"""Train baselines + LightGBM, evaluate on held-out years, save model and report.

Split (by date, never shuffled, so the model never sees the future):
  train: up to TRAIN_END   val: up to VAL_END (early stopping)   test: after VAL_END

Outputs:
  artifacts/model.joblib     trained model + feature list
  reports/metrics.json       numbers for the app / backend
  reports/evaluation.md      human-readable report
Run:  python src/train.py
"""
import json

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd

from config import (AQI_CATEGORIES, ARTIFACTS_DIR, REPORTS_DIR, TRAIN_END,
                    VAL_END, aqi_category_index)
from features import build_features, feature_columns, load_raw


def score(y_true, y_pred) -> dict:
    err = y_pred - y_true
    return {
        "mae": float(np.mean(np.abs(err))),
        "rmse": float(np.sqrt(np.mean(err ** 2))),
        "category_accuracy": float(np.mean(
            aqi_category_index(y_true) == aqi_category_index(y_pred))),
        "n": int(len(y_true)),
    }


def main():
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    aqi, weather = load_raw()
    df = build_features(aqi, weather)
    df = df[df["target"].notna()].copy()
    feats = feature_columns(df)

    train = df[df["date"] <= TRAIN_END]
    val = df[(df["date"] > TRAIN_END) & (df["date"] <= VAL_END)]
    test = df[df["date"] > VAL_END]
    print(f"rows  train={len(train)}  val={len(val)}  test={len(test)}  "
          f"features={len(feats)}")

    # Baselines only count days where they can make a prediction; to keep the
    # comparison fair, every model is scored on the same test rows.
    seasonal = (train.groupby(["county_code", "month"], observed=True)["target"]
                .mean().rename("seasonal"))
    test = test.join(seasonal, on=["county_code", "month"])
    # Month never seen in training for that county -> fall back to the county's average
    county_mean = train.groupby("county_code", observed=True)["target"].mean()
    test["seasonal"] = test["seasonal"].fillna(test["county_code"].map(county_mean))
    fair = test["aqi_today"].notna() & test["seasonal"].notna()
    t = test[fair]
    y = t["target"].to_numpy()

    results = {
        "persistence (tomorrow = today)": score(y, t["aqi_today"].to_numpy()),
        "seasonal average (county x month)": score(y, t["seasonal"].to_numpy()),
        "7-day average": score(y, t["aqi_mean7"].fillna(t["aqi_today"]).to_numpy()),
    }

    params = dict(objective="l1", learning_rate=0.03, num_leaves=63,
                  min_child_samples=50, subsample=0.8, subsample_freq=1,
                  colsample_bytree=0.8, n_estimators=3000, verbose=-1)
    model = lgb.LGBMRegressor(**params)
    model.fit(train[feats], train["target"],
              eval_X=(val[feats],), eval_y=(val["target"],),
              callbacks=[lgb.early_stopping(100, verbose=False)])
    print(f"best iteration: {model.best_iteration_}")
    pred = model.predict(t[feats], num_iteration=model.best_iteration_)
    results["LightGBM"] = score(y, pred)

    best_baseline = min((k for k in results if k != "LightGBM"),
                        key=lambda k: results[k]["mae"])
    improvement = 1 - results["LightGBM"]["mae"] / results[best_baseline]["mae"]
    vs_seasonal = 1 - results["LightGBM"]["mae"] / results[
        "seasonal average (county x month)"]["mae"]

    # Error per county and per category -> "expected error" shown next to forecasts
    t = t.assign(pred=pred, abs_err=np.abs(pred - y))
    per_county = (t.groupby("county_code", observed=True)
                  .agg(county_name=("county_name", "first"),
                       mae=("abs_err", "mean"), n=("abs_err", "size"))
                  .reset_index())
    names = aqi.groupby("county_code")["county_name"].first()
    per_county["county_name"] = per_county["county_code"].astype(int).map(names)

    cat_names = [n for _, n in AQI_CATEGORIES]
    t["true_cat"] = aqi_category_index(t["target"].to_numpy())
    per_cat = (t.groupby("true_cat")["abs_err"].agg(["mean", "size"]).reset_index())
    per_cat["category"] = per_cat["true_cat"].map(lambda i: cat_names[i])

    importance = (pd.Series(model.booster_.feature_importance("gain"), index=feats)
                  .sort_values(ascending=False))

    metrics = {
        "split": {"train_end": TRAIN_END, "val_end": VAL_END,
                  "test_start": str(t["date"].min().date()),
                  "test_end": str(t["date"].max().date())},
        "results": results,
        "best_baseline": best_baseline,
        "mae_improvement_vs_best_baseline": improvement,
        "mae_improvement_vs_seasonal_average": vs_seasonal,
        "targets": {"mae_improvement": 0.15, "category_accuracy": 0.70},
        "expected_error_by_county": {
            str(int(r.county_code)): round(float(r.mae), 1)
            for r in per_county.itertuples()},
        "overall_expected_error": round(results["LightGBM"]["mae"], 1),
    }
    (REPORTS_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2))
    joblib.dump({"model": model, "features": feats,
                 "best_iteration": model.best_iteration_,
                 "expected_error_by_county": metrics["expected_error_by_county"],
                 "overall_expected_error": metrics["overall_expected_error"]},
                ARTIFACTS_DIR / "model.joblib")

    write_report(metrics, per_county, per_cat, importance)
    print(json.dumps(results, indent=2))
    print(f"LightGBM MAE improvement vs best baseline ({best_baseline}): "
          f"{improvement:.1%}")


