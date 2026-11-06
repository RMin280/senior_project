import { notFound } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import { AqiCard } from "@/features/air-quality"
import { ForecastSection } from "@/features/forecast"
import { HistorySection } from "@/features/history"
import { PollutantsSection } from "@/features/pollutants"
import { formatApiDate, getZip, type ZipResult } from "@/lib/api"

const MILES_PER_KM = 0.621371

/* When reading is from a nearby county, explain why and how far away it is. */
function describeReading(result: ZipResult) {
  const { county, home_county_name, uses_nearest_county, distance_km } = result
  const date = formatApiDate(county.latest_date)

  if (!uses_nearest_county) {
    return `Latest reading: ${date}, ${county.county_name} County.`
  }
  const miles = Math.round(distance_km * MILES_PER_KM)
  return `Latest reading: ${date}. ${home_county_name} County has no active monitor, so this is from ${county.county_name} County, about ${miles} miles away.`
}

export default async function ZipCodePage({
  params,
}: PageProps<"/zipcodes/[zip]">) {
  const { zip } = await params
  const result = await getZip(zip)
  if (!result) notFound()

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-sky to-background bg-size-[100%_40rem] bg-no-repeat">
      <Navbar />

      <main className="flex flex-col pb-24">
        <section
          aria-label="Latest air quality"
          className="mx-auto w-full max-w-4xl px-4 pt-8"
        >
          <AqiCard
            place={`${result.home_county_name} County, TX ${zip}`}
            aqi={result.county.latest_aqi}
            measured={describeReading(result)}
            changeHref="/"
          />
        </section>

        <PollutantsSection />

        <ForecastSection />

        <HistorySection />
      </main>
    </div>
  )
}
