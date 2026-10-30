import Link from "next/link"
import { ArrowRightIcon, MapPinIcon } from "@phosphor-icons/react/ssr"

export function ZipSearch() {
  return (
    <div className="mt-10 flex h-16 w-full max-w-md items-center rounded-full border border-input bg-white shadow-raised">
      <MapPinIcon
        size={20}
        className="ml-5 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <input
        aria-label="ZIP code"
        placeholder="Enter a Texas ZIP code"
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-base tracking-wide outline-none placeholder:text-muted-foreground"
      />
      <Link
        href="/zipcodes/75201"
        aria-label="Show air quality"
        className="mr-2 flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/85"
      >
        <ArrowRightIcon size={20} weight="bold" />
      </Link>
    </div>
  )
}
