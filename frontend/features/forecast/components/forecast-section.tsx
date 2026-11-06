import { Section } from "@/components/layout/section"
import type { Forecast, HistoryPoint } from "@/lib/api"
import { formatApiDate } from "@/lib/utils"
import { ForecastDay } from "./forecast-day"
import { TimelineChart } from "./timeline-chart"

type ForecastSectionProps = {
  forecast: Forecast | null
  history: HistoryPoint[]
}

export function ForecastSection({ forecast, history }: ForecastSectionProps) {
  return (
    <Section
      id="forecast"
      band
      title="Next-day forecast"
      description="What our model expects the day after the latest reading."
    >
      {forecast ? (
        <div className="mt-6 max-w-sm">
          <ForecastDay
            day={formatApiDate(forecast.forecast_date, { weekday: "long" })}
            date={formatApiDate(forecast.forecast_date)}
            aqi={forecast.predicted_aqi}
            error={Math.round(forecast.expected_error)}
          />
        </div>
      ) : (
        <p className="mt-6 text-muted-foreground">
          No forecast for this area right now.
        </p>
      )}
      {/* The chart shows 90 days at most, so don't send it all of history */}
      <TimelineChart history={history.slice(-90)} />
    </Section>
  )
}
