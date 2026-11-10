import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr"
import { Navbar } from "@/components/layout/navbar"
import { AqiCard } from "@/features/air-quality"
import { ForecastSection } from "@/features/forecast"
import { HistorySection } from "@/features/history"
import { PollutantsSection } from "@/features/pollutants"
import {
  getCounty,
  getForecast,
  getHistory,
  getMapPoints,
  getZip,
  type MonitorReading,
  type ZipResult,
} from "@/lib/api"
import { formatApiDate, splitMonitorName } from "@/lib/utils"

const MILES_PER_KM = 0.621371

/* The latest measured reading. When it's from a nearby county, explain why and how far away it is. */
function describeReading(result: ZipResult) {
  const { county, home_county_name, uses_nearest_county, distance_km } = result
  const latest = `Latest reading ${county.latest_aqi} on ${formatApiDate(county.latest_date)}`

  if (!uses_nearest_county) {
    return `${latest}, ${county.county_name} County.`
  }
  const miles = Math.round(distance_km * MILES_PER_KM)
  return `${latest}. ${home_county_name} County has no active monitor, so this is from ${county.county_name} County, about ${miles} miles away.`
}

/* Dashboard for the searched ZIP, or for a monitor picked on the map
   (?site=<monitor name>), which shows that monitor's county instead. */
export default async function ZipCodePage({
  params,
  searchParams,
}: PageProps<"/zipcodes/[zip]">) {
  const { zip } = await params
  const { site } = await searchParams
  const [result, points] = await Promise.all([
    getZip(zip),
    site ? getMapPoints() : null,
  ])
  if (!result) notFound()
  const monitor = points?.sites.find((s) => s.site === site)
  const view = (monitor && (await monitorView(monitor))) ?? zipView(result)
  const history = await getHistory(view.countyCode)
  // Lead with tomorrow's forecast, like the map's side panel; the latest reading
  // goes in the small print (and is the big number only when there's no forecast)
  const { forecast } = view
  const label = forecast
    ? `Our forecast for ${formatApiDate(forecast.forecast_date, { weekday: "short", month: "short", day: "numeric" })}`
    : "Latest reading (no forecast for this county)"
  const measured = forecast
    ? `Usually within ±${Math.round(forecast.expected_error)} AQI. ${view.measured}`
    : view.measured
  // Back to the same view on the map: the monitor if one was picked, else the ZIP
  const mapHref = view.site
    ? `/map/${zip}?site=${encodeURIComponent(view.site)}`
    : `/map/${zip}`

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-sky to-background bg-size-[100%_40rem] bg-no-repeat">
      <Navbar />

      <main className="flex flex-col pb-24">
        <section
          aria-label="Air quality forecast"
          className="mx-auto w-full max-w-4xl px-4 pt-8"
        >
          {/* Same outline style as the back button in the map's side panel */}
          <Link
            href={mapHref}
            className="mb-4 inline-flex items-center gap-2 rounded-full bg-background px-4 py-2.5 text-sm font-semibold ring-1 ring-border ring-inset hover:bg-muted"
          >
            <ArrowLeftIcon size={16} weight="bold" aria-hidden />
            Back to map
          </Link>
          <AqiCard
            place={view.place}
            aqi={forecast?.predicted_aqi ?? view.aqi}
            label={label}
            measured={measured}
            changeHref="/"
          />
        </section>

        <PollutantsSection />

        <ForecastSection forecast={view.forecast} history={history} />

        <HistorySection history={history} forecast={view.forecast} />
      </main>
    </div>
  )
}

/* What the dashboard shows for the searched ZIP */
function zipView(result: ZipResult) {
  return {
    site: undefined,
    countyCode: result.county.county_code,
    place: `${result.home_county_name} County, TX ${result.zip}`,
    aqi: result.county.latest_aqi,
    measured: describeReading(result),
    forecast: result.forecast,
  }
}

/* What it shows for a monitor picked on the map: its county's readings and forecast,
   like the map's side panel. null if the API doesn't know that county yet. */
async function monitorView(monitor: MonitorReading) {
  const code = monitor.county_code
  const [county, forecast] = await Promise.all([
    getCounty(code),
    getForecast(code),
  ])
  if (!county) return null
  const { name, codes } = splitMonitorName(monitor.site)
  return {
    site: monitor.site,
    countyCode: code,
    // Site codes smaller, right after the name, like the map's side panel
    place: (
      <>
        {name}
        {codes && (
          <>
            {" "}
            <span className="text-sm font-normal whitespace-nowrap text-muted-foreground">
              {codes}
            </span>
          </>
        )}
        , {county.county_name} County
      </>
    ),
    aqi: county.latest_aqi,
    measured: `Latest reading ${county.latest_aqi} on ${formatApiDate(county.latest_date)}, ${county.county_name} County.`,
    forecast,
  }
}
