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
