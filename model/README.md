# Model: next-day AQI forecast for Texas counties

Predicts tomorrow's overall AQI (and its category) for every Texas county that has EPA air monitors.

## Setup (once)

```bash
cd model
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt     # Windows
# source .venv/bin/activate && pip install -r requirements.txt   # Mac/Linux
```

## Run

```bash
.venv/Scripts/python src/download_data.py   # EPA AQI + weather -> data/ (cached, re-runnable)
.venv/Scripts/python src/train.py           # baselines + LightGBM -> artifacts/, reports/
.venv/Scripts/python src/predict.py         # forecast the day after the latest data
```

`data/` and `artifacts/` are gitignored and rebuilt by these scripts. `reports/` is committed.

## Data

| Source | What | Key needed |
| :-- | :-- | :-- |
| [EPA AirData](https://aqs.epa.gov/aqsweb/airdata/download_files.html) `daily_aqi_by_county_YYYY.zip` | Daily AQI per county, 2015 to now | No |
| EPA `aqs_sites.zip` | Monitor locations, used to place each county's weather point | No |
| [Open-Meteo archive](https://open-meteo.com/en/docs/historical-weather-api) | Daily temperature, wind, humidity, rain | No |

## Approach

- **Target:** AQI on day t+1 for each county.
- **Features:**
  - AQI today and on days t-1, t-2, t-3 and t-7
  - 7-day and 30-day averages, plus the 7-day spread
  - which pollutant drove today's AQI
  - day of year, day of week and month
  - weather today and tomorrow
  - the county itself
- **Baselines:**
  - persistence (tomorrow = today)
  - seasonal average (county x month)
  - 7-day average
- **Model:** LightGBM, trained to minimize absolute error.
- **Split by date:**
  - train through 2022
  - 2023 to decide when to stop training
  - test on 2024 onward
- **Scoring:** every model is scored on the same test days.

Results are in [reports/evaluation.md](reports/evaluation.md). Raw numbers, including the expected error per county, are in [reports/metrics.json](reports/metrics.json).

## For the backend

```python
from predict import load_model, forecast
from features import build_features
bundle = load_model()
rows = build_features(aqi_df, weather_df)   # same columns as download_data.py output
forecast(bundle, latest_rows_per_county)
# -> county_code, county_name, forecast_date, predicted_aqi, category, expected_error
```

**Live data:** EPA files lag by months. For live forecasts, the backend needs:
- recent AQI from AirNow or OpenAQ
- tomorrow's weather from the Open-Meteo forecast API

Both go in the same columns.
