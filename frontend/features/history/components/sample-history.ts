// Mock data, replace with API data when available

export type DayReading = { aqi: number; kind: "measured" | "forecast" }

// Same sample "today" and forecast as the AQI card and forecast section
export const TODAY = new Date(2026, 9, 15)
const TODAY_AQI = 42
const FORECAST = [48, 57, 63]

export const EARLIEST_DAY = new Date(2021, 0, 1)
// Date rolls over into the next month on its own (Oct 31 + 3 days = Nov 3)
export const LAST_FORECAST_DAY = new Date(
  TODAY.getFullYear(),
  TODAY.getMonth(),
  TODAY.getDate() + FORECAST.length,
)

const DAY_MS = 24 * 60 * 60 * 1000

/** The reading for one date, or undefined when there's no data. */
export function getSampleReading(date: Date): DayReading | undefined {
  const daysFromToday = Math.round((date.getTime() - TODAY.getTime()) / DAY_MS)

  if (daysFromToday === 0) return { aqi: TODAY_AQI, kind: "measured" }
  if (daysFromToday > 0 && daysFromToday <= FORECAST.length) {
    return { aqi: FORECAST[daysFromToday - 1], kind: "forecast" }
  }
  if (daysFromToday > 0 || date < EARLIEST_DAY) return undefined

  // Past days: a seasonal base (worse in summer) with fixed pseudo-random variation
  const x =
    Math.sin(
      date.getFullYear() * 373 + date.getMonth() * 31 + date.getDate() * 7.13,
    ) * 10000
  const random = x - Math.floor(x)
  const seasonal = [36, 35, 38, 42, 50, 62, 70, 68, 56, 48, 40, 37][
    date.getMonth()
  ]
  const aqi = Math.round(seasonal * (0.65 + 0.7 * random))
  return { aqi: random > 0.965 ? aqi + 48 : aqi, kind: "measured" }
}
