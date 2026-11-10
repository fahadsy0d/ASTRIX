from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, update
from sqlalchemy.orm import Session

from app.models import EmergencyTeam, Incident, StatusHistory
from app.services.geo import eta_minutes, haversine_km
from app.services.incidents import refresh_priority
from app.services.severity import score_incident

# (id, name, category, lat, lng, base name, phone)  — Chennai metropolitan area
TEAMS = [
    ("TEAM-FIRE-01", "Central Fire Station Squad Alpha", "Fire Emergency", 13.0870, 80.2760, "Park Town, Chennai Central", "+91 44 2538 1101"),
    ("TEAM-FIRE-02", "Guindy Fire Station Squad Bravo", "Fire Emergency", 13.0090, 80.2180, "Guindy Industrial Estate", "+91 44 2250 1102"),
    ("TEAM-MED-01", "RGGGH Ambulance 108-A", "Medical Emergency", 13.0810, 80.2790, "Rajiv Gandhi Govt. General Hospital", "+91 44 2530 5201"),
    ("TEAM-MED-02", "Apollo Greams Road Ambulance", "Medical Emergency", 13.0632, 80.2518, "Greams Road, Thousand Lights", "+91 44 2829 3202"),
    ("TEAM-ROAD-01", "Anna Nagar Highway Rescue Unit", "Road Accident", 13.0860, 80.2100, "Anna Nagar West", "+91 44 2626 3301"),
    ("TEAM-FLOOD-01", "Adyar River Rescue Boat Team", "Flood", 13.0120, 80.2560, "Adyar Estuary Boat Club", "+91 44 2441 4401"),
    ("TEAM-COLL-01", "Velachery Urban Search & Rescue", "Building Collapse", 12.9890, 80.2230, "Velachery Fire & Rescue Post", "+91 44 2243 5501"),
    ("TEAM-RESC-01", "Tambaram Multi-Purpose Rescue", "Other Emergencies", 12.9250, 80.1180, "Tambaram Rescue Hub", "+91 44 2226 6601"),
]

# title, description, category, location, lat, lng, people, minutes_ago, stage, team
INCIDENTS = [
    ("Commercial complex fire, T. Nagar", "Fire spreading rapidly through a shopping complex on Usman Road; heavy smoke and people trapped on upper floors.",
     "Fire Emergency", "Usman Road, T. Nagar", 13.0418, 80.2341, 12, 18, "Reported", None),
    ("Residential building collapse, Velachery", "Old three-storey apartment collapsed; several residents trapped under rubble, children among them.",
     "Building Collapse", "Velachery Main Road", 12.9815, 80.2180, 14, 9, "Reported", None),
    ("Bus and car collision, Anna Nagar", "Multi-vehicle collision involving a bus and two cars at the roundtana; severe bleeding reported.",
     "Road Accident", "Anna Nagar Roundtana", 13.0850, 80.2150, 5, 6, "Reported", None),
    ("Cardiac arrest on Marina promenade", "Elderly man collapsed, unconscious and not breathing; bystanders are performing CPR.",
     "Medical Emergency", "Marina Beach Promenade", 13.0500, 80.2824, 1, 35, "In Progress", "TEAM-MED-01"),
    ("Adyar river overflow, low-lying homes", "River overflow flooding ground floors of dozens of homes; families stranded on rooftops.",
     "Flood", "Adyar Riverbank Colony", 13.0067, 80.2570, 40, 22, "Assigned", "TEAM-FLOOD-01"),
    ("Gas inhalation, Koyambedu market", "Several workers felt dizzy after a cooling-gas leak; situation contained and treated.",
     "Medical Emergency", "Koyambedu Market Complex", 13.0694, 80.1948, 3, 110, "Resolved", "TEAM-MED-02"),
]


def wipe(db: Session):
    db.execute(update(Incident).values(assigned_team_id=None))
    db.execute(update(EmergencyTeam).values(assigned_incident_id=None))
    db.execute(delete(StatusHistory))
    db.execute(delete(Incident))
    db.commit()


def seed_demo(db: Session, reset: bool = True) -> dict:
    if reset:
        wipe(db)
        db.execute(delete(EmergencyTeam))
        db.commit()
    for tid, name, cat, lat, lng, loc, phone in TEAMS:
        if not db.get(EmergencyTeam, tid):
            db.add(EmergencyTeam(id=tid, name=name, category=cat, latitude=lat, longitude=lng,
                                 current_location_name=loc, contact_number=phone, status="Available"))
    db.commit()

    now = datetime.now(timezone.utc)
    created = []
    for title, desc, cat, loc, lat, lng, ppl, ago, stage, team_id in INCIDENTS:
        _, level, reason = score_incident(cat, ppl, f"{title} {desc}")
        t0 = now - timedelta(minutes=ago)
        inc = Incident(title=title, description=desc, category=cat, location=loc, latitude=lat, longitude=lng,
                       people_affected=ppl, contact="+91 98400 %05d" % (10000 + len(created) * 137),
                       severity=level.value, severity_score=_, severity_reason=reason,
                       status="Reported", source="sim", created_at=t0)
        inc.history.append(StatusHistory(old_status=None, new_status="Reported", changed_by="Feed (seed)", timestamp=t0))
        if team_id:
            team = db.get(EmergencyTeam, team_id)
            dist = haversine_km(lat, lng, team.latitude, team.longitude)
            t_assign = t0 + timedelta(minutes=min(4, ago // 3 + 1))
            inc.assigned_team_id, inc.distance_km, inc.eta_minutes = team_id, round(dist, 2), eta_minutes(dist)
            inc.assigned_at, inc.status = t_assign, "Assigned"
            inc.history.append(StatusHistory(old_status="Reported", new_status="Assigned", changed_by="System Auto-Assign",
                                             timestamp=t_assign, note=f"{team_id} · {inc.distance_km} km · ETA {inc.eta_minutes} min"))
            if stage in ("In Progress", "Resolved"):
                t_prog = t_assign + timedelta(minutes=eta_minutes(dist) + 2)
                inc.status = "In Progress"
                inc.history.append(StatusHistory(old_status="Assigned", new_status="In Progress", changed_by="Dispatcher", timestamp=t_prog))
            if stage == "Resolved":
                t_res = t0 + timedelta(minutes=ago - 40)
                inc.status, inc.resolved_at = "Resolved", t_res
                inc.response_time_mins = round((t_res - t0).total_seconds() / 60, 1)
                inc.history.append(StatusHistory(old_status="In Progress", new_status="Resolved", changed_by="Dispatcher",
                                                 timestamp=t_res, note=f"Total response time {inc.response_time_mins:g} min"))
            else:
                team.status, team.assigned_incident_id = "Busy", None  # set below once incident has an id
        refresh_priority(inc, now)
        db.add(inc)
        db.flush()
        if team_id and stage != "Resolved":
            db.get(EmergencyTeam, team_id).assigned_incident_id = inc.id
        created.append(inc)
    db.commit()
    return {"incidents": len(INCIDENTS), "teams": len(TEAMS)}
