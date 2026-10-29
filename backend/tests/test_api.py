import time


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.get_json()["status"] == "ok"


def test_counties_list(client):
    data = client.get("/api/counties").get_json()
    codes = {c["county_code"] for c in data}
    assert codes == {113, 201, 149}
    fayette = next(c for c in data if c["county_code"] == 149)
    assert fayette["has_forecast"] is False


def test_county_unknown_is_404(client):
    assert client.get("/api/counties/999").status_code == 404


def test_history_default_last_year(client):
    data = client.get("/api/counties/113/history").get_json()
    assert data["end"] == "2025-12-31"
    assert len(data["points"]) > 300
    p = data["points"][0]
    assert set(p) == {"date", "aqi", "category", "driver"}


def test_history_date_range(client):
    data = client.get("/api/counties/113/history?start=2025-06-01&end=2025-06-10").get_json()
    assert [p["date"] for p in data["points"]][0] == "2025-06-01"
    assert len(data["points"]) == 10


def test_history_bad_dates(client):
    assert client.get("/api/counties/113/history?start=nope").status_code == 400
    assert client.get(
        "/api/counties/113/history?start=2025-06-10&end=2025-06-01").status_code == 400


def test_forecast_shape(client):
    fc = client.get("/api/counties/113/forecast").get_json()
    assert fc["forecast_date"] == "2026-01-01"
    assert isinstance(fc["predicted_aqi"], int)
    assert fc["category"] in {"Good", "Moderate", "Unhealthy for Sensitive Groups",
                              "Unhealthy", "Very Unhealthy", "Hazardous"}
    assert fc["expected_error"] == 7.5           # county-specific error
    assert client.get("/api/counties/201/forecast").get_json()["expected_error"] == 8.0


def test_no_forecast_for_inactive_county(client):
    assert client.get("/api/counties/149/forecast").status_code == 404
    codes = {f["county_code"] for f in client.get("/api/forecast").get_json()}
    assert codes == {113, 201}


def test_zip_in_monitored_county(client):
    data = client.get("/api/zip/75201").get_json()
    assert data["county"]["county_code"] == 113
    assert data["uses_nearest_county"] is False
    assert data["forecast"]["county_code"] == 113


def test_zip_falls_back_to_nearest_county(client):
    data = client.get("/api/zip/78945").get_json()   # Fayette has no recent data
    assert data["home_county_name"] == "Fayette"
    assert data["uses_nearest_county"] is True
    assert data["county"]["county_code"] == 201       # Harris is closer than Dallas
    assert data["distance_km"] > 0


def test_zip_errors(client):
    assert client.get("/api/zip/abc").status_code == 400
    assert client.get("/api/zip/1234").status_code == 400
    assert client.get("/api/zip/10001").status_code == 404


def test_model_info(client):
    data = client.get("/api/model").get_json()
    assert data["model"] == "LightGBM"
    assert data["overall_expected_error"] == 8.0


def test_response_time_under_500ms(client):
    for url in ["/api/counties", "/api/counties/113/history",
                "/api/forecast", "/api/zip/75201"]:
        t = time.perf_counter()
        client.get(url)
        assert time.perf_counter() - t < 0.5, url


def test_cors_allows_frontend(client):
    r = client.get("/api/health", headers={"Origin": "http://localhost:3000"})
    assert r.headers.get("Access-Control-Allow-Origin") == "http://localhost:3000"
