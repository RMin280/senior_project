import { aqiColor, getCategory } from "@/lib/aqi"
import type { DayReading } from "./sample-history"

type DayCellProps = {
  day: number
  reading?: DayReading
}

export function DayCell({ day, reading }: DayCellProps) {
  //if no data for the day, return a blank cell
  if (!reading) {
    return (
      <div className="h-18 rounded-lg border p-2 text-sm text-muted-foreground">
        {day}
      </div>
    )
  }

  const category = getCategory(reading.aqi)
  const isForecast = reading.kind === "forecast"

  // measured days are filled with the category tint, forecast days get a dashed outline
  return (
    <div
      className="flex h-18 flex-col justify-between rounded-lg p-2 text-foreground"
      style={
        isForecast
          ? { border: `1.5px dashed ${aqiColor(category.key)}` }
          : { background: aqiColor(category.key, "tint") }
      }
      title={`AQI ${reading.aqi}, ${category.name}${isForecast ? ", forecast" : ""}`}
    >
      <span className="text-sm">{day}</span>
      <span className="text-xl font-bold tabular-nums">
        {reading.aqi}
        <span className="sr-only">
          , {category.name}
          {isForecast && ", forecast"}
        </span>
      </span>
    </div>
  )
}
