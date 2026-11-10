from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants import Category, Severity, Status
from app.core.db import get_db
from app.models import EmergencyTeam, Incident
from app.schemas import (AssignmentOut, AssignRequest, IncidentCreate, IncidentDetail, IncidentOut, StatusUpdate,
                         TeamOut)
from app.services import incidents as svc
from app.services.seed import wipe
from app.services.ws import hub

router = APIRouter(prefix="/api/v1/incidents", tags=["incidents"])


def _get(db: Session, incident_id: str) -> Incident:
    inc = db.get(Incident, incident_id)
    if not inc:
        raise HTTPException(404, "Incident not found")
    return inc


def _out(inc: Incident) -> dict:
    return IncidentOut.model_validate(inc).model_dump(mode="json")


async def _broadcast_with_team(event: str, inc: Incident):
    await hub.broadcast(event, _out(inc))
    if inc.assigned_team:
        await hub.broadcast("team.updated", TeamOut.model_validate(inc.assigned_team).model_dump(mode="json"))


@router.get("", response_model=list[IncidentOut])
def list_incidents(
    status: Status | None = None,
    category: Category | None = None,
    severity: Severity | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    """All incidents ordered by priority_score DESC (re-scored live so waiting time keeps counting)."""
    q = select(Incident)
    if status:
        q = q.where(Incident.status == status.value)
    if category:
        q = q.where(Incident.category == category.value)
    if severity:
        q = q.where(Incident.severity == severity.value)
    if search:
        s = f"%{search.strip()}%"
        q = q.where(Incident.title.ilike(s) | Incident.location.ilike(s) | Incident.description.ilike(s))
    rows = db.scalars(q).unique().all()
    for r in rows:
        svc.refresh_priority(r)
    db.commit()
    rows.sort(key=lambda r: (-r.priority_score, r.created_at))
    return rows


@router.post("", response_model=IncidentOut, status_code=201)
async def create_incident(data: IncidentCreate, db: Session = Depends(get_db)):
    inc, dup = svc.create_incident(db, data)
    await hub.broadcast("incident.escalated" if dup else "incident.created", _out(inc))
    return inc


@router.get("/{incident_id}", response_model=IncidentDetail)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    inc = _get(db, incident_id)
    svc.refresh_priority(inc)
    db.commit()
    return inc


@router.patch("/{incident_id}/status", response_model=IncidentOut)
async def update_status(incident_id: str, body: StatusUpdate, db: Session = Depends(get_db)):
    inc = _get(db, incident_id)
    try:
        svc.transition(db, inc, body.status.value, body.changed_by)
    except svc.DispatchError as e:
        raise HTTPException(e.code, str(e))
    await _broadcast_with_team("incident.updated", inc)
    return inc


@router.post("/{incident_id}/auto-assign", response_model=AssignmentOut)
async def auto_assign(incident_id: str, db: Session = Depends(get_db)):
    """Nearest Available team of the incident's category (fallback: multi-purpose rescue) via Haversine."""
    inc = _get(db, incident_id)
    try:
        svc.auto_assign(db, inc)
    except svc.DispatchError as e:
        raise HTTPException(e.code, str(e))
    await _broadcast_with_team("incident.updated", inc)
    return AssignmentOut(incident=inc, team=inc.assigned_team, distance_km=inc.distance_km, eta_minutes=inc.eta_minutes)


@router.post("/{incident_id}/assign", response_model=AssignmentOut)
async def manual_assign(incident_id: str, body: AssignRequest, db: Session = Depends(get_db)):
    inc = _get(db, incident_id)
    team = db.get(EmergencyTeam, body.team_id)
    if not team:
        raise HTTPException(404, "Team not found")
    try:
        svc.assign_team(db, inc, team, "Dispatcher")
    except svc.DispatchError as e:
        raise HTTPException(e.code, str(e))
    await _broadcast_with_team("incident.updated", inc)
    return AssignmentOut(incident=inc, team=inc.assigned_team, distance_km=inc.distance_km, eta_minutes=inc.eta_minutes)


@router.delete("", status_code=204)
async def clear_incidents(db: Session = Depends(get_db)):
    wipe(db)
    from sqlalchemy import update
    db.execute(update(EmergencyTeam).where(EmergencyTeam.status == "Busy").values(status="Available"))
    db.commit()
    await hub.broadcast("incident.cleared", {"cleared": True})
    return Response(status_code=204)


@router.delete("/{incident_id}", status_code=204)
async def delete_incident(incident_id: str, db: Session = Depends(get_db)):
    inc = _get(db, incident_id)
    svc.delete_incident(db, inc)
    await hub.broadcast("incident.deleted", {"id": incident_id})
    return Response(status_code=204)
