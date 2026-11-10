/**
 * Mock of the Flask API (backend/app) for frontend work: the same routes and
 * JSON shapes, with fake but stable data, so the UI runs without downloading
 * data or training the model. Needs only Node.
 *
 *   npm run mock-api   ->  http://localhost:5000/api/health
 *
 * The frontend already looks for the API on :5000, so run this instead of the
 * real backend (only one can use the port). It has the routes lib/api.ts calls.
 */
import { readFileSync } from "node:fs"
import { createServer } from "node:http"

const PORT = Number(process.env.PORT ?? 5000)

// Counties with fake monitors (code: how many). ZIPs in other counties use the
// nearest of these, like the real backend.
const MONITORS = {
  201: 8, // Harris (Houston)
  113: 5, // Dallas
  439: 5, // Tarrant (Fort Worth)
  29: 4, // Bexar (San Antonio)
  141: 4, // El Paso
  453: 3, // Travis (Austin)
  85: 2, // Collin
  121: 2, // Denton
  167: 2, // Galveston
  39: 2, // Brazoria
  245: 2, // Jefferson (Beaumont)
  355: 2, // Nueces (Corpus Christi)
  215: 2, // Hidalgo (McAllen)
}
// One each: suburbs, mid-size cities, Big Bend
for (const code of [
  157, 339, 361, 61, 479, 303, 375, 309, 423, 183, 203, 139, 251, 257, 367, 397,
  221, 497, 27, 41, 491, 209, 91, 469, 135, 329, 37, 43, 441, 451,
]) {
  MONITORS[code] = 1
}

// Bad air around Houston over the last few days, so the map shows more than
// green. Move it, widen it, or set boost to 0.
const EPISODE = {
  lat: 29.75,
  lon: -95.15,
  radiusKm: 140,
  boost: 65,
  days: 3,
  pollutant: "PM2.5",
}

// Typical daily AQI per pollutant: yearly mean, seasonal swing and the day of
// the year it peaks, day-to-day noise, and the chance of a spike on any day
const POLLUTANTS = {
  Ozone: { mean: 40, swing: 12, peakDay: 230, noise: 9, spikes: 0.02 },
  "PM2.5": { mean: 42, swing: 6, peakDay: 190, noise: 8, spikes: 0.008 },
  PM10: { mean: 24, swing: 5, peakDay: 100, noise: 7, spikes: 0.008 },
}
const KINDS = Object.keys(POLLUTANTS)

// Nearby counties share these regions' ups and downs, so the heatmap is smooth
const REGIONS = [
  [29.7, -95.3], // Houston and the coast
  [32.8, -97.0], // Dallas-Fort Worth
  [29.9, -98.2], // Austin and San Antonio
  [27.0, -98.0], // Corpus Christi and the Valley
  [32.3, -94.7], // East Texas
  [31.7, -106.4], // El Paso
  [34.0, -101.8], // Panhandle and South Plains
]

const CATEGORIES = [
  [50, "Good"],
  [100, "Moderate"],
  [150, "Unhealthy for Sensitive Groups"],
  [200, "Unhealthy"],
  [300, "Very Unhealthy"],
]
const category = (aqi) =>
  CATEGORIES.find(([upper]) => aqi <= upper)?.[1] ?? "Hazardous"

// ---------- dates: 2015-01-01 through yesterday, like the real data ----------
const DAY = 86_400_000
const FIRST = Date.UTC(2015, 0, 1)
const now = new Date()
const N = Math.round(
  (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - FIRST) / DAY,
)
const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10)
const DATES = Array.from({ length: N + 1 }, (_, i) => isoDate(FIRST + i * DAY))
const DAY_OF_YEAR = DATES.map(
  (d, i) => (FIRST + i * DAY - Date.UTC(Number(d.slice(0, 4)), 0, 0)) / DAY,
)
const END = DATES[N - 1] // latest data
const TODAY = DATES[N] // forecast day
const AIRNOW_FROM = DATES.indexOf("2021-01-01") // per-pollutant data starts here

// ---------- helpers ----------
/* Seeded random numbers, so every run serves the same data */
function random(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const normal = (rand) =>
  Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())

/* Daily noise that carries over from one day to the next */
function wobble(seed) {
  const rand = random(seed)
  const out = new Float64Array(N)
  for (let i = 0, x = 0; i < N; i++) {
    x = 0.65 * x + 0.76 * normal(rand)
    out[i] = x
  }
  return out
}

function km(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) *
      Math.cos(lat2 * r) *
      Math.sin(((lon2 - lon1) * r) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(a))
}

const round = (x, digits) => Number(x.toFixed(digits))

// ---------- ZIPs and counties (the real backend reads this file too) ----------
const ZIPS = new Map()
const PLACES = new Map() // county code -> { name, lat, lon, zips }
const csv = readFileSync(
  new URL("../../backend/data/zip_county.csv", import.meta.url),
  "utf8",
)
for (const line of csv.trim().split(/\r?\n/).slice(1)) {
  const [zip, code, name, lat, lon] = line.split(",")
  const z = {
    zip,
    code: Number(code),
    name,
    lat: Number(lat),
    lon: Number(lon),
  }
  ZIPS.set(zip, z)
  if (!PLACES.has(z.code)) PLACES.set(z.code, { name, zips: [] })
  PLACES.get(z.code).zips.push(z)
}
for (const place of PLACES.values()) {
  place.lat = place.zips.reduce((sum, z) => sum + z.lat, 0) / place.zips.length
  place.lon = place.zips.reduce((sum, z) => sum + z.lon, 0) / place.zips.length
}

