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


def test_summary_and_rankings(client):
    s = client.get("/api/counties/113/summary").get_json()
    assert s["county_name"] == "Dallas" and s["grade"] in "ABCDF"
    assert client.get("/api/counties/999/summary").status_code == 404
    r = client.get("/api/rankings").get_json()
    assert {x["county_code"] for x in r} == {113, 201, 149}


def test_model_comparison(client):
    assert client.get("/api/models/comparison").get_json()["models"][0]["model"] == "LightGBM"
    p = client.get("/api/models/predictions/113?start=2025-12-05").get_json()
    assert p["models"] == ["LightGBM", "Persistence"]
    assert len(p["dates"]) == 6 and p["actual"][0] == 40
    assert client.get("/api/models/predictions/201").status_code == 404   # no rows


def test_demo_page_served(client):
    r = client.get("/demo/")
    assert r.status_code == 200 and b"Texas Air Check" in r.data
    assert client.get("/").status_code == 302


def test_zip_has_its_own_location(client):
    data = client.get("/api/zip/75201").get_json()
    assert data["zip_lat"] == 32.79 and data["zip_lon"] == -96.8


def test_pollutants(client):
    p = client.get("/api/counties/113/pollutants?days=3").get_json()
    assert set(p["pollutants"]) == {"Ozone", "PM2.5"}
    assert [x["aqi"] for x in p["pollutants"]["Ozone"]] == [40, 45, 50]
    assert [x["aqi"] for x in p["pollutants"]["PM2.5"]] == [30, 55]   # missing day skipped
    assert p["latest"]["PM2.5"] == {"date": "2025-12-31", "aqi": 55}
    assert client.get("/api/counties/201/pollutants").get_json()["pollutants"] == {}
    assert client.get("/api/counties/113/pollutants?days=abc").status_code == 400


def test_map_points_worst_pollutant_per_site(client):
    m = client.get("/api/map").get_json()
    assert m["date"] == "2025-12-31"
    by_site = {s["site"]: s for s in m["sites"]}
    assert by_site["Dallas A"]["aqi"] == 50
    assert by_site["Dallas B"]["aqi"] == 55 and by_site["Dallas B"]["pollutant"] == "PM2.5"
