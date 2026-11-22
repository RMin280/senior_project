import { Section } from "@/components/layout/section"
import type { Forecast, HistoryPoint } from "@/lib/api"
import { formatApiDate } from "@/lib/utils"
import { ForecastDay } from "./forecast-day"
import { TimelineChart } from "./timeline-chart"

type ForecastSectionProps = {
  /* forecast days, tomorrow first */
  days: Forecast[]
  history: HistoryPoint[]
}

const COUNT = ["", "day", "two days", "three days", "four days", "five days"]

export function ForecastSection({ days, history }: ForecastSectionProps) {
  return (
    <Section
      id="forecast"
      title={`The next ${COUNT[days.length] ?? `${days.length} days`}`}
      description="Solid is measured, dashed is our forecast. The ± is the likely range."
    >
      {days.length > 0 ? (
        <div className="mt-6 grid gap-x-10 sm:grid-cols-3">
          {days.map((day) => (
            <ForecastDay
              key={day.forecast_date}
              day={formatApiDate(day.forecast_date, { weekday: "long" })}
              date={formatApiDate(day.forecast_date, {
                month: "short",
                day: "numeric",
              })}
              aqi={day.predicted_aqi}
              error={Math.round(day.expected_error)}
            />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-muted-foreground">
          No forecast for this area right now.
        </p>
      )}
      {/* 5Y is the longest range, so don't send the chart more than that */}
      <TimelineChart history={history.slice(-1830)} forecastDays={days} />
    </Section>
  )
}
