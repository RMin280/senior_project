"use client"

import { useState } from "react"
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import type { Forecast } from "@/lib/api"
import { aqiColor } from "@/lib/aqi"
import { DayCell, type DayReading } from "./day-cell"

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

type HistoryCalendarProps = {
  /* aqi by date, oldest first */
  aqiByDate: Record<string, number>
  forecast: Forecast | null
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

export function HistoryCalendar({ aqiByDate, forecast }: HistoryCalendarProps) {
  const dates = Object.keys(aqiByDate)
  const firstDate = dates[0]
  const latestDate = dates[dates.length - 1]
  const lastDate = forecast?.forecast_date ?? latestDate

  // opens on the latest reading's month
  const [monthNumber, setMonthNumber] = useState(toMonthNumber(latestDate))

  function getReading(date: string): DayReading | undefined {
    if (date === forecast?.forecast_date) {
      return { aqi: forecast.predicted_aqi, kind: "forecast" }
    }
    const aqi = aqiByDate[date]
    return aqi === undefined ? undefined : { aqi, kind: "measured" }
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

  // Arrows //
  // no previous month before data starts, no next month after the last forecast day
  const hasPrevious = monthNumber > toMonthNumber(firstDate)
  const hasNext = monthNumber < toMonthNumber(lastDate)

  return (
    <div className="mt-6 flex flex-col gap-3">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        {hasPrevious ? (
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Previous month"
            className="rounded-full"
            onClick={() => setMonthNumber(monthNumber - 1)}
          >
            <CaretLeftIcon />
          </Button>
        ) : (
          <span className="size-9" />
        )}

        <h3 aria-live="polite" className="font-display text-lg font-medium">
          {monthLabel}
        </h3>

        {hasNext ? (
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Next month"
            className="rounded-full"
            onClick={() => setMonthNumber(monthNumber + 1)}
          >
            <CaretRightIcon />
          </Button>
        ) : (
          <span className="size-9" />
        )}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekdays.map((weekday) => (
          <div
            key={weekday}
            className="text-center text-xs text-muted-foreground"
          >
            {weekday}
          </div>
        ))}

        {/* Blank cells before the 1st */}
        {Array.from({ length: firstWeekday }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => (
          <DayCell
            key={i}
            day={i + 1}
            reading={getReading(toApiDate(year, month, i + 1))}
          />
        ))}
      </div>

      {/* Key */}
      <div className="flex gap-5 text-xs text-muted-foreground">
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
  )
}
