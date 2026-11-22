import { aqiColor, getCategory } from "@/lib/aqi"

type ForecastDayProps = {
  day: string
  date: string
  aqi: number
  error: number
}

/** One forecast day: the day and its category on the left, the number and its ± on the right. */
export function ForecastDay({ day, date, aqi, error }: ForecastDayProps) {
  const category = getCategory(aqi)

  return (
    <div className="flex items-end justify-between gap-3 border-t py-4.5">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg leading-tight font-medium">
          {day}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {date}
          </span>
        </h3>
        <p
          className="flex items-center gap-2 text-sm"
          style={{ color: aqiColor(category.key, "ink") }}
        >
          <span
            aria-hidden
            className="size-2 rounded-full"
            style={{ background: aqiColor(category.key) }}
          />
          {category.name}
        </p>
      </div>
      <p className="flex flex-col items-end">
        <span className="text-3xl leading-none font-light tracking-tight tabular-nums">
          {aqi}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">
          <span className="sr-only">likely within </span>±{error}
        </span>
      </p>
    </div>
  )
}
