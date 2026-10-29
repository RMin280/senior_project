"""'Would I want to live here?' summary of a county's long-term air quality.

Clean Air Score (0-100) = the average day, where each day earns points by its
AQI category: Good 100, Moderate 60, Unhealthy for Sensitive Groups 20,
anything worse 0. Computed over the last 5 full years.
"""
import numpy as np
import pandas as pd

CATEGORY_POINTS = [(50, 100), (100, 60), (150, 20)]   # (AQI upper bound, points); worse = 0
# A ~ nearly every day Good; F ~ most days Moderate with 30+ unhealthy days a year
GRADES = [(93, "A"), (85, "B"), (77, "C"), (70, "D"), (0, "F")]
YEARS = 5
MAIN_POLLUTANTS = {"PM2.5", "Ozone"}


def day_points(aqi: pd.Series) -> np.ndarray:
    conds = [aqi <= 50, aqi <= 100, aqi <= 150]
    return np.select(conds, [p for _, p in CATEGORY_POINTS], default=0)


def grade(score: float) -> str:
    return next(g for cutoff, g in GRADES if score >= cutoff)


def county_summaries(aqi: pd.DataFrame) -> dict:
    """aqi: county_code, date, aqi, defining_parameter. Returns {county_code: summary}."""
    end = aqi["date"].max()
    last_full = end.year if (end.month, end.day) == (12, 31) else end.year - 1
    first = last_full - YEARS + 1
    out = {}
    for code, g in aqi.groupby("county_code"):
        g = g.assign(year=g["date"].dt.year, month=g["date"].dt.month)
        recent = g[g["year"].between(first, last_full)]
        if recent.empty:
            continue
        a = recent["aqi"]
        n_expected = (pd.Timestamp(f"{last_full}-12-31") - pd.Timestamp(f"{first}-01-01")).days + 1
        drivers = recent["defining_parameter"].value_counts(normalize=True)
        main_share = float(drivers[drivers.index.isin(MAIN_POLLUTANTS)].sum())

        notes = []
        if main_share < 0.5:
            notes.append(f"Monitors here mostly measure {drivers.index[0]}, not ozone or "
                         "fine particles, so the score likely overstates how clean the air is.")
        coverage = len(recent) / n_expected
        if coverage < 0.7:
            notes.append(f"Only {coverage:.0%} of days in {first}-{last_full} have data.")

        yearly = []
        for y, yg in g[g["year"] <= last_full].groupby("year"):
            if len(yg) < 200:      # skip years with too little data to be fair
                continue
            yearly.append({"year": int(y), "mean_aqi": round(float(yg["aqi"].mean()), 1),
                           "pct_good": round(float((yg["aqi"] <= 50).mean()), 3),
                           "unhealthy_days": int((yg["aqi"] > 100).sum()),
                           "score": round(float(day_points(yg["aqi"]).mean()), 1)})
        trend = None
        if len(yearly) >= 4:
            ys = np.array([r["year"] for r in yearly])
            ms = np.array([r["mean_aqi"] for r in yearly])
            slope = float(np.polyfit(ys, ms, 1)[0])
            trend = {"aqi_per_year": round(slope, 2),
                     "direction": "improving" if slope < -0.3 else
                                  "worsening" if slope > 0.3 else "steady"}

        monthly = recent.groupby("month")["aqi"].mean()
        score = float(day_points(a).mean())
        out[int(code)] = {
            "county_code": int(code),
            "years": [first, last_full],
            "score": round(score, 1),
            "grade": grade(score),
            "median_aqi": float(a.median()),
            "pct_good": round(float((a <= 50).mean()), 3),
            "pct_moderate": round(float(((a > 50) & (a <= 100)).mean()), 3),
            "unhealthy_days_per_year": round(float((a > 100).sum()) / YEARS, 1),
            "worst_aqi": int(a.max()),
            "worst_months": [int(m) for m in monthly.sort_values(ascending=False).index[:2]],
            "monthly_mean_aqi": {int(m): round(float(v), 1) for m, v in monthly.items()},
            "main_pollutants": {k: round(float(v), 3) for k, v in drivers.head(3).items()},
            "yearly": yearly,
            "trend": trend,
            "reliable": not notes,
            "notes": notes,
        }

    # Rank reliable counties only (1 = cleanest)
    ranked = sorted((s for s in out.values() if s["reliable"]),
                    key=lambda s: s["score"], reverse=True)
    for i, s in enumerate(ranked, 1):
        s["rank"], s["rank_of"] = i, len(ranked)
    for s in out.values():
        s.setdefault("rank", None)
        s.setdefault("rank_of", len(ranked))
    return out
