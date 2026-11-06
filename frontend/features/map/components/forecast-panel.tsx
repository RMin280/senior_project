import Link from "next/link"
import { ArrowRightIcon } from "@phosphor-icons/react/ssr"
import { AqiChip, AqiScale } from "@/features/air-quality"
import type { PollutantHistory, ZipResult } from "@/lib/api"
import { getCategory } from "@/lib/aqi"
import { formatApiDate } from "@/lib/utils"
import { PollutantSparklines } from "./pollutant-sparklines"

type ForecastPanelProps = {
  result: ZipResult
  pollutants: PollutantHistory | null
}

/** Left-side card on the map: the zip's forecast and what's in the air. */
export function ForecastPanel({ result, pollutants }: ForecastPanelProps) {
  const { zip, forecast, county } = result
  const aqi = forecast?.predicted_aqi ?? county.latest_aqi
  const category = getCategory(aqi)
  const place = result.uses_nearest_county
    ? `${result.home_county_name} County · using ${county.county_name} County monitors`
    : `${county.county_name} County`

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-card p-6 shadow-raised">
      <header>
        <h1 className="font-display text-6xl leading-none font-light tracking-tighter tabular-nums">
          {zip}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{place}</p>
      </header>

      <section aria-labelledby="our-forecast" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between border-b pb-2">
          <h2 id="our-forecast" className="font-display text-lg font-semibold">
            Our forecast
          </h2>
          {forecast && (
            <span className="text-xs text-muted-foreground">
              {formatApiDate(forecast.forecast_date, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>
        <div className="flex items-start gap-2.5">
          <span className="font-display text-8xl leading-none font-light tracking-tighter tabular-nums">
            {aqi}
          </span>
          <span className="mt-3 text-sm leading-tight font-medium text-muted-foreground">
            US
            <br />
            AQI
          </span>
        </div>
        <div>
          <AqiChip aqi={aqi} />
        </div>
        <p className="font-display text-lg leading-snug">
          {category.description}
        </p>
        <AqiScale aqi={aqi} />
        <p className="text-xs text-muted-foreground">
          {forecast
            ? `Usually within ±${Math.round(forecast.expected_error)} AQI. Latest reading ${county.latest_aqi} on ${formatApiDate(county.latest_date, { month: "short", day: "numeric" })}.`
            : `No forecast for this county. Latest reading on ${formatApiDate(county.latest_date)}.`}
        </p>
      </section>

      <PollutantSparklines data={pollutants} />

      <Link
        href={`/zipcodes/${zip}`}
        className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/85"
      >
        Open full dashboard
        <ArrowRightIcon size={16} weight="bold" aria-hidden />
      </Link>
    </div>
  )
}
