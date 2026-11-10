import { notFound } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import {
  AqiHeatmap,
  ForecastPanel,
  HeatmapLegend,
  MapSearch,
} from "@/features/map"
import {
  getCounty,
  getForecast,
  getMapPoints,
  getPollutants,
  getZip,
  type MonitorReading,
  type ZipResult,
} from "@/lib/api"
import { formatApiDate } from "@/lib/utils"

/* Map view: Texas AQI heatmap with a forecast panel on the left, for the
   searched ZIP or for a monitor picked on the map (?site=<monitor name>). */
export default async function MapPage({
  params,
  searchParams,
}: PageProps<"/map/[zip]">) {
  const { zip } = await params
  const { site } = await searchParams
  const [result, points] = await Promise.all([getZip(zip), getMapPoints()])
  if (!result) notFound()
  const monitor = points?.sites.find((s) => s.site === site)
  const monitorView = monitor ? await monitorPanel(monitor, zip) : null
  const panel = monitorView ?? (await zipPanel(result))
  const pin = { lat: result.zip_lat, lon: result.zip_lon, label: zip }

  return (
    <div className="flex h-dvh flex-col">
      <Navbar />
      <main className="relative flex-1 overflow-hidden max-lg:overflow-y-auto">
        <div className="absolute inset-0 max-lg:relative max-lg:h-[55vh]">
          <AqiHeatmap
            sites={points?.sites ?? []}
            pin={pin}
            selected={monitorView ? monitor?.site : undefined}
          />
        </div>

        {/* Overlays: search (top right), legend (bottom left of the map) */}
        <div className="pointer-events-none absolute top-4 right-4 left-4 z-[1000] flex justify-end lg:left-auto">
          <MapSearch />
        </div>
        <div className="pointer-events-none absolute right-4 bottom-8 z-[1000] max-lg:top-[calc(55vh-5rem)] max-lg:right-auto max-lg:bottom-auto max-lg:left-4 lg:right-16">
          <HeatmapLegend
            date={
              points
                ? formatApiDate(points.date, { month: "short", day: "numeric" })
                : undefined
            }
          />
        </div>

        <div className="z-[1000] p-4 lg:absolute lg:top-4 lg:bottom-4 lg:left-4 lg:w-[400px] lg:overflow-x-hidden lg:overflow-y-auto lg:p-0">
          <ForecastPanel {...panel} />
        </div>
      </main>
    </div>
  )
}

/* Side panel for the searched ZIP */
async function zipPanel(result: ZipResult) {
  const { zip, county } = result
  return {
    title: zip,
    place: result.uses_nearest_county
      ? `${result.home_county_name} County · using ${county.county_name} County monitors`
      : `${county.county_name} County`,
    county,
    forecast: result.forecast,
    pollutants: await getPollutants(county.county_code),
    link: { href: `/zipcodes/${zip}`, label: "Open full dashboard" },
  }
}

/* Side panel for a monitor picked on the map: its county's forecast and readings.
   null if the API doesn't know that county yet, so the ZIP's panel shows instead. */
async function monitorPanel(monitor: MonitorReading, zip: string) {
  const code = monitor.county_code
  const [county, forecast, pollutants] = await Promise.all([
    getCounty(code),
    getForecast(code),
    getPollutants(code),
  ])
  if (!county) return null
  // AirNow names end with the state's site codes, e.g. "Northwest Harris Co. C26/C110/C154".
  // The panel shows the codes smaller, after the name.
  const [, name = monitor.site, codes] =
    monitor.site.match(/^(.+?)\s+(C\d+(?:\/C\d+)*)$/) ?? []
  return {
    title: name,
    titleNote: codes,
    place: `${county.county_name} County`,
    county,
    forecast,
    pollutants,
    link: { href: `/map/${zip}`, label: `Back to ${zip}`, back: true },
  }
}
