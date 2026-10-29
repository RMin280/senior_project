"""Loads data + the trained model once at startup and answers queries from memory.

Data comes from the model pipeline's files for now. When the PostgreSQL
database exists, only this file needs to change: swap the parquet reads for SQL.
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "model" / "src"))

from config import aqi_category  # noqa: E402  (model/src)
from features import build_features  # noqa: E402
from predict import forecast, load_model  # noqa: E402

ACTIVE_DAYS = 60  # counties with no data in the last N days get no forecast


def _haversine_km(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = (np.sin((lat2 - lat1) / 2) ** 2
         + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2)
    return 6371 * 2 * np.arcsin(np.sqrt(a))


class DataStore:
    def __init__(self, data_dir: Path, model_path: Path, metrics_path: Path,
                 zip_path: Path):
        self.aqi = pd.read_parquet(data_dir / "aqi_texas.parquet")
        weather = pd.read_parquet(data_dir / "weather.parquet")
        self.counties = pd.read_csv(data_dir / "counties.csv").set_index("county_code")
        self.zips = pd.read_csv(zip_path, dtype={"zip": str}).set_index("zip")
        self.metrics = json.loads(Path(metrics_path).read_text())
        bundle = load_model(model_path)

        self.aqi = self.aqi.sort_values(["county_code", "date"])
        self.data_end = self.aqi["date"].max()
        latest = self.aqi.groupby("county_code").tail(1).set_index("county_code")
        self.counties["latest_date"] = latest["date"]
        self.counties["latest_aqi"] = latest["aqi"]
        self.counties["active"] = (
            self.counties["latest_date"] >= self.data_end - pd.Timedelta(days=ACTIVE_DAYS))

        # Precompute tomorrow's forecast for every active county
        feats = build_features(self.aqi, weather)
        feats["county_name"] = feats["county_code"].astype(int).map(
            self.counties["county_name"])
        rows = feats[feats["aqi"].notna()].groupby("county_code", observed=True).tail(1)
        rows = rows[rows["county_code"].astype(int).isin(
            self.counties.index[self.counties["active"]])]
        fc = forecast(bundle, rows)
        self.forecasts = {int(r.county_code): self._forecast_dict(r)
                          for r in fc.itertuples()}

    # ---------- helpers ----------
    @staticmethod
    def _forecast_dict(r):
        return {"county_code": int(r.county_code), "county_name": r.county_name,
                "forecast_date": str(r.forecast_date), "predicted_aqi": int(r.predicted_aqi),
                "category": r.category, "expected_error": float(r.expected_error)}

    def _county_dict(self, code):
        c = self.counties.loc[code]
        aqi = None if pd.isna(c["latest_aqi"]) else int(c["latest_aqi"])
        return {"county_code": int(code), "county_name": c["county_name"],
                "lat": round(float(c["lat"]), 4), "lon": round(float(c["lon"]), 4),
                "latest_date": c["latest_date"].strftime("%Y-%m-%d"),
                "latest_aqi": aqi,
                "latest_category": aqi_category(aqi) if aqi is not None else None,
                "has_forecast": bool(c["active"])}

    # ---------- queries ----------
    def has_county(self, code: int) -> bool:
        return code in self.counties.index

    def list_counties(self):
        return [self._county_dict(c) for c in self.counties.index]

    def county(self, code: int):
        return self._county_dict(code)

    def history(self, code: int, start=None, end=None):
        h = self.aqi[self.aqi["county_code"] == code]
        end = pd.Timestamp(end) if end else h["date"].max()
        start = pd.Timestamp(start) if start else end - pd.Timedelta(days=365)
        h = h[(h["date"] >= start) & (h["date"] <= end)]
        return {"county_code": code, "start": start.strftime("%Y-%m-%d"),
                "end": end.strftime("%Y-%m-%d"),
                "points": [{"date": d.strftime("%Y-%m-%d"), "aqi": int(a),
                            "category": aqi_category(a), "driver": p}
                           for d, a, p in zip(h["date"], h["aqi"],
                                              h["defining_parameter"])]}

    def forecast(self, code: int):
        return self.forecasts.get(code)

    def all_forecasts(self):
        return list(self.forecasts.values())

    def lookup_zip(self, zip_code: str):
        """Zip -> its county. If that county has no active monitor, use the nearest one that does."""
        if zip_code not in self.zips.index:
            return None
        z = self.zips.loc[zip_code]
        home = int(z["county_code"])
        if home in self.forecasts:
            used, distance = home, 0.0
        else:
            active = self.counties[self.counties["active"]]
            d = _haversine_km(z["lat"], z["lon"], active["lat"], active["lon"])
            used, distance = int(d.idxmin()), float(d.min())
        return {"zip": zip_code, "home_county_code": home,
                "home_county_name": z["county_name"],
                "uses_nearest_county": used != home,
                "distance_km": round(distance, 1),
                "county": self._county_dict(used),
                "forecast": self.forecasts.get(used)}

    def model_info(self):
        m = self.metrics
        return {"model": "LightGBM", "target": "next-day overall AQI",
                "test_period": [m["split"]["test_start"], m["split"]["test_end"]],
                "results": m["results"],
                "mae_improvement_vs_best_baseline": m["mae_improvement_vs_best_baseline"],
                "overall_expected_error": m["overall_expected_error"]}
