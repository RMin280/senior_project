"use client"

import type { SubmitEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, MapPinIcon } from "@phosphor-icons/react"

/** ZIP search box. The browser checks the format; the API decides if it's in Texas. */
export function ZipSearch() {
  const router = useRouter()

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const zip = new FormData(event.currentTarget).get("zip")
    router.push(`/zipcodes/${zip}`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-10 flex h-16 w-full max-w-md items-center rounded-full border border-input bg-white shadow-raised"
    >
      <MapPinIcon
        size={20}
        className="ml-5 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <input
        name="zip"
        required
        pattern="[0-9]{5}"
        maxLength={5}
        inputMode="numeric"
        autoComplete="postal-code"
        title="Enter a 5-digit ZIP code"
        aria-label="ZIP code"
        placeholder="Enter a Texas ZIP code"
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-base tracking-wide outline-none placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        aria-label="Show air quality"
        className="mr-2 flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/85"
      >
        <ArrowRightIcon size={20} weight="bold" />
      </button>
    </form>
  )
}
