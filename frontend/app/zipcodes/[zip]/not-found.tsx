import { WarningCircleIcon } from "@phosphor-icons/react/ssr"
import { Navbar } from "@/components/layout/navbar"
import { ZipSearch } from "@/features/search"

/* no ZIP code found, or not in Texas */
export default function ZipNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-sky to-background bg-size-[100%_40rem] bg-no-repeat">
      <Navbar />

      {/* Centered in the space below the navbar; pb-14 (the navbar's height) moves it to the middle of the window */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 pb-14 text-center">
        {/* Same treatment as the wind logo on the home page */}
        <WarningCircleIcon size={64} aria-hidden />
        {/* Styled like the home page heading, a size smaller */}
        <h1 className="mt-6 font-display text-4xl leading-tight font-medium tracking-tighter text-balance sm:text-5xl">
          We couldn&apos;t find that ZIP code.
        </h1>
        <p className="mt-3 text-muted-foreground">
          We only cover Texas. Try another Texas ZIP code.
        </p>
        <ZipSearch />
      </main>
    </div>
  )
}
