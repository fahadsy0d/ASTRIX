from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants import ALLOWED_TRANSITIONS, FALLBACK_CATEGORY, Category
from app.models import EmergencyTeam, Incident, StatusHistory
from app.schemas import IncidentCreate
from app.services.geo import eta_minutes, haversine_km
from app.services.priority import aware, compute_priority
from app.services.severity import score_incident

# ── Spatial de-duplication (Round 1) ─────────────────────────────────────────
DEDUP_RADIUS_KM = 0.15
DEDUP_ACTIVE = {"Reported", "Assigned", "In Progress"}
SEV_RANK = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}


class DispatchError(Exception):
    """Raised for business-rule violations (mapped to HTTP 409/422 by the routers)."""

    def __init__(self, message: str, code: int = 409):
        super().__init__(message)
        self.code = code


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def refresh_priority(inc: Incident, now: datetime | None = None) -> float:
    score, breakdown = compute_priority(
        inc.severity, inc.people_affected, inc.category, inc.created_at, inc.assigned_at, now
    )
    inc.priority_score = score
    inc.extra = {**(inc.extra or {}), "priority_breakdown": breakdown}
    return score


def _log(inc: Incident, old: str | None, new: str, by: str, note: str | None = None):
    inc.history.append(StatusHistory(old_status=old, new_status=new, changed_by=by, note=note))


def _find_nearby(db: Session, category: str, lat: float, lon: float) -> Incident | None:
    rows = db.scalars(
        select(Incident).where(
            Incident.category == category,
            Incident.status.in_(DEDUP_ACTIVE),
            Incident.latitude.isnot(None),
            Incident.longitude.isnot(None),
        )
    ).all()
    best, best_d = None, float("inf")
    for r in rows:
        d = haversine_km(lat, lon, r.latitude, r.longitude)
        if d <= DEDUP_RADIUS_KM and d < best_d:
            best, best_d = r, d
    return best


def create_incident(db: Session, data: IncidentCreate, changed_by: str = "Reporter") -> tuple[Incident, bool]:
    """Create an incident (or merge a duplicate report). Returns (incident, is_duplicate)."""
    cat = data.category.value
    sev_score, sev_level, sev_reason = score_incident(cat, data.people_affected, f"{data.title} {data.description}")
    severity = data.severity.value if data.severity else sev_level.value

    if data.latitude is not None and data.longitude is not None:
        near = _find_nearby(db, cat, data.latitude, data.longitude)
        if near:
            near.report_count += 1
            near.people_affected = max(near.people_affected, data.people_affected)
            _, lvl, reason = score_incident(
                cat, near.people_affected, f"{near.title} {near.description} {data.title} {data.description}"
            )
            if SEV_RANK[lvl.value] > SEV_RANK.get(near.severity, 0):
                near.severity = lvl.value
            near.severity_score = max(near.severity_score, sev_score)
            near.severity_reason = f"[{near.report_count} reporters] {reason}"
            refresh_priority(near)
            db.commit()
            db.refresh(near)
            return near, True

    inc = Incident(
        title=data.title,
        description=data.description,
        category=cat,
        location=data.location,
        latitude=data.latitude,
        longitude=data.longitude,
        people_affected=data.people_affected,
        contact=data.contact,
        source=data.source,
        severity=severity,
        severity_score=sev_score,
        severity_reason=sev_reason,
        status="Reported",
        report_count=1,
    )
    inc.created_at = _utcnow()
    refresh_priority(inc)
    _log(inc, None, "Reported", changed_by if data.source == "web" else f"Feed ({data.source})")
    db.add(inc)
    db.commit()
    db.refresh(inc)
    return inc, False


