"""Turn raw AQI + weather into one feature row per county per day.

Each row describes "today" (day t). The target is the AQI on day t+1.
Weather for t+1 is included: in production it comes from a weather
forecast (Open-Meteo forecast API), in training we use what actually happened.
"""
import numpy as np
import pandas as pd

from config import DATA_DIR, WEATHER_VARS

LAGS = [1, 2, 3, 7]          # AQI from N days before today
WINDOWS = [7, 30]            # rolling averages ending today
PARAMS = ["PM2.5", "Ozone", "NO2", "PM10", "CO", "SO2"]


def load_raw():
    aqi = pd.read_parquet(DATA_DIR / "aqi_texas.parquet")
    weather = pd.read_parquet(DATA_DIR / "weather.parquet")
    return aqi, weather


def build_features(aqi: pd.DataFrame, weather: pd.DataFrame) -> pd.DataFrame:
    # Fill in missing calendar days per county so "shift(1)" really means yesterday.
    frames = []
    for code, g in aqi.groupby("county_code"):
        g = g.set_index("date").sort_index()
        full = pd.date_range(g.index.min(), g.index.max(), freq="D")
        g = g.reindex(full)
        g["county_code"] = code
        frames.append(g.rename_axis("date").reset_index())
    df = pd.concat(frames, ignore_index=True)

    df = df.merge(weather, on=["county_code", "date"], how="left")
    df = df.sort_values(["county_code", "date"]).reset_index(drop=True)
    g = df.groupby("county_code", group_keys=False)

    # Target: tomorrow's AQI
    df["target"] = g["aqi"].shift(-1)

    # AQI history
    df["aqi_today"] = df["aqi"]
    for lag in LAGS:
        df[f"aqi_lag{lag}"] = g["aqi"].shift(lag)
    for w in WINDOWS:
        df[f"aqi_mean{w}"] = g["aqi"].transform(
            lambda s: s.rolling(w, min_periods=max(2, w // 3)).mean())
    df["aqi_std7"] = g["aqi"].transform(lambda s: s.rolling(7, min_periods=3).std())
    df["aqi_change1"] = df["aqi"] - df["aqi_lag1"]

    # Which pollutant drove today's AQI
    for p in PARAMS:
        df[f"driver_{p}"] = (df["defining_parameter"] == p).astype(float)
    df.loc[df["aqi"].isna(), [f"driver_{p}" for p in PARAMS]] = np.nan

    # Calendar for tomorrow (the day being predicted)
    tomorrow = df["date"] + pd.Timedelta(days=1)
    doy = tomorrow.dt.dayofyear
    df["doy_sin"] = np.sin(2 * np.pi * doy / 365.25)
    df["doy_cos"] = np.cos(2 * np.pi * doy / 365.25)
    df["dow"] = tomorrow.dt.dayofweek
    df["month"] = tomorrow.dt.month

    # Weather today and tomorrow. Wind direction becomes x/y so 359 and 1 are close.
    for prefix, shift in (("wx_today_", 0), ("wx_tmrw_", -1)):
        for v in WEATHER_VARS:
            col = g[v].shift(shift) if shift else df[v]
            if v == "wind_direction_10m_dominant":
                rad = np.deg2rad(col)
                df[prefix + "wind_dir_sin"] = np.sin(rad)
                df[prefix + "wind_dir_cos"] = np.cos(rad)
            else:
                df[prefix + v] = col

    df["county_code"] = df["county_code"].astype("category")
    return df


def feature_columns(df: pd.DataFrame) -> list[str]:
    skip = {"date", "aqi", "target", "county_name", "defining_parameter",
            "n_sites", "Category"} | set(WEATHER_VARS)
    return [c for c in df.columns if c not in skip]
