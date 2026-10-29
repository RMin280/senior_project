"""Shared settings and paths for the model pipeline."""
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = MODEL_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
WEATHER_DIR = DATA_DIR / "weather"
ARTIFACTS_DIR = MODEL_DIR / "artifacts"
REPORTS_DIR = MODEL_DIR / "reports"

STATE_CODE = 48  # Texas (EPA state code)
FIRST_YEAR = 2015
LAST_YEAR = 2026  # current year file is partial, which is fine

# Time-based split: train on older years, tune on VAL, report on TEST.
TRAIN_END = "2022-12-31"
VAL_END = "2023-12-31"

EPA_URL = "https://aqs.epa.gov/aqsweb/airdata/daily_aqi_by_county_{year}.zip"
EPA_SITES_URL = "https://aqs.epa.gov/aqsweb/airdata/aqs_sites.zip"
WEATHER_URL = "https://archive-api.open-meteo.com/v1/archive"
WEATHER_VARS = [
    "temperature_2m_max",
    "temperature_2m_min",
    "precipitation_sum",
    "wind_speed_10m_max",
    "wind_direction_10m_dominant",
    "relative_humidity_2m_mean",
]

# EPA AQI categories: (upper bound inclusive, name)
AQI_CATEGORIES = [
    (50, "Good"),
    (100, "Moderate"),
    (150, "Unhealthy for Sensitive Groups"),
    (200, "Unhealthy"),
    (300, "Very Unhealthy"),
    (10_000, "Hazardous"),
]


def aqi_category(aqi: float) -> str:
    for upper, name in AQI_CATEGORIES:
        if aqi <= upper:
            return name
    return "Hazardous"


def aqi_category_index(aqi):
    """Vectorized: AQI values -> category index 0..5."""
    import numpy as np

    bounds = [u for u, _ in AQI_CATEGORIES[:-1]]
    return np.searchsorted(bounds, np.round(aqi), side="left")
