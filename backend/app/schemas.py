from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.constants import Category, Severity, Status

class IncidentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=3)
    category: Category
    location: str = Field(min_length=2, max_length=300)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    people_affected: int = Field(1, ge=0, le=100000)
    contact: str | None = Field(None, max_length=120)
    source: str = "web"

class IncidentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
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
    status: Status
    source: str
    assigned_to: str | None
    report_count: int        # Number of separate reporters who confirmed this incident
    created_at: datetime
    updated_at: datetime

class StatusUpdate(BaseModel):
    status: Status

class DispatchRequest(BaseModel):
    unit: str

class StatsOut(BaseModel):
    total: int
    critical: int
    reported: int
    pending: int
    in_progress: int
    resolved: int
    by_category: dict[str, int]
