import { aqiColor, categories, scalePosition } from "@/lib/aqi"
import { cn } from "@/lib/utils"

/* AQI Scale from Good to Hazardous, line chart. Capped at max-w-xs unless className overrides it. */
export function AqiScale({
  aqi,
  className,
}: {
  aqi: number
  className?: string
}) {
  return (
    <div
      role="img"
      aria-label={`AQI ${aqi} on the scale from Good to Hazardous`}
      className={cn("flex w-full max-w-xs flex-col gap-2", className)}
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
