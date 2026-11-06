import { aqiColor, getCategory } from "@/lib/aqi"

/* AQI category chip with color and name */
export function AqiChip({ aqi }: { aqi: number }) {
  const category = getCategory(aqi)

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold"
      style={{
        background: aqiColor(category.key, "tint"),
        color: aqiColor(category.key, "ink"),
      }}
    >
      <span
        aria-hidden
        className="size-2.5 rounded-full"
        style={{ background: aqiColor(category.key) }}
      />
      {category.name}
    </span>
  )
}
