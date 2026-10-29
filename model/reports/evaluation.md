# Model Evaluation Report

Test period: 2024-01-01 to 2026-04-29 (model trained on data through 2022-12-31, tuned on 2023).

Task: predict tomorrow's overall AQI for each Texas county with EPA monitors.

## Results (same test days for every model)

| Model | MAE | RMSE | Category accuracy |
| :-- | --: | --: | --: |
| persistence (tomorrow = today) | 11.08 | 28.37 | 77.3% |
| seasonal average (county x month) | 12.16 | 25.13 | 72.5% |
| 7-day average | 11.92 | 24.65 | 73.5% |
| LightGBM | 8.32 | 21.75 | 81.8% |

## Proposal targets

- MAE at least 15% lower than baseline: 24.9% vs best baseline (persistence (tomorrow = today)), 31.5% vs seasonal average -> met (best baseline), met (seasonal average)
- Category accuracy at least 70%: 81.8% -> met

## Error by true AQI category

| Category | MAE | Days |
| :-- | --: | --: |
| Good | 5.7 | 22567 |
| Moderate | 9.9 | 10998 |
| Unhealthy for Sensitive Groups | 40.5 | 647 |
| Unhealthy | 80.8 | 102 |
| Very Unhealthy | 156.0 | 13 |
| Hazardous | 573.4 | 20 |

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
| El Paso | 31.2 | 821 |
| Cameron | 12.9 | 820 |
| Harris | 11.9 | 821 |
| Tarrant | 10.9 | 821 |
| Bexar | 10.1 | 821 |
| Dallas | 9.8 | 820 |
| Denton | 9.8 | 820 |
| Atascosa | 9.2 | 766 |
| Hidalgo | 9.0 | 820 |
| Montgomery | 9.0 | 781 |
