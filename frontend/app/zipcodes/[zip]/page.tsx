import { Navbar } from "@/components/layout/navbar"
import { AqiCard } from "@/features/air-quality"
import { ForecastSection } from "@/features/forecast"
import { HistorySection } from "@/features/history"
import { PollutantsSection } from "@/features/pollutants"

export default async function ZipCodePage({
  params,
}: PageProps<"/zipcodes/[zip]">) {
  const { zip } = await params

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-16 px-4 pb-24">
        <section aria-label="Air quality now" className="pt-8">
          <AqiCard
            place={`Dallas, TX ${zip}`}
            aqi={42}
            description="The air is clean. A good day to be outside."
            measured="Measured at 2:00 PM CT today, downtown Dallas monitor. Sample data."
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
