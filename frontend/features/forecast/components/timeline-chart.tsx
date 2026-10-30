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

// Same shape as the points from the backend's /history endpoint
type MeasuredDay = { date: string; aqi: number }

type TimelineChartProps = {
  history: MeasuredDay[]
}

// Time Ranges (Days shown on the chart)
// Todo: Add 1Y and 3D
const ranges = { "1W": 7, "1M": 30, "3M": 90 }
type Range = keyof typeof ranges

// Chart Coloring
const chartConfig = {
  aqi: { label: "AQI", color: "var(--foreground)" },
} satisfies ChartConfig

//////////////////////////////////////////////////////////////////////////

export function TimelineChart({ history }: TimelineChartProps) {
  const [range, setRange] = useState<Range>("1W") //1 week by default
  const [active, setActive] = useState<number | null>(null) //index of day being hovered on

  // Visible Days (the last one is today)
  const days = history.slice(-ranges[range])
  const todayIndex = days.length - 1

  // Active Day
  const index = active ?? todayIndex
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
            {index === todayIndex ? "Today" : point.date}
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
            ticks={[days[0].date, days[todayIndex].date]}
            tickFormatter={(date) =>
              date === days[todayIndex].date ? "Today" : date
            }
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
        getAriaValueText={(_, i) => `${days[i].date}: AQI ${days[i].aqi}`}
        min={0}
        max={todayIndex}
        value={[index]}
        onValueChange={(value) =>
          setActive(Array.isArray(value) ? value[0] : value)
        }
      />
    </div>
  )
}
