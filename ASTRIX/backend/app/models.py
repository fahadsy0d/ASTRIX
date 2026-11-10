import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def now() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return uuid.uuid4().hex[:12].upper()


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(40), index=True)
    location: Mapped[str] = mapped_column(String(300))
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    people_affected: Mapped[int] = mapped_column(Integer, default=1)
    contact: Mapped[str | None] = mapped_column(String(120), nullable=True)
    severity: Mapped[str] = mapped_column(String(10), index=True)
    # Round 1 keyword-triage output (kept: it decides the severity label)
    severity_score: Mapped[float] = mapped_column(Float, default=0.0)
    severity_reason: Mapped[str] = mapped_column(Text, default="")
    # Round 2 explainable priority score in [0, 100]
    priority_score: Mapped[float] = mapped_column(Float, default=0.0, index=True)
    status: Mapped[str] = mapped_column(String(20), default="Reported", index=True)
    source: Mapped[str] = mapped_column(String(20), default="web")
    report_count: Mapped[int] = mapped_column(Integer, default=1)
    extra: Mapped[dict] = mapped_column(JSON, default=dict)

    assigned_team_id: Mapped[str | None] = mapped_column(
        ForeignKey("teams.id", use_alter=True, name="fk_incident_team"), nullable=True
    )
    distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    eta_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    response_time_mins: Mapped[float | None] = mapped_column(Float, nullable=True)

    assigned_team: Mapped["EmergencyTeam | None"] = relationship(
        "EmergencyTeam", foreign_keys=[assigned_team_id], lazy="joined"
    )
    history: Mapped[list["StatusHistory"]] = relationship(
        back_populates="incident", cascade="all, delete-orphan", order_by="StatusHistory.id"
    )


class EmergencyTeam(Base):
    __tablename__ = "teams"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(40), index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    current_location_name: Mapped[str] = mapped_column(String(200), default="")
    status: Mapped[str] = mapped_column(String(12), default="Available", index=True)
    contact_number: Mapped[str] = mapped_column(String(40), default="")
    assigned_incident_id: Mapped[str | None] = mapped_column(
        ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class StatusHistory(Base):
    __tablename__ = "status_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    incident_id: Mapped[str] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"), index=True)
    old_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    new_status: Mapped[str] = mapped_column(String(20))
    changed_by: Mapped[str] = mapped_column(String(60), default="Dispatcher")
    note: Mapped[str | None] = mapped_column(String(300), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    incident: Mapped[Incident] = relationship(back_populates="history")
