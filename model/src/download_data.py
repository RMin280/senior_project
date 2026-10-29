"""Download Texas daily county AQI (EPA) and daily weather (Open-Meteo).

Outputs:
  data/aqi_texas.parquet      one row per county per day
  data/counties.csv           county codes, names, and center lat/lon
  data/weather.parquet        one row per county per day

Files are cached, so re-running only fetches what's missing.
Run:  python src/download_data.py
"""
import io
import time
import zipfile

import pandas as pd
import requests

from config import (DATA_DIR, EPA_SITES_URL, EPA_URL, FIRST_YEAR, LAST_YEAR,
                    RAW_DIR, STATE_CODE, WEATHER_DIR, WEATHER_URL, WEATHER_VARS)


def fetch_zip_csv(url: str, cache_name: str) -> pd.DataFrame:
    cache = RAW_DIR / cache_name
    if not cache.exists():
        print(f"  downloading {url}")
        r = requests.get(url, timeout=120)
        r.raise_for_status()
        cache.write_bytes(r.content)
    with zipfile.ZipFile(cache) as z:
        name = z.namelist()[0]
        return pd.read_csv(z.open(name), low_memory=False)


def download_aqi() -> pd.DataFrame:
    frames = []
    for year in range(FIRST_YEAR, LAST_YEAR + 1):
        try:
            df = fetch_zip_csv(EPA_URL.format(year=year), f"aqi_{year}.zip")
        except requests.HTTPError as e:
            print(f"  skip {year}: {e}")
            continue
        df = df[df["State Code"] == STATE_CODE]
        frames.append(df)
        print(f"  {year}: {len(df)} Texas rows")
    aqi = pd.concat(frames, ignore_index=True)
    aqi = aqi.rename(columns={
        "county Name": "county_name", "County Name": "county_name",
        "County Code": "county_code", "Date": "date", "AQI": "aqi",
        "Defining Parameter": "defining_parameter",
        "Number of Sites Reporting": "n_sites",
    })
    aqi["date"] = pd.to_datetime(aqi["date"])
    aqi = aqi[["county_code", "county_name", "date", "aqi",
               "defining_parameter", "n_sites"]]
    return aqi.drop_duplicates(["county_code", "date"])


def trim_incomplete_days(aqi: pd.DataFrame) -> pd.DataFrame:
    """The current-year EPA file trails off: the last weeks have only a few
    counties (sometimes just one CO sensor). Cut everything after the last day
    where at least half the usual number of counties reported."""
    per_day = aqi.groupby("date")["county_code"].nunique()
    usual = per_day.iloc[-120:].median()
    complete = per_day[per_day >= usual / 2]
    last_good = complete.index.max()
    dropped = (aqi["date"] > last_good).sum()
    if dropped:
        print(f"  trimming {dropped} rows after {last_good.date()} (incomplete days)")
    return aqi[aqi["date"] <= last_good]


def county_centers(aqi: pd.DataFrame) -> pd.DataFrame:
    """Center of each county = average location of its EPA monitors."""
    sites = fetch_zip_csv(EPA_SITES_URL, "aqs_sites.zip")
    sites = sites[pd.to_numeric(sites["State Code"], errors="coerce") == STATE_CODE]
    sites = sites[(sites["Latitude"] != 0) & (sites["Longitude"] != 0)]
    sites["county_code"] = pd.to_numeric(sites["County Code"])
    centers = (sites.groupby("county_code")[["Latitude", "Longitude"]].mean()
               .rename(columns={"Latitude": "lat", "Longitude": "lon"}))
    names = aqi.groupby("county_code")["county_name"].first()
    out = names.to_frame().join(centers, how="left").reset_index()
    missing = out[out["lat"].isna()]
    if len(missing):
        print(f"  warning: no coordinates for {list(missing['county_name'])}")
    return out.dropna(subset=["lat"])


def download_weather(counties: pd.DataFrame, start: str, end: str) -> pd.DataFrame:
    frames = []
    for i, row in counties.iterrows():
        cache = WEATHER_DIR / f"{int(row.county_code)}.csv"
        if not cache.exists():
            params = {
                "latitude": round(row.lat, 4), "longitude": round(row.lon, 4),
                "start_date": start, "end_date": end,
                "daily": ",".join(WEATHER_VARS), "timezone": "America/Chicago",
            }
            for attempt in range(5):
                r = requests.get(WEATHER_URL, params=params, timeout=120)
                if r.status_code == 429:  # rate limited: back off and retry
                    wait = 60 * (attempt + 1)
                    print(f"  rate limited, waiting {wait}s")
                    time.sleep(wait)
                    continue
                r.raise_for_status()
                break
            else:
                raise RuntimeError("Open-Meteo kept rate limiting; re-run later")
            daily = pd.DataFrame(r.json()["daily"])
            daily.to_csv(cache, index=False)
            print(f"  weather {row.county_name} ({len(daily)} days)")
            time.sleep(1)
        w = pd.read_csv(cache)
        w["county_code"] = int(row.county_code)
        frames.append(w)
    weather = pd.concat(frames, ignore_index=True).rename(columns={"time": "date"})
    weather["date"] = pd.to_datetime(weather["date"])
    return weather


def main():
    for d in (RAW_DIR, WEATHER_DIR):
        d.mkdir(parents=True, exist_ok=True)

    print("EPA daily AQI by county")
    aqi = trim_incomplete_days(download_aqi())
    aqi.to_parquet(DATA_DIR / "aqi_texas.parquet", index=False)
    print(f"  total: {len(aqi)} rows, {aqi.county_code.nunique()} counties, "
          f"{aqi.date.min().date()} to {aqi.date.max().date()}")

    print("County centers")
    counties = county_centers(aqi)
    counties.to_csv(DATA_DIR / "counties.csv", index=False)

    print("Weather (Open-Meteo)")
    # Archive API lags a few days behind today; stop at the last AQI date.
    end = aqi.date.max().strftime("%Y-%m-%d")
    weather = download_weather(counties, f"{FIRST_YEAR}-01-01", end)
    weather.to_parquet(DATA_DIR / "weather.parquet", index=False)
    print(f"  total: {len(weather)} rows")


if __name__ == "__main__":
    main()
