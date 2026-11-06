import { Section } from "@/components/layout/section"
import type { Forecast, HistoryPoint } from "@/lib/api"
import { HistoryCalendar } from "./history-calendar"

type HistorySectionProps = {
  history: HistoryPoint[]
  forecast: Forecast | null
}

export function HistorySection({ history, forecast }: HistorySectionProps) {
  //only need aqi and date
  const aqiByDate = Object.fromEntries(
    history.map((day) => [day.date, day.aqi]),
  )

  return (
    <Section
      id="history"
      title="History"
      description="Check the historical air quality for this area."
    >
      {history.length > 0 ? (
        <HistoryCalendar aqiByDate={aqiByDate} forecast={forecast} />
      ) : (
        <p className="mt-6 text-muted-foreground">
          No history for this area yet.
        </p>
      )}
    </Section>
  )
}
