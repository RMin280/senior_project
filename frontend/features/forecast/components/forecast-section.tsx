import { Section } from "@/components/layout/section"
import { ForecastDay } from "./forecast-day"
import { TimelineChart } from "./timeline-chart"

// Sample data now, replace with API
const forecast = [
  { day: "Tomorrow", date: "Fri, Oct 16", aqi: 48, error: 6 },
  { day: "Saturday", date: "Oct 17", aqi: 57, error: 9 },
  { day: "Sunday", date: "Oct 18", aqi: 63, error: 13 },
]

// 90 days of sample history ending today (Oct 15), which matches the AQI card's 42.
const history = Array.from({ length: 90 }, (_, i) => {
  const date = new Date(2026, 9, 15 - 89 + i)
  return {
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    aqi:
      i === 89
        ? 42
        : Math.round(45 + 12 * Math.sin(i / 5) + 8 * Math.sin(i * 1.7)),
  }
})

export function ForecastSection() {
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
      <TimelineChart history={history} />
    </Section>
  )
}
