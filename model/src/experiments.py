"""Accuracy experiments: can category accuracy go up, and why do papers report 92-98%?

All runs use the same time split as train.py (train <= 2022, tune 2023, test 2024+),
except the "random split" run, which shows what happens when days are shuffled.

Experiments
  A. current model (LightGBM regression, binned into categories)
  B. A + new inputs: each pollutant's AQI today (AirNow), nearby counties' AQI today
  C. LightGBM classifier on the 6 categories directly, same inputs as B
  D. C with class weights (rare unhealthy days count more)
  E. B with a RANDOM train/test split (leaks neighbouring days between train and test)

Output: reports/accuracy_experiments.md / .json
Run:    python src/experiments.py      (~5 minutes)
"""
import json

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, balanced_accuracy_score, f1_score

from config import DATA_DIR, REPORTS_DIR, TRAIN_END, VAL_END, aqi_category_index
from features import build_features, feature_columns, load_raw

SEED = 0
NEIGHBOR_KM = 150
REG = dict(objective="l1", learning_rate=0.03, num_leaves=63, min_child_samples=50,
           subsample=0.8, subsample_freq=1, colsample_bytree=0.8, n_estimators=3000,
           verbose=-1, random_state=SEED)


def add_new_features(df: pd.DataFrame) -> pd.DataFrame:
    # Each pollutant's AQI today (AirNow, from 2021; earlier days stay blank)
    an = pd.read_parquet(DATA_DIR / "airnow_county.parquet")
    cols = [c for c in an.columns if c.startswith("aqi_")]
    an = an[["county_code", "date"] + cols].rename(columns={c: f"today_{c}" for c in cols})
    df = df.assign(cc=df["county_code"].astype(int)).merge(
        an.rename(columns={"county_code": "cc"}), on=["cc", "date"], how="left")

    # Nearby counties' AQI today (pollution travels), and the statewide average
    counties = pd.read_csv(DATA_DIR / "counties.csv").set_index("county_code")
    lat, lon = np.radians(counties["lat"].to_numpy()), np.radians(counties["lon"].to_numpy())
    d = 6371 * 2 * np.arcsin(np.sqrt(
        np.sin((lat[:, None] - lat[None]) / 2) ** 2
        + np.cos(lat[:, None]) * np.cos(lat[None]) * np.sin((lon[:, None] - lon[None]) / 2) ** 2))
    near = (d < NEIGHBOR_KM) & (d > 0)
    wide = df.pivot_table(index="date", columns="cc", values="aqi_today").reindex(
        columns=counties.index)
    vals = wide.to_numpy()
    has = ~np.isnan(vals)
    filled = np.nan_to_num(vals)
    num = filled @ near.T.astype(float)
    cnt = has.astype(float) @ near.T.astype(float)
    nbr = pd.DataFrame(np.where(cnt > 0, num / np.maximum(cnt, 1), np.nan),
                       index=wide.index, columns=counties.index)
    nbr_max = pd.DataFrame(
        [[np.nanmax(row[near[j]]) if has[i][near[j]].any() else np.nan
          for j in range(len(counties))] for i, row in enumerate(vals)],
        index=wide.index, columns=counties.index)
    long = lambda w, name: w.stack(future_stack=True).rename(name).reset_index().rename(
        columns={"level_1": "cc", "county_code": "cc"})
    df = df.merge(long(nbr, "nearby_mean_aqi"), on=["date", "cc"], how="left")
    df = df.merge(long(nbr_max, "nearby_max_aqi"), on=["date", "cc"], how="left")
    df = df.merge(wide.mean(axis=1).rename("texas_mean_aqi").reset_index(), on="date", how="left")
    return df.drop(columns="cc")


def scores(y_true, y_pred_cat, y_pred_aqi=None):
    t = aqi_category_index(y_true)
    out = {"accuracy": accuracy_score(t, y_pred_cat),
           "balanced_accuracy": balanced_accuracy_score(t, y_pred_cat),
           "macro_f1": f1_score(t, y_pred_cat, average="macro", labels=range(6), zero_division=0),
           "f1_unhealthy": f1_score(t >= 2, y_pred_cat >= 2, zero_division=0)}
    if y_pred_aqi is not None:
        out["mae"] = float(np.mean(np.abs(y_pred_aqi - y_true)))
    return out


