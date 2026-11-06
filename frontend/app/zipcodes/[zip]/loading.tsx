import { Navbar } from "@/components/layout/navbar"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-linear-to-b from-sky to-background bg-size-[100%_40rem] bg-no-repeat">
      <Navbar />

      <div
        aria-busy="true"
        className="mx-auto flex w-full max-w-4xl flex-col gap-16 px-4 pb-24"
      >
        <div className="flex flex-col items-center gap-3 py-16">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}
