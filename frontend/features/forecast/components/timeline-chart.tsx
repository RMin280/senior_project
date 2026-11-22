"use client"

import { useState } from "react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  usePlotArea,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { AqiChip } from "@/features/air-quality"
import type { Forecast, HistoryPoint } from "@/lib/api"
import { categories } from "@/lib/aqi"
import { formatApiDate } from "@/lib/utils"

type TimelineChartProps = {
  history: HistoryPoint[]
  /* forecast days after the latest reading, drawn dashed with their likely ranges */
  forecastDays: Forecast[]
}

// Time ranges: days shown, and how long ranges are averaged so the line stays readable
const ranges = {
  "1W": { days: 7 },
  "1M": { days: 30 },
  "3M": { days: 90 },
  "1Y": { days: 365, group: "week" },
  "5Y": { days: 1826, group: "month" },
} as const
type Range = keyof typeof ranges

// Ink lines, like the design (color stays for the AQI categories)
const chartConfig = {
  aqi: { label: "Measured", color: "var(--foreground)" },
  forecast: { label: "Forecast", color: "var(--foreground)" },
  range: { label: "Likely range", color: "var(--foreground)" },
} satisfies ChartConfig

/* One spot on the chart. Measured spots have `aqi`; the forecast day has `forecast` and `range`.
   The latest measured day carries both, so the dashed line and the band start from it.
   `label` and `kind` are what the readout says about it. */
