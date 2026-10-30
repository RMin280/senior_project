import { Section } from "@/components/layout/section"
import { PollutantCard } from "./pollutant-card"

// Sample data for now, but this will eventually be fetched from the API.
const pollutants = [
  { name: "PM2.5", value: 7.6, unit: "µg/m³" },
  { name: "Ozone", value: 38, unit: "ppb" },
  { name: "NO₂", value: 14, unit: "ppb" },
]

export function PollutantsSection() {
  return (
    <Section
      id="pollutants"
      title="In the air"
      description="Measurements of pollutants in the air."
    >
      <div className="mt-6 grid gap-x-10 gap-y-2 sm:grid-cols-3">
        {pollutants.map((pollutant) => (
          <PollutantCard key={pollutant.name} {...pollutant} />
        ))}
      </div>
    </Section>
  )
}
