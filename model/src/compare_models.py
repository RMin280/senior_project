"""Compare several model families on the exact same split and test days.

Models: two baselines, Ridge (linear), k-nearest neighbors, SVM with an RBF
kernel, random forest, a small neural network (MLP), and LightGBM.
Hyperparameters are picked on the validation year (2023), then each model is
scored once on the test period.

Outputs:
  reports/model_comparison.md / .json      results table (committed)
  artifacts/comparison_predictions.parquet every model's test predictions (for the demo)
Run:  python src/compare_models.py        (~5-10 minutes)
"""
import json
import time

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.neighbors import KNeighborsRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.svm import SVR

from config import (AQI_CATEGORIES, ARTIFACTS_DIR, REPORTS_DIR, TRAIN_END,
                    VAL_END, aqi_category_index)
from features import build_features, feature_columns, load_raw
from train import score

SEED = 0
SVR_TRAIN_ROWS = 20_000   # kernel SVM training cost grows ~n^2, so it gets a random sample

# Short, plain descriptions used in the report and the demo
ABOUT = {
    "Persistence": "Tomorrow = today. The simplest possible forecast.",
    "Seasonal average": "Average AQI for that county and month in the training years.",
    "Ridge regression": "A straight-line (linear) combination of the features.",
    "k-nearest neighbors": "Finds the k most similar past days and averages what happened next.",
    "SVM (RBF kernel)": "Support vector regression with a curved (RBF) kernel. "
                        f"Trained on a {SVR_TRAIN_ROWS:,}-row sample (cost grows with rows squared).",
    "Random forest": "Hundreds of decision trees, each on a random slice of the data, averaged.",
    "Neural network (MLP)": "Two hidden layers (64, 32) trained with early stopping.",
    "LightGBM": "Gradient-boosted trees: each tree fixes the previous trees' mistakes.",
}


def preprocessor(feats):
    """Non-tree models need no missing values, same-scale numbers, and one-hot counties."""
    numeric = [f for f in feats if f != "county_code"]
    return ColumnTransformer([
        ("num", make_pipeline(SimpleImputer(strategy="median", add_indicator=True),
                              StandardScaler()), numeric),
        ("county", OneHotEncoder(handle_unknown="ignore"), ["county_code"]),
    ])


def tune(name, make, grid, Xtr, ytr, Xva, yva):
    """Try each setting, keep the one with the lowest validation MAE."""
    best = None
    for params in grid:
        m = make(**params).fit(Xtr, ytr)
        mae = float(np.mean(np.abs(m.predict(Xva) - yva)))
        print(f"    {name} {params}: val MAE {mae:.2f}")
        if best is None or mae < best[0]:
            best = (mae, params)
    return best[1]