# ── Team selection & assignment ──────────────────────────────────────────────
def rank_candidates(db: Session, inc: Incident) -> list[tuple[EmergencyTeam, float]]:
    """Available teams of the matching category (fallback: multi-purpose rescue), nearest first."""
    if inc.latitude is None or inc.longitude is None:
        raise DispatchError("Incident has no coordinates; cannot compute nearest team", 422)
    available = db.scalars(select(EmergencyTeam).where(EmergencyTeam.status == "Available")).all()
    pool = [t for t in available if t.category == inc.category]
    if not pool:
        pool = [t for t in available if t.category == FALLBACK_CATEGORY]
    ranked = [(t, haversine_km(inc.latitude, inc.longitude, t.latitude, t.longitude)) for t in pool]
    ranked.sort(key=lambda x: x[1])
    return ranked


def _release_team(db: Session, team_id: str | None):
    if not team_id:
        return
    t = db.get(EmergencyTeam, team_id)
    if t and t.status == "Busy":
        t.status = "Available"
    if t:
        t.assigned_incident_id = None


def assign_team(db: Session, inc: Incident, team: EmergencyTeam, by: str) -> Incident:
    """Atomically bind team <-> incident (single commit): incident=Assigned, team=Busy."""
    if inc.status not in ("Reported", "Assigned"):
        raise DispatchError(f"Cannot assign a team to an incident that is '{inc.status}'")
    if inc.latitude is None or inc.longitude is None:
        raise DispatchError("Incident has no coordinates; cannot compute route", 422)
    if team.status != "Available":
        raise DispatchError(f"Team {team.id} is {team.status}, not Available")

    old = inc.status
    if old == "Assigned":  # re-assignment frees the previous team
        _release_team(db, inc.assigned_team_id)

    dist = haversine_km(inc.latitude, inc.longitude, team.latitude, team.longitude)
    inc.assigned_team_id = team.id
    inc.distance_km = round(dist, 2)
    inc.eta_minutes = eta_minutes(dist)
    inc.status = "Assigned"
    if old == "Reported":
        inc.assigned_at = _utcnow()
    team.status = "Busy"
    team.assigned_incident_id = inc.id
    refresh_priority(inc)
    _log(inc, old, "Assigned", by, f"{team.id} · {inc.distance_km} km · ETA {inc.eta_minutes} min")
    db.commit()
    db.refresh(inc)
    return inc


def auto_assign(db: Session, inc: Incident, by: str = "System Auto-Assign") -> Incident:
    if inc.status != "Reported":
        raise DispatchError(f"Incident is already '{inc.status}'")
    ranked = rank_candidates(db, inc)
    if not ranked:
        raise DispatchError("No available team of a suitable category (or multi-purpose rescue) right now")
    return assign_team(db, inc, ranked[0][0], by)


def transition(db: Session, inc: Incident, new_status: str, by: str = "Dispatcher") -> Incident:
    """Strict state machine. Emits StatusHistory; on Resolved frees the team and records response time."""
    if new_status == inc.status:
        return inc
    if new_status not in ALLOWED_TRANSITIONS.get(inc.status, set()):
        allowed = ", ".join(sorted(ALLOWED_TRANSITIONS.get(inc.status, set()))) or "none (terminal)"
        raise DispatchError(f"Invalid transition '{inc.status}' → '{new_status}'. Allowed next: {allowed}")
    if new_status == "Assigned" and not inc.assigned_team_id:
        raise DispatchError("Assign a team first (use auto-assign or pick a team)")

    old = inc.status
    inc.status = new_status
    note = None
    if new_status == "Resolved":
        inc.resolved_at = _utcnow()
        inc.response_time_mins = round((inc.resolved_at - aware(inc.created_at)).total_seconds() / 60.0, 1)
        _release_team(db, inc.assigned_team_id)
        note = f"Total response time {inc.response_time_mins:g} min"
    refresh_priority(inc)
    _log(inc, old, new_status, by, note)
    db.commit()
    db.refresh(inc)
    return inc


def delete_incident(db: Session, inc: Incident):
    _release_team(db, inc.assigned_team_id)
    db.delete(inc)
    db.commit()
