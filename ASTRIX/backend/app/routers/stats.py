from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.services.incidents import get_stats
from app.schemas import StatsOut

router = APIRouter(prefix="/api/v1/stats", tags=["stats"])

@router.get("", response_model=StatsOut)
def stats(db: Session = Depends(get_db)):
    return get_stats(db)
