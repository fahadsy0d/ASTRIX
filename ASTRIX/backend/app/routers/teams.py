from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import EmergencyTeam
from app.schemas import IncidentOut, NearestIncidentOut, TeamCreate, TeamOut, TeamUpdate
from app.services import teams as svc
from app.services.incidents import DispatchError, refresh_priority
from app.services.ws import hub

router = APIRouter(prefix="/api/v1/teams", tags=["teams"])


def _get(db: Session, team_id: str) -> EmergencyTeam:
    t = db.get(EmergencyTeam, team_id.upper())
    if not t:
        raise HTTPException(404, "Team not found")
    return t


def _out(t: EmergencyTeam, d: float | None = None) -> TeamOut:
    o = TeamOut.model_validate(t)
    o.distance_km = d
    return o


@router.get("", response_model=list[TeamOut])
def list_teams(
    status: str | None = None,
    category: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    radius_km: float | None = None,
    db: Session = Depends(get_db),
):
    """Filter by status (Available/Busy/Offline), category (substring, e.g. 'Fire') and operational radius (lat+lng+radius_km)."""
    if radius_km is not None and (lat is None or lng is None):
        raise HTTPException(422, "radius_km requires lat and lng")
    return [_out(t, d) for t, d in svc.filter_teams(db, status, category, lat, lng, radius_km)]


@router.post("", response_model=TeamOut, status_code=201)
async def create_team(data: TeamCreate, db: Session = Depends(get_db)):
    try:
        t = svc.create_team(db, data)
    except DispatchError as e:
        raise HTTPException(e.code, str(e))
    out = _out(t)
    await hub.broadcast("team.created", out.model_dump(mode="json"))
    return out


@router.get("/{team_id}", response_model=TeamOut)
def get_team(team_id: str, db: Session = Depends(get_db)):
    return _out(_get(db, team_id))


@router.get("/{team_id}/nearest-incidents", response_model=list[NearestIncidentOut])
def nearest_incidents(team_id: str, radius_km: float = 25.0, limit: int = 10, db: Session = Depends(get_db)):
    t = _get(db, team_id)
    res = svc.nearest_incidents(db, t, radius_km, limit)
    for inc, *_ in res:
        refresh_priority(inc)
    db.commit()
    return [
        NearestIncidentOut(incident=IncidentOut.model_validate(i), distance_km=d, eta_minutes=eta, category_match=m)
        for i, d, eta, m in res
    ]


@router.patch("/{team_id}", response_model=TeamOut)
@router.put("/{team_id}", response_model=TeamOut)
async def update_team(team_id: str, data: TeamUpdate, db: Session = Depends(get_db)):
    t = _get(db, team_id)
    patch = data.model_dump(exclude_unset=True)
    new_status = patch.pop("status", None)
    if new_status is not None:
        if t.assigned_incident_id:
            raise HTTPException(409, "Team has an active assignment; resolve the incident to free it")
        if new_status.value == "Busy":
            raise HTTPException(409, "Teams become Busy only through an incident assignment")
        t.status = new_status.value
    for k, v in patch.items():
        setattr(t, k, v.value if hasattr(v, "value") else v)
    db.commit()
    db.refresh(t)
    out = _out(t)
    await hub.broadcast("team.updated", out.model_dump(mode="json"))
    return out


@router.delete("/{team_id}", status_code=204)
async def delete_team(team_id: str, db: Session = Depends(get_db)):
    t = _get(db, team_id)
    if t.assigned_incident_id:
        raise HTTPException(409, "Team is assigned to an active incident")
    db.delete(t)
    db.commit()
    await hub.broadcast("team.deleted", {"id": team_id})
    return Response(status_code=204)
