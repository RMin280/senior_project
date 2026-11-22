import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRightIcon } from "@phosphor-icons/react/ssr"
import { Navbar } from "@/components/layout/navbar"
import { AqiCard } from "@/features/air-quality"
import { ForecastSection } from "@/features/forecast"
import { HistorySection } from "@/features/history"
import { AqiHeatmap } from "@/features/map"
import { PollutantsSection } from "@/features/pollutants"
import {
  getCounty,
  getForecast,
  getHistory,
  getMapPoints,
  getPollutants,
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
  const [result, points] = await Promise.all([getZip(zip), getMapPoints()])
  if (!result) notFound()
  const monitor = site ? points?.sites.find((s) => s.site === site) : undefined
  const view = (monitor && (await monitorView(monitor))) ?? zipView(result)
  const [history, pollutants] = await Promise.all([
    getHistory(view.countyCode),
    getPollutants(view.countyCode, 30),
  ])
  const days = view.forecast ? [view.forecast] : []
  // Lead with tomorrow's forecast, like the map's side panel; the latest reading
  // goes in the small print (and is the big number only when there's no forecast)
  const { forecast } = view
  const label = forecast
    ? `Our forecast for ${formatApiDate(forecast.forecast_date, { weekday: "short", month: "short", day: "numeric" })}`
    : "Latest reading (no forecast for this county)"
  const measured = forecast
    ? `Usually within ±${Math.round(forecast.expected_error)} AQI. ${view.measured}`
    : view.measured
  // Up/down like a stock quote: the forecast against the latest reading, or the
  // latest reading against the one before it
  const change = forecast
    ? { from: view.county.latest_aqi, note: "vs latest reading" }
    : history.length > 1
      ? {
          from: history[history.length - 2].aqi,
          note: "since previous reading",
        }
      : undefined
  // Back to the same view on the map: the monitor if one was picked, else the ZIP
  const mapHref = view.site
    ? `/map/${zip}?site=${encodeURIComponent(view.site)}`
    : `/map/${zip}`

  return (
    // Geist throughout, like the Sylphio design (the rest of the app is still JetBrains Mono)
    <div className="flex min-h-screen flex-col bg-background font-display">
      <main className="flex flex-col">
        {/* Hero: the pill nav, then the reading card. On wide screens the map fills the
            hero from just inside the card's edge to the window's, under the nav and card,
            so the neighboring states run off the page; on phones it's a box above the card. */}
        <section
          aria-label="Air quality forecast"
          className="relative bg-linear-to-b from-sky to-background lg:min-h-[46rem]"
        >
          <Navbar pill className="relative z-20" />
          <div className="mx-auto grid max-w-6xl gap-4 px-4 pt-4 pb-12 lg:grid-cols-[28rem_1fr] lg:items-start lg:px-8 lg:pt-10 lg:pb-16">
            <div className="relative z-10 flex flex-col items-start gap-4">
              <AqiCard
                place={view.place}
                aqi={forecast?.predicted_aqi ?? view.aqi}
                label={label}
                change={change}
                measured={measured}
                changeHref="/"
              />
              <Link
                href={mapHref}
                className="inline-flex items-center gap-2 rounded-full px-1 py-2.5 text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
              >
                Open the full map
                <ArrowRightIcon size={16} weight="bold" aria-hidden />
              </Link>
            </div>
            {/* `isolate` keeps Leaflet's z-indexes inside the map, under the card */}
            <figure className="relative isolate order-first m-0 lg:absolute lg:inset-y-0 lg:right-0 lg:left-[calc(max(0px,(100%_-_72rem)/2)_+_27rem)] lg:order-none">
              <div className="h-[22rem] lg:h-full">
                <AqiHeatmap
                  sites={points?.sites ?? []}
                  pin={{ lat: result.zip_lat, lon: result.zip_lon, label: zip }}
                  selected={view.site}
                  plain
                />
              </div>
              <figcaption className="mt-2 text-right text-xs text-muted-foreground lg:absolute lg:right-8 lg:bottom-6 lg:mt-0">
                {points
                  ? `Monitor readings on ${formatApiDate(points.date, { month: "short", day: "numeric" })}. `
                  : ""}
                Shading blends between monitors.
              </figcaption>
            </figure>
          </div>
        </section>

        <ForecastSection days={days} history={history} />

        <PollutantsSection data={pollutants} />

        <HistorySection history={history} forecastDays={days} />
      </main>

      <footer className="mt-16 border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-x-6 gap-y-2 px-4 pt-7 pb-10 text-xs text-muted-foreground lg:px-8">
          <span>
            Data from the U.S. EPA: AirNow for current readings, AQS for
            history. Forecasts are model estimates.
          </span>
          <Link
            href="/accuracy"
            className="text-primary underline underline-offset-4"
          >
            How accurate are our forecasts?
          </Link>
        </div>
      </footer>
    </div>
  )
}

/* What the dashboard shows for the searched ZIP */
function zipView(result: ZipResult) {
  return {
    site: undefined,
    countyCode: result.county.county_code,
    county: result.county,
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
    county,
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
