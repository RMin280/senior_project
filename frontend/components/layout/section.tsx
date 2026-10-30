import type { ReactNode } from "react"

type SectionProps = {
  id: string
  title: string
  description?: string
  children?: ReactNode
}

export function Section({ id, title, description, children }: SectionProps) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="font-display text-2xl font-medium">
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-muted-foreground">{description}</p>
      )}
      {children}
    </section>
  )
}
