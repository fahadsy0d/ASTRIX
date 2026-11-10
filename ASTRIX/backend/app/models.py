from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base

def now():
    return datetime.now(timezone.utc)

class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(40), index=True)
    location: Mapped[str] = mapped_column(String(300))
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    people_affected: Mapped[int] = mapped_column(Integer, default=1)
    contact: Mapped[str | None] = mapped_column(String(120), nullable=True)
    severity: Mapped[str] = mapped_column(String(10), index=True)
    severity_score: Mapped[float] = mapped_column(Float)
    severity_reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="Reported", index=True)
    source: Mapped[str] = mapped_column(String(20), default="web")   # web | voice | sim
    extra: Mapped[dict] = mapped_column(JSON, default=dict)          # Round 2 escape hatch
    assigned_to: Mapped[str | None] = mapped_column(String(80), nullable=True)
    # Duplicate corroboration: how many separate reporters confirmed this incident
    report_count: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

    history: Mapped[list["StatusHistory"]] = relationship(
        back_populates="incident", cascade="all, delete-orphan", order_by="StatusHistory.changed_at"
    )

class StatusHistory(Base):
    __tablename__ = "status_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(20))
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    incident: Mapped[Incident] = relationship(back_populates="history")
