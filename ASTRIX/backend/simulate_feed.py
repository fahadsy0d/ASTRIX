"""
simulate_feed.py
Live disaster/emergency feed simulator for ASTRIX demo.
Continuously seeds incidents into the backend to demonstrate real-time triage and map reactivity.
"""

import itertools
import random
import time
import requests
import sys

API_URL = "http://localhost:8000/api/v1/incidents"

SPOTS = [
    ("T. Nagar, Usman Road", 13.0418, 80.2341),
    ("Adyar Junction", 13.0067, 80.2570),
    ("Anna Nagar Tower", 13.0850, 80.2101),
    ("Velachery Main Road", 12.9815, 80.2180),
    ("Marina Beach Promenade", 13.0500, 80.2824),
    ("Tambaram Railway Outskirts", 12.9249, 80.1000),
    ("Guindy Industrial Park", 13.0067, 80.2206),
    ("Egmore Roundabout", 13.0732, 80.2609),
    ("Porur Lake Road", 13.0382, 80.1565),
    ("Koyambedu Wholesale Terminal", 13.0694, 80.1948),
]

EVENTS = [
    ("Fire Emergency", "Chemical store fire spreading rapidly with dark smoke, several workers trapped inside", 8),
    ("Road Accident", "Heavy container truck collided with city bus, multiple commuters bleeding", 6),
    ("Medical Emergency", "Elderly pedestrian suffered suspected cardiac arrest, unconscious on sidewalk", 1),
    ("Flood", "Severe subway water inundation, cars submerged up to hood, people standing on vehicles", 5),
    ("Building Collapse", "Old commercial facade crumbled onto busy street, pedestrians buried under rubble", 12),
    ("Other Emergencies", "Massive electrical transformer burst, power lines hanging low across road", 0),
    ("Fire Emergency", "Residential apartment 3rd floor blaze, families trapped on balcony screaming for rescue", 7),
    ("Road Accident", "Two-wheeler skid during sudden rainfall, rider unresponsive with head trauma", 1),
    ("Flood", "Canal overflow encroaching residential area, low-lying ground floors waterlogged", 15),
    ("Other Emergencies", "Large chemical cargo spillage causing toxic fumes and localized evacuation", 4),
]

def run_simulation():
    print(f"Connecting to ASTRIX Backend at {API_URL}...")
    
    # Check if backend is alive
    try:
        health = requests.get("http://localhost:8000/health", timeout=3)
        if health.status_code == 200:
            print("[Connected] Backend is running. Starting incident stream...")
    except Exception as e:
        print(f"[Warning] Backend health check failed: {e}. Will attempt streaming anyway...")

    for count in itertools.count(1):
        cat, desc, ppl = random.choice(EVENTS)
        area, lat, lng = random.choice(SPOTS)
        
        jittered_lat = round(lat + random.uniform(-0.005, 0.005), 5)
        jittered_lng = round(lng + random.uniform(-0.005, 0.005), 5)

        payload = {
            "title": f"{cat} near {area}",
            "description": desc,
            "category": cat,
            "location": area,
            "latitude": jittered_lat,
            "longitude": jittered_lng,
            "people_affected": ppl,
            "contact": f"+91 {random.randint(90000, 99999)} {random.randint(10000, 99999)}",
            "source": "sim",
        }

        try:
            res = requests.post(API_URL, json=payload, timeout=5)
            if res.status_code == 201:
                data = res.json()
                print(f"[{count:03d}] Ingested: #{data['id']} | {data['severity']} | {cat} @ {area} (Priority: {data['priority_score']})")
            else:
                print(f"[{count:03d}] Server response error {res.status_code}: {res.text}")
        except Exception as err:
            print(f"[{count:03d}] Failed to deliver incident: {err}")

        # Rapid seed for first 8 items, then realistic 4-second pace
        delay = 0.4 if count <= 8 else 4.5
        time.sleep(delay)

if __name__ == "__main__":
    try:
        run_simulation()
    except KeyboardInterrupt:
        print("\nFeed simulator halted by user.")
        sys.exit(0)