// ---------- fake readings ----------
const REGION_WOBBLE = REGIONS.map((_, r) =>
  Object.fromEntries(KINDS.map((kind, k) => [kind, wobble(1000 + 10 * r + k)])),
)
const SITE_NAMES = [
  "Central",
  "North",
  "East",
  "South",
  "West",
  "Northwest",
  "Southeast",
  "Airport",
]
const COUNTIES = new Map() // code -> { county, forecast, points, pollutants }
const SITES = [] // every monitor's reading on END, for the map

for (const [key, monitors] of Object.entries(MONITORS)) {
  const code = Number(key)
  const place = PLACES.get(code)
  const rand = random(code)
  const kinds =
    monitors >= 3
      ? KINDS
      : monitors === 2 || rand() < 0.5
        ? ["Ozone", "PM2.5"]
        : ["Ozone"]
  const level = 1.2 * monitors + (rand() - 0.5) * 10 // bigger metros run higher
  const near = REGIONS.map(([lat, lon]) =>
    Math.exp(-((km(place.lat, place.lon, lat, lon) / 300) ** 2)),
  )
  const weights = near.map((w) => w / near.reduce((a, b) => a + b))
  const episodeKm = km(place.lat, place.lon, EPISODE.lat, EPISODE.lon)
  const boost = EPISODE.boost * Math.exp(-((episodeKm / EPISODE.radiusKm) ** 2))
  const typical = (kind, i) => {
    const p = POLLUTANTS[kind]
    const season = Math.cos((2 * Math.PI * (DAY_OF_YEAR[i] - p.peakDay)) / 365)
    return p.mean + level + p.swing * season - (0.4 * i) / 365 // slowly improving
  }

  // Daily AQI per pollutant; 0 means no reading that day
  const daily = {}
  for (const kind of kinds) {
    const p = POLLUTANTS[kind]
    const own = wobble(10 * code + KINDS.indexOf(kind))
    daily[kind] = new Int16Array(N)
    for (let i = 0; i < N; i++) {
      const daysAgo = N - 1 - i
      let shared = 0
      for (let r = 0; r < REGIONS.length; r++) {
        shared += weights[r] * REGION_WOBBLE[r][kind][i]
      }
      let aqi = typical(kind, i) + p.noise * (0.8 * shared + 0.6 * own[i])
      if (rand() < p.spikes) aqi += 20 + 40 * rand()
      if (kind === "PM2.5" && /-(01-01|07-05)$/.test(DATES[i])) {
        aqi += 25 + 30 * rand() // fireworks
      }
      if (kind === EPISODE.pollutant && daysAgo < EPISODE.days) {
        aqi += boost * (1 - daysAgo / (EPISODE.days + 1))
      }
      const missing = daysAgo >= 3 && rand() < 0.01
      daily[kind][i] = missing ? 0 : Math.max(3, Math.round(aqi))
    }
  }

  // Overall AQI is the worst pollutant that day
  const points = []
  for (let i = 0; i < N; i++) {
    let aqi = 0
    let driver = null
    for (const kind of kinds) {
      if (daily[kind][i] > aqi) {
        aqi = daily[kind][i]
        driver = kind
      }
    }
    if (aqi > 0) {
      points.push({ date: DATES[i], aqi, category: category(aqi), driver })
    }
  }

  const pollutants = {}
  for (const kind of kinds) {
    pollutants[kind] = []
    for (let i = AIRNOW_FROM; i < N; i++) {
      if (daily[kind][i] > 0) {
        pollutants[kind].push({ date: DATES[i], aqi: daily[kind][i] })
      }
    }
  }

  const latest = points.at(-1)
  const usual = Math.max(...kinds.map((kind) => typical(kind, N)))
  const predicted = Math.max(
    5,
    Math.round(0.6 * latest.aqi + 0.4 * usual + 3 * normal(rand)),
  )
  COUNTIES.set(code, {
    county: {
      county_code: code,
      county_name: place.name,
      lat: round(place.lat, 4),
      lon: round(place.lon, 4),
      latest_date: latest.date,
      latest_aqi: latest.aqi,
      latest_category: latest.category,
      has_forecast: true,
    },
    forecast: {
      county_code: code,
      county_name: place.name,
      forecast_date: TODAY,
      predicted_aqi: predicted,
      category: category(predicted),
      expected_error: round(6 + 6 * rand(), 1),
    },
    points,
    pollutants,
  })

  for (let s = 0; s < monitors; s++) {
    const z = place.zips[Math.floor(rand() * place.zips.length)]
    const kind =
      s === 0 ? latest.driver : kinds[Math.floor(rand() * kinds.length)]
    const aqi =
      s === 0
        ? latest.aqi
        : Math.max(3, daily[kind][N - 1] - Math.round(12 * rand()))
    // Like AirNow's names, most end with the state's site codes ("... C26/C110/C154")
    const cams = 10 + ((code * 37 + s * 101) % 1200)
    const codes = (code + s) % 4 === 0 ? `C${cams}/C${cams + 113}` : `C${cams}`
    const name = `${place.name} ${SITE_NAMES[s]}`
    SITES.push({
      site: (code * 7 + s) % 10 === 0 ? name : `${name} ${codes}`,
      lat: round(z.lat + (rand() - 0.5) * 0.04, 4),
      lon: round(z.lon + (rand() - 0.5) * 0.04, 4),
      aqi,
      pollutant: kind,
      county_code: code,
    })
  }
}

