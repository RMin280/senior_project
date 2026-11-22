import {
  ArrowDownIcon,
  ArrowUpIcon,
  MinusIcon,
} from "@phosphor-icons/react/ssr"
import { aqiColor } from "@/lib/aqi"
import { cn } from "@/lib/utils"

/* Percent change from one AQI to another, one decimal under 10%. null when `from` is 0. */
export function percentChange(from: number, to: number) {
  if (from <= 0) return null
  const pct = (Math.abs(to - from) / from) * 100
  return pct < 10 ? pct.toFixed(1) : String(Math.round(pct))
}

/** Up/down chip, like a stock ticker's. Rising AQI is worse air, so up is red and down is green;
    the arrow and the hidden word carry the meaning, the color only supports it. */
export function ChangeChip({
  from,
  to,
  className,
}: {
  from: number
  to: number
  className?: string
}) {
  const diff = to - from
  const pct = percentChange(from, to)
  const Icon = diff > 0 ? ArrowUpIcon : diff < 0 ? ArrowDownIcon : MinusIcon
  const tone = diff > 0 ? "unhealthy" : diff < 0 ? "good" : null

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm leading-none font-semibold whitespace-nowrap tabular-nums",
        !tone && "bg-muted text-muted-foreground",
        className,
      )}
      style={
        tone
          ? { background: aqiColor(tone, "tint"), color: aqiColor(tone, "ink") }
          : undefined
      }
    >
      <Icon size={14} weight="bold" aria-hidden />
      <span className="sr-only">
        {diff > 0 ? "Up" : diff < 0 ? "Down" : "No change,"}
      </span>
      {pct !== null ? `${pct}%` : `${Math.abs(diff)} AQI`}
    </span>
  )
}

/** "+8" / "−3" / "±0", with a real minus sign */
export function signed(n: number) {
  return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "±0"
}
