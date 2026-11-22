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

/* Great-circle distance in miles between two lat/lon points */
export function distanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const r = Math.PI / 180
  const dLat = (lat2 - lat1) * r
  const dLon = (lon2 - lon1) * r
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2
  // 7918 miles is the Earth's diameter
  return 7918 * Math.asin(Math.sqrt(a))
}
