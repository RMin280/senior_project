type ForecastDayProps = {
  day: string
  date: string
  aqi: number
  error: number
}

export function ForecastDay({ day, date, aqi, error }: ForecastDayProps) {
  return (
    <div className="flex items-end justify-between border-t pt-5">
      <div>
        <h3 className="font-display text-base font-semibold">{day}</h3>
        <p className="text-sm text-muted-foreground">{date}</p>
      </div>
      <p>
        <span className="font-display text-4xl tabular-nums">{aqi}</span>{" "}
        <span className="text-sm text-muted-foreground">±{error}</span>
      </p>
    </div>
  )
}
