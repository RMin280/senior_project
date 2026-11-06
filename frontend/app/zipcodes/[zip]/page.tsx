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
    <div className="flex min-h-screen flex-col bg-linear-to-b from-sky to-background bg-size-[100%_40rem] bg-no-repeat">
      <Navbar />

      <main className="flex flex-col pb-24">
        <section
          aria-label="Air quality now"
          className="mx-auto w-full max-w-4xl px-4 pt-8"
        >
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
