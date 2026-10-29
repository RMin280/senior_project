import pandas as pd

from app.livability import county_summaries, day_points, grade


def test_day_points_by_category():
    assert list(day_points(pd.Series([10, 50, 51, 100, 101, 150, 151]))) == \
        [100, 100, 60, 60, 20, 20, 0]


def test_grade_cutoffs():
    assert [grade(s) for s in (99, 93, 92.9, 85, 77, 70, 10)] == ["A", "A", "B", "B", "C", "D", "F"]


def make(code, aqi, param="PM2.5", years=range(2019, 2025)):
    dates = pd.date_range(f"{min(years)}-01-01", f"{max(years)}-12-31")
    return pd.DataFrame({"county_code": code, "date": dates, "aqi": aqi,
                         "defining_parameter": param})


def test_summary_ranks_and_flags():
    df = pd.concat([make(1, 30), make(2, 80), make(3, 5, param="NO2")])
    s = county_summaries(df)
    assert s[1]["score"] == 100 and s[1]["rank"] == 1
    assert s[2]["score"] == 60 and s[2]["rank"] == 2 and s[2]["grade"] == "F"
    assert s[3]["reliable"] is False and s[3]["rank"] is None   # NO2-only monitors
    assert s[1]["years"] == [2020, 2024]
    assert s[1]["trend"]["direction"] == "steady"
