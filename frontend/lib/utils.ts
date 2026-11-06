export { cn } from "cn"

/* formats dates */
export function formatApiDate(
  date: string,
  format: Intl.DateTimeFormatOptions = { dateStyle: "long" },
) {
  return new Date(date).toLocaleDateString("en-US", {
    ...format,
    timeZone: "UTC",
  })
}
