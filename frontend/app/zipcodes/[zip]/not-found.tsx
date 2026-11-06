import { Navbar } from "@/components/layout/navbar"
import { ZipSearch } from "@/features/search"

/* no ZIP code found, or not in Texas */
export default function ZipNotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-sky to-background bg-size-[100%_40rem] bg-no-repeat">
      <Navbar />

      <main className="mx-auto flex w-full max-w-md flex-col items-center px-4 pt-24 text-center">
        <h1 className="font-display text-3xl font-medium tracking-tight">
          We couldn&apos;t find that ZIP code
        </h1>
        <p className="mt-3 text-muted-foreground">
          We only cover Texas. Try another Texas ZIP code.
        </p>
        <ZipSearch />
      </main>
    </div>
  )
}
