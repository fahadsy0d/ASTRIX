from datetime import datetime, timezone
from typing import Annotated, Any

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, model_validator

from app.constants import Category, Severity, Status, TeamStatus


def _utc(v: Any):
    if isinstance(v, datetime) and v.tzinfo is None:
        return v.replace(tzinfo=timezone.utc)
    return v


UtcDT = Annotated[datetime, BeforeValidator(_utc)]


# ── Teams ────────────────────────────────────────────────────────────────────
class TeamCreate(BaseModel):
    id: str | None = Field(None, max_length=40, description="e.g. TEAM-FIRE-01 (auto-generated if omitted)")
    name: str = Field(min_length=2, max_length=120)
    category: Category
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    current_location_name: str = Field("", max_length=200)
    status: TeamStatus = TeamStatus.AVAILABLE
    contact_number: str = Field("", max_length=40)


class TeamUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=120)
    category: Category | None = None
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    current_location_name: str | None = Field(None, max_length=200)
    status: TeamStatus | None = None
    contact_number: str | None = Field(None, max_length=40)


class TeamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    category: str
    latitude: float
    longitude: float
    current_location_name: str
    status: TeamStatus
    contact_number: str
    assigned_incident_id: str | None
    created_at: UtcDT
    updated_at: UtcDT
    distance_km: float | None = None  # only filled for radius queries


# ── Incidents ────────────────────────────────────────────────────────────────
class IncidentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=3)
    category: Category
    location: str = Field(min_length=2, max_length=300)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    people_affected: int = Field(1, ge=0, le=100000)
    severity: Severity | None = Field(None, description="Optional override; otherwise auto-triaged")
    contact: str | None = Field(None, max_length=120)
    source: str = "web"


class StatusUpdate(BaseModel):
    status: Status
    changed_by: str = "Dispatcher"


class AssignRequest(BaseModel):
    team_id: str


class HistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    old_status: str | None
    new_status: str
    changed_by: str
    note: str | None
    timestamp: UtcDT


class IncidentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str
    category: str
    location: str
    latitude: float | None
    longitude: float | None
    people_affected: int
    contact: str | None
    severity: Severity
    severity_score: float
    severity_reason: str
    priority_score: float
    priority_breakdown: dict | None = None
    status: Status
    source: str
    report_count: int
    assigned_team_id: str | None
    assigned_team: TeamOut | None = None
    distance_km: float | None
    eta_minutes: int | None
    created_at: UtcDT
    updated_at: UtcDT
    assigned_at: UtcDT | None
    resolved_at: UtcDT | None
    response_time_mins: float | None

    @model_validator(mode="before")
    @classmethod
    def _lift_breakdown(cls, obj):
        if hasattr(obj, "extra"):
            data = {k: getattr(obj, k, None) for k in cls.model_fields if k != "priority_breakdown"}
            data["priority_breakdown"] = (obj.extra or {}).get("priority_breakdown")
            return data
        return obj


class IncidentDetail(IncidentOut):
    history: list[HistoryOut] = []

    @model_validator(mode="before")
    @classmethod
    def _lift_with_history(cls, obj):
        if hasattr(obj, "extra"):
            data = {k: getattr(obj, k, None) for k in cls.model_fields if k not in ("priority_breakdown", "history")}
            data["priority_breakdown"] = (obj.extra or {}).get("priority_breakdown")
            data["history"] = list(obj.history)
            return data
        return obj


class AssignmentOut(BaseModel):
    incident: IncidentOut
    team: TeamOut
    distance_km: float
    eta_minutes: int


class NearestIncidentOut(BaseModel):
    incident: IncidentOut
    distance_km: float
    eta_minutes: int
    category_match: bool
