import Link from "next/link"
import { MapPinIcon } from "@phosphor-icons/react/ssr"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AqiChip } from "./aqi-chip"
import { AqiScale } from "./aqi-scale"
import { getCategory } from "@/lib/aqi"

type AqiCardProps = {
  place: string
  aqi: number
  description: string
  advice?: string
  measured: string
  changeHref: string
}

/** The large card showing a place's current AQI, category and scale. */
export function AqiCard({
  place,
  aqi,
  description,
  advice,
  measured,
  changeHref,
}: AqiCardProps) {
  const category = getCategory(aqi)

  return (
    <Card className="w-full max-w-md gap-3 rounded-2xl text-base shadow-raised ring-0 [--card-spacing:--spacing(8)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPinIcon size={18} className="text-primary" aria-hidden />
          {place}
        </CardTitle>
        <CardAction>
          <Link
            href={changeHref}
            className="text-sm text-primary underline underline-offset-4"
          >
            Change
          </Link>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col items-start gap-3">
        <h1 className="sr-only">
          Air quality now: {aqi}, {category.name}
        </h1>
        <AqiNumber aqi={aqi} />

        <AqiChip aqi={aqi} />
        <p className="font-display text-xl leading-snug">{description}</p>
        {advice && <p className="text-foreground/80">{advice}</p>}

        <div className="mt-4 w-full">
          <AqiScale aqi={aqi} />
        </div>
      </CardContent>

      <CardFooter className="border-t-0 pt-0">
        <p className="text-sm text-muted-foreground">{measured}</p>
      </CardFooter>
    </Card>
  )
}

function AqiNumber({ aqi }: { aqi: number }) {
  return (
    <div aria-hidden className="mt-1 flex items-start gap-2.5">
      <span className="font-display text-9xl leading-none font-light tracking-tighter tabular-nums">
        {aqi}
      </span>
      <span className="mt-5 text-sm leading-tight font-medium text-muted-foreground">
        US
        <br />
        AQI
      </span>
    </div>
  )
}
