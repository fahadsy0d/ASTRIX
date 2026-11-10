# 🚨 ASTRIX - Emergency Response & Disaster Management Platform
### *Code Clash 2026 · Round 1 Platform & Extensible Architecture*

> 📖 **Full System Documentation & Defense Guide:** See [**`PROJECT_OVERVIEW.md`**](file:///C:/Dev/ASTRIX/PROJECT_OVERVIEW.md) for complete architecture diagrams, severity engine mathematics, responder dispatch details, and judge Q&A strategies.

A centralized emergency triage and monitoring platform that ingests citizen reports across multiple channels (Web Form, Voice-to-Incident, Native Smartphone SOS via Expo, and Simulated Live Telemetry), scores incident severity using an explainable deterministic heuristics engine, and broadcasts real-time updates to first-responder dispatchers over WebSockets.

---

## ⚡ Quick Start Guide (Run the Website)

### Prerequisites
- **Python**: 3.10+ (tested on Python 3.13)
- **Node.js**: v18+ (tested on Node v24) & npm

---

### Step 1: Start the Backend (Terminal 1)

```bash
# Navigate to the backend directory
cd backend

# (Optional but recommended) Create and activate a virtual environment:
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Launch FastAPI with auto-reload (bind to 0.0.0.0 so your phone can reach it)
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
> The API will be live at `http://localhost:8000` (and `http://<YOUR_LOCAL_IP>:8000` for mobile devices).  
> Interactive OpenAPI / Swagger documentation is available at `http://localhost:8000/docs`

---

### Step 2: Start the Frontend Dispatcher Dashboard (Terminal 2)

```bash
# Open a new terminal and navigate to the frontend directory
cd frontend

# Install dependencies (already completed)
npm install

# Start Vite development server
npm run dev
```
> The application UI will be available at:
> - **Dispatcher Command Center**: [http://localhost:5173/](http://localhost:5173/)
> - **Web Citizen SOS Portal**: [http://localhost:5173/report](http://localhost:5173/report)

---

### Step 3: Run the Expo Mobile App on Your Phone (Terminal 3)

For the **mobile citizen reporting experience** accessed via your physical smartphone:

```bash
# Open a terminal and navigate to mobile
cd mobile

# Start Expo development server
npx expo start
```

1. Install the free **Expo Go** app on your phone ([Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) or [Apple App Store](https://apps.apple.com/app/expo-go/id982107442)).
2. Ensure your phone is connected to the **same Wi-Fi network** as your laptop.
3. Open Expo Go and scan the QR code displayed in your terminal.
4. The mobile app connects to `http://172.20.218.135:8000` (or tap the **Configure** badge in the app header to adjust the IP anytime).
5. Submit an SOS report from your phone—watch it instantly appear on your laptop's live GIS map and KPI dashboard via WebSockets!

---

### Step 4: Run the Live Incident Feed Simulator (Terminal 4 / Optional)

To demonstrate real-time triage without manually filling forms:

```bash
cd backend
python simulate_feed.py
```
> This streams realistic multi-casualty incidents across Chennai directly into the system. Watch the map markers pulse and the KPI dashboard update in real time via WebSockets!
> 
> *Tip: You can also click the in-app **"⚡ Seed Feed"** button in the dashboard header to inject 5 incidents with one click.*

---

## 🎯 Round 1 Deliverables & Feature Checklist

| Requirement | Implementation in ASTRIX | Status |
| :--- | :--- | :---: |
| **Emergency Reporting** | Citizen SOS portal (`/report`) capturing Title, Description, Category, Location, Casualties, and Contact. Includes Web Speech voice input. | ✅ Complete |
| **6 Required Categories** | `Fire Emergency`, `Road Accident`, `Medical Emergency`, `Flood`, `Building Collapse`, `Other Emergencies`. | ✅ Complete |
| **Severity Scoring Engine** | Transparent, unit-testable scoring model combining category weights, casualty multipliers, and emergency keyword detection. Returns `Low`, `Medium`, `High`, or `Critical` with explainable rationale. | ✅ Complete |
| **Emergency Dashboard** | Real-time counts for Total, Critical, Reported, Pending, In Progress, Resolved, and per-category incident breakdowns. | ✅ Complete |
| **Incident Management** | Interactive GIS Leaflet map, detail inspection drawer, safe status transitions, and duplicate/test incident deletion. | ✅ Complete |
| **UI/UX & Highlighting** | Responsive dark-mode dashboard with pulsing beacons on active Critical emergencies (`pulse-critical`) and shimmer skeletons. | ✅ Complete |

---

## 🏗️ Project Architecture

```
c:\Dev\ASTRIX\
├── backend/
│   ├── requirements.txt
│   ├── simulate_feed.py         # Autonomous Chennai incident generator
│   └── app/
│       ├── main.py              # Application lifecycle, CORS, WS, & plugin loader
│       ├── constants.py         # Category, Severity, Status Enums & allowed transitions
│       ├── models.py            # SQLAlchemy 2.0 Incident & StatusHistory models
│       ├── schemas.py           # Pydantic v2 schemas
│       ├── core/
│       │   └── db.py            # SQLite WAL / PostgreSQL engine & session factory
│       ├── services/
│       │   ├── severity.py      # Explainable rule-based severity scoring engine
│       │   ├── incidents.py     # Incident lifecycle, seeders, and KPI stats
│       │   └── ws.py            # WebSocket broadcast hub
│       ├── routers/
│       │   ├── incidents.py     # REST endpoints for CRUD + seed
│       │   └── stats.py         # REST endpoint for aggregated metrics
│       └── plugins/             # Round 2 auto-loader (mounts routers/hooks)
│           ├── __init__.py      # Dynamic module discovery
│           └── export_csv.py    # Live CSV triage log export
│
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── src/
    │   ├── main.tsx             # React DOM root & React Query provider
    │   ├── App.tsx              # URL path routing ("/" for admin, "/report" for citizen)
    │   ├── index.css            # Tailwind directives & beacon pulse animations
    │   ├── lib/
    │   │   ├── types.ts         # TypeScript definitions
    │   │   ├── constants.ts     # Category emojis, colors, and coordinates
    │   │   └── api.ts           # Typed API client and WebSocket URL
    │   ├── hooks/
    │   │   └── useLive.ts       # Real-time WebSocket hook with query invalidation & audio chime
    │   ├── features/
    │   │   ├── dashboard/
    │   │   │   ├── Dashboard.tsx    # Live Dispatcher Command Center
    │   │   │   ├── IncidentMap.tsx  # React-Leaflet GIS map with fly-to
    │   │   │   └── Shimmer.tsx      # Skeleton loader
    │   │   └── report/
    │   │       └── ReportPage.tsx   # Citizen Voice + Structured Form SOS page
    │   └── extensions/          # Drop-in UI components for Round 2 side-quests
│
└── mobile/                  # Native Expo Smartphone SOS Application
    ├── package.json         # Expo SDK 58, React Native 0.88
    ├── app.json             # Mobile app metadata (ASTRIX Emergency SOS)
    └── App.tsx              # Native mobile reporting UI with quick presets & IP config
```

---

## 🛡️ Round 2 Extensibility (Plugin System)

When Round 2 introduces new requirements (e.g. Responder Dispatch, JWT Authentication, or Analytics Heatmaps):

1. **Backend**: Drop a new `.py` file into `backend/app/plugins/` (e.g., `responders.py`). It will be automatically discovered on startup and mounted onto the FastAPI app without modifying `main.py`.
2. **Database**: Extra JSON data can be stored immediately in `Incident.extra` or `Incident.assigned_to`.
3. **Frontend**: Drop extension widgets into `frontend/src/extensions/` and import them directly into the Dashboard drawer.
