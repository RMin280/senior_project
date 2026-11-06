"use client"

import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"

/* shows when api is down or server error */
export default function ZipError({ retry }: { retry: () => void }) {
  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-sky to-background bg-size-[100%_40rem] bg-no-repeat">
      <Navbar />

      <main className="mx-auto flex w-full max-w-md flex-col items-center px-4 pt-24 text-center">
        <h1 className="font-display text-3xl font-medium tracking-tight">
          We can&apos;t load the air quality data
        </h1>
        <p className="mt-3 text-muted-foreground">
          Something went wrong on our end. Please try again in a moment.
        </p>
        <Button className="mt-8" onClick={() => retry()}>
          Try again
        </Button>
      </main>
    </div>
  )
}
