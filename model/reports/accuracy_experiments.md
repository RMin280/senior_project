# Accuracy experiments

Test: 2024-01-01 to 2026-11-04 (44,075 county-days). Always guessing "Good" scores 64.6% accuracy.

| Experiment | Accuracy | Balanced acc. | Macro-F1 | F1 on AQI > 100 | MAE |
| :-- | --: | --: | --: | --: | --: |
| Persistence (tomorrow = today) | 77.1% | 0.377 | 0.377 | 0.355 | 11.00 |
| A. Current model | 81.8% | 0.285 | 0.295 | 0.193 | 8.32 |
| B. + pollutant levels, nearby counties | 81.8% | 0.290 | 0.301 | 0.228 | 8.27 |
| C. Classifier on categories | 81.4% | 0.338 | 0.332 | 0.247 | - |
| D. Classifier + class weights | 79.1% | 0.355 | 0.350 | 0.383 | - |
| E. B with a random split (leaky) | 83.9% | 0.293 | 0.309 | 0.287 | 7.02 |

Top inputs in B: aqi_today, county_code, aqi_mean30, wx_tmrw_temperature_2m_max, aqi_mean7, wx_tmrw_wind_dir_cos, wx_tmrw_wind_speed_10m_max, wx_tmrw_relative_humidity_2m_mean, texas_mean_aqi, doy_sin
