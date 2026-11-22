/* Pollutants the API reports per county (AirNow), in the order pages show them */
export const POLLUTANT_ORDER = ["PM2.5", "Ozone", "PM10"]

export const POLLUTANT_ABOUT: Record<string, string> = {
  "PM2.5": "Fine particles",
  Ozone: "Ground-level smog",
  PM10: "Dust and coarse particles",
}
