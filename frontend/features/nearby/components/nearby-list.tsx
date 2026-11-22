import { ChangeChip } from "@/features/air-quality"
import { getHistory, type County } from "@/lib/api"
import { aqiColor, getCategory } from "@/lib/aqi"
import { distanceMiles } from "@/lib/utils"

/* The `count` closest monitored counties to a point, leaving out the one already shown */
export function nearestCounties(
  counties: County[],
  from: { lat: number; lon: number; countyCode: number },
  count = 4,
) {
  return counties
    .filter((c) => c.has_forecast && c.county_code !== from.countyCode)
    .map((county) => ({
      county,
      miles: Math.round(
        distanceMiles(from.lat, from.lon, county.lat, county.lon),
      ),
    }))
    .sort((a, b) => a.miles - b.miles)
    .slice(0, count)
}

/* Adds each place's reading before its latest one, from its last two weeks of history.
   A county whose history fails to load just shows no chip. */
export function withPrevious(places: ReturnType<typeof nearestCounties>) {
  return Promise.all(
    places.map(async (place) => {
      const start = new Date(place.county.latest_date)
      start.setUTCDate(start.getUTCDate() - 14)
      const history = await getHistory(
        place.county.county_code,
        start.toISOString().slice(0, 10),
      ).catch(() => [])
      return { ...place, previous: history.at(-2)?.aqi }
    }),
  )
}

type NearbyPlace = ReturnType<typeof nearestCounties>[number] & {
  /* the county's reading before its latest one, for the up/down chip */
  previous?: number
}

/** Nearby counties' latest AQI and how it moved, like a stock quote's "Related" list. */
export function NearbyList({ places }: { places: NearbyPlace[] }) {
  if (places.length === 0) return null

  return (
    <section aria-labelledby="nearby" className="flex flex-col">
      {/* Same heading style as the panel's other sections */}
      <h2
        id="nearby"
        className="border-b pb-2 font-display text-lg font-semibold"
      >
        Nearby
      </h2>
      <ul className="divide-y">
        {places.map(({ county, miles, previous }) => {
          const category = getCategory(county.latest_aqi)
          return (
            <li
              key={county.county_code}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {county.county_name} County
                </p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: aqiColor(category.key) }}
                  />
                  <span className="sr-only">{category.name}, </span>
                  {county.latest_aqi} AQI · {miles} mi away
                </p>
              </div>
              {previous !== undefined && (
                <ChangeChip from={previous} to={county.latest_aqi} />
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
