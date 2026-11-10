import Link from "next/link"
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react/ssr"
import { AqiChip, AqiScale } from "@/features/air-quality"
import type { County, Forecast, PollutantHistory } from "@/lib/api"
import { getCategory } from "@/lib/aqi"
import { cn, formatApiDate } from "@/lib/utils"
import { PollutantSparklines } from "./pollutant-sparklines"

type ForecastPanelProps = {
  /* the searched ZIP code, or the name of a monitor picked on the map */
  title: string
  /* smaller text after the title, e.g. a monitor's site codes */
  titleNote?: string
  /* line under the title, e.g. the county */
  place: string
  county: County
  forecast: Forecast | null
  pollutants: PollutantHistory | null
  /* main button at the bottom, filling the row */
  link: { href: string; label: string }
  /* shorter button to its left, back to the searched ZIP */
  back?: { href: string; to: string }
}

/** Left-side card on the map: a place's forecast and what's in the air. */
export function ForecastPanel({
  title,
  titleNote,
  place,
  county,
  forecast,
  pollutants,
  link,
  back,
}: ForecastPanelProps) {
  const aqi = forecast?.predicted_aqi ?? county.latest_aqi
  const category = getCategory(aqi)
  // Monitor names are much longer than a ZIP code, so they get a smaller title
  const isZip = /^\d{5}$/.test(title)

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-card p-6 shadow-overlay">
      <header>
        {/* leading-none here too, so a note that wraps gets a short line of its own */}
        <h1 className="leading-none">
          <span
            className={cn(
              "font-display leading-none font-light tracking-tighter",
              isZip ? "text-5xl tabular-nums" : "text-3xl",
            )}
          >
            {title}
          </span>
          {titleNote && (
            <>
              {" "}
              <span className="text-sm leading-none whitespace-nowrap text-muted-foreground">
                {titleNote}
              </span>
            </>
          )}
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
        {/* The chip sits beside the number, and wraps under it when the name is long */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="font-display text-7xl leading-none font-light tracking-tighter tabular-nums">
              {aqi}
            </span>
            <span className="mt-2 text-sm leading-tight font-medium text-muted-foreground">
              US
              <br />
              AQI
            </span>
          </div>
          <AqiChip aqi={aqi} />
        </div>
        <p className="font-display text-lg leading-snug">
          {category.description}
        </p>
        {/* Full width, so it lines up with the section dividers */}
        <AqiScale aqi={aqi} className="max-w-none" />
        <p className="text-xs text-muted-foreground">
          {forecast
            ? `Usually within ±${Math.round(forecast.expected_error)} AQI. Latest reading ${county.latest_aqi} on ${formatApiDate(county.latest_date, { month: "short", day: "numeric" })}.`
            : `No forecast for this county. Latest reading on ${formatApiDate(county.latest_date)}.`}
        </p>
      </section>

      <PollutantSparklines data={pollutants} />

      <div className="flex gap-2">
        {back && (
          // Inset ring instead of a border, so both buttons stay the same height
          <Link
            href={back.href}
            aria-label={`Back to ${back.to}`}
            className="flex items-center justify-center gap-2 rounded-full bg-background px-4 py-3 text-sm font-semibold ring-1 ring-border ring-inset hover:bg-muted"
          >
            <ArrowLeftIcon size={16} weight="bold" aria-hidden />
            {back.to}
          </Link>
        )}
        <Link
          href={link.href}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/85"
        >
          {link.label}
          <ArrowRightIcon size={16} weight="bold" aria-hidden />
        </Link>
      </div>
    </div>
  )
}
