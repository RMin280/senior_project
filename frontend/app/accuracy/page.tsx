import type { Metadata } from "next"
import { Suspense } from "react"
import { Navbar } from "@/components/layout/navbar"
import {
  AccuracySection,
  AccuracySkeleton,
  CategoriesSection,
  FinePrintSection,
  HowSteps,
} from "@/features/how-it-works"

export const metadata: Metadata = { title: "How it works · Sylph" }

/* "How it works" in the navbar: where the data comes from, how the forecast is
   made, and how accurate it is. Only the accuracy numbers come from the API, so
   the rest of the page shows right away while they load. */
export default function HowItWorksPage() {
  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-sky to-background bg-size-[100%_40rem] bg-no-repeat">
      <Navbar />

      <main className="flex flex-col pb-24">
        <header className="mx-auto w-full max-w-4xl px-4 pt-16">
          <p className="text-sm font-medium text-primary">How it works</p>
          <h1 className="mt-3 font-display text-4xl leading-tight font-medium tracking-tighter text-balance sm:text-5xl">
            From air monitors to tomorrow&apos;s forecast
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Sylph turns daily readings from air monitors across Texas into a
            next-day AQI forecast for every county that has one. Here&apos;s
            where the data comes from, how the forecast is made, and how often
            it&apos;s right.
          </p>
        </header>

        <HowSteps />

        <Suspense fallback={<AccuracySkeleton />}>
          <AccuracySection />
        </Suspense>

        <CategoriesSection />

        <FinePrintSection />
      </main>
    </div>
  )
}
