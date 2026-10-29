# Backend: Flask REST API

Serves AQI history and next-day forecasts to the frontend. Everything is loaded into memory at startup (~3 s), so requests take a few milliseconds.

## Setup and run

You need the model data and a trained model first. See [../model/README.md](../model/README.md).

```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt   # Windows (Mac/Linux: .venv/bin/pip)
.venv/Scripts/python run.py                     # http://localhost:5000/api/health
.venv/Scripts/python -m pytest                  # tests (no real data needed)
```

`data/zip_county.csv` (Texas zip → county) is committed. To rebuild it from Census files, run `python build_zip_lookup.py`.

## Endpoints

All endpoints are `GET` and return JSON. Errors look like `{"error": "..."}` with status 400 or 404.

County codes are EPA's 3-digit Texas county codes: Dallas = 113, Harris = 201, Travis = 453, El Paso = 141.

| Endpoint | Returns |
| :-- | :-- |
| `/api/health` | `{status, counties, data_through}` |
| `/api/zip/<zip>` | Zip → county, latest AQI and forecast. If the zip's county has no recent monitor data, it uses the nearest county that does (`uses_nearest_county: true`, `distance_km`). |
| `/api/counties` | Every county with data: `{county_code, county_name, lat, lon, latest_date, latest_aqi, latest_category, has_forecast}` |
| `/api/counties/<code>` | One county (same fields) |
| `/api/counties/<code>/history?start=YYYY-MM-DD&end=YYYY-MM-DD` | `{points: [{date, aqi, category, driver}]}`. Defaults to the last 365 days. `driver` is the pollutant behind that day's AQI. |
| `/api/counties/<code>/forecast` | `{forecast_date, predicted_aqi, category, expected_error}`. Returns 404 if the county stopped reporting. |
| `/api/forecast` | Forecasts for all counties |
| `/api/model` | Model accuracy numbers for the "how accurate is this" display |

Example: `GET /api/zip/75201` returns

```json
{
  "zip": "75201", "home_county_name": "Dallas", "uses_nearest_county": false, "distance_km": 0.0,
  "county": {"county_code": 113, "county_name": "Dallas", "latest_aqi": 41, "latest_category": "Good", "...": "..."},
  "forecast": {"forecast_date": "2026-04-01", "predicted_aqi": 45, "category": "Good", "expected_error": 9.8}
}
```

`expected_error` means the model is usually within about ±N AQI points for that county.

## Layout

- `app/__init__.py`: routes
- `app/store.py`: loads data and model, answers queries. When the PostgreSQL database is ready, this is the only file that needs to change.
- `tests/`: API and model tests on a small fake dataset (95% coverage)
- CORS allows `http://localhost:3000` (the Next.js dev server). Change `CORS_ORIGINS` in `app/__init__.py` for deployment.

## Not done yet

- **Database:** reads the model's parquet files instead of PostgreSQL (Arjun's schema).
- **Live data:** EPA files lag by months, so "latest" is currently end of March 2026. Live forecasts need AirNow plus the Open-Meteo forecast API, and a daily refresh job.
