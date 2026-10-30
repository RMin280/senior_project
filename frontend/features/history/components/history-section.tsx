import { Section } from "@/components/layout/section"
import { HistoryCalendar } from "./history-calendar"

export function HistorySection() {
  return (
    <Section
      id="history"
      title="History"
      description="Check the historical air quality for this area."
    >
      <HistoryCalendar />
    </Section>
  )
}