def fit_reg(tr, va, feats):
    m = lgb.LGBMRegressor(**REG)
    m.fit(tr[feats], tr["target"], eval_X=(va[feats],), eval_y=(va["target"],),
          callbacks=[lgb.early_stopping(100, verbose=False)])
    return m


def fit_clf(tr, va, feats, weighted):
    y_tr, y_va = aqi_category_index(tr["target"].to_numpy()), aqi_category_index(va["target"].to_numpy())
    params = {k: v for k, v in REG.items() if k != "objective"}
    m = lgb.LGBMClassifier(objective="multiclass", num_class=6,
                           class_weight="balanced" if weighted else None, **params)
    m.fit(tr[feats], y_tr, eval_X=(va[feats],), eval_y=(y_va,),
          callbacks=[lgb.early_stopping(100, verbose=False)])
    return m


def main():
    aqi, weather = load_raw()
    base = build_features(aqi, weather)
    base = base[base["target"].notna()].copy()
    old_feats = feature_columns(base)
    df = add_new_features(base)
    new_feats = old_feats + [c for c in df.columns if c.startswith("today_aqi_")] + \
        ["nearby_mean_aqi", "nearby_max_aqi", "texas_mean_aqi"]

    tr = df[df["date"] <= TRAIN_END]
    va = df[(df["date"] > TRAIN_END) & (df["date"] <= VAL_END)]
    te = df[df["date"] > VAL_END]
    y = te["target"].to_numpy()
    res = {}

    print("  persistence")
    p = te["aqi_today"].fillna(te["aqi_mean7"]).to_numpy()
    ok = ~np.isnan(p)
    res["Persistence (tomorrow = today)"] = scores(y[ok], aqi_category_index(p[ok]), p[ok])

    print("  A current model")
    a = fit_reg(tr, va, old_feats).predict(te[old_feats])
    res["A. Current model"] = scores(y, aqi_category_index(a), a)

    print("  B + pollutant levels and nearby counties")
    mb = fit_reg(tr, va, new_feats)
    b = mb.predict(te[new_feats])
    res["B. + pollutant levels, nearby counties"] = scores(y, aqi_category_index(b), b)

    print("  C classifier")
    c = fit_clf(tr, va, new_feats, weighted=False).predict(te[new_feats])
    res["C. Classifier on categories"] = scores(y, c)

    print("  D classifier with class weights")
    d = fit_clf(tr, va, new_feats, weighted=True).predict(te[new_feats])
    res["D. Classifier + class weights"] = scores(y, d)

    print("  E random split (leaky)")
    shuffled = df.sample(frac=1, random_state=SEED)
    n = len(shuffled)
    rtr, rva, rte = shuffled[: int(.7 * n)], shuffled[int(.7 * n): int(.8 * n)], shuffled[int(.8 * n):]
    e = fit_reg(rtr, rva, new_feats).predict(rte[new_feats])
    res["E. B with a random split (leaky)"] = scores(rte["target"].to_numpy(), aqi_category_index(e), e)

    importance = (pd.Series(mb.booster_.feature_importance("gain"), index=new_feats)
                  .sort_values(ascending=False).head(10))
    out = {"test": [str(te["date"].min().date()), str(te["date"].max().date())],
           "n_test": int(len(te)), "results": res,
           "majority_class_accuracy": float((aqi_category_index(y) == 0).mean()),
           "top_features_B": list(importance.index)}
    (REPORTS_DIR / "accuracy_experiments.json").write_text(json.dumps(out, indent=2))

    lines = ["# Accuracy experiments", "",
             f"Test: {out['test'][0]} to {out['test'][1]} ({out['n_test']:,} county-days). "
             f"Always guessing \"Good\" scores {out['majority_class_accuracy']:.1%} accuracy.", "",
             "| Experiment | Accuracy | Balanced acc. | Macro-F1 | F1 on AQI > 100 | MAE |",
             "| :-- | --: | --: | --: | --: | --: |"]
    for k, r in res.items():
        mae = f"{r['mae']:.2f}" if "mae" in r else "-"
        lines.append(f"| {k} | {r['accuracy']:.1%} | {r['balanced_accuracy']:.3f} | "
                     f"{r['macro_f1']:.3f} | {r['f1_unhealthy']:.3f} | {mae} |")
    lines += ["", "Top inputs in B: " + ", ".join(out["top_features_B"]), ""]
    (REPORTS_DIR / "accuracy_experiments.md").write_text("\n".join(lines))
    print("\n".join(lines))


if __name__ == "__main__":
    main()
