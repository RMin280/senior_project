import { Section } from "@/components/layout/section"
import type { HistoryPoint } from "@/lib/api"
import { ForecastDay } from "./forecast-day"
import { TimelineChart } from "./timeline-chart"

// Sample data now, replace with API
const forecast = [
  { day: "Tomorrow", date: "Fri, Oct 16", aqi: 48, error: 6 },
  { day: "Saturday", date: "Sat, Oct 17", aqi: 57, error: 9 },
  { day: "Sunday", date: "Sun, Oct 18", aqi: 63, error: 13 },
]

export function ForecastSection({ history }: { history: HistoryPoint[] }) {
  return (
    <Section
      id="forecast"
      band
      title="The next three days"
      description="Here's what to expect."
    >
      <div className="mt-6 grid gap-x-10 gap-y-2 sm:grid-cols-3">
        {forecast.map((day) => (
          <ForecastDay key={day.day} {...day} />
        ))}
      </div>
      {/* The chart shows 90 days at most, so don't send it all of history */}
      <TimelineChart history={history.slice(-90)} />
    </Section>
  )
}
