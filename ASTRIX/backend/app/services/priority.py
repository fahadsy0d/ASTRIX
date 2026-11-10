from datetime import datetime, timezone

SEVERITY_POINTS = {"Critical": 40.0, "High": 25.0, "Medium": 15.0, "Low": 5.0}
PEOPLE_PTS_PER_PERSON = 1.2
PEOPLE_CAP = 30.0
TIME_PTS_PER_MIN = 0.5
TIME_CAP = 20.0
CATEGORY_BONUS = {"Fire Emergency": 10.0, "Building Collapse": 10.0}


def aware(dt: datetime | None) -> datetime | None:
    """SQLite returns naive datetimes; everything we store is UTC."""
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


def minutes_unassigned(created_at: datetime, assigned_at: datetime | None, now: datetime | None = None) -> float:
    """Wait time before a team was assigned. The clock stops once a team is assigned."""
    end = aware(assigned_at) or now or datetime.now(timezone.utc)
    return max(0.0, (end - aware(created_at)).total_seconds() / 60.0)


def compute_priority(
    severity: str,
    people: int,
    category: str,
    created_at: datetime,
    assigned_at: datetime | None = None,
    now: datetime | None = None,
) -> tuple[float, dict]:
    """
    P = S_pts + min(1.2 * N, 30) + min(0.5 * T_unassigned_min, 20) + C_bonus     (P in [0, 100])
    Max possible: 40 + 30 + 20 + 10 = 100.
    """
    sev = SEVERITY_POINTS.get(severity, 5.0)
    ppl = min(PEOPLE_PTS_PER_PERSON * max(people, 0), PEOPLE_CAP)
    mins = minutes_unassigned(created_at, assigned_at, now)
    tim = min(TIME_PTS_PER_MIN * mins, TIME_CAP)
    bonus = CATEGORY_BONUS.get(category, 0.0)
    total = round(min(100.0, sev + ppl + tim + bonus), 1)

    components = [
        {"key": "severity", "label": f"Severity: {severity}", "points": round(sev, 1), "max": 40.0},
        {"key": "people", "label": f"{people} people affected", "points": round(ppl, 1), "max": PEOPLE_CAP},
        {"key": "time", "label": f"{mins:.0f} min waiting unassigned", "points": round(tim, 1), "max": TIME_CAP},
        {"key": "category", "label": f"Category bonus ({category})", "points": round(bonus, 1), "max": 10.0},
    ]
    summary = " + ".join(f"{c['points']:g} ({c['label']})" for c in components) + f" = {total:g}"
    return total, {"total": total, "components": components, "summary": summary}
