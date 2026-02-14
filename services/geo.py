import math
from typing import Optional


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate great-circle distance between two points (in km).
    Uses the Haversine formula — accurate enough for trade radius filtering.
    """
    R = 6371.0  # Earth's radius in km

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def is_within_radius(
    origin_lat: float,
    origin_lon: float,
    target_lat: Optional[float],
    target_lon: Optional[float],
    radius_km: float,
) -> bool:
    if target_lat is None or target_lon is None:
        return False
    return haversine_km(origin_lat, origin_lon, target_lat, target_lon) <= radius_km
