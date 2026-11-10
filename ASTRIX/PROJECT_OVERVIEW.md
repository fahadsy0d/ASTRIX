# 🚨 ASTRIX - Emergency Response & Disaster Management Platform
### *Complete Technical Documentation, Architecture Specification & Hackathon Defense Guide*
**Event:** Code Clash 2026 · Hackathon Brief (Round 1 & Progressive Stage Architecture)  
**Workspace:** `C:\Dev\ASTRIX`

---

## 📑 Table of Contents
1. [Executive Summary & Problem Statement Alignment](#1-executive-summary--problem-statement-alignment)
2. [Full System Architecture Diagram](#2-full-system-architecture-diagram)
3. [Intelligent Triage & Explainable Severity Engine](#3-intelligent-triage--explainable-severity-engine)
4. [Smart First Responder Dispatch System (New Feature)](#4-smart-first-responder-dispatch-system)
5. [Frontend Command Center & GIS Radar Map](#5-frontend-command-center--gis-radar-map)
6. [Native Mobile Expo SOS App (Smartphone Access)](#6-native-mobile-expo-sos-app)
7. [Autonomous Live Feed Simulator](#7-autonomous-live-feed-simulator)
8. [Round 2 Modular Plugin Extensibility](#8-round-2-modular-plugin-extensibility)
9. [Step-by-Step Running Guide (All Platforms)](#9-step-by-step-running-guide)
10. [Hackathon Judge Q&A Defense Strategy](#10-hackathon-judge-qa-defense-strategy)

---

## 1. Executive Summary & Problem Statement Alignment

The **Code Clash 2026 Challenge Brief** requires building a centralized platform to solve coordination bottlenecks in disaster situations (road accidents, building collapses, fires, floods, medical crises). The brief specifies:
- Ingestion of emergency reports from multiple channels.
- Support for 6 exact categories: `Fire Emergency`, `Road Accident`, `Medical Emergency`, `Flood`, `Building Collapse`, `Other Emergencies`.
- Automated severity classification (`Low`, `Medium`, `High`, `Critical`).
- Centralized administrator dashboard tracking KPIs and displaying incident status.
- Incident management: detail inspection, status updates (`Reported`, `Pending`, `In Progress`, `Resolved`), and deletion of test/duplicate records.
- Future-proof design for progressive competition stages.

### How ASTRIX Complies:
| Required Feature | Code Clash Specification | ASTRIX Implementation | Status |
| :--- | :--- | :--- | :---: |
| **Emergency Reporting** | Capture Title, Description, Category, Location, Casualties, and Contact | Native Expo smartphone app, Web Voice SOS, and Web Form | **100% Met** |
| **6 Mandatory Categories** | Fire, Road, Medical, Flood, Collapse, Other | Exact string enums across Backend, Frontend, and Mobile | **Exact Match** |
| **Severity Classification** | Logical classification using report data | Explainable, unit-testable mathematical scoring engine (0 to 10+) | **Exceeds Brief** |
| **Emergency Dashboard** | Total, Critical, Pending, Resolved, and Category counts | Real-time KPI tiles with WebSocket reactivity | **100% Met** |
| **Incident Management** | View details, update statuses, delete test reports | Interactive GIS map, detail drawer, safe transitions, and trash action | **100% Met** |
| **Unit Dispatching** | Assign specific responder units to incidents | **Smart Category Action Buttons** (Fire Truck, ALS Ambulance, NDRF Boat, etc.) | **New Feature** |
| **Progressive Extensibility** | Prepare for Round 2 side-quests | Dynamic plugin loader (`app/plugins/`) & UI extension slots | **Round 2 Ready** |

---

## 2. Full System Architecture Diagram

```mermaid
flowchart TD
    subgraph INGESTION["Multi-Source Ingestion Channels"]
        M1["📱 Physical Phone (Expo Go Mobile SOS)"]
        W1["💻 Web Voice-to-Incident & Form (/report)"]
        S1["⚡ Autonomous Feed Simulator (simulate_feed.py)"]
    end

    subgraph BACKEND["FastAPI Triage Core (Port 8000)"]
        API["FastAPI REST & WebSocket Server"]
        SEV["⚙️ Explainable Severity Scoring Engine"]
        DB[("SQLite WAL / PostgreSQL (emergency.db)")]
        HUB["📡 WebSocket Event Hub"]
        DISP["🚨 Unit Dispatch Controller"]
        PLUG["🧩 Dynamic Plugin Loader (Round 2)"]
    end

    subgraph DISPATCH_CENTER["Dispatcher Command Center (Port 5173)"]
        DASH["React 18 + Vite + Tailwind Dashboard"]
        MAP["🗺️ Leaflet GIS Map with Pulsing Beacons"]
        KPI["📊 Live KPI Analytics Tiles"]
        ACTION["🚒 Category-Specific Dispatch Action Buttons"]
    end

    M1 -->|HTTP POST JSON| API
    W1 -->|HTTP POST JSON| API
    S1 -->|High-Frequency Stream| API

    API --> SEV
    SEV -->|Score + Reason| DB
    API --> HUB

    HUB -.->|Real-time Events| DASH
    HUB -.->|Map Marker Updates| MAP
    HUB -.->|Triage Alerts & Chimes| KPI

    ACTION -->|POST /dispatch (Assign Unit)| DISP
    DISP --> DB
    DISP --> HUB
    PLUG --> API
```

---

## 3. Intelligent Triage & Explainable Severity Engine

Located at [`backend/app/services/severity.py`](file:///C:/Dev/ASTRIX/backend/app/services/severity.py).

In high-stress emergency response, dispatch decisions cannot rely on black-box heuristics or slow LLMs. ASTRIX employs a **deterministic, sub-millisecond, and 100% auditable scoring engine**:

$$\text{Final Score} = \text{Base Weight} + \text{Casualty Points} + \text{Hazard Keyword Hits} - \text{Mitigating Factors}$$

### Scoring Matrix:
1. **Category Base Weight:**
   - `Building Collapse`: **4.0**
   - `Fire Emergency`: **3.0**
   - `Medical Emergency`: **3.0**
   - `Flood`: **2.5**
   - `Road Accident`: **2.5**
   - `Other Emergencies`: **1.0**

2. **Casualties / People Affected:**
   - $\ge 21$ people: **+3.0**
   - $6 - 20$ people: **+2.0**
   - $2 - 5$ people: **+1.0**
   - $0 - 1$ people: **+0.0**

3. **High-Risk Critical Keywords:**
   - Detects regex boundary terms: `trapped`, `explosion`, `unconscious`, `not breathing`, `bleeding`, `collapsed`, `children`, `gas leak`, `drowning`, `spreading`, `fatal`, `dead`, `heart attack`, `suffocating`, `severe`, `burning`.
   - Adds **+2.0** per hit (capped at +4.0).

4. **Mitigating Factors:**
   - `minor`, `small`, `no injuries`, `under control`, `no one hurt`, `safe`.
   - Subtracts **-1.5** (minimum score floor is 1.0).

5. **Severity Classification Buckets:**
   - $\text{Score} < 3.0 \implies$ **Low** (Green)
   - $3.0 \le \text{Score} < 5.0 \implies$ **Medium** (Yellow)
   - $5.0 \le \text{Score} < 7.5 \implies$ **High** (Orange)
   - $\text{Score} \ge 7.5 \implies$ **Critical** (Red, audio beacon triggered)

### Transparent Rationale Output:
Every incident records a human-readable justification for post-incident audits:
> *Example:* `"Building Collapse base 4.0; 14 casualties/affected (+2); risk keywords [trapped] (+2)"` $\implies$ **Score: 8.0 (CRITICAL)**.

---

## 4. Smart First Responder Dispatch System

Located in `routers/incidents.py` and `features/dashboard/Dashboard.tsx`.

When dispatchers inspect an incident, the platform dynamically generates **context-aware emergency unit buttons tailored to the report's category**:

| Incident Category | Context-Aware Responder Units | Primary Operational Objective |
| :--- | :--- | :--- |
| 🔥 **Fire Emergency** | • 🚒 **Fire Tender (Water / Foam)**<br>• 🪜 **High-Rise Hydraulic Ladder**<br>• ☣️ **Chemical Hazmat Foam Squad** | Fire suppression, window/balcony rescue, toxic containment. |
| 🚗 **Road Accident** | • 🚑 **Trauma Ambulance (ALS)**<br>• 🚓 **Highway Police Patrol**<br>• 🚜 **Heavy Tow & Extrication Crane** | Patient stabilization, traffic cordon, wreckage clearance. |
| 🚑 **Medical Emergency** | • 🚑 **Advanced Life Support Ambulance**<br>• 🏍️ **Paramedic First Responder Bike**<br>• 🚐 **Mobile Critical Care Van** | Rapid on-scene CPR, ICU transit, mobile triage. |
| 🌊 **Flood** | • 🚤 **NDRF Motorized Inflatable Boat**<br>• 🚚 **High-Clearance Evacuation Truck**<br>• 📦 **Emergency Food & Lifeline Drop** | Water rescue, citizen evacuation, aerial relief delivery. |
| 🏢 **Building Collapse** | • 🏗️ **USAR Heavy Excavator & Crane**<br>• 🐕 **K9 Search & Scent Dogs**<br>• 👷 **Structural Shoring Taskforce** | Rubble excavation, victim location, void stabilization. |
| ⚠️ **Other Emergencies** | • 🚓 **Rapid Response Police Squad**<br>• 🛡️ **Disaster Management Quick Team**<br>• 🛠️ **Civic Utility & Cable Repair Crew** | Law enforcement, area perimeter, power/gas line repair. |

### Operational Workflow:
1. Dispatcher clicks any unit button (e.g. `🚒 Fire Tender (Water / Foam)`).
2. The client transmits `POST /api/v1/incidents/{id}/dispatch` with `{ unit: "..." }`.
3. The backend saves `assigned_to = unit`, automatically promotes status from `Reported` to `In Progress`, and broadcasts an `incident.updated` event.
4. The dashboard immediately updates the marker, displays the active unit badge, and reflects the assignment across mobile and web clients in real time.

---

## 5. Frontend Command Center & GIS Radar Map

Located in `frontend/src/features/dashboard/`.

- **Live Radar Map:** Powered by React-Leaflet with OpenStreetMap tiles. Renders color-coded circle markers by severity. Critical emergencies pulse continuously with CSS radar rings (`pulse-critical`).
- **Interactive Fly-To:** Clicking an incident in the list smoothly pans and zooms the camera directly to the coordinates.
- **Audio Chime:** Incoming critical incidents trigger an audio beacon via Web Audio API.
- **Safe State Transitions:** Enforces state machine rules:
  $$\text{Reported} \longrightarrow \text{Pending} \mid \text{In Progress} \mid \text{Resolved}$$
  $$\text{Pending} \longrightarrow \text{In Progress} \mid \text{Resolved}$$
  $$\text{In Progress} \longrightarrow \text{Resolved} \mid \text{Pending}$$
  $$\text{Resolved} \longrightarrow \text{In Progress}$$
  Buttons for invalid transitions are automatically disabled, preventing 409 conflict errors during live demos.
- **In-App Quick Seeder:** Includes a **"⚡ Seed Feed"** button in the header that injects 5 realistic incidents on demand.
- **CSV Export:** Includes an **"📥 CSV"** button in the header connecting to the live CSV export plugin.

---

## 6. Native Mobile Expo SOS App (Smartphone Access)

Located in `mobile/App.tsx`.

Built with **Expo SDK 58** and **React Native 0.88**:
- **Real Phone Access:** Scan the QR code in **Expo Go** on Android or iOS.
- **Automatic Host Detection:** Defaults to your PC's local Wi-Fi IP (`http://172.20.218.135:8000`), with an in-app **Configure** modal to adjust IPs without modifying code.
- **One-Tap Emergency Shortcuts:** Preset scenarios (Fire, Car Crash, Cardiac Arrest) for rapid demoing.
- **Instant Triage Feedback:** Submitting a report immediately displays the calculated severity level, score, and reasoning returned from the backend triage engine.

---

## 7. Autonomous Live Feed Simulator

Located in `backend/simulate_feed.py`.

- Ingests real-world Chennai landmark coordinates (T. Nagar, Adyar, Anna Nagar, Marina Beach, Guindy, Porur, Egmore, Tambaram).
- Jitters coordinates realistically ($\pm 0.005^{\circ}$).
- Seeds the first 8 incidents rapidly, then paces at 4.5 seconds per incident to showcase live WebSocket streaming and map reactivity.

---

## 8. Round 2 Modular Plugin Extensibility

Located in `backend/app/plugins/`.

The brief notes that participants will progressively extend the application in later rounds. ASTRIX implements a dynamic plugin architecture:
- Any Python script added to `backend/app/plugins/` (e.g. `responders.py` or `auth.py`) is auto-discovered and mounted at startup.
- `Incident.extra` (`JSON`) and `Incident.assigned_to` (`String`) provide zero-migration storage for custom attributes.
- Example included: `export_csv.py` streaming real-time triage data to Excel/CSV.

---

## 9. Step-by-Step Running Guide

### Terminal 1: Backend
```powershell
cd C:\Dev\ASTRIX\backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
*API running at `http://localhost:8000` (Docs at `/docs`)*

### Terminal 2: Web Command Center
```powershell
cd C:\Dev\ASTRIX\frontend
npm run dev
```
*Web dashboard running at `http://localhost:5173`*

### Terminal 3: Mobile Phone Expo App
```powershell
cd C:\Dev\ASTRIX\mobile
npx expo start
```
*Scan the QR code with the **Expo Go** app on your smartphone.*

### Terminal 4 (Optional): Background Feed Streamer
```powershell
cd C:\Dev\ASTRIX\backend
python simulate_feed.py
```

---

## 10. Hackathon Judge Q&A Defense Strategy

| Common Judge Question | Defensible Answer |
| :--- | :--- |
| **"Why did you eliminate the ESP32 hardware?"** | *"Physical hardware introduces single points of failure (flaky Wi-Fi chips, serial driver mismatches, and battery drain). By transitioning to a native mobile app (Expo Go) with WebSockets, we provide real-world smartphone SOS telemetry with zero hardware fragility."* |
| **"Why a rule-based severity algorithm instead of an LLM?"** | *"In life-and-death disaster dispatch, decisions must be **deterministic, sub-millisecond, and 100% auditable**. LLMs introduce latency (2-5s), hallucination risks, and API rate limits. Our mathematical engine executes in under 1ms and produces a human-readable breakdown for every score."* |
| **"How does the dispatcher know what units to send?"** | *"We built an automated triage-to-unit matcher. When an incident is flagged as Fire, dispatchers are presented with Fire Tenders and Hazmat Squads; when it's a Flood, NDRF Rescue Boats and High-Clearance Trucks appear. One click dispatches the unit and promotes the status to In Progress."* |
| **"How is this prepared for Round 2?"** | *"Our plugin auto-loader (`app/plugins/`) discovers and mounts new routers and hooks on boot without editing `main.py`. The database schema already includes `extra` JSON and `assigned_to` fields, enabling instantaneous feature additions."* |
