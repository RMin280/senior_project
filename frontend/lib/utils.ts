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

/* AirNow monitor names end with the state's site codes, e.g. "Northwest Harris Co. C26/C110/C154".
   Splits them off so pages can show the codes smaller; names without codes come back whole. */
export function splitMonitorName(site: string) {
  const [, name = site, codes] = site.match(/^(.+?)\s+(C\d+(?:\/C\d+)*)$/) ?? []
  return { name, codes }
}
