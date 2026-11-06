export type AQICategory = {
  key:
    | "good"
    | "moderate"
    | "sensitive"
    | "unhealthy"
    | "very-unhealthy"
    | "hazardous"
  name: string
  lo: number
  hi: number
}

export const categories: AQICategory[] = [
  { key: "good", name: "Good", lo: 0, hi: 50 },
  { key: "moderate", name: "Moderate", lo: 51, hi: 100 },
  {
    key: "sensitive",
    name: "Unhealthy for Sensitive Groups",
    lo: 101,
    hi: 150,
  },
  { key: "unhealthy", name: "Unhealthy", lo: 151, hi: 200 },
  { key: "very-unhealthy", name: "Very Unhealthy", lo: 201, hi: 300 },
  { key: "hazardous", name: "Hazardous", lo: 301, hi: 500 },
]

type ColorShade = "fill" | "tint" | "ink"

/** CSS color for a category, from the --aqi-* variables in globals.css. */
export function aqiColor(key: AQICategory["key"], shade: ColorShade = "fill") {
  return shade === "fill" ? `var(--aqi-${key})` : `var(--aqi-${key}-${shade})`
}

export function getCategory(aqi: number) {
  const index = categories.findIndex((c) => aqi <= c.hi)
  const i = index === -1 ? categories.length - 1 : index
  return { ...categories[i], index: i }
}

export function scalePosition(aqi: number) {
  const category = getCategory(aqi)
  const bandWidth = 100 / categories.length

  const bandSize = category.hi - category.lo
  let fraction = (aqi - category.lo) / bandSize
  fraction = Math.min(1, Math.max(0, fraction))

  return category.index * bandWidth + fraction * bandWidth
}
