import { notFound } from "next/navigation"
import { Navbar } from "@/components/layout/navbar"
import {
  AqiHeatmap,
  ForecastPanel,
  HeatmapLegend,
  MapSearch,
} from "@/features/map"
import { getMapPoints, getPollutants, getZip } from "@/lib/api"
import { formatApiDate } from "@/lib/utils"

/* Map view: Texas AQI heatmap, with the searched ZIP's forecast panel on the left. */
export default async function MapPage({ params }: PageProps<"/map/[zip]">) {
  const { zip } = await params
  const result = await getZip(zip)
  if (!result) notFound()
  const [points, pollutants] = await Promise.all([
    getMapPoints(),
    getPollutants(result.county.county_code),
  ])
  const pin = { lat: result.zip_lat, lon: result.zip_lon, label: zip }

  return (
    <div className="flex h-dvh flex-col">
      <Navbar />
      <main className="relative flex-1 overflow-hidden max-lg:overflow-y-auto">
        <div className="absolute inset-0 max-lg:relative max-lg:h-[55vh]">
          <AqiHeatmap sites={points?.sites ?? []} pin={pin} />
        </div>

        {/* Overlays: search (top right), legend (bottom left of the map) */}
        <div className="pointer-events-none absolute top-4 right-4 left-4 z-[1000] flex justify-end lg:left-auto">
          <MapSearch defaultZip={zip} />
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
          <ForecastPanel result={result} pollutants={pollutants} />
        </div>
      </main>
    </div>
  )
}
