from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401  (register tables)
from app.core.db import Base, engine
from app.plugins import load_plugins
from app.routers import incidents, stats, teams
from app.services.ws import hub

Base.metadata.create_all(engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    yield


app = FastAPI(
    title="ASTRIX Emergency Command Center",
    description="Priority scoring, nearest-unit dispatch, lifecycle tracking and live operational analytics.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # demo setup; restrict to the frontend origin in production
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(incidents.router)
app.include_router(teams.router)
app.include_router(stats.router)
load_plugins(app)  # Round 1 plugin system (CSV export etc.)


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "service": "ASTRIX Emergency Platform", "version": "2.0.0"}


@app.websocket("/ws")
async def live_feed(socket: WebSocket):
    await hub.connect(socket)
    try:
        while True:
            await socket.receive_text()  # keep-alive pings from the client
    except WebSocketDisconnect:
        hub.disconnect(socket)
