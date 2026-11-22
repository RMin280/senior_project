# Model Evaluation Report

Test period: 2024-01-01 to 2026-11-18 (model trained on data through 2022-12-31, tuned on 2023).

Task: predict tomorrow's overall AQI for each Texas county with EPA monitors.

## Results (same test days for every model)

| Model | MAE | RMSE | Category accuracy |
| :-- | --: | --: | --: |
| persistence (tomorrow = today) | 10.95 | 26.45 | 77.1% |
| seasonal average (county x month) | 12.20 | 23.86 | 71.7% |
| 7-day average | 12.11 | 23.55 | 72.4% |
| LightGBM | 8.27 | 20.28 | 81.8% |

## Proposal targets

- MAE at least 15% lower than baseline: 24.5% vs best baseline (persistence (tomorrow = today)), 32.3% vs seasonal average -> met (best baseline), met (seasonal average)
- Category accuracy at least 70%: 81.8% -> met

## Error by true AQI category

| Category | MAE | Days |
| :-- | --: | --: |
| Good | 5.7 | 28041 |
| Moderate | 9.7 | 14462 |
| Unhealthy for Sensitive Groups | 40.3 | 844 |
| Unhealthy | 81.5 | 124 |
| Very Unhealthy | 154.1 | 17 |
| Hazardous | 546.0 | 22 |

## Top 10 features (by gain)

- aqi_today
- county_code
- aqi_mean30
- wx_tmrw_temperature_2m_max
- aqi_mean7
- wx_tmrw_wind_speed_10m_max
- wx_tmrw_wind_dir_cos
- doy_sin
- wx_tmrw_relative_humidity_2m_mean
- wx_tmrw_precipitation_sum

## Error by county (worst 10)

| County | MAE | Days |
| :-- | --: | --: |
| El Paso | 28.5 | 1053 |
| Harris | 11.9 | 1053 |
| Cameron | 11.7 | 1053 |
| Tarrant | 11.3 | 1053 |
| Denton | 10.2 | 1053 |
| Dallas | 9.9 | 1053 |
| Bexar | 9.7 | 1053 |
| Collin | 9.1 | 1037 |
| Atascosa | 9.1 | 985 |
| Kleberg | 8.9 | 460 |
