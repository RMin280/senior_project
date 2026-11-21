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
.venv/Scripts/python src/download_data.py   # once: EPA AQI history + weather -> data/ (~10 min)
.venv/Scripts/python src/update_data.py     # daily: AirNow recent days + weather through tomorrow
                                            #   (first run backfills AirNow from 2021, ~5 min)
.venv/Scripts/python src/train.py           # baselines + LightGBM -> artifacts/, reports/
.venv/Scripts/python src/predict.py         # forecast the day after the latest data
```

Optional experiments (results are committed in `reports/`):

```bash
.venv/Scripts/python src/compare_models.py  # 8 model types on the same test days
.venv/Scripts/python src/experiments.py     # accuracy experiments (classifier, new inputs, random split)
```

To show current data, run `update_data.py` and then `train.py` each day, and restart the backend.

`data/` and `artifacts/` are gitignored and rebuilt by these scripts. `reports/` is committed.

## Data

| Source | What | Key needed |
| :-- | :-- | :-- |
| [EPA AirData](https://aqs.epa.gov/aqsweb/airdata/download_files.html) `daily_aqi_by_county_YYYY.zip` | Daily AQI per county, 2015 to now | No |
| EPA `aqs_sites.zip` | Monitor locations, used to place each county's weather point | No |
| [AirNow daily files](https://files.airnowtech.org/) `daily_data_v2.dat` | Yesterday's AQI per monitor and pollutant (ozone, PM2.5, PM10), 2021 to now | No |
| [Open-Meteo archive](https://open-meteo.com/en/docs/historical-weather-api) | Daily temperature, wind, humidity, rain (measured) | No |
| [Open-Meteo forecast](https://open-meteo.com/en/docs) | The last few days and tomorrow's weather | No |

EPA's files stop at 2026-03-31. After that, AirNow fills in. On the days both have (2021 to March 2026), they agree closely: correlation 0.93, average difference 3 AQI points, same category 91.5% of the time.

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
- **Final model:** after scoring, the saved model is refit on **all** data (2015 to the latest day) with the same settings. Reported scores are always the held-out ones.

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

**Live data:** `update_data.py` writes `data/aqi_combined.parquet` (EPA, then AirNow) and extends `data/weather.parquet` through tomorrow. `features.load_aqi()` picks up the combined file automatically.
