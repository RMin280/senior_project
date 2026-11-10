import { Section } from "@/components/layout/section"
import { aqiColor, categories } from "@/lib/aqi"

/** The six AQI categories behind every color on the map and dashboard. */
export function CategoriesSection() {
  return (
    <Section
      id="colors"
      title="What the colors mean"
      description="Sylph uses the EPA's Air Quality Index (AQI). The higher the number, the more polluted the air."
    >
      <ul className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2">
        {categories.map((c) => (
          <li key={c.key} className="flex gap-3">
            <span
              aria-hidden
              className="mt-1.5 size-3 shrink-0 rounded-full"
              style={{ backgroundColor: aqiColor(c.key) }}
            />
            <div>
              <p className="flex flex-wrap items-baseline gap-x-2 font-medium">
                {c.name}
                <span className="text-sm font-normal text-muted-foreground tabular-nums">
                  {c.lo}–{c.hi}
                </span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {c.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}
