"use client"

import { Line, LineChart, Tooltip, YAxis } from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import type { PollutantPoint } from "@/lib/api"
import { cn, formatApiDate } from "@/lib/utils"

const chartConfig = {
  aqi: { label: "AQI", color: "var(--muted-foreground)" },
} satisfies ChartConfig

/** Small trend line of one pollutant's daily AQI, with the day under the pointer. */
export function PollutantTrend({
  points,
  className,
}: {
  points: PollutantPoint[]
  className?: string
}) {
  return (
    <ChartContainer
      config={chartConfig}
      className={cn("aspect-auto h-14 w-full", className)}
    >
      <LineChart
        data={points}
        margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
      >
        <YAxis hide domain={[0, (max: number) => Math.max(60, max)]} />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <div className="rounded-lg border bg-card px-2 py-1 text-xs shadow-raised">
                {formatApiDate(payload[0].payload.date, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {" · "}
                <b>AQI {payload[0].payload.aqi}</b>
              </div>
            ) : null
          }
        />
        <Line
          dataKey="aqi"
          type="monotone"
          stroke="var(--color-aqi)"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  )
}
