import { Section } from "@/components/layout/section"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getModelComparison,
  getModelInfo,
  type ModelComparison,
  type ModelInfo,
} from "@/lib/api"
import { cn, formatApiDate } from "@/lib/utils"

const TITLE = "How accurate is it?"
const DESCRIPTION =
  "We test the model on days it never saw while it was being trained, and compare its forecasts with what the monitors measured."

const monthYear = (date: string) =>
  formatApiDate(date, { month: "short", year: "numeric" })
const percent = (share: number) => `${Math.round(share * 100)}%`

/** How often the forecast is right, from the backend's test results. */
export async function AccuracySection() {
  // The page still explains itself if the API is down; only the numbers go missing
  const [model, comparison] = await Promise.all([
    getModelInfo().catch(() => null),
    getModelComparison().catch(() => null),
  ])

  return (
    <Section id="accuracy" band title={TITLE} description={DESCRIPTION}>
      {model ? (
        <Headline model={model} />
      ) : (
        <p className="mt-6 text-muted-foreground">
          Accuracy numbers aren&apos;t available right now.
        </p>
      )}
      {comparison && (
        <Comparison comparison={comparison} current={model?.model} />
      )}
    </Section>
  )
}

/** Shown while the numbers load. */
export function AccuracySkeleton() {
  return (
    <Section id="accuracy" band title={TITLE} description={DESCRIPTION}>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-14 h-80 rounded-2xl" />
    </Section>
  )
}

/* Three headline numbers */
function Headline({ model }: { model: ModelInfo }) {
  const ours = model.results[model.model]
  if (!ours) return null
  // The best simple guess, e.g. "persistence (tomorrow = today)" -> "tomorrow = today"
  const [baseline] = Object.entries(model.results)
    .filter(([name]) => name !== model.model)
    .sort((a, b) => a[1].mae - b[1].mae)
  const baselineName = baseline?.[0].match(/\((.+)\)/)?.[1] ?? baseline?.[0]
  const [start, end] = model.test_period
  const stats = [
    {
      value: `±${Math.round(model.overall_expected_error)}`,
      label: "AQI points off on a typical day",
    },
    {
      value: percent(ours.category_accuracy),
      label: "of days in the right AQI category",
    },
    {
      value: percent(model.mae_improvement_vs_best_baseline),
      label: `smaller misses than the simple guess “${baselineName}”`,
    },
  ]

  return (
    <>
      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-2 rounded-2xl bg-sky p-6"
          >
            <dt className="text-sm text-muted-foreground">{stat.label}</dt>
            {/* Number first on screen; label first for screen readers */}
            <dd className="order-first font-display text-5xl leading-none font-light tracking-tighter tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-muted-foreground">
        Measured on {ours.n.toLocaleString("en-US")} days of county readings,{" "}
        {monthYear(start)} to {monthYear(end)}.
      </p>
    </>
  )
}

/* Every model type that was tried, as bars of typical miss (shorter is better) */
function Comparison({
  comparison,
  current,
}: {
  comparison: ModelComparison
  current?: string
}) {
  const models = [...comparison.models].sort((a, b) => a.mae - b.mae)
  const longest = Math.max(...models.map((m) => m.mae))

  return (
    <div className="mt-14">
      <h3 className="font-display text-lg font-medium">
        We tried {models.length} kinds of models
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Typical miss in AQI points, on the same{" "}
        {comparison.n_test_days.toLocaleString("en-US")} test days (
        {monthYear(comparison.test_start)} to {monthYear(comparison.test_end)}
        ). Shorter is better.
      </p>
      <ol className="mt-6 flex flex-col gap-5">
        {models.map((m) => {
          const used = m.model === (current ?? models[0].model)
          return (
            <li
              key={m.model}
              title={`${m.model}: off by ${m.mae.toFixed(1)} AQI points on a typical day, right category ${percent(m.category_accuracy)} of the time`}
              className="grid gap-x-6 gap-y-2 sm:grid-cols-[17rem_1fr] sm:items-center"
            >
              <div>
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {m.model}
                  {used && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-primary">
                      Used for forecasts
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {m.about}
                </p>
              </div>
              {/* Bar from the baseline with the value at its tip; 3.5rem is kept for the value */}
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-3 rounded-r",
                    used ? "bg-primary" : "bg-muted-foreground/60",
                  )}
                  style={{
                    width: `calc((100% - 3.5rem) * ${m.mae / longest})`,
                  }}
                />
                <span
                  className={cn(
                    "text-sm tabular-nums",
                    used ? "font-semibold" : "text-muted-foreground",
                  )}
                >
                  ±{m.mae.toFixed(1)}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