// ---------- routes ----------
function lookupZip(zip) {
  const z = ZIPS.get(zip)
  if (!z) return null
  let used = COUNTIES.get(z.code)
  let distance = 0
  if (!used) {
    // No monitor in this county: use the nearest county that has one
    distance = Infinity
    for (const c of COUNTIES.values()) {
      const d = km(z.lat, z.lon, c.county.lat, c.county.lon)
      if (d < distance) {
        used = c
        distance = d
      }
    }
  }
  return {
    zip,
    zip_lat: round(z.lat, 4),
    zip_lon: round(z.lon, 4),
    home_county_code: z.code,
    home_county_name: z.name,
    uses_nearest_county: used.county.county_code !== z.code,
    distance_km: round(distance, 1),
    county: used.county,
    forecast: used.forecast,
  }
}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const BAD_DATE = [400, { error: "start/end must be dates like 2025-01-31" }]

/* path + query -> [status, body], shaped like backend/app/__init__.py */
function route(path, query) {
  let m
  if (path === "/api/health") {
    return [
      200,
      { status: "ok", counties: COUNTIES.size, data_through: END, mock: true },
    ]
  }
  if (path === "/api/map") return [200, { date: END, sites: SITES }]

  if ((m = path.match(/^\/api\/zip\/([^/]*)$/))) {
    if (!/^\d{5}$/.test(m[1])) {
      return [400, { error: "zip code must be 5 digits" }]
    }
    const result = lookupZip(m[1])
    if (!result) return [404, { error: `${m[1]} is not a Texas zip code` }]
    return [200, result]
  }

  if ((m = path.match(/^\/api\/counties\/(\d+)(\/forecast)?$/))) {
    const c = COUNTIES.get(Number(m[1]))
    if (!c) return [404, { error: `no data for county ${m[1]}` }]
    return [200, m[2] ? c.forecast : c.county]
  }

  if ((m = path.match(/^\/api\/counties\/(\d+)\/history$/))) {
    const c = COUNTIES.get(Number(m[1]))
    if (!c) return [404, { error: `no data for county ${m[1]}` }]
    const end = query.get("end") ?? c.county.latest_date
    if (!DATE.test(end)) return BAD_DATE
    const start = query.get("start") ?? isoDate(Date.parse(end) - 365 * DAY)
    if (!DATE.test(start)) return BAD_DATE
    if (start > end) return [400, { error: "start must be before end" }]
    const points = c.points.filter((p) => p.date >= start && p.date <= end)
    return [200, { county_code: c.county.county_code, start, end, points }]
  }

  if ((m = path.match(/^\/api\/counties\/(\d+)\/pollutants$/))) {
    const days = Number(query.get("days") ?? 30)
    if (!Number.isInteger(days)) {
      return [400, { error: "days must be a number" }]
    }
    const code = Number(m[1])
    const c = COUNTIES.get(code)
    if (!c) return [200, { county_code: code, pollutants: {}, latest: {} }]
    const window = Math.min(Math.max(days, 1), 3650)
    const after = isoDate(Date.parse(END) - window * DAY)
    const series = {}
    const latest = {}
    for (const [kind, points] of Object.entries(c.pollutants)) {
      series[kind] = points.filter((p) => p.date > after)
      latest[kind] = series[kind].at(-1)
    }
    return [200, { county_code: code, pollutants: series, latest }]
  }

  return [
    404,
    {
      error: `the mock API has no ${path}; add it in frontend/mock/server.mjs`,
    },
  ]
}

function respond(rawUrl) {
  try {
    const url = new URL(rawUrl, "http://localhost")
    return route(url.pathname, url.searchParams)
  } catch (err) {
    return [500, { error: String(err) }]
  }
}

createServer((req, res) => {
  const [status, body] = respond(req.url)
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "http://localhost:3000",
  })
  res.end(JSON.stringify(body))
  console.log(`${req.method} ${req.url} ${status}`)
})
  .on("error", (err) => {
    console.error(
      err.code === "EADDRINUSE"
        ? `Port ${PORT} is taken. Is the real backend running? Stop it first.`
        : err,
    )
    process.exit(1)
  })
  .listen(PORT, () => {
    console.log(
      `Mock API on http://localhost:${PORT} · ${SITES.length} monitors · data through ${END}`,
    )
  })
