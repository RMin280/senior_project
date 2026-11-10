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
        {/* Segments are split by a see-through 4px border instead of a gap. Browsers round
            border widths to whole screen pixels, so every split is the same width; a gap can
            land on a fraction of a pixel at 125% display scaling and get drawn wider or narrower. */}
        <div className="flex h-1.5 w-full">
          {categories.map((category) => (
            <span
              key={category.key}
              className="flex-1 border-l-4 border-transparent bg-clip-padding first:rounded-l first:border-l-0 last:rounded-r"
              style={{ backgroundColor: aqiColor(category.key) }}
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
