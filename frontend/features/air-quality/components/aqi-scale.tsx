import { aqiColor, categories, scalePosition } from "@/lib/aqi"

/** Six equal bands, one per category, with a marker at the reading. */
export function AqiScale({ aqi }: { aqi: number }) {
  return (
    <div
      role="img"
      aria-label={`AQI ${aqi} on the scale from Good to Hazardous`}
      className="flex w-full max-w-xs flex-col gap-2"
    >
      <div className="relative flex h-4.5 items-center">
        <div className="flex h-1.5 w-full gap-0.5">
          {categories.map((category) => (
            <span
              key={category.key}
              className="flex-1 first:rounded-l last:rounded-r"
              style={{ background: aqiColor(category.key) }}
            />
          ))}
        </div>

        {/* -translate-x-1/2 centers the marker on its position instead of starting there. */}
        <span
          className="absolute top-0 size-4.5 -translate-x-1/2 rounded-full border-3 border-foreground bg-white shadow-sm"
          style={{ left: `${scalePosition(aqi)}%` }}
        />
      </div>

      <div className="flex justify-between text-xs font-medium text-muted-foreground">
        <span>Good</span>
        <span>Hazardous</span>
      </div>
    </div>
  )
}
