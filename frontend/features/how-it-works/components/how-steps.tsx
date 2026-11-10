import {
  BroadcastIcon,
  ChartLineUpIcon,
  CloudSunIcon,
} from "@phosphor-icons/react/ssr"
import { Section } from "@/components/layout/section"

const steps = [
  {
    Icon: BroadcastIcon,
    title: "Monitors measure the air",
    text: "Government air monitors across Texas measure ozone and fine and coarse particles (PM2.5 and PM10). AirNow posts each day's readings the next morning, and the EPA's archive goes back to 2015.",
  },
  {
    Icon: CloudSunIcon,
    title: "We add the weather",
    text: "Heat, wind, humidity and rain change how pollution builds up and clears out, so each county also gets the day's measured weather and tomorrow's weather forecast from Open-Meteo.",
  },
  {
    Icon: ChartLineUpIcon,
    title: "A model forecasts tomorrow",
    text: "A LightGBM model trained on every day since 2015 looks at the past week of readings, the time of year, the pollutant driving today's AQI and tomorrow's weather, then predicts tomorrow's AQI.",
  },
]

/** The three steps from monitor readings to a forecast. */
export function HowSteps() {
  return (
    <Section
      id="steps"
      title="From monitors to a forecast"
      description="The same three steps, for every Texas county with an air monitor."
    >
      <ol className="mt-8 grid gap-4 sm:grid-cols-3">
        {steps.map(({ Icon, title, text }, i) => (
          <li
            key={title}
            className="flex flex-col gap-3 rounded-2xl bg-card p-6 shadow-raised"
          >
            <div className="flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-full bg-accent text-primary">
                <Icon size={20} aria-hidden />
              </span>
              <span className="text-xs text-muted-foreground">
                Step {i + 1}
              </span>
            </div>
            <h3 className="font-display text-lg font-medium">{title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {text}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  )
}
