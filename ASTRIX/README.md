# 🚨 ASTRIX Emergency Command Center — Round 2
Code Clash 2026 · intelligent dispatch, live map routing and operational analytics (extends the Round 1 platform).

## Run it
**Backend** (Python 3.11+)
```bash
cd backend
python -m venv venv && source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000             # API docs: http://localhost:8000/docs
```
**Frontend** (Node 18+)
```bash
cd frontend
npm install
npm run dev                                           # http://localhost:5173
```
Click **Seed Demo Data** in the navbar (or `POST /api/v1/seed`) → 6 Chennai incidents + 8 response teams.
Optional: `python simulate_feed.py` streams live incidents. Tests: `cd backend && pytest`.
Config: `DATABASE_URL` (default SQLite `astrix_r2.db`, Postgres works), `VITE_API` (default `http://localhost:8000`).

## What's implemented
| Feature | Where |
|---|---|
| **Priority engine** `P = sev(40/25/15/5) + min(1.2·N, 30) + min(0.5·min_unassigned, 20) + 10 (Fire/Collapse)`, max 100, with `priority_breakdown` in every response; re-scored live on each list call | `services/priority.py` |
| **Team CRUD** + filters (`status`, `category` substring, `lat/lng/radius_km`); status auto-toggles Busy ↔ Available | `routers/teams.py` |
| **Nearest-team dispatch**: Available + same category (fallback: multi-purpose rescue), Haversine km, ETA = round(km/40·60), atomic single-commit assignment | `services/incidents.py`, `services/geo.py` |
| **Strict lifecycle** Reported → Assigned → In Progress → Resolved, invalid jumps return 409, every change writes `StatusHistory` + WebSocket event, response time recorded on Resolve | `services/incidents.py` |
| **Map**: pulsing severity markers, vehicle icons coloured by status, glowing dashed route with distance/ETA popup, Teams/Routes layer toggles | `MapView.tsx` |
| **Analytics**: 6 KPI cards, category donut, severity stacked bar, fleet-readiness bar | `AnalyticsPanel.tsx` |
| Round 1 kept: spatial duplicate merging (150 m), voice/web report page (`/report`), CSV export plugin | |

## API (`/api/v1`)
`GET/POST /incidents` · `GET /incidents/{id}` (team + history) · `PATCH /incidents/{id}/status` · `POST /incidents/{id}/auto-assign` · `POST /incidents/{id}/assign {team_id}` ·
`GET/POST /teams` · `GET/PATCH/DELETE /teams/{id}` · `GET /teams/{id}/nearest-incidents` · `GET /analytics/stats` · `POST /seed` · `WS /ws`

WebSocket events: `incident.created | updated | escalated | deleted | cleared`, `team.created | updated | deleted`, `seed.completed`.

## Design notes
- A `Reported → Assigned` PATCH is rejected unless a team is already attached; use `auto-assign`/`assign` to dispatch.
- The waiting-time term of the priority score stops growing once a team is assigned.
- Incident ids are now short UUID strings (Round 1 used integers); Round 1 databases are not reused (new file `astrix_r2.db`).
- Travel is a straight line at 40 km/h, as specified; road routing could replace it in `services/geo.py`.
