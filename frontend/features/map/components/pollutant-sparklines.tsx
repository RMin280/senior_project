"use client"

import { useState } from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { PollutantHistory, PollutantPoint } from "@/lib/api"
import { aqiColor, getCategory } from "@/lib/aqi"
import {
  POLLUTANT_ABOUT,
  POLLUTANT_ORDER,
  PollutantTrend,
} from "@/features/pollutants"

const ranges = { "1W": 7, "1M": 30, "3M": 90, "1Y": 365, "5Y": 1826 }
type Range = keyof typeof ranges

function lastDays(points: PollutantPoint[], days: number) {
  if (points.length === 0) return points
  const cutoff = new Date(points[points.length - 1].date)
  cutoff.setUTCDate(cutoff.getUTCDate() - days + 1)
  const first = cutoff.toISOString().slice(0, 10)
  return points.filter((p) => p.date >= first)
}

/** One small trend line per pollutant, with today's AQI for it. */
export function PollutantSparklines({
  data,
}: {
  data: PollutantHistory | null
}) {
  const [range, setRange] = useState<Range>("1M")
  const names = POLLUTANT_ORDER.filter((n) => data?.pollutants[n]?.length)

  return (
    <section aria-labelledby="in-the-air" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 border-b pb-2">
        <h3 id="in-the-air" className="font-display text-lg font-semibold">
          In the air
        </h3>
        <ToggleGroup
          value={[range]}
          onValueChange={(v) => v[0] && setRange(v[0] as Range)}
          spacing={0}
          size="sm"
          aria-label="Time range"
        >
          {Object.keys(ranges).map((r) => (
            <ToggleGroupItem key={r} value={r} className="px-2 text-xs">
              {r}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {names.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No pollutant readings from monitors here yet.
        </p>
      )}

      {names.map((name) => {
        const points = lastDays(data!.pollutants[name], ranges[range])
        const latest = data!.latest[name]
        const category = getCategory(latest.aqi)
        return (
          <div
            key={name}
            className="grid grid-cols-[6.5rem_1fr] items-center gap-3"
          >
            <div>
              <div className="text-sm font-semibold">{name}</div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-xl leading-tight tabular-nums">
                  {latest.aqi}
                </span>
                <span className="text-xs text-muted-foreground">AQI</span>
              </div>
              <div
                className="flex items-center gap-1.5 text-xs"
                style={{ color: aqiColor(category.key, "ink") }}
              >
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ background: aqiColor(category.key) }}
                />
                {category.name === "Unhealthy for Sensitive Groups"
                  ? "Sensitive groups"
                  : category.name}
              </div>
            </div>
            <div title={POLLUTANT_ABOUT[name]}>
              <PollutantTrend points={points} />
            </div>
          </div>
        )
      })}
      {names.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          Daily AQI for each pollutant, highest reading in the county. Source:
          AirNow.
        </p>
      )}
    </section>
  )
}
