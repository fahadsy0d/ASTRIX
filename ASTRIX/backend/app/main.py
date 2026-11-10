from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.db import Base, engine, ensure_sqlite_schema
from app.routers import incidents, stats
from app.services.ws import hub
from app.plugins import load_plugins

# Ensure DB schema is ready at startup
Base.metadata.create_all(engine)
ensure_sqlite_schema()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    Base.metadata.create_all(engine)
    ensure_sqlite_schema()
    yield

app = FastAPI(
    title="Emergency Response & Disaster Management Platform",
    description="Centralized triage, explainable severity scoring, and live monitoring platform.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core Routers
app.include_router(incidents.router)
app.include_router(stats.router)

# Auto-load Round 2 modular plugins
load_plugins(app)

@app.get("/health", tags=["system"])
def health_check():
    return {"status": "ok", "service": "ASTRIX Emergency Platform"}

@app.websocket("/ws")
async def live_feed(socket: WebSocket):
    await hub.connect(socket)
    try:
        while True:
            # Keep socket alive and listen for optional ping/client events
            await socket.receive_text()
    except WebSocketDisconnect:
        hub.disconnect(socket)
