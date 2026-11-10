from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.services.analytics import get_stats
from app.services.seed import seed_demo
from app.services.ws import hub

router = APIRouter(prefix="/api/v1", tags=["analytics"])


@router.get("/analytics/stats")
def stats(db: Session = Depends(get_db)):
    return get_stats(db)


@router.post("/seed")
async def seed(reset: bool = True, db: Session = Depends(get_db)):
    """Pre-seed 6 realistic Chennai incidents + 8 response teams (resets existing data by default)."""
    res = seed_demo(db, reset=reset)
    await hub.broadcast("seed.completed", res)
    return {"status": "seeded", **res}
