import math

from app.constants import AVG_SPEED_KMH

EARTH_RADIUS_KM = 6371.0088


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km: d = 2R*asin(sqrt(sin^2(dphi/2) + cos(phi1)cos(phi2)sin^2(dlambda/2)))."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(min(1.0, math.sqrt(a)))


def eta_minutes(distance_km: float, speed_kmh: float = AVG_SPEED_KMH) -> int:
    """ETA (mins) = round(distance / speed * 60), assuming 40 km/h emergency vehicle speed."""
    return int(round(distance_km / speed_kmh * 60))
