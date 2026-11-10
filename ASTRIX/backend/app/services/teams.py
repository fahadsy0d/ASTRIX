import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants import Category
from app.models import EmergencyTeam, Incident
from app.schemas import TeamCreate
from app.services.geo import eta_minutes, haversine_km
from app.services.incidents import DispatchError

PREFIX = {
    "Fire Emergency": "FIRE",
    "Road Accident": "ROAD",
    "Medical Emergency": "MED",
    "Flood": "FLOOD",
    "Building Collapse": "COLL",
    "Other Emergencies": "RESC",
}


def next_team_id(db: Session, category: str) -> str:
    prefix = f"TEAM-{PREFIX[category]}-"
    nums = [
        int(m.group(1))
        for (tid,) in db.execute(select(EmergencyTeam.id).where(EmergencyTeam.id.like(prefix + "%"))).all()
        if (m := re.search(r"-(\d+)$", tid))
    ]
    return f"{prefix}{(max(nums) + 1) if nums else 1:02d}"


def create_team(db: Session, data: TeamCreate) -> EmergencyTeam:
    cat = data.category.value
    tid = (data.id or next_team_id(db, cat)).strip().upper()
    if db.get(EmergencyTeam, tid):
        raise DispatchError(f"Team id {tid} already exists")
    team = EmergencyTeam(
        id=tid,
        name=data.name,
        category=cat,
        latitude=data.latitude,
        longitude=data.longitude,
        current_location_name=data.current_location_name,
        status="Offline" if data.status.value == "Offline" else "Available",  # Busy only via assignment
        contact_number=data.contact_number,
    )
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


def filter_teams(
    db: Session,
    status: str | None = None,
    category: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float | None = None,
) -> list[tuple[EmergencyTeam, float | None]]:
    q = select(EmergencyTeam)
    if status:
        q = q.where(EmergencyTeam.status.ilike(status.strip()))
    rows = db.scalars(q.order_by(EmergencyTeam.id)).all()
    if category:  # accepts "Fire" or "Fire Emergency" (case-insensitive substring)
        needle = category.strip().lower()
        rows = [t for t in rows if needle in t.category.lower()]
    out: list[tuple[EmergencyTeam, float | None]] = []
    for t in rows:
        d = None
        if lat is not None and lng is not None:
            d = round(haversine_km(lat, lng, t.latitude, t.longitude), 2)
            if radius_km is not None and d > radius_km:
                continue
        out.append((t, d))
    if lat is not None and lng is not None:
        out.sort(key=lambda x: x[1])
    return out


def nearest_incidents(db: Session, team: EmergencyTeam, radius_km: float, limit: int):
    """Highest-priority unassigned incidents within range of a team (priority desc, then distance)."""
    rows = db.scalars(select(Incident).where(Incident.status == "Reported")).all()
    res = []
    for inc in rows:
        if inc.latitude is None or inc.longitude is None:
            continue
        d = haversine_km(team.latitude, team.longitude, inc.latitude, inc.longitude)
        if d <= radius_km:
            res.append((inc, round(d, 2), eta_minutes(d), inc.category == team.category))
    res.sort(key=lambda x: (-x[0].priority_score, x[1]))
    return res[:limit]
