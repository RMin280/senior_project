import { Section } from "@/components/layout/section"

const notes = [
  {
    title: "Not every county has a monitor.",
    text: "If yours doesn't, Sylph uses the nearest county that does, and the map's side panel says which one.",
  },
  {
    title: "A county's AQI is its worst reading.",
    text: "Like the EPA, we take the highest reading from any monitor in the county, for whichever pollutant is worst that day.",
  },
  {
    title: "Monitors measure different things.",
    text: "Some only measure ozone, so a county may show one or two pollutants instead of all three.",
  },
  {
    title: "Colors between monitors are estimates.",
    text: "The map blends the readings of the nearest monitors and fades out where none are close. The dots are the actual readings.",
  },
  {
    title: "Readings are a day behind.",
    text: "AirNow posts each day's numbers the next morning, so the newest reading is from yesterday and the forecast is for the day after it.",
  },
]

const LINK = "text-primary underline underline-offset-4"

/** Limits worth knowing, and where the data comes from. */
export function FinePrintSection() {
  return (
    <Section id="fine-print" band title="Good to know">
      <dl className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2">
        {notes.map((note) => (
          <div key={note.title}>
            <dt className="font-medium">{note.title}</dt>
            <dd className="mt-1 text-sm text-muted-foreground">{note.text}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-10 text-sm text-muted-foreground">
        Data from{" "}
        <a
          href="https://aqs.epa.gov/aqsweb/airdata/download_files.html"
          className={LINK}
        >
          EPA AirData
        </a>{" "}
        (2015 to March 2026),{" "}
        <a href="https://www.airnow.gov/" className={LINK}>
          AirNow
        </a>{" "}
        (2021 on) and{" "}
        <a href="https://open-meteo.com/" className={LINK}>
          Open-Meteo
        </a>{" "}
        (weather).
      </p>
    </Section>
  )
}
