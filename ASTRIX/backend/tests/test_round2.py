import os, tempfile

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/test.db"

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.geo import eta_minutes, haversine_km
from app.services.priority import compute_priority
from datetime import datetime, timedelta, timezone


@pytest.fixture()
def c():
    with TestClient(app) as client:
        client.post("/api/v1/seed")
        yield client


def test_haversine_and_eta():
    # Chennai Central -> T. Nagar is roughly 6-7 km
    d = haversine_km(13.0827, 80.2757, 13.0418, 80.2341)
    assert 5.5 < d < 7.5
    assert eta_minutes(40) == 60 and eta_minutes(10) == 15


def test_priority_formula_bounds():
    now = datetime.now(timezone.utc)
    s, b = compute_priority("Critical", 100, "Fire Emergency", now - timedelta(minutes=600), None, now)
    assert s == 100 and len(b["components"]) == 4
    s, _ = compute_priority("Low", 0, "Flood", now, None, now)
    assert s == 5
    s, _ = compute_priority("High", 10, "Fire Emergency", now - timedelta(minutes=10), None, now)
    assert s == 25 + 12 + 5 + 10


def test_seed_and_listing_order(c):
    r = c.get("/api/v1/incidents").json()
    assert len(r) == 6
    scores = [i["priority_score"] for i in r]
    assert scores == sorted(scores, reverse=True)
    assert all(i["priority_breakdown"]["summary"] for i in r)
    assert len(c.get("/api/v1/teams").json()) == 8
    assert len(c.get("/api/v1/teams?status=Available&category=Fire").json()) == 2


def test_lifecycle_and_autoassign(c):
    inc = next(i for i in c.get("/api/v1/incidents?status=Reported").json() if i["category"] == "Fire Emergency")
    # cannot skip states
    assert c.patch(f"/api/v1/incidents/{inc['id']}/status", json={"status": "Resolved"}).status_code == 409
    assert c.patch(f"/api/v1/incidents/{inc['id']}/status", json={"status": "Assigned"}).status_code == 409
    r = c.post(f"/api/v1/incidents/{inc['id']}/auto-assign")
    assert r.status_code == 200, r.text
    a = r.json()
    assert a["incident"]["status"] == "Assigned" and a["team"]["status"] == "Busy"
    assert a["team"]["category"] == "Fire Emergency" and a["eta_minutes"] == round(a["distance_km"] / 40 * 60)
    # same team can't be taken twice, second fire goes to the other unit
    assert c.post(f"/api/v1/incidents/{inc['id']}/auto-assign").status_code == 409
    assert c.patch(f"/api/v1/incidents/{inc['id']}/status", json={"status": "In Progress"}).status_code == 200
    r = c.patch(f"/api/v1/incidents/{inc['id']}/status", json={"status": "Resolved"})
    assert r.status_code == 200 and r.json()["response_time_mins"] >= 18
    team = c.get(f"/api/v1/teams/{a['team']['id']}").json()
    assert team["status"] == "Available" and team["assigned_incident_id"] is None
    d = c.get(f"/api/v1/incidents/{inc['id']}").json()
    assert [h["new_status"] for h in d["history"]] == ["Reported", "Assigned", "In Progress", "Resolved"]


def test_fallback_to_multipurpose(c):
    # Only one flood boat and it is already busy in the seed -> falls back to the rescue team
    flood = c.post("/api/v1/incidents", json={
        "title": "Flash flood at subway", "description": "Water rising fast", "category": "Flood",
        "location": "Tambaram", "latitude": 12.93, "longitude": 80.11, "people_affected": 4}).json()
    r = c.post(f"/api/v1/incidents/{flood['id']}/auto-assign")
    assert r.status_code == 200 and r.json()["team"]["id"] == "TEAM-RESC-01"


def test_team_crud_and_nearest(c):
    r = c.post("/api/v1/teams", json={"name": "Test Fire", "category": "Fire Emergency", "latitude": 13.04, "longitude": 80.23})
    assert r.status_code == 201 and r.json()["id"] == "TEAM-FIRE-03"
    assert c.patch("/api/v1/teams/TEAM-FIRE-03", json={"status": "Offline"}).json()["status"] == "Offline"
    assert c.patch("/api/v1/teams/TEAM-FIRE-03", json={"status": "Busy"}).status_code == 409
    n = c.get("/api/v1/teams/TEAM-FIRE-01/nearest-incidents?radius_km=30").json()
    assert n and n[0]["incident"]["priority_score"] >= n[-1]["incident"]["priority_score"]
    assert c.delete("/api/v1/teams/TEAM-FIRE-03").status_code == 204
    near = c.get("/api/v1/teams?lat=13.04&lng=80.23&radius_km=3").json()
    assert all(t["distance_km"] <= 3 for t in near)


def test_stats_and_dedup(c):
    s = c.get("/api/v1/analytics/stats").json()
    assert s["total_incidents"] == 6 and s["total_resolved"] == 1 and s["busy_teams"] == 2
    assert s["available_teams"] == 6 and s["fleet_readiness_pct"] == 75.0
    assert s["avg_dispatch_to_resolution_mins"] is not None
    dup = {"title": "Fire again", "description": "another caller", "category": "Fire Emergency",
           "location": "Usman Rd", "latitude": 13.0419, "longitude": 80.2342, "people_affected": 30}
    r = c.post("/api/v1/incidents", json=dup).json()
    assert r["report_count"] == 2 and c.get("/api/v1/analytics/stats").json()["total_incidents"] == 6


def test_delete_busy_incident_frees_team(c):
    busy = c.get("/api/v1/incidents?status=Assigned").json()[0]
    assert c.delete(f"/api/v1/incidents/{busy['id']}").status_code == 204
    assert c.get(f"/api/v1/teams/{busy['assigned_team_id']}").json()["status"] == "Available"


def test_csv_plugin(c):
    r = c.get("/api/v1/export/incidents.csv")
    assert r.status_code == 200 and "priority_score" in r.text.splitlines()[0]
