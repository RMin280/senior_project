import { Skeleton } from "@/components/ui/skeleton"

type PollutantCardProps = {
  name: string
  /* leave out until the API has this pollutant's level */
  value?: number
  unit: string
}

/** One pollutant's current level. */
export function PollutantCard({ name, value, unit }: PollutantCardProps) {
  return (
    <div className="border-t pt-5">
      <h3 className="font-display text-base font-semibold">{name}</h3>
      {value === undefined ? (
        <div className="mt-2">
          <Skeleton className="h-10 w-20 rounded-md" />
          <span className="sr-only">Not available yet</span>
        </div>
      ) : (
        <p className="mt-2">
          <span className="font-display text-4xl tabular-nums">{value}</span>{" "}
          <span className="text-sm text-muted-foreground">{unit}</span>
        </p>
      )}
    </div>
  )
}
