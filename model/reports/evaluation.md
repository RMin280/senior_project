# Model Evaluation Report

Test period: 2024-01-01 to 2026-11-04 (model trained on data through 2022-12-31, tuned on 2023).

Task: predict tomorrow's overall AQI for each Texas county with EPA monitors.

## Results (same test days for every model)

| Model | MAE | RMSE | Category accuracy |
| :-- | --: | --: | --: |
| persistence (tomorrow = today) | 10.98 | 26.59 | 77.0% |
| seasonal average (county x month) | 12.25 | 23.98 | 71.6% |
| 7-day average | 12.16 | 23.67 | 72.3% |
| LightGBM | 8.29 | 20.38 | 81.7% |

## Proposal targets

- MAE at least 15% lower than baseline: 24.5% vs best baseline (persistence (tomorrow = today)), 32.3% vs seasonal average -> met (best baseline), met (seasonal average)
- Category accuracy at least 70%: 81.7% -> met

## Error by true AQI category

| Category | MAE | Days |
| :-- | --: | --: |
| Good | 5.7 | 27598 |
| Moderate | 9.7 | 14356 |
| Unhealthy for Sensitive Groups | 40.3 | 843 |
| Unhealthy | 81.4 | 124 |
| Very Unhealthy | 154.4 | 17 |
| Hazardous | 545.2 | 22 |

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
| El Paso | 28.7 | 1039 |
| Harris | 11.9 | 1039 |
| Cameron | 11.8 | 1039 |
| Tarrant | 11.3 | 1039 |
| Denton | 10.3 | 1039 |
| Dallas | 9.9 | 1039 |
| Bexar | 9.8 | 1039 |
| Collin | 9.2 | 1023 |
| Atascosa | 9.0 | 971 |
| Kleberg | 8.9 | 460 |
