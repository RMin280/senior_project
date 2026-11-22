import { Section } from "@/components/layout/section"
import type { PollutantHistory } from "@/lib/api"
import { formatApiDate } from "@/lib/utils"
import { POLLUTANT_ORDER } from "../pollutants"
import { PollutantCard } from "./pollutant-card"

/** Each pollutant's AQI on the latest day, from the county's AirNow monitors. */
export function PollutantsSection({ data }: { data: PollutantHistory | null }) {
  const names = POLLUTANT_ORDER.filter((n) => data?.pollutants[n]?.length)
  const latest = names.map((n) => data!.latest[n])
  const newest = latest.reduce((a, p) => (p.date > a ? p.date : a), "")
  // The day's AQI is its highest pollutant, so that one "sets" it
  const top = Math.max(
    ...latest.filter((p) => p.date === newest).map((p) => p.aqi),
  )

  return (
    <Section
      id="pollutants"
      title="In the air"
      description="Each pollutant on the latest day, with its last 30 days. The main pollutant sets the overall AQI."
    >
      {names.length === 0 ? (
        <p className="mt-6 text-muted-foreground">
          No per-pollutant readings from monitors in this county yet.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-x-10 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {names.map((name, i) => (
              <PollutantCard
                key={name}
                name={name}
                points={data!.pollutants[name]}
                main={latest[i].date === newest && latest[i].aqi === top}
              />
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Highest reading in the county each day, as of{" "}
            {formatApiDate(newest)}. Source: AirNow.
          </p>
        </>
      )}
    </Section>
  )
}
