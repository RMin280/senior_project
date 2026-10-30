type PollutantCardProps = {
  name: string
  value: number
  unit: string
}

/** One pollutant's current level. */
export function PollutantCard({ name, value, unit }: PollutantCardProps) {
  return (
    <div className="border-t pt-5">
      <h3 className="font-display text-base font-semibold">{name}</h3>
      <p className="mt-2">
        <span className="font-display text-4xl tabular-nums">{value}</span>{" "}
        <span className="text-sm text-muted-foreground">{unit}</span>
      </p>
    </div>
  )
}
