from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select, case
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models import Incident
from app.schemas import IncidentCreate, IncidentOut, StatusUpdate, DispatchRequest
from app.constants import Category, Severity, Status
from app.services import incidents as svc
from app.services.ws import hub

router = APIRouter(prefix="/api/v1/incidents", tags=["incidents"])

def _get_or_404(db: Session, incident_id: int) -> Incident:
    inc = db.get(Incident, incident_id)
    if not inc:
        raise HTTPException(404, "Incident not found")
    return inc

@router.post("", response_model=IncidentOut, status_code=201)
async def create_incident(data: IncidentCreate, db: Session = Depends(get_db)):
    inc, is_duplicate = svc.create_incident(db, data)
    out = IncidentOut.model_validate(inc)
    # Broadcast different events so the frontend can distinguish
    # a brand-new pin on the map vs. an escalation of an existing one
    event = "incident.escalated" if is_duplicate else "incident.created"
    await hub.broadcast(event, out.model_dump(mode="json"))
    return out

@router.get("", response_model=list[IncidentOut])
def list_incidents(
    status: Status | None = None,
    category: Category | None = None,
    severity: Severity | None = None,
    search: str | None = None,
    db: Session = Depends(get_db)
):
    q = select(Incident)
    if status:
        q = q.where(Incident.status == status.value)
    if category:
        q = q.where(Incident.category == category.value)
    if severity:
        q = q.where(Incident.severity == severity.value)
    if search:
        s = f"%{search.strip()}%"
        q = q.where((Incident.title.ilike(s)) | (Incident.location.ilike(s)) | (Incident.description.ilike(s)))

    rank = case(
        (Incident.severity == "Critical", 0),
        (Incident.severity == "High", 1),
        (Incident.severity == "Medium", 2),
        (Incident.severity == "Low", 3),
        else_=4
    )
    return db.scalars(q.order_by(rank, Incident.created_at.desc())).all()

@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, incident_id)

@router.patch("/{incident_id}/status", response_model=IncidentOut)
async def update_status(incident_id: int, body: StatusUpdate, db: Session = Depends(get_db)):
    inc = _get_or_404(db, incident_id)
    try:
        svc.transition(db, inc, body.status.value)
    except ValueError as e:
        raise HTTPException(409, str(e))
    out = IncidentOut.model_validate(inc)
    await hub.broadcast("incident.updated", out.model_dump(mode="json"))
    return out

@router.post("/{incident_id}/dispatch", response_model=IncidentOut)
async def dispatch_responder_unit(incident_id: int, body: DispatchRequest, db: Session = Depends(get_db)):
    inc = _get_or_404(db, incident_id)
    inc.assigned_to = body.unit.strip()
    
    # Automatically promote newly reported/pending incidents to In Progress on dispatch
    if inc.status in ["Reported", "Pending"]:
        try:
            svc.transition(db, inc, "In Progress")
        except ValueError:
            pass
    else:
        db.commit()
        db.refresh(inc)

    out = IncidentOut.model_validate(inc)
    await hub.broadcast("incident.updated", out.model_dump(mode="json"))
    return out

@router.delete("", status_code=204)
async def clear_incidents(db: Session = Depends(get_db)):
    db.query(Incident).delete()
    db.commit()
    await hub.broadcast("incident.cleared", {"cleared": True})
    return Response(status_code=204)

@router.delete("/{incident_id}", status_code=204)
async def delete_incident(incident_id: int, db: Session = Depends(get_db)):
    inc = _get_or_404(db, incident_id)
    db.delete(inc)
    db.commit()
    await hub.broadcast("incident.deleted", {"id": incident_id})
    return Response(status_code=204)

@router.post("/seed", response_model=list[IncidentOut])
async def seed_incidents(count: int = 5, db: Session = Depends(get_db)):
    created = svc.seed_sample_incidents(db, count=min(count, 15))
    results = []
    for inc in created:
        out = IncidentOut.model_validate(inc)
        results.append(out)
        await hub.broadcast("incident.created", out.model_dump(mode="json"))
    return results
