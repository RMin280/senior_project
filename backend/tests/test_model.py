"""Unit tests for the model pipeline (model/src)."""
import numpy as np
import pandas as pd

from config import aqi_category, aqi_category_index
from features import build_features, feature_columns
from train import score


def test_aqi_category_boundaries():
    assert aqi_category(0) == "Good"
    assert aqi_category(50) == "Good"
    assert aqi_category(51) == "Moderate"
    assert aqi_category(150) == "Unhealthy for Sensitive Groups"
    assert aqi_category(301) == "Hazardous"
    assert list(aqi_category_index(np.array([10, 50, 51, 101, 151, 201, 999]))) == \
        [0, 0, 1, 2, 3, 4, 5]


def test_target_is_tomorrow(raw):
    df = build_features(*raw)
    d = df[df["county_code"] == 113].set_index("date")
    assert d.loc["2025-05-01", "target"] == d.loc["2025-05-02", "aqi"]
    assert d.loc["2025-05-02", "aqi_lag1"] == d.loc["2025-05-01", "aqi"]


def test_missing_day_is_not_skipped(raw):
    """2025-03-15 is missing: lag must be NaN, not the 14th's neighbour."""
    df = build_features(*raw)
    d = df[df["county_code"] == 113].set_index("date")
    assert np.isnan(d.loc["2025-03-15", "aqi"])
    assert np.isnan(d.loc["2025-03-16", "aqi_lag1"])
    assert np.isnan(d.loc["2025-03-14", "target"])


def test_no_target_leak_in_features(raw):
    cols = feature_columns(build_features(*raw))
    assert "target" not in cols and "aqi" not in cols and "date" not in cols


def test_tomorrow_weather_is_shifted(raw):
    df = build_features(*raw)
    d = df[df["county_code"] == 113].set_index("date")
    assert d.loc["2025-05-01", "wx_tmrw_temperature_2m_max"] == \
        d.loc["2025-05-02", "wx_today_temperature_2m_max"]


def test_score():
    s = score(np.array([40.0, 60.0]), np.array([55.0, 60.0]))
    assert s["mae"] == 7.5
    assert s["category_accuracy"] == 0.5   # Good vs Moderate wrong, Moderate vs Moderate right


def test_train_end_to_end(raw, tmp_path, monkeypatch):
    """Full training run on the fake data: writes model, metrics, and report."""
    import json
    import train

    monkeypatch.setattr(train, "load_raw", lambda: raw)
    monkeypatch.setattr(train, "ARTIFACTS_DIR", tmp_path / "artifacts")
    monkeypatch.setattr(train, "REPORTS_DIR", tmp_path / "reports")
    monkeypatch.setattr(train, "TRAIN_END", "2025-06-30")
    monkeypatch.setattr(train, "VAL_END", "2025-09-30")
    train.main()

    m = json.loads((tmp_path / "reports" / "metrics.json").read_text())
    assert "LightGBM" in m["results"]
    assert m["results"]["LightGBM"]["n"] > 0
    assert (tmp_path / "artifacts" / "model.joblib").exists()
    assert "Model Evaluation Report" in (tmp_path / "reports" / "evaluation.md").read_text()


def test_predict_forecast_columns(raw):
    import lightgbm as lgb
    from predict import forecast

    df = build_features(*raw)
    df["county_name"] = "X"
    train_rows = df[df["target"].notna()]
    cols = feature_columns(df)
    model = lgb.LGBMRegressor(n_estimators=5, verbose=-1).fit(
        train_rows[cols], train_rows["target"])
    bundle = {"model": model, "features": cols, "best_iteration": 5,
              "expected_error_by_county": {}, "overall_expected_error": 9.0}
    out = forecast(bundle, df.groupby("county_code", observed=True).tail(1))
    assert list(out.columns) == ["county_code", "county_name", "forecast_date",
                                 "predicted_aqi", "category", "expected_error"]
    assert (out["expected_error"] == 9.0).all()