def main():
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(SEED)

    aqi, weather = load_raw()
    df = build_features(aqi, weather)
    df = df[df["target"].notna()].copy()
    feats = feature_columns(df)
    names = aqi.groupby("county_code")["county_name"].first()

    train = df[df["date"] <= TRAIN_END]
    val = df[(df["date"] > TRAIN_END) & (df["date"] <= VAL_END)]
    test = df[df["date"] > VAL_END].copy()

    seasonal = (train.groupby(["county_code", "month"], observed=True)["target"]
                .mean().rename("seasonal"))
    test = test.join(seasonal, on=["county_code", "month"])
    county_mean = train.groupby("county_code", observed=True)["target"].mean()
    test["seasonal"] = test["seasonal"].fillna(test["county_code"].map(county_mean))
    test = test[test["aqi_today"].notna() & test["seasonal"].notna()]
    y_tr, y_va, y_te = (train["target"].to_numpy(), val["target"].to_numpy(),
                        test["target"].to_numpy())

    # Shared preprocessing for the non-tree models (fit on training data only)
    prep = preprocessor(feats).fit(train[feats])
    P = lambda d: prep.transform(d[feats])
    Xtr, Xva, Xte = P(train), P(val), P(test)
    # KNN/SVR prefer dense arrays; the one-hot block is small (46 counties)
    dense = lambda X: X.toarray() if hasattr(X, "toarray") else X
    Xtr_d, Xva_d, Xte_d = dense(Xtr), dense(Xva), dense(Xte)

    preds, timing, chosen = {}, {}, {}
    preds["Persistence"] = test["aqi_today"].to_numpy()
    preds["Seasonal average"] = test["seasonal"].to_numpy()

    def run(name, fit_predict):
        print(f"  {name}")
        t = time.perf_counter()
        preds[name] = fit_predict()
        timing[name] = round(time.perf_counter() - t, 1)

    def ridge():
        p = tune("ridge", Ridge, [{"alpha": a} for a in (0.1, 1, 10, 100)],
                 Xtr, y_tr, Xva, y_va)
        chosen["Ridge regression"] = p
        return Ridge(**p).fit(Xtr, y_tr).predict(Xte)
    run("Ridge regression", ridge)

    def knn():
        make = lambda **p: KNeighborsRegressor(weights="distance", n_jobs=-1, **p)
        sub = rng.choice(len(Xva_d), min(5000, len(Xva_d)), replace=False)
        p = tune("knn", make, [{"n_neighbors": k} for k in (10, 25, 50)],
                 Xtr_d, y_tr, Xva_d[sub], y_va[sub])
        chosen["k-nearest neighbors"] = p
        return make(**p).fit(Xtr_d, y_tr).predict(Xte_d)
    run("k-nearest neighbors", knn)

    def svr():
        idx = rng.choice(len(Xtr_d), min(SVR_TRAIN_ROWS, len(Xtr_d)), replace=False)
        small = idx[:5000]
        sub = rng.choice(len(Xva_d), min(3000, len(Xva_d)), replace=False)
        make = lambda **p: SVR(kernel="rbf", gamma="scale", epsilon=1.0, **p)
        p = tune("svr", make, [{"C": c} for c in (10, 50, 200)],
                 Xtr_d[small], y_tr[small], Xva_d[sub], y_va[sub])
        chosen["SVM (RBF kernel)"] = p
        return make(**p).fit(Xtr_d[idx], y_tr[idx]).predict(Xte_d)
    run("SVM (RBF kernel)", svr)

    def forest():
        # Trees don't need scaling; county stays a plain number code
        as_num = lambda d: d[feats].assign(county_code=d["county_code"].astype(int))
        imp = SimpleImputer(strategy="median").fit(as_num(train))
        I = lambda d: imp.transform(as_num(d))
        m = RandomForestRegressor(n_estimators=200, min_samples_leaf=5, max_features=0.5,
                                  n_jobs=-1, random_state=SEED)
        chosen["Random forest"] = {"n_estimators": 200, "min_samples_leaf": 5}
        return m.fit(I(train), y_tr).predict(I(test))
    run("Random forest", forest)

    def mlp():
        m = MLPRegressor(hidden_layer_sizes=(64, 32), early_stopping=True,
                         max_iter=200, random_state=SEED)
        chosen["Neural network (MLP)"] = {"hidden_layer_sizes": [64, 32]}
        return m.fit(Xtr, y_tr).predict(Xte)
    run("Neural network (MLP)", mlp)

    def lgbm():
        m = lgb.LGBMRegressor(objective="l1", learning_rate=0.03, num_leaves=63,
                              min_child_samples=50, subsample=0.8, subsample_freq=1,
                              colsample_bytree=0.8, n_estimators=3000, verbose=-1)
        m.fit(train[feats], y_tr, eval_X=(val[feats],), eval_y=(y_va,),
              callbacks=[lgb.early_stopping(100, verbose=False)])
        chosen["LightGBM"] = {"best_iteration": int(m.best_iteration_)}
        return m.predict(test[feats], num_iteration=m.best_iteration_)
    run("LightGBM", lgbm)

    # ---- score everything on the same rows ----
    baseline_mae = float(np.mean(np.abs(preds["Persistence"] - y_te)))
    cat_true = aqi_category_index(y_te)
    high = cat_true >= 2   # USG or worse
    rows = []
    for name, p in preds.items():
        p = np.clip(p, 0, None)
        s = score(y_te, p)
        s.update({
            "model": name, "about": ABOUT[name],
            "mae_vs_persistence": 1 - s["mae"] / baseline_mae,
            "mae_unhealthy_days": float(np.mean(np.abs(p[high] - y_te[high]))),
            "seconds": timing.get(name, 0.0), "settings": chosen.get(name, {}),
        })
        rows.append(s)
    rows.sort(key=lambda r: r["mae"])

    out = {"test_start": str(test["date"].min().date()),
           "test_end": str(test["date"].max().date()),
           "n_test_days": int(len(test)), "unhealthy_test_days": int(high.sum()),
           "models": rows}
    (REPORTS_DIR / "model_comparison.json").write_text(json.dumps(out, indent=2))
    write_report(out)

    keep = pd.DataFrame({
        "date": test["date"].to_numpy(),
        "county_code": test["county_code"].astype(int).to_numpy(),
        "actual": y_te})
    keep["county_name"] = keep["county_code"].map(names)
    for name, p in preds.items():
        keep[name] = np.clip(p, 0, None).round(1)
    keep.to_parquet(ARTIFACTS_DIR / "comparison_predictions.parquet", index=False)

    for r in rows:
        print(f"  {r['model']:<22} MAE {r['mae']:6.2f}  cat {r['category_accuracy']:.1%}  "
              f"({r['seconds']}s)")


def write_report(out):
    lines = [
        "# Model Comparison", "",
        f"All models are scored on the same {out['n_test_days']:,} county-days "
        f"({out['test_start']} to {out['test_end']}). Training data ends 2022-12-31. "
        "Settings were picked on 2023.", "",
        "| Rank | Model | MAE | RMSE | Category accuracy | vs. persistence | "
        f"MAE on unhealthy days ({out['unhealthy_test_days']}) | Train time |",
        "| --: | :-- | --: | --: | --: | --: | --: | --: |",
    ]
    for i, r in enumerate(out["models"], 1):
        lines.append(
            f"| {i} | {r['model']} | {r['mae']:.2f} | {r['rmse']:.2f} | "
            f"{r['category_accuracy']:.1%} | {r['mae_vs_persistence']:+.1%} | "
            f"{r['mae_unhealthy_days']:.1f} | {r['seconds']}s |")
    lines += ["", "## What each model is", ""]
    for r in out["models"]:
        settings = f" Settings: `{json.dumps(r['settings'])}`." if r["settings"] else ""
        lines.append(f"- **{r['model']}**: {r['about']}{settings}")
    (REPORTS_DIR / "model_comparison.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
