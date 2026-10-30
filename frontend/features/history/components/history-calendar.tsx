"use client"

import { useState } from "react"
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { aqiColor } from "@/lib/aqi"
import { DayCell } from "./day-cell"
import {
  EARLIEST_DAY,
  LAST_FORECAST_DAY,
  TODAY,
  getSampleReading,
} from "./sample-history"

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// Months are stored as num, so going back/forward +1/-1
function toMonthNumber(date: Date) {
  return date.getFullYear() * 12 + date.getMonth()
}

export function HistoryCalendar() {
  const [monthNumber, setMonthNumber] = useState(toMonthNumber(TODAY))

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
  const hasPrevious = monthNumber > toMonthNumber(EARLIEST_DAY)
  const hasNext = monthNumber < toMonthNumber(LAST_FORECAST_DAY)

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
            reading={getSampleReading(new Date(year, month, i + 1))}
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
