const API_URL = process.env.API_URL ?? "http://localhost:5000"

export type County = {
  county_code: number
  county_name: string
  lat: number
  lon: number
  latest_date: string
  latest_aqi: number
  latest_category: string
  has_forecast: boolean
}

export type Forecast = {
  county_code: number
  county_name: string
  forecast_date: string
  predicted_aqi: number
  category: string

  /* like += 1, -= 1, *= 1.5, etc. */
  expected_error: number
}

export type ZipResult = {
  zip: string
  /* center of the zip code */
  zip_lat: number
  zip_lon: number
  home_county_code: number
  home_county_name: string

  /* use nearest county for aqi */
  uses_nearest_county: boolean
  distance_km: number
  county: County
  forecast: Forecast | null
}

export async function getZip(zip: string): Promise<ZipResult | null> {
  const response = await fetch(`${API_URL}/api/zip/${encodeURIComponent(zip)}`)

  if (response.status === 400 || response.status === 404) return null
  if (!response.ok) throw new Error(`API returned ${response.status}`)
  return response.json()
}

/* one county's latest reading, or null if the API has no data for it */
export async function getCounty(countyCode: number): Promise<County | null> {
  const response = await fetch(`${API_URL}/api/counties/${countyCode}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`API returned ${response.status}`)
  return response.json()
}

/* a county's forecast for the day after its latest reading, or null if it stopped reporting */
export async function getForecast(
  countyCode: number,
): Promise<Forecast | null> {
  const response = await fetch(`${API_URL}/api/counties/${countyCode}/forecast`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`API returned ${response.status}`)
  return response.json()
}

export type HistoryPoint = {
  date: string
  aqi: number
  category: string

  /* pollutant behind that day's AQI */
  driver: string
}

/* load all readings for ocunties up front */
export async function getHistory(countyCode: number): Promise<HistoryPoint[]> {
  const response = await fetch(
    `${API_URL}/api/counties/${countyCode}/history?start=2015-01-01`,
  )

  if (!response.ok) throw new Error(`API returned ${response.status}`)
  const { points } = await response.json()
  return points
}

export type PollutantPoint = { date: string; aqi: number }

export type PollutantHistory = {
  county_code: number
  /* keyed by pollutant: "Ozone", "PM2.5", "PM10" */
  pollutants: Record<string, PollutantPoint[]>
  latest: Record<string, PollutantPoint>
}

/* daily AQI per pollutant (AirNow, 2021 on) for the last `days` days */
export async function getPollutants(
  countyCode: number,
  days = 1826,
): Promise<PollutantHistory | null> {
  const response = await fetch(
    `${API_URL}/api/counties/${countyCode}/pollutants?days=${days}`,
  )
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`API returned ${response.status}`)
  return response.json()
}

export type MonitorReading = {
  site: string
  lat: number
  lon: number
  aqi: number
  pollutant: string
  county_code: number
}

/* every monitor's AQI on the newest day, for the map */
export async function getMapPoints(): Promise<{
  date: string
  sites: MonitorReading[]
} | null> {
  const response = await fetch(`${API_URL}/api/map`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`API returned ${response.status}`)
  return response.json()
}

export type ModelScore = {
  /* typical miss in AQI points (mean absolute error) */
  mae: number
  rmse: number
  /* share of days forecast in the right AQI category, 0 to 1 */
  category_accuracy: number
  /* county-days scored */
  n: number
}

export type ModelInfo = {
  model: string
  target: string
  /* first and last held-out test day */
  test_period: [string, string]
  /* the model and each simple baseline, scored on the same test days */
  results: Record<string, ModelScore>
  /* how much smaller the model's typical miss is than the best baseline's, 0 to 1 */
  mae_improvement_vs_best_baseline: number
  overall_expected_error: number
}

/* how accurate the forecast model is, for the How it works page */
export async function getModelInfo(): Promise<ModelInfo> {
  const response = await fetch(`${API_URL}/api/model`)
  if (!response.ok) throw new Error(`API returned ${response.status}`)
  return response.json()
}

export type ComparedModel = {
  model: string
  /* one-line plain-language description */
  about: string
  mae: number
  category_accuracy: number
}

export type ModelComparison = {
  test_start: string
  test_end: string
  n_test_days: number
  models: ComparedModel[]
}

/* every model type that was tried, scored on the same test days; null if the comparison wasn't run */
export async function getModelComparison(): Promise<ModelComparison | null> {
  const response = await fetch(`${API_URL}/api/models/comparison`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`API returned ${response.status}`)
  return response.json()
}
