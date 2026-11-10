from enum import Enum

class Category(str, Enum):
    FIRE = "Fire Emergency"
    ROAD = "Road Accident"
    MEDICAL = "Medical Emergency"
    FLOOD = "Flood"
    COLLAPSE = "Building Collapse"
    OTHER = "Other Emergencies"

class Severity(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class Status(str, Enum):
    REPORTED = "Reported"
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"

ALLOWED_TRANSITIONS = {
    "Reported": {"Pending", "In Progress", "Resolved"},
    "Pending": {"In Progress", "Resolved"},
    "In Progress": {"Resolved", "Pending"},
    "Resolved": {"In Progress"},
}
