import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models import Incident

router = APIRouter(prefix="/api/v1/export", tags=["export"])

@router.get("/incidents.csv")
def export_incidents_csv(db: Session = Depends(get_db)):
    """
    Exports all recorded incidents to CSV format with full triage metadata.
    """
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow([
        "id", "title", "category", "severity", "priority_score", "severity_score",
        "severity_reason", "status", "location", "latitude", "longitude",
        "people_affected", "contact", "source", "created_at"
    ])
    
    incidents = db.scalars(select(Incident).order_by(Incident.id.desc())).all()
    for i in incidents:
        w.writerow([
            i.id,
            i.title,
            i.category,
            i.severity,
            i.priority_score,
            i.severity_score,
            i.severity_reason,
            i.status,
            i.location,
            i.latitude,
            i.longitude,
            i.people_affected,
            i.contact or "",
            i.source,
            i.created_at.isoformat() if i.created_at else ""
        ])
    
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="incidents_export.csv"'}
    )
