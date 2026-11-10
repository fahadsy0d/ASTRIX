import math
import random
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.models import Incident, StatusHistory
from app.schemas import IncidentCreate
from app.constants import ALLOWED_TRANSITIONS, Category
from app.services.severity import score_incident

# ─────────────────────────────────────────────────────────────────────────────
# SPATIAL DEDUPLICATION CONFIG
# ─────────────────────────────────────────────────────────────────────────────
DEDUP_RADIUS_METRES = 150        # Reports within 150 m of same category → merge
DEDUP_ACTIVE_STATUSES = {"Reported", "Pending", "In Progress"}  # Resolved incidents are never merged into

CHENNAI_LOCATIONS = [
    ("T. Nagar, Usman Road", 13.0418, 80.2341),
    ("Adyar Signal Junction", 13.0067, 80.2570),
    ("Anna Nagar Roundtana", 13.0850, 80.2101),
    ("Velachery Main Road", 12.9815, 80.2180),
    ("Marina Beach Promenade", 13.0500, 80.2824),
    ("Tambaram Railway Station Area", 12.9249, 80.1000),
    ("Guindy Industrial Estate", 13.0067, 80.2206),
    ("Egmore Bridge", 13.0732, 80.2609),
    ("Porur Toll Junction", 13.0382, 80.1565),
    ("Koyambedu Market Complex", 13.0694, 80.1948),
]

SAMPLE_SCENARIOS = [
    ("Fire Emergency", "Commercial kitchen fire spreading rapidly to upper residential floor, smoke heavy", 8),
    ("Road Accident", "Multi-vehicle collision involving bus and two cars, severe bleeding reported", 5),
    ("Medical Emergency", "Elderly citizen collapsed on pavement, unconscious and not breathing", 1),
    ("Building Collapse", "Old residential balcony collapsed onto street, several pedestrians trapped", 14),
    ("Flood", "Severe flash waterlogging at subway, 3 cars stalled with rising water level", 6),
    ("Other Emergencies", "Large fallen banyan tree blocking arterial road, electric cable snapped", 0),
]