type ChartPoint = {
  date: string
  label: string
  kind: string
  aqi?: number
  forecast?: number
  range?: [number, number]
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

const dayLabel = (date: string) =>
  formatApiDate(date, { weekday: "short", month: "short", day: "numeric" })
const shortDate = (date: string) =>
  formatApiDate(date, { month: "short", day: "numeric" })

/* Readings from the last N calendar days. Some counties skip days, so counting readings would reach too far back. */
function lastDays(history: HistoryPoint[], count: number) {
  const cutoff = new Date(history[history.length - 1].date)
  cutoff.setUTCDate(cutoff.getUTCDate() - count + 1)
  const firstDate = cutoff.toISOString().slice(0, 10)
  return history.filter((day) => day.date >= firstDate)
}

/* The range's measured days, or for 1Y/5Y their weekly/monthly averages. The latest day
   always stays as itself, so the forecast starts from a real reading. */
function measuredPoints(history: HistoryPoint[], range: Range): ChartPoint[] {
  const { days } = ranges[range]
  const group = "group" in ranges[range] ? ranges[range].group : undefined
  const shown = lastDays(history, days)
  const latest = shown[shown.length - 1]
  const latestPoint = {
    date: latest.date,
    aqi: latest.aqi,
    label: dayLabel(latest.date),
    kind: "measured",
  }
  if (!group) {
    return shown.map((d) => ({
      date: d.date,
      aqi: d.aqi,
      label: dayLabel(d.date),
      kind: "measured",
    }))
  }

  // Buckets oldest first: calendar months, or weeks counted back from the latest day
  const buckets = new Map<string, HistoryPoint[]>()
  const end = Date.parse(latest.date)
  for (const d of shown.slice(0, -1)) {
    const key =
      group === "month"
        ? d.date.slice(0, 7)
        : String(Math.floor((end - Date.parse(d.date) - 1) / WEEK_MS))
    buckets.set(key, [...(buckets.get(key) ?? []), d])
  }
  const averaged = [...buckets.values()].map((list) => {
    const first = list[0].date
    return {
      date: first,
      aqi: Math.round(list.reduce((sum, d) => sum + d.aqi, 0) / list.length),
      label:
        group === "month"
          ? formatApiDate(first, { month: "long", year: "numeric" })
          : `Week of ${formatApiDate(first, { month: "short", day: "numeric", year: "numeric" })}`,
      kind: group === "month" ? "monthly average" : "weekly average",
    }
  })
  return [...averaged, latestPoint]
}

/* The measured spots, then the forecast days after them */
function chartPoints(
  history: HistoryPoint[],
  range: Range,
  forecastDays: Forecast[],
) {
  const points = measuredPoints(history, range)
  if (forecastDays.length === 0) return points
  const last = points[points.length - 1]
  last.forecast = last.aqi
  last.range = [last.aqi!, last.aqi!]
  for (const day of forecastDays) {
    const value = day.predicted_aqi
    const err = Math.round(day.expected_error)
    const [lo, hi] = [Math.max(0, value - err), value + err]
    points.push({
      date: day.forecast_date,
      forecast: value,
      range: [lo, hi],
      label: dayLabel(day.forecast_date),
      kind: `forecast, likely ${lo} to ${hi}`,
    })
  }
  return points
}

/* Category name inside the top of its band, like the design */
function BandLabel({ viewBox, name }: { viewBox?: unknown; name: string }) {
  const { x = 0, y = 0 } = (viewBox ?? {}) as { x?: number; y?: number }
  return (
    <text
      x={x + 10}
      y={y + 18}
      fontSize={12}
      fill="var(--muted-foreground)"
      pointerEvents="none"
    >
      {name}
    </text>
  )
}

/* "Measured | Forecast" on either side of the split. With a single forecast day there's
   no room for "Forecast" past the split, so only "Measured" shows (the dashed line and
   the section's description still say which part is the forecast). */
function SplitLabel({ viewBox }: { viewBox?: unknown }) {
  const { x = 0, y = 0 } = (viewBox ?? {}) as { x?: number; y?: number }
  const plot = usePlotArea()
  const room = plot ? plot.x + plot.width - x : 0
  return (
    <g fontSize={12} fill="var(--muted-foreground)" pointerEvents="none">
      <text x={x - 8} y={y + 14} textAnchor="end">
        Measured
      </text>
      {room >= 64 && (
        <text x={x + 8} y={y + 14}>
          Forecast
        </text>
      )}
    </g>
  )
}

//////////////////////////////////////////////////////////////////////////

export function TimelineChart({ history, forecastDays }: TimelineChartProps) {
  const [range, setRange] = useState<Range>("1M")
  const [active, setActive] = useState<number | null>(null) //index of the hovered spot

  // error handling
  if (history.length === 0) {
    return (
      <p className="mt-10 text-muted-foreground">
        No history for this area yet.
      </p>
    )
  }

  const points = chartPoints(history, range, forecastDays)
  const hasForecast = forecastDays.length > 0
  const lastIndex = points.length - 1
  const latestDate = history[history.length - 1].date
  const firstDate = points[0].date

  // Active spot: the hovered one, else the forecast (or the latest reading)
  const index = Math.min(active ?? lastIndex, lastIndex)
  const point = points[index]
  const value = point.aqi ?? point.forecast!
  const isForecast = point.aqi === undefined

  // Room for the top of the forecast range, in whole category bands
  const top = Math.max(...points.map((p) => p.range?.[1] ?? p.aqi ?? 0))
  const yMax = Math.max(100, Math.ceil(top / 50) * 50)
  const yTicks = Array.from({ length: yMax / 50 + 1 }, (_, i) => i * 50).filter(
    (t) => yMax <= 200 || t % 100 === 0,
  )
  const bands = categories.filter((c) => c.lo < yMax)

  return (
    <div className="mt-10 flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {/* Active Spot Readout */}
        <div aria-live="polite" className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-5xl leading-none font-light tracking-tight tabular-nums">
              {isForecast ? `~${value}` : value}
            </p>
            <AqiChip aqi={value} />
          </div>
          <p className="text-sm text-foreground/75">
            {point.label}, {point.kind}
          </p>
        </div>

        {/* Time Range Pills */}
        <ToggleGroup
          aria-label="Time range"
          value={[range]}
          onValueChange={(next) => {
            if (next[0]) {
              setRange(next[0] as Range)
              setActive(null)
            }
          }}
          className="max-w-full overflow-x-auto rounded-full bg-muted p-1"
        >
          {Object.keys(ranges).map((r) => (
            <ToggleGroupItem
              key={r}
              value={r}
              className="h-9 min-w-13 rounded-full px-4 text-sm aria-pressed:bg-background aria-pressed:font-semibold aria-pressed:shadow-sm"
            >
              {r}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Trend Chart */}
      <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
        <ComposedChart
          accessibilityLayer
          data={points}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          onMouseMove={(state) => {
            if (state.activeTooltipIndex != null) {
              setActive(Number(state.activeTooltipIndex))
            }
          }}
          onMouseLeave={() => setActive(null)}
        >
          {/* Grid and Axes: lines at the category edges */}
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            ticks={[firstDate, latestDate]}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            interval={0}
            tick={(props: {
              x: number | string
              y: number | string
              payload: { value: string }
            }) => {
              const isLatest = props.payload.value === latestDate
              return (
                <text
                  x={props.x}
                  y={props.y}
                  dy={12}
                  fontSize={12}
                  textAnchor={isLatest ? "middle" : "start"}
                  fill={
                    isLatest ? "var(--foreground)" : "var(--muted-foreground)"
                  }
                  fontWeight={isLatest ? 600 : 400}
                >
                  {isLatest
                    ? shortDate(latestDate)
                    : points[0].label.replace(/^Week of /, "")}
                </text>
              )
            }}
          />
          <YAxis
            width={32}
            tickLine={false}
            axisLine={false}
            domain={[0, yMax]}
            ticks={yTicks}
          />

          {/* Hover Tracking (no popup; the readout shows the spot) */}
          <ChartTooltip cursor={false} content={() => null} />

          {/* Category names inside their bands */}
          {bands.map((c) => (
            <ReferenceLine
              key={c.key}
              y={Math.min(c.hi, yMax)}
              stroke="none"
              label={
                <BandLabel
                  name={c.key === "sensitive" ? "Sensitive groups" : c.name}
                />
              }
            />
          ))}

          {/* Where measured ends and the forecast begins */}
          {hasForecast && (
            <ReferenceLine
              x={latestDate}
              stroke="var(--foreground)"
              strokeOpacity={0.35}
              strokeDasharray="3 4"
              label={<SplitLabel />}
            />
          )}

          {/* Forecast range band, then the lines on top */}
          <Area
            dataKey="range"
            type="linear"
            stroke="none"
            fill="var(--color-range)"
            fillOpacity={0.08}
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="aqi"
            type="linear"
            stroke="var(--color-aqi)"
            strokeWidth={2}
            strokeLinejoin="round"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="forecast"
            type="linear"
            stroke="var(--color-forecast)"
            strokeWidth={2}
            strokeDasharray="6 5"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Active Spot Crosshair and Dot (hollow on the forecast) */}
          <ReferenceLine
            x={point.date}
            stroke="var(--foreground)"
            strokeOpacity={0.3}
          />
          <ReferenceDot
            x={point.date}
            y={value}
            r={6}
            fill={isForecast ? "var(--card)" : "var(--foreground)"}
            stroke={isForecast ? "var(--foreground)" : "var(--card)"}
            strokeWidth={3}
          />
        </ComposedChart>
      </ChartContainer>

      {/* Trend Line Slider */}
      <Slider
        getAriaLabel={() => "Move through days"}
        getAriaValueText={(_, i) => {
          const p = points[i]
          return `${p.label}: AQI ${p.aqi ?? `about ${p.forecast}`}, ${p.kind}`
        }}
        min={0}
        max={lastIndex}
        value={[index]}
        onValueChange={(next) =>
          setActive(Array.isArray(next) ? next[0] : next)
        }
      />
    </div>
  )
}
