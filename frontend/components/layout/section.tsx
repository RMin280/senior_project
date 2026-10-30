import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type SectionProps = {
  id: string
  title: string
  description?: string
  /** Full-width white band with lines above and below, to break up the page. */
  band?: boolean
  children?: ReactNode
}

export function Section({
  id,
  title,
  description,
  band,
  children,
}: SectionProps) {
  return (
    <section aria-labelledby={id} className={cn(band && "border-y bg-card")}>
      {/* Content stays page width even when the band runs edge to edge */}
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h2 id={id} className="font-display text-2xl font-medium">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-muted-foreground">{description}</p>
        )}
        {children}
      </div>
    </section>
  )
}
