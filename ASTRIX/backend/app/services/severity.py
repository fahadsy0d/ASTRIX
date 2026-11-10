import re
from app.constants import Severity

CATEGORY_WEIGHT = {
    "Building Collapse": 4.0,
    "Fire Emergency": 3.0,
    "Medical Emergency": 3.0,
    "Flood": 2.5,
    "Road Accident": 2.5,
    "Other Emergencies": 1.0,
}

HIGH_RISK = [
    "trapped", "explosion", "unconscious", "not breathing", "bleeding",
    "collapsed", "children", "gas leak", "drowning", "spreading", "fatal",
    "dead", "heart attack", "suffocating", "severe", "burning"
]

LOW_RISK = [
    "minor", "small", "no injuries", "under control", "no one hurt",
    "safe", "controlled", "property only"
]

def _people_points(n: int) -> float:
    if n >= 21:
        return 3.0
    if n >= 6:
        return 2.0
    if n >= 2:
        return 1.0
    return 0.0

def score_incident(category: str, people: int, text: str) -> tuple[float, Severity, str]:
    t = text.lower()
    reasons = []
    
    score = CATEGORY_WEIGHT.get(category, 1.0)
    reasons.append(f"{category} base {score:g}")

    pp = _people_points(people)
    if pp > 0:
        score += pp
        reasons.append(f"{people} casualties/affected (+{pp:g})")

    hits = [k for k in HIGH_RISK if re.search(rf"\b{re.escape(k)}\b", t)]
    if hits:
        add = min(len(hits), 2) * 2.0
        score += add
        reasons.append(f"risk keywords [{', '.join(hits[:3])}] (+{add:g})")

    lows = [k for k in LOW_RISK if k in t]
    if lows:
        score = max(1.0, score - 1.5)
        reasons.append(f"mitigating factor ({lows[0]}) (-1.5)")

    if score < 3.0:
        level = Severity.LOW
    elif score < 5.0:
        level = Severity.MEDIUM
    elif score < 7.5:
        level = Severity.HIGH
    else:
        level = Severity.CRITICAL

    return round(score, 1), level, "; ".join(reasons)
