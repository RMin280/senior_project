"""Test fixtures: a tiny fake dataset + a small model trained on it.

Tests never touch the real downloaded data, so they run anywhere (CI included).
"""
import json
import sys
from pathlib import Path

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "model" / "src"))
sys.path.insert(0, str(ROOT / "backend"))

from config import WEATHER_VARS  # noqa: E402
from features import build_features, feature_columns  # noqa: E402

# county_code: (name, lat, lon, last day of data)
COUNTIES = {
    113: ("Dallas", 32.79, -96.82, "2025-12-31"),
    201: ("Harris", 29.76, -95.37, "2025-12-31"),
    149: ("Fayette", 29.91, -96.90, "2025-06-01"),   # stopped reporting -> no forecast
}


def make_raw():
    rng = np.random.default_rng(0)
    aqi_rows, wx_rows = [], []
    for code, (name, _, _, last) in COUNTIES.items():
        dates = pd.date_range("2025-01-01", last, freq="D")
        base = 45 + 15 * np.sin(np.arange(len(dates)) / 30) + rng.normal(0, 5, len(dates))
        for d, a in zip(dates, base):
            aqi_rows.append({"county_code": code, "county_name": name, "date": d,
                             "aqi": max(0, round(a)), "defining_parameter": "PM2.5",
                             "n_sites": 1})
        for d in pd.date_range("2025-01-01", "2025-12-31", freq="D"):
            row = {"county_code": code, "date": d}
            row.update({v: float(rng.uniform(0, 30)) for v in WEATHER_VARS})
            wx_rows.append(row)
    aqi = pd.DataFrame(aqi_rows)
    aqi = aqi[aqi["date"] != "2025-03-15"]  # a missing day, like real data
    return aqi, pd.DataFrame(wx_rows)


@pytest.fixture(scope="session")
def raw():
    return make_raw()


@pytest.fixture(scope="session")
def app(tmp_path_factory, raw):
    d = tmp_path_factory.mktemp("data")
    aqi, weather = raw
    aqi.to_parquet(d / "aqi_texas.parquet", index=False)
    weather.to_parquet(d / "weather.parquet", index=False)
    pd.DataFrame([{"county_code": c, "county_name": n, "lat": la, "lon": lo}
                  for c, (n, la, lo, _) in COUNTIES.items()]).to_csv(
        d / "counties.csv", index=False)
    pd.DataFrame([
        {"zip": "75201", "county_code": 113, "county_name": "Dallas", "lat": 32.79, "lon": -96.80},
        {"zip": "78945", "county_code": 149, "county_name": "Fayette", "lat": 29.90, "lon": -96.87},
    ]).to_csv(d / "zip_county.csv", index=False)

    feats = build_features(aqi, weather)
    feats = feats[feats["target"].notna()]
    cols = feature_columns(feats)
    model = lgb.LGBMRegressor(n_estimators=20, verbose=-1).fit(feats[cols], feats["target"])
    joblib.dump({"model": model, "features": cols, "best_iteration": 20,
                 "expected_error_by_county": {"113": 7.5},
                 "overall_expected_error": 8.0}, d / "model.joblib")
    (d / "metrics.json").write_text(json.dumps({
        "split": {"test_start": "2024-01-01", "test_end": "2025-12-31"},
        "results": {"LightGBM": {"mae": 8.0}},
        "mae_improvement_vs_best_baseline": 0.25, "overall_expected_error": 8.0}))

    from app import create_app
    return create_app({"DATA_DIR": d, "MODEL_PATH": d / "model.joblib",
                       "METRICS_PATH": d / "metrics.json",
                       "ZIP_PATH": d / "zip_county.csv", "TESTING": True})


@pytest.fixture()
def client(app):
    return app.test_client()
