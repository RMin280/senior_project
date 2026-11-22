import { aqiColor, getCategory } from "@/lib/aqi"
import { cn } from "@/lib/utils"

export type DayReading = { aqi: number; kind: "measured" | "forecast" }

type DayCellProps = {
  day: number
  reading?: DayReading
  /* shown instead of the day number, e.g. "Latest" */
  label?: string
  selected: boolean
  onSelect: () => void
}

/** One calendar day: tinted when measured, dashed outline when forecast, plain when there's no reading. */
export function DayCell({
  day,
  reading,
  label,
  selected,
  onSelect,
}: DayCellProps) {
  if (!reading) {
    return (
      <div className="h-15 px-2 py-1.5 text-xs text-muted-foreground/70">
        {day}
      </div>
    )
  }

  const category = getCategory(reading.aqi)
  const isForecast = reading.kind === "forecast"

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex h-15 w-full cursor-pointer flex-col items-start justify-between rounded-lg border px-2 py-1.5 text-left text-foreground transition-colors",
        selected && "ring-2 ring-foreground",
      )}
      style={
        isForecast
          ? {
              background: "var(--card)",
              border: `1.5px dashed ${aqiColor(category.key)}`,
            }
          : {
              background: aqiColor(category.key, "tint"),
              borderColor: aqiColor(category.key, "tint"),
            }
      }
    >
      <span className="text-xs leading-tight text-foreground/75">
        {label ?? day}
      </span>
      <span className="text-base leading-none font-medium tabular-nums">
        {isForecast ? `~${reading.aqi}` : reading.aqi}
        <span className="sr-only">
          , {category.name}
          {isForecast && ", forecast"}
        </span>
      </span>
    </button>
  )
}
