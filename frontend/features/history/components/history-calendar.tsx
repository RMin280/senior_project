"use client"

import { useState, type ReactNode } from "react"
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react"
import { AqiChip } from "@/features/air-quality"
import type { Forecast, HistoryPoint } from "@/lib/api"
import { aqiColor, categories, getCategory } from "@/lib/aqi"
import { formatApiDate } from "@/lib/utils"
import { DayCell, type DayReading } from "./day-cell"

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

type HistoryCalendarProps = {
  /* each measured day by date, oldest first */
  byDate: Record<string, HistoryPoint>
  /* forecast days after the latest reading, tomorrow first */
  forecastDays: Forecast[]
}

// Months are stored as num, so going back/forward +1/-1
function toMonthNumber(date: string) {
  const [year, month] = date.split("-").map(Number)
  return year * 12 + month - 1
}

// "2026-03-05", the same format the API uses
function toApiDate(year: number, month: number, day: number) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${year}-${pad(month + 1)}-${pad(day)}`
}

const shortName = (key: string, name: string) =>
  key === "sensitive" ? "sensitive groups" : name.toLowerCase()

/* Month arrows: outlined circles, like the design */
function MonthButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={!onClick}
      className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-input bg-card hover:bg-muted disabled:cursor-default disabled:opacity-40 disabled:hover:bg-card"
    >
      {children}
    </button>
  )
}

export function HistoryCalendar({
  byDate,
  forecastDays,
}: HistoryCalendarProps) {
  const dates = Object.keys(byDate)
  const firstDate = dates[0]
  const latestDate = dates[dates.length - 1]
  const lastDate = forecastDays.at(-1)?.forecast_date ?? latestDate
  const forecastOn = (date: string) =>
    forecastDays.find((d) => d.forecast_date === date)

  // Opens on the latest reading, in its month
  const [selected, setSelected] = useState(latestDate)
  const [monthNumber, setMonthNumber] = useState(toMonthNumber(latestDate))

  function getReading(date: string): DayReading | undefined {
    const forecast = forecastOn(date)
    if (forecast) return { aqi: forecast.predicted_aqi, kind: "forecast" }
    const day = byDate[date]
    return day && { aqi: day.aqi, kind: "measured" }
  }

  function pick(date: string) {
    setSelected(date)
    setMonthNumber(toMonthNumber(date))
  }

  // Shown Month
  const year = Math.floor(monthNumber / 12)
  const month = monthNumber % 12
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstWeekday = new Date(year, month, 1).getDay() // 0 = Sunday
  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
  const monthDays = Array.from({ length: daysInMonth }, (_, i) =>
    toApiDate(year, month, i + 1),
  )

  // no previous month before data starts, no next month after the last forecast day
  const hasPrevious = monthNumber > toMonthNumber(firstDate)
  const hasNext = monthNumber < toMonthNumber(lastDate)

  // The picked day, and the shown month in numbers
  const reading = getReading(selected)
  const err = Math.round(forecastOn(selected)?.expected_error ?? 0)
  const measured = monthDays.flatMap((d) => (byDate[d] ? [byDate[d].aqi] : []))
  const average = measured.length
    ? Math.round(measured.reduce((a, b) => a + b, 0) / measured.length)
    : null
  const counts = categories
    .map((c) => ({
      ...c,
      days: measured.filter((aqi) => getCategory(aqi).key === c.key).length,
    }))
    .filter((c) => c.days > 0)

  return (
    <div className="mt-6 grid gap-x-8 gap-y-10 lg:grid-cols-[1fr_12rem]">
      {/* Calendar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <MonthButton
            label="Previous month"
            onClick={
              hasPrevious ? () => setMonthNumber(monthNumber - 1) : undefined
            }
          >
            <CaretLeftIcon size={18} />
          </MonthButton>
          <h3 aria-live="polite" className="text-lg font-medium">
            {monthLabel}
          </h3>
          <MonthButton
            label="Next month"
            onClick={
              hasNext ? () => setMonthNumber(monthNumber + 1) : undefined
            }
          >
            <CaretRightIcon size={18} />
          </MonthButton>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {weekdays.map((weekday) => (
            <div
              key={weekday}
              className="pb-1 text-center text-xs text-muted-foreground"
            >
              {weekday}
            </div>
          ))}

          {/* Blank cells before the 1st */}
          {Array.from({ length: firstWeekday }, (_, i) => (
            <div key={`blank-${i}`} />
          ))}

          {monthDays.map((date, i) => (
            <DayCell
              key={date}
              day={i + 1}
              label={date === latestDate ? "Latest" : undefined}
              reading={getReading(date)}
              selected={date === selected}
              onSelect={() => setSelected(date)}
            />
          ))}
        </div>

        {/* Key */}
        <div className="mt-3 flex gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span
              className="size-3.5 rounded"
              style={{ background: aqiColor("good", "tint") }}
            />
            Measured
          </span>
          <span className="flex items-center gap-2">
            <span
              className="size-3.5 rounded"
              style={{ border: `1.5px dashed ${aqiColor("good")}` }}
            />
            Forecast
          </span>
        </div>
      </div>

      {/* Side panel: jump to a date, the picked day, the month's summary */}
      <aside aria-label="Selected day" className="flex flex-col gap-6">
        <label className="flex flex-col gap-2 text-sm text-muted-foreground">
          Go to a date
          <input
            type="date"
            min={firstDate}
            max={lastDate}
            value={selected}
            onChange={(e) => e.target.value && pick(e.target.value)}
            className="h-11 rounded-lg border border-input bg-card px-3 text-base text-foreground"
          />
        </label>

        <div aria-live="polite" className="flex flex-col gap-1">
          <p className="font-medium">
            {formatApiDate(selected, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          {reading ? (
            <>
              <p className="text-sm text-muted-foreground">
                {reading.kind === "forecast"
                  ? `Forecast, likely ${Math.max(0, reading.aqi - err)} to ${reading.aqi + err}`
                  : selected === latestDate
                    ? "Latest reading"
                    : "Measured"}
              </p>
              <p className="mt-3 text-6xl leading-none font-light tracking-tight tabular-nums">
                {reading.kind === "forecast" ? `~${reading.aqi}` : reading.aqi}
              </p>
              <div className="mt-3">
                <AqiChip aqi={reading.aqi} />
              </div>
              {byDate[selected]?.driver && (
                <p className="mt-3 text-sm text-foreground/75">
                  Main pollutant: {byDate[selected].driver}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No reading this day.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 border-t pt-5 text-sm">
          <p className="font-medium">{monthLabel}</p>
          {average === null ? (
            <p className="text-muted-foreground">No readings this month.</p>
          ) : (
            <>
              <p className="text-foreground/75">Average AQI {average}</p>
              {counts.map((c) => (
                <p
                  key={c.key}
                  className="flex items-center gap-2"
                  style={{ color: aqiColor(c.key, "ink") }}
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ background: aqiColor(c.key) }}
                  />
                  {c.days} {c.days === 1 ? "day" : "days"}{" "}
                  {shortName(c.key, c.name)}
                </p>
              ))}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
