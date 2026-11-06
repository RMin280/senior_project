import { Navbar } from "@/components/layout/navbar"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex h-dvh flex-col">
      <Navbar />
      <main aria-busy="true" className="relative flex-1 bg-sky">
        <div className="p-4 lg:absolute lg:top-4 lg:left-4 lg:w-[400px] lg:p-0">
          <Skeleton className="h-[560px] w-full rounded-2xl" />
        </div>
      </main>
    </div>
  )
}
