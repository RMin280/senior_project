"use client"

// NEED TO ADD FUTURE FORECASTING ON TIMELINE CHART

import { useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
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
import type { HistoryPoint } from "@/lib/api"
import { formatApiDate } from "@/lib/utils"

type TimelineChartProps = {
  history: HistoryPoint[]
}

// Time Ranges (Days shown on the chart)
// Todo: Add 1Y and 3D
const ranges = { "1W": 7, "1M": 30, "3M": 90 }
type Range = keyof typeof ranges

// Chart Coloring (same line color as the map's pollutant sparklines)
const chartConfig = {
  aqi: { label: "AQI", color: "var(--aqi-sensitive)" },
} satisfies ChartConfig

/* formats date as shorter form like "Nov 6" */
function shortDate(date: string) {
  return formatApiDate(date, { month: "short", day: "numeric" })
}

/* Readings from the last N calendar days. Some counties skip days, so counting readings would reach too far back. */
function lastDays(history: HistoryPoint[], count: number) {
  const cutoff = new Date(history[history.length - 1].date)
  cutoff.setUTCDate(cutoff.getUTCDate() - count + 1)
  const firstDate = cutoff.toISOString().slice(0, 10)
  return history.filter((day) => day.date >= firstDate)
}

//////////////////////////////////////////////////////////////////////////

export function TimelineChart({ history }: TimelineChartProps) {
  const [range, setRange] = useState<Range>("1W") //1 week by default
  const [active, setActive] = useState<number | null>(null) //index of day being hovered on

  // error handling
  if (history.length === 0) {
    return (
      <p className="mt-10 text-muted-foreground">
        No history for this area yet.
      </p>
    )
  }

  // Visible Days (the last one is the latest reading)
  const days = lastDays(history, ranges[range])
  const latestIndex = days.length - 1

  // Active Day
  const index = active ?? latestIndex
  const point = days[index]

  return (
    <div className="mt-10 flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {/* Active Day Readout */}
        <div aria-live="polite">
          <p className="font-display text-5xl font-light tabular-nums">
            {point.aqi}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatApiDate(point.date)}
          </p>
        </div>

        {/* Time Range Pills */}
        <ToggleGroup
          aria-label="Time range"
          value={[range]}
          onValueChange={(value) => {
            if (value[0]) {
              setRange(value[0] as Range)
              setActive(null)
            }
          }}
          className="rounded-full bg-muted p-1"
        >
          {Object.keys(ranges).map((r) => (
            <ToggleGroupItem
              key={r}
              value={r}
              className="h-9 rounded-full px-4 text-sm aria-pressed:bg-background aria-pressed:shadow-sm"
            >
              {r}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Trend Chart */}
      <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
        <LineChart
          accessibilityLayer
          data={days}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          onMouseMove={(state) => {
            if (state.activeTooltipIndex != null) {
              setActive(Number(state.activeTooltipIndex))
            }
          }}
          onMouseLeave={() => setActive(null)}
        >
          {/* Grid and Axes */}
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            ticks={[days[0].date, days[latestIndex].date]}
            tickFormatter={shortDate}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
          />
          <YAxis
            width={32}
            tickLine={false}
            axisLine={false}
            domain={[
              0,
              (max: number) => Math.max(100, Math.ceil(max / 50) * 50),
            ]}
          />

          {/* Hover Tracking (no popup; the readout shows the day) */}
          <ChartTooltip cursor={false} content={() => null} />

          {/* Trend Line */}
          <Line
            dataKey="aqi"
            type="monotone"
            stroke="var(--color-aqi)"
            strokeWidth={2}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />

          {/* Active Day Crosshair and Dot */}
          <ReferenceLine
            x={point.date}
            stroke="var(--foreground)"
            strokeOpacity={0.3}
          />
          <ReferenceDot
            x={point.date}
            y={point.aqi}
            r={6}
            fill="var(--foreground)"
            stroke="var(--background)"
            strokeWidth={3}
          />
        </LineChart>
      </ChartContainer>

      {/* Trend Line Slider */}
      <Slider
        getAriaLabel={() => "Move through days"}
        getAriaValueText={(_, i) =>
          `${formatApiDate(days[i].date)}: AQI ${days[i].aqi}`
        }
        min={0}
        max={latestIndex}
        value={[index]}
        onValueChange={(value) =>
          setActive(Array.isArray(value) ? value[0] : value)
        }
      />
    </div>
  )
}
