import { Section } from "@/components/layout/section"
import { PollutantCard } from "./pollutant-card"

// show placeholder till api has pollutant values
const pollutants = [
  { name: "PM2.5", unit: "µg/m³" },
  { name: "Ozone", unit: "ppb" },
]

export function PollutantsSection() {
  return (
    <Section
      id="pollutants"
      title="In the air"
      description="Measurements of pollutants in the air."
    >
      <div className="mt-6 grid gap-x-10 gap-y-2 sm:grid-cols-2">
        {pollutants.map((pollutant) => (
          <PollutantCard key={pollutant.name} {...pollutant} />
        ))}
      </div>
    </Section>
  )
}