# ─────────────────────────────────────────────────────────────────────────────
# HAVERSINE DISTANCE (metres) — works without any extra Python package
# ─────────────────────────────────────────────────────────────────────────────
def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Returns the great-circle distance in metres between two GPS coordinates.
    Uses the Haversine formula — accurate enough for < 50 km distances.
    """
    R = 6_371_000  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _find_nearby_incident(
    db: Session, category: str, lat: float, lon: float
) -> Incident | None:
    """
    Queries all active, same-category incidents and returns the closest one
    within DEDUP_RADIUS_METRES. Returns None when no near match is found.

    Why we don't use a GIS SQL function:
        SQLite has no native spatial extension without loading mod_spatialite.
        Loading all active same-category rows is cheap (typically < 50 rows)
        and the Python Haversine check is sub-millisecond for that set size.
        PostgreSQL users can drop in PostGIS later as a plugin.
    """
    candidates = db.scalars(
        select(Incident).where(
            Incident.category == category,
            Incident.status.in_(DEDUP_ACTIVE_STATUSES),
            Incident.latitude.isnot(None),
            Incident.longitude.isnot(None),
        )
    ).all()

    best: Incident | None = None
    best_dist = float("inf")

    for inc in candidates:
        dist = _haversine_m(lat, lon, inc.latitude, inc.longitude)  # type: ignore[arg-type]
        if dist <= DEDUP_RADIUS_METRES and dist < best_dist:
            best_dist = dist
            best = inc

    return best


def _merge_into_existing(
    db: Session,
    existing: Incident,
    incoming: IncidentCreate,
    incoming_score: float,
    incoming_level_value: str,
    incoming_reason: str,
) -> Incident:
    """
    Merges a duplicate incoming report into an already-existing incident.

    Escalation rules:
    - report_count always increments (corroboration counter).
    - people_affected takes the MAX of old and new (worst-case victim count).
    - Severity is re-scored using the COMBINED people count so the
      escalated total is reflected in the final score.
    - severity_reason is updated to show corroboration evidence.
    - The incident description is NOT overwritten — dispatchers keep the
      original context.
    """
    existing.report_count += 1

    # Escalate casualty count to the worst known value
    combined_people = max(existing.people_affected, incoming.people_affected)
    existing.people_affected = combined_people

    # Re-score with combined information so severity can escalate
    merged_text = f"{existing.title} {existing.description} {incoming.title} {incoming.description}"
    new_score, new_level, new_reason = score_incident(
        existing.category, combined_people, merged_text
    )

    # Severity only escalates — never downgrade an existing Critical to High
    sev_rank = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}
    if sev_rank.get(new_level.value, 0) > sev_rank.get(existing.severity, 0):
        existing.severity = new_level.value

    existing.severity_score = new_score
    existing.severity_reason = (
        f"[{existing.report_count} reporters] {new_reason}"
    )

    db.commit()
    db.refresh(existing)
    return existing


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────
def create_incident(db: Session, data: IncidentCreate) -> tuple[Incident, bool]:
    """
    Creates a new incident or merges into an existing nearby one.

    Returns:
        (incident, is_duplicate) — callers broadcast different WebSocket
        events depending on whether a new incident was created or an
        existing one was updated.
    """
    cat_str = data.category.value if isinstance(data.category, Category) else data.category
    score, level, reason = score_incident(
        cat_str, data.people_affected, f"{data.title} {data.description}"
    )

    # ── Deduplication check ──────────────────────────────────────────────────
    if data.latitude is not None and data.longitude is not None:
        nearby = _find_nearby_incident(db, cat_str, data.latitude, data.longitude)
        if nearby:
            merged = _merge_into_existing(
                db, nearby, data, score, level.value, reason
            )
            return merged, True          # is_duplicate = True

    # ── No duplicate found → create fresh incident ───────────────────────────
    inc = Incident(
        **data.model_dump(exclude={"category"}),
        category=cat_str,
        severity=level.value,
        severity_score=score,
        severity_reason=reason,
        status="Reported",
        report_count=1,
    )
    inc.history.append(StatusHistory(status="Reported"))
    db.add(inc)
    db.commit()
    db.refresh(inc)
    return inc, False                    # is_duplicate = False


def transition(db: Session, inc: Incident, new_status: str) -> Incident:
    if new_status == inc.status:
        return inc
    if new_status not in ALLOWED_TRANSITIONS.get(inc.status, set()):
        raise ValueError(f"Cannot transition from '{inc.status}' to '{new_status}'")
    inc.status = new_status
    inc.history.append(StatusHistory(status=new_status))
    db.commit()
    db.refresh(inc)
    return inc


def get_stats(db: Session) -> dict:
    by_status = dict(db.execute(
        select(Incident.status, func.count(Incident.id)).group_by(Incident.status)
    ).all())

    by_cat = dict(db.execute(
        select(Incident.category, func.count(Incident.id)).group_by(Incident.category)
    ).all())

    critical = db.scalar(
        select(func.count(Incident.id)).where(
            Incident.severity == "Critical",
            Incident.status != "Resolved"
        )
    ) or 0

    return {
        "total": sum(by_status.values()),
        "critical": critical,
        "reported": by_status.get("Reported", 0),
        "pending": by_status.get("Pending", 0),
        "in_progress": by_status.get("In Progress", 0),
        "resolved": by_status.get("Resolved", 0),
        "by_category": by_cat,
    }


def seed_sample_incidents(db: Session, count: int = 5) -> list[Incident]:
    created = []
    for _ in range(count):
        cat_str, desc, ppl = random.choice(SAMPLE_SCENARIOS)
        loc_name, base_lat, base_lng = random.choice(CHENNAI_LOCATIONS)

        lat = round(base_lat + random.uniform(-0.005, 0.005), 5)
        lng = round(base_lng + random.uniform(-0.005, 0.005), 5)

        data = IncidentCreate(
            title=f"{cat_str} at {loc_name}",
            description=desc,
            category=Category(cat_str),
            location=loc_name,
            latitude=lat,
            longitude=lng,
            people_affected=ppl,
            contact=f"+91 98400 {random.randint(10000, 99999)}",
            source="sim"
        )
        inc, _ = create_incident(db, data)
        created.append(inc)
    return created
