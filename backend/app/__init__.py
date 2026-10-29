"""Flask REST API for the Pollution Analyzer.

Endpoints (all JSON, all GET):
  /api/health
  /api/counties                          every county with EPA data + latest AQI
  /api/counties/<code>                   one county
  /api/counties/<code>/history?start=&end=   daily AQI (default: last 365 days)
  /api/counties/<code>/forecast          tomorrow's AQI forecast
  /api/forecast                          forecasts for all counties
  /api/zip/<zip>                         zip -> county, latest AQI, forecast
  /api/model                             model accuracy numbers
"""
import re
from pathlib import Path

import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

from .store import ROOT, DataStore

DEFAULTS = {
    "DATA_DIR": ROOT / "model" / "data",
    "MODEL_PATH": ROOT / "model" / "artifacts" / "model.joblib",
    "METRICS_PATH": ROOT / "model" / "reports" / "metrics.json",
    "ZIP_PATH": ROOT / "backend" / "data" / "zip_county.csv",
    "CORS_ORIGINS": ["http://localhost:3000"],
}


def error(status, message):
    return jsonify({"error": message}), status


def create_app(overrides=None):
    app = Flask(__name__)
    app.config.update(DEFAULTS)
    app.config.update(overrides or {})
    CORS(app, origins=app.config["CORS_ORIGINS"])

    store = DataStore(Path(app.config["DATA_DIR"]), Path(app.config["MODEL_PATH"]),
                      Path(app.config["METRICS_PATH"]), Path(app.config["ZIP_PATH"]))
    app.extensions["store"] = store

    def county_or_404(code):
        return store.has_county(code)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "counties": len(store.counties),
                        "data_through": store.data_end.strftime("%Y-%m-%d")})

    @app.get("/api/counties")
    def counties():
        return jsonify(store.list_counties())

    @app.get("/api/counties/<int:code>")
    def county(code):
        if not county_or_404(code):
            return error(404, f"no data for county {code}")
        return jsonify(store.county(code))

    @app.get("/api/counties/<int:code>/history")
    def history(code):
        if not county_or_404(code):
            return error(404, f"no data for county {code}")
        start, end = request.args.get("start"), request.args.get("end")
        try:
            s = pd.Timestamp(start) if start else None
            e = pd.Timestamp(end) if end else None
        except ValueError:
            return error(400, "start/end must be dates like 2025-01-31")
        if s is not None and e is not None and s > e:
            return error(400, "start must be before end")
        return jsonify(store.history(code, start, end))

    @app.get("/api/counties/<int:code>/forecast")
    def county_forecast(code):
        if not county_or_404(code):
            return error(404, f"no data for county {code}")
        fc = store.forecast(code)
        if fc is None:
            return error(404, f"county {code} has no recent data, so no forecast")
        return jsonify(fc)

    @app.get("/api/forecast")
    def all_forecasts():
        return jsonify(store.all_forecasts())

    @app.get("/api/zip/<zip_code>")
    def by_zip(zip_code):
        if not re.fullmatch(r"\d{5}", zip_code):
            return error(400, "zip code must be 5 digits")
        result = store.lookup_zip(zip_code)
        if result is None:
            return error(404, f"{zip_code} is not a Texas zip code")
        return jsonify(result)

    @app.get("/api/model")
    def model_info():
        return jsonify(store.model_info())

    return app