def write_report(m, per_county, per_cat, importance):
    r = m["results"]
    lines = [
        "# Model Evaluation Report", "",
        f"Test period: {m['split']['test_start']} to {m['split']['test_end']} "
        f"(model trained on data through {m['split']['train_end']}, "
        f"tuned on {m['split']['val_end'][:4]}).", "",
        "Task: predict tomorrow's overall AQI for each Texas county with EPA monitors.", "",
        "## Results (same test days for every model)", "",
        "| Model | MAE | RMSE | Category accuracy |",
        "| :-- | --: | --: | --: |",
    ]
    for name, s in r.items():
        lines.append(f"| {name} | {s['mae']:.2f} | {s['rmse']:.2f} | "
                     f"{s['category_accuracy']:.1%} |")
    lg = r["LightGBM"]
    hit = lambda ok: "met" if ok else "NOT met"
    lines += [
        "", "## Proposal targets", "",
        f"- MAE at least 15% lower than baseline: "
        f"{m['mae_improvement_vs_best_baseline']:.1%} vs best baseline "
        f"({m['best_baseline']}), {m['mae_improvement_vs_seasonal_average']:.1%} "
        f"vs seasonal average -> "
        f"{hit(m['mae_improvement_vs_best_baseline'] >= 0.15)} (best baseline), "
        f"{hit(m['mae_improvement_vs_seasonal_average'] >= 0.15)} (seasonal average)",
        f"- Category accuracy at least 70%: {lg['category_accuracy']:.1%} -> "
        f"{hit(lg['category_accuracy'] >= 0.70)}",
        "", "## Error by true AQI category", "",
        "| Category | MAE | Days |", "| :-- | --: | --: |",
    ]
    for row in per_cat.itertuples():
        lines.append(f"| {row.category} | {row.mean:.1f} | {row.size} |")
    lines += ["", "## Top 10 features (by gain)", ""]
    for f, v in importance.head(10).items():
        lines.append(f"- {f}")
    lines += ["", "## Error by county (worst 10)", "",
              "| County | MAE | Days |", "| :-- | --: | --: |"]
    for row in per_county.sort_values("mae", ascending=False).head(10).itertuples():
        lines.append(f"| {row.county_name} | {row.mae:.1f} | {row.n} |")
    (REPORTS_DIR / "evaluation.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
