"""Make next-day AQI forecasts with the trained model.

Backend usage:
    from predict import load_model, forecast
    bundle = load_model()
    forecast(bundle, feature_rows)   # rows built by features.build_features

Run directly to forecast the day after the latest data for every county:
    python src/predict.py
"""
import joblib
import pandas as pd

from config import ARTIFACTS_DIR, aqi_category
from features import build_features, load_raw


def load_model(path=ARTIFACTS_DIR / "model.joblib"):
    return joblib.load(path)


def forecast(bundle, rows: pd.DataFrame) -> pd.DataFrame:
    """rows: one feature row per county for 'today'. Returns tomorrow's forecast."""
    pred = bundle["model"].predict(rows[bundle["features"]],
                                   num_iteration=bundle["best_iteration"])
    errs = bundle["expected_error_by_county"]
    out = pd.DataFrame({
        "county_code": rows["county_code"].astype(int).to_numpy(),
        "county_name": rows["county_name"].to_numpy(),
        "forecast_date": (rows["date"] + pd.Timedelta(days=1)).dt.date.to_numpy(),
        "predicted_aqi": pred.round().astype(int),
    })
    out["category"] = out["predicted_aqi"].map(aqi_category)
    out["expected_error"] = out["county_code"].map(
        lambda c: errs.get(str(c), bundle["overall_expected_error"]))
    return out


def main():
    aqi, weather = load_raw()
    df = build_features(aqi, weather)
    df["county_name"] = df.groupby("county_code", observed=True)["county_name"] \
        .transform(lambda s: s.ffill().bfill())
    latest = df[df["aqi"].notna()].sort_values("date").groupby(
        "county_code", observed=True).tail(1)
    # Skip counties whose monitors stopped reporting (no data in the last 60 days)
    latest = latest[latest["date"] >= latest["date"].max() - pd.Timedelta(days=60)]
    print(forecast(load_model(), latest).to_string(index=False))


if __name__ == "__main__":
    main()
