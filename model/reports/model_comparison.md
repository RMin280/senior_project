# Model Comparison

All models are scored on the same 34,313 county-days (2024-01-01 to 2026-03-30). Training data ends 2022-12-31. Settings were picked on 2023.

| Rank | Model | MAE | RMSE | Category accuracy | vs. persistence | MAE on unhealthy days (782) | Train time |
| --: | :-- | --: | --: | --: | --: | --: | --: |
| 1 | LightGBM | 8.32 | 21.74 | 81.8% | +24.9% | 61.3 | 14.7s |
| 2 | Neural network (MLP) | 8.78 | 22.75 | 80.8% | +20.7% | 55.4 | 26.5s |
| 3 | SVM (RBF kernel) | 8.94 | 22.87 | 80.7% | +19.2% | 67.4 | 125.2s |
| 4 | Random forest | 9.01 | 21.98 | 80.1% | +18.6% | 60.2 | 14.4s |
| 5 | k-nearest neighbors | 9.51 | 22.56 | 79.3% | +14.1% | 65.9 | 6.9s |
| 6 | Ridge regression | 9.65 | 22.99 | 79.2% | +12.9% | 60.5 | 0.5s |
| 7 | Persistence | 11.07 | 28.37 | 77.3% | +0.0% | 57.4 | 0.0s |
| 8 | Seasonal average | 12.15 | 25.13 | 72.5% | -9.7% | 83.4 | 0.0s |

## What each model is

- **LightGBM**: Gradient-boosted trees: each tree fixes the previous trees' mistakes. Settings: `{"best_iteration": 2954}`.
- **Neural network (MLP)**: Two hidden layers (64, 32) trained with early stopping. Settings: `{"hidden_layer_sizes": [64, 32]}`.
- **SVM (RBF kernel)**: Support vector regression with a curved (RBF) kernel. Trained on a 20,000-row sample (cost grows with rows squared). Settings: `{"C": 50}`.
- **Random forest**: Hundreds of decision trees, each on a random slice of the data, averaged. Settings: `{"n_estimators": 200, "min_samples_leaf": 5}`.
- **k-nearest neighbors**: Finds the k most similar past days and averages what happened next. Settings: `{"n_neighbors": 25}`.
- **Ridge regression**: A straight-line (linear) combination of the features. Settings: `{"alpha": 0.1}`.
- **Persistence**: Tomorrow = today. The simplest possible forecast.
- **Seasonal average**: Average AQI for that county and month in the training years.
