export type AQICategory = {
  key:
    | "good"
    | "moderate"
    | "sensitive"
    | "unhealthy"
    | "very-unhealthy"
    | "hazardous"
  name: string
  /** Plain-language summary shown on the AQI card. */
  description: string
  lo: number
  hi: number
}

export const categories: AQICategory[] = [
  {
    key: "good",
    name: "Good",
    description: "The air is clean. A good day to be outside.",
    lo: 0,
    hi: 50,
  },
  {
    key: "moderate",
    name: "Moderate",
    description:
      "The air is acceptable. People who are very sensitive to pollution may want to take it easy outside.",
    lo: 51,
    hi: 100,
  },
  {
    key: "sensitive",
    name: "Unhealthy for Sensitive Groups",
    description:
      "Children, older adults and people with heart or lung conditions should limit long or heavy activity outside.",
    lo: 101,
    hi: 150,
  },
  {
    key: "unhealthy",
    name: "Unhealthy",
    description: "Everyone should limit long or heavy activity outside.",
    lo: 151,
    hi: 200,
  },
  {
    key: "very-unhealthy",
    name: "Very Unhealthy",
    description: "Everyone should avoid long or heavy activity outside.",
    lo: 201,
    hi: 300,
  },
  {
    key: "hazardous",
    name: "Hazardous",
    description: "Everyone should stay indoors and keep activity light.",
    lo: 301,
    hi: 500,
  },
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
