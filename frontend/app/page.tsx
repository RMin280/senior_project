import { WindIcon } from "@phosphor-icons/react/ssr"
import { Navbar } from "@/components/layout/navbar"
import { ZipSearch } from "@/features/search"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <Navbar />
      <main className="sky-panel mx-4 mb-4 flex flex-1 flex-col items-center justify-center rounded-2xl px-5 pt-16 pb-24 text-center">
        <WindIcon size={64} aria-hidden />
        <h1 className="mt-6 font-display text-5xl leading-tight font-medium tracking-tighter text-balance sm:text-7xl">
          Know the air you breathe.
        </h1>
        <p className="mt-5 max-w-md text-base text-balance text-muted-foreground">
          The air quality forecast system for Texans.
        </p>
        <ZipSearch />
      </main>
      <footer className="px-6 pb-4 text-xs text-muted-foreground">
        Data from the U.S. EPA (AirNow and AQS)
      </footer>
    </div>
  )
}
