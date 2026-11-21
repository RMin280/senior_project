"""Bring the data up to date: EPA history + AirNow recent days + weather through tomorrow.

Steps
  1. AirNow daily files (airnow.py) for recent days
  2. aqi_combined.parquet = EPA county AQI where EPA has it, AirNow after EPA ends
  3. counties.csv gains any county AirNow reports that EPA didn't
  4. weather: Open-Meteo forecast API for the last 92 days + the next 2 days
     (the archive API runs ~5 days behind and has no future)

Run daily:  python src/update_data.py           (python src/download_data.py once first)
"""
import argparse
import time
from pathlib import Path

import pandas as pd
import requests

import airnow
from config import DATA_DIR, WEATHER_URL, WEATHER_VARS

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
ZIP_FILE = Path(__file__).resolve().parents[2] / "backend" / "data" / "zip_county.csv"


def combine_aqi() -> pd.DataFrame:
    epa = pd.read_parquet(DATA_DIR / "aqi_texas.parquet").assign(source="EPA")
    an = pd.read_parquet(DATA_DIR / "airnow_county.parquet")
    epa_end = epa["date"].max()
    recent = an[an["date"] > epa_end].assign(source="AirNow")
    names = epa.groupby("county_code")["county_name"].first()
    if ZIP_FILE.exists():   # names for counties EPA doesn't have
        z = pd.read_csv(ZIP_FILE).groupby("county_code")["county_name"].first()
        names = names.combine_first(z)
    recent["county_name"] = recent["county_code"].map(names)
    cols = ["county_code", "county_name", "date", "aqi", "defining_parameter",
            "n_sites", "source"]
    out = pd.concat([epa[cols], recent[cols]], ignore_index=True)
    out = out.sort_values(["county_code", "date"]).reset_index(drop=True)
    out.to_parquet(DATA_DIR / "aqi_combined.parquet", index=False)
    print(f"  EPA through {epa_end.date()}, AirNow {len(recent)} county-days after that, "
          f"latest {out.date.max().date()}")
    return out


def add_new_counties(aqi: pd.DataFrame) -> pd.DataFrame:
    counties = pd.read_csv(DATA_DIR / "counties.csv")
    sites = pd.read_parquet(DATA_DIR / "airnow_sites.parquet")
    missing = set(aqi["county_code"]) - set(counties["county_code"])
    if missing:
        centers = (sites[sites["county_code"].isin(missing)]
                   .groupby("county_code")[["lat", "lon"]].mean().reset_index())
        centers["county_name"] = centers["county_code"].map(
            aqi.groupby("county_code")["county_name"].first())
        counties = pd.concat([counties, centers], ignore_index=True)
        counties.to_csv(DATA_DIR / "counties.csv", index=False)
        print(f"  added {len(missing)} counties from AirNow: "
              f"{', '.join(centers['county_name'].astype(str))}")
    return counties


def _get(url, params):
    for attempt in range(5):
        r = requests.get(url, params=params, timeout=120)
        if r.status_code == 429 or r.status_code >= 500:   # rate limit or server hiccup
            time.sleep(30 * (attempt + 1))
            continue
        r.raise_for_status()
        return pd.DataFrame(r.json()["daily"]).rename(columns={"time": "date"})
    raise RuntimeError(f"{url} kept failing; re-run later")


def fill_archive_gaps(counties: pd.DataFrame, old: pd.DataFrame) -> pd.DataFrame:
    """Measured weather from each county's last archived day (or 2021 for new
    counties) up to ~6 days ago, where the archive API stops."""
    archive_end = (pd.Timestamp.today().normalize() - pd.Timedelta(days=6))
    last = old.groupby("county_code")["date"].max() if len(old) else pd.Series(dtype="datetime64[ns]")
    frames = []
    for row in counties.itertuples():
        start = last.get(row.county_code, pd.Timestamp("2021-01-01")) + pd.Timedelta(days=1)
        if start > archive_end:
            continue
        w = _get(WEATHER_URL, {"latitude": round(row.lat, 4), "longitude": round(row.lon, 4),
                               "start_date": start.strftime("%Y-%m-%d"),
                               "end_date": archive_end.strftime("%Y-%m-%d"),
                               "daily": ",".join(WEATHER_VARS), "timezone": "America/Chicago"})
        w["county_code"] = int(row.county_code)
        frames.append(w)
        time.sleep(0.5)
    if frames:
        print(f"  archive: filled gaps for {len(frames)} counties")
    return pd.concat(frames, ignore_index=True) if frames else old.iloc[:0]


def update_weather(counties: pd.DataFrame):
    path = DATA_DIR / "weather.parquet"
    old = pd.read_parquet(path) if path.exists() else pd.DataFrame(columns=["county_code", "date"])
    if "source" not in old:   # file from download_data.py: all measured (archive)
        old["source"] = "archive"
    archive = old[old["source"] == "archive"]
    gaps = fill_archive_gaps(counties, archive)
    if len(gaps):
        gaps["date"] = pd.to_datetime(gaps["date"])

    frames = []
    for row in counties.itertuples():
        w = _get(FORECAST_URL, {"latitude": round(row.lat, 4), "longitude": round(row.lon, 4),
                                "daily": ",".join(WEATHER_VARS), "timezone": "America/Chicago",
                                "past_days": 92, "forecast_days": 3})
        w["county_code"] = int(row.county_code)
        frames.append(w)
        time.sleep(0.2)
    recent = pd.concat(frames, ignore_index=True)
    recent["date"] = pd.to_datetime(recent["date"])

    # Measured (archive) values win; the forecast API fills the last few days and tomorrow
    merged = pd.concat([archive, gaps.assign(source="archive"), recent.assign(source="forecast")],
                       ignore_index=True).drop_duplicates(["county_code", "date"], keep="first")
    merged.sort_values(["county_code", "date"]).to_parquet(path, index=False)
    print(f"  weather through {merged.date.max().date()} for {merged.county_code.nunique()} counties")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=14,
                    help="AirNow days to (re)fetch; the first run backfills from 2021")
    days = None if not (DATA_DIR / "airnow_county.parquet").exists() else ap.parse_args().days
    print("AirNow")
    airnow.build(days)
    print("Combine with EPA")
    aqi = combine_aqi()
    counties = add_new_counties(aqi)
    print("Weather (Open-Meteo forecast API)")
    update_weather(counties)


if __name__ == "__main__":
    main()
