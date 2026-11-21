"use client"

import type { SubmitEvent } from "react"
import { useRouter } from "next/navigation"
import { MagnifyingGlassIcon, MapPinIcon } from "@phosphor-icons/react"

/** Compact ZIP search that sits on top of the map. Empties itself after each search. */
export function MapSearch() {
  const router = useRouter()

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const zip = new FormData(form).get("zip")
    router.push(`/map/${zip}`)
    form.reset()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="pointer-events-auto flex h-12 w-full max-w-xs items-center rounded-full border border-input bg-white shadow-raised"
    >
      <MapPinIcon
        size={18}
        className="ml-4 shrink-0 text-muted-foreground"
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
        aria-label="Search ZIP code"
        placeholder="Search"
        className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-sm tracking-wide outline-none placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        aria-label="Search"
        className="mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/85"
      >
        <MagnifyingGlassIcon size={16} weight="bold" />
      </button>
    </form>
  )
}
