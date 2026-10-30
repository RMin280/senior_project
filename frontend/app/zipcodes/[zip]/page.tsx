import { Navbar } from "@/components/layout/navbar"
import { ReadingCard } from "@/features/air-quality"

export default async function ZipCodePage({
  params,
}: PageProps<"/zipcodes/[zip]">) {
  const { zip } = await params

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-16 px-4 pb-24">
        <section aria-label="Air quality now" className="pt-8">
          <ReadingCard
            place={`Dallas, TX ${zip}`}
            aqi={42}
            description="The air is clean. A good day to be outside."
            measured="Measured at 2:00 PM CT today, downtown Dallas monitor. Sample data."
            changeHref="/"
          />
        </section>

        <section aria-labelledby="forecast">
          <h2 id="forecast" className="font-display text-2xl font-medium">
            The next three days
          </h2>
          <p className="mt-2 text-muted-foreground">
            Forecasts aren’t certain, but here’s what we expect.
          </p>
        </section>

        <section aria-labelledby="pollutants">
          <h2 id="pollutants" className="font-display text-2xl font-medium">
            In the air
          </h2>
          <p className="mt-2 text-muted-foreground">
            Each pollutant and their recent measurements.
          </p>
        </section>

        <section aria-labelledby="history">
          <h2 id="history" className="font-display text-2xl font-medium">
            History
          </h2>
          <p className="mt-2 text-muted-foreground">
            Check historical data as far back as we hold it.
          </p>
        </section>
      </main>
    </div>
  )
}
