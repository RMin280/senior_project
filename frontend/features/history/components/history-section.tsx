import { Section } from "@/components/layout/section"
import type { Forecast, HistoryPoint } from "@/lib/api"
import { formatApiDate } from "@/lib/utils"
import { HistoryCalendar } from "./history-calendar"

type HistorySectionProps = {
  history: HistoryPoint[]
  forecastDays: Forecast[]
}

export function HistorySection({ history, forecastDays }: HistorySectionProps) {
  const byDate = Object.fromEntries(history.map((day) => [day.date, day]))

  return (
    <Section
      id="history"
      title="History"
      description={
        history.length > 0
          ? `Daily AQI back to ${formatApiDate(history[0].date, { month: "long", year: "numeric" })}. Pick any day.`
          : undefined
      }
    >
      {history.length > 0 ? (
        <HistoryCalendar byDate={byDate} forecastDays={forecastDays} />
      ) : (
        <p className="mt-6 text-muted-foreground">
          No history for this area yet.
        </p>
      )}
    </Section>
  )
}
