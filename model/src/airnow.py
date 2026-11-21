"""Recent Texas air quality from AirNow's public daily files (no API key).

EPA's yearly AQS files lag by months; AirNow posts each day's numbers the next
morning. Each daily file lists every monitor with its daily AQI per pollutant
(ozone 8-hour, PM2.5 24-hour, PM10 24-hour).

Outputs:
  data/airnow_sites.parquet     one row per monitor per pollutant per day
  data/airnow_county.parquet    one row per county per day:
                                overall AQI (= worst pollutant at any monitor, EPA's
                                county definition) + AQI for each pollutant
Run:  python src/airnow.py              (first run backfills from 2021, ~5 min)
      python src/airnow.py --days 7     (daily update)
"""
import argparse
import io
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta

import pandas as pd
import requests

from config import DATA_DIR, RAW_DIR

URL = "https://files.airnowtech.org/airnow/{y}/{d}/daily_data_v2.dat"
FIRST_DAY = date(2021, 1, 1)
CACHE = RAW_DIR / "airnow"
COLS = ["date", "aqsid", "site", "parameter", "units", "value", "hours", "agency",
        "aqi", "category", "lat", "lon", "full_aqsid"]
PARAMS = {"OZONE-8HR": "Ozone", "PM2.5-24hr": "PM2.5", "PM10-24hr": "PM10"}
TX_PREFIX = "84048"  # 840 = USA, 48 = Texas


def fetch_day(d: date) -> pd.DataFrame | None:
    """Download one day's file (cached as Texas-only CSV)."""
    cache = CACHE / f"{d:%Y%m%d}.csv"
    if cache.exists():
        return pd.read_csv(cache, dtype={"full_aqsid": str})
    r = requests.get(URL.format(y=d.year, d=f"{d:%Y%m%d}"), timeout=60)
    if r.status_code == 404:
        return None          # not posted yet (today) or missing day
    r.raise_for_status()
    df = pd.read_csv(io.StringIO(r.text), sep="|", names=COLS, dtype={"full_aqsid": str},
                     encoding_errors="replace")
    df = df[df["full_aqsid"].str.startswith(TX_PREFIX, na=False)]
    df = df[df["parameter"].isin(PARAMS) & (df["aqi"] >= 0)]
    df = df[["date", "full_aqsid", "site", "parameter", "value", "units", "aqi", "lat", "lon"]]
    df.to_csv(cache, index=False)
    return df


def build(days_back: int | None):
    CACHE.mkdir(parents=True, exist_ok=True)
    end = date.today() - timedelta(days=1)
    start = FIRST_DAY if days_back is None else end - timedelta(days=days_back)
    days = [start + timedelta(days=i) for i in range((end - start).days + 1)]
    # Always re-check the last 3 days: AirNow can post late or revise
    for d in days[-3:]:
        (CACHE / f"{d:%Y%m%d}.csv").unlink(missing_ok=True)
    with ThreadPoolExecutor(max_workers=6) as pool:
        frames = [f for f in pool.map(fetch_day, days) if f is not None]
    print(f"  {len(frames)} of {len(days)} days available")

    # Combine with every cached day, not only the ones fetched now
    all_files = sorted(CACHE.glob("*.csv"))
    sites = pd.concat((pd.read_csv(f, dtype={"full_aqsid": str}) for f in all_files),
                      ignore_index=True)
    sites["date"] = pd.to_datetime(sites["date"], format="%m/%d/%y")
    sites["pollutant"] = sites["parameter"].map(PARAMS)
    sites["county_code"] = sites["full_aqsid"].str[5:8].astype(int)
    sites = sites.drop(columns="parameter")
    sites.to_parquet(DATA_DIR / "airnow_sites.parquet", index=False)

    # County-day: worst monitor per pollutant, then worst pollutant overall
    per_pollutant = (sites.groupby(["county_code", "date", "pollutant"])["aqi"].max()
                     .unstack("pollutant"))
    county = per_pollutant.copy()
    county.columns = [f"aqi_{c}" for c in county.columns]
    county["aqi"] = per_pollutant.max(axis=1)
    county["defining_parameter"] = per_pollutant.idxmax(axis=1)
    county["n_sites"] = sites.groupby(["county_code", "date"])["full_aqsid"].nunique()
    county = county.reset_index()
    county.to_parquet(DATA_DIR / "airnow_county.parquet", index=False)
    print(f"  {len(sites)} monitor rows, {len(county)} county-days, "
          f"{county.county_code.nunique()} counties, "
          f"{county.date.min().date()} to {county.date.max().date()}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, help="only fetch the last N days")
    build(ap.parse_args().days)
