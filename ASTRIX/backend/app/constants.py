from enum import Enum


class Category(str, Enum):
    FIRE = "Fire Emergency"
    ROAD = "Road Accident"
    MEDICAL = "Medical Emergency"
    FLOOD = "Flood"
    COLLAPSE = "Building Collapse"
    OTHER = "Other Emergencies"


class Severity(str, Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class Status(str, Enum):
    REPORTED = "Reported"
    ASSIGNED = "Assigned"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"


class TeamStatus(str, Enum):
    AVAILABLE = "Available"
    BUSY = "Busy"
    OFFLINE = "Offline"


# Strict, forward-only lifecycle: Reported -> Assigned -> In Progress -> Resolved
ALLOWED_TRANSITIONS = {
    "Reported": {"Assigned"},
    "Assigned": {"In Progress"},
    "In Progress": {"Resolved"},
    "Resolved": set(),
}

AVG_SPEED_KMH = 40.0
# Multi-purpose rescue units are registered under this category and are the
# fallback pool when no category-specific team is available.
FALLBACK_CATEGORY = Category.OTHER.value
