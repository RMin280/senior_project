import { ChangeChip, signed } from "@/features/air-quality"
import type { PollutantPoint } from "@/lib/api"
import { aqiColor, getCategory } from "@/lib/aqi"
import { formatApiDate } from "@/lib/utils"
import { POLLUTANT_ABOUT } from "../pollutants"
import { PollutantTrend } from "./pollutant-trend"

type PollutantCardProps = {
  name: string
  /* daily AQI for this pollutant, oldest first; the last one is the latest */
  points: PollutantPoint[]
  /* highest pollutant on the latest day, so it's the one setting the AQI */
  main?: boolean
}

/** One pollutant now: its AQI and category, its last 30 days, and the change since its previous reading. */
export function PollutantCard({ name, points, main }: PollutantCardProps) {
  const latest = points[points.length - 1]
  const previous = points.at(-2)
  const category = getCategory(latest.aqi)

  return (
    <div className="flex flex-col gap-2.5 border-t pt-5 pb-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold">{name}</h3>
          <p className="text-sm text-muted-foreground">
            {POLLUTANT_ABOUT[name]}
          </p>
        </div>
        {main && (
          <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-xs font-medium whitespace-nowrap text-aqi-good-ink">
            Main pollutant
          </span>
        )}
      </div>

      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-4xl leading-none font-light tracking-tight tabular-nums">
          {latest.aqi}
        </span>
        <span className="text-sm text-muted-foreground">AQI</span>
      </p>
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

      <PollutantTrend points={points} className="h-10" />

      {previous && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <ChangeChip
            from={previous.aqi}
            to={latest.aqi}
            className="px-1.5 py-0.5 text-xs"
          />
          <span>
            {signed(latest.aqi - previous.aqi)} since{" "}
            {formatApiDate(previous.date, { month: "short", day: "numeric" })}
          </span>
        </p>
      )}
    </div>
  )
}
