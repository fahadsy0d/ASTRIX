from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import EmergencyTeam, Incident
from app.services.priority import aware

SEVERITIES = ["Critical", "High", "Medium", "Low"]
STATUSES = ["Reported", "Assigned", "In Progress", "Resolved"]


def _avg(xs: list[float]) -> float | None:
    return round(sum(xs) / len(xs), 1) if xs else None


def get_stats(db: Session) -> dict:
    incs = db.scalars(select(Incident)).all()
    teams = db.scalars(select(EmergencyTeam)).all()

    by_cat: dict[str, int] = {}
    sev_status = {s: {st: 0 for st in STATUSES} for s in SEVERITIES}
    for i in incs:
        by_cat[i.category] = by_cat.get(i.category, 0) + 1
        sev_status[i.severity][i.status] += 1

    resolved = [i for i in incs if i.status == "Resolved"]
    dispatch_to_res = [
        (aware(i.resolved_at) - aware(i.assigned_at)).total_seconds() / 60
        for i in resolved
        if i.resolved_at and i.assigned_at
    ]
    total_resp = [i.response_time_mins for i in resolved if i.response_time_mins is not None]

    available = sum(t.status == "Available" for t in teams)
    busy = sum(t.status == "Busy" for t in teams)
    return {
        "total_incidents": len(incs),
        "active_critical": sum(i.severity == "Critical" and i.status != "Resolved" for i in incs),
        "available_teams": available,
        "busy_teams": busy,
        "offline_teams": sum(t.status == "Offline" for t in teams),
        "total_teams": len(teams),
        "total_resolved": len(resolved),
        "avg_dispatch_to_resolution_mins": _avg(dispatch_to_res),
        "avg_total_response_mins": _avg(total_resp),
        "fleet_readiness_pct": round(available / len(teams) * 100, 1) if teams else 0.0,
        "by_category": by_cat,
        "by_status": {st: sum(i.status == st for i in incs) for st in STATUSES},
        "severity_breakdown": [{"severity": s, **sev_status[s]} for s in SEVERITIES],
    }
