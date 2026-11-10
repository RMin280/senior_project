"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import type { CircleMarker, CircleMarkerOptions } from "leaflet"
import "leaflet/dist/leaflet.css"
import { categories, getCategory } from "@/lib/aqi"
import type { MonitorReading } from "@/lib/api"

type Pin = { lat: number; lon: number; label: string }

type AqiHeatmapProps = {
  sites: MonitorReading[]
  /* the searched zip code's location, shown as a pin */
  pin?: Pin
  /* name of the monitor picked on the map, drawn larger */
  selected?: string
}

// Texas bounding box, a little padded
const BOUNDS = { west: -107, east: -93.3, south: 25.6, north: 36.7 }
const GRID_W = 360
// Past this distance from every monitor, the color fades out (we don't know the air there)
const FADE_START_KM = 60
const FADE_END_KM = 180

// Monitor dots, and the one picked on the map
const DOT: CircleMarkerOptions = { radius: 4, weight: 1.5, color: "#ffffff" }
const PICKED_DOT: CircleMarkerOptions = {
  radius: 8,
  weight: 3,
  color: "#10201a",
}

/* Web Mercator so the image lines up with the map tiles */
const mercY = (lat: number) =>
  Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
const invMercY = (y: number) => (360 / Math.PI) * Math.atan(Math.exp(y)) - 90

function km(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180
  const dLat = (lat2 - lat1) * r
  const dLon = (lon2 - lon1) * r
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(a))
}

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/* AQI -> its category's color from globals.css, in solid steps like the legend.
   Blending between categories gave in-between values muddy olive tones. */
function makeColorScale() {
  const style = getComputedStyle(document.documentElement)
  const colors = categories.map((c) =>
    hexToRgb(style.getPropertyValue(`--aqi-${c.key}`).trim() || "#888888"),
  )
  return (aqi: number) => colors[getCategory(Math.round(aqi)).index]
}

/* Inverse-distance-weighted AQI surface, clipped to the Texas outline */
function drawSurface(sites: MonitorReading[], outline: number[][][]) {
  const yTop = mercY(BOUNDS.north)
  const yBottom = mercY(BOUNDS.south)
  const gridH = Math.round(
    (GRID_W * (yTop - yBottom)) /
      (((BOUNDS.east - BOUNDS.west) * Math.PI) / 180),
  )
  const colorOf = makeColorScale()

  const surface = document.createElement("canvas")
  surface.width = GRID_W
  surface.height = gridH
  const ctx = surface.getContext("2d")!
  const image = ctx.createImageData(GRID_W, gridH)

  for (let row = 0; row < gridH; row++) {
    const lat = invMercY(yTop - ((row + 0.5) / gridH) * (yTop - yBottom))
    for (let col = 0; col < GRID_W; col++) {
      const lon =
        BOUNDS.west + ((col + 0.5) / GRID_W) * (BOUNDS.east - BOUNDS.west)
      let weight = 0
      let total = 0
      let nearest = Infinity
      for (const s of sites) {
        const d = Math.max(km(lat, lon, s.lat, s.lon), 1)
        nearest = Math.min(nearest, d)
        const w = 1 / (d * d)
        weight += w
        total += w * s.aqi
      }
      const fade =
        nearest <= FADE_START_KM
          ? 1
          : Math.max(
              0,
              1 - (nearest - FADE_START_KM) / (FADE_END_KM - FADE_START_KM),
            )
      const [r, g, b] = colorOf(total / weight)
      const i = (row * GRID_W + col) * 4
      image.data[i] = r
      image.data[i + 1] = g
      image.data[i + 2] = b
      image.data[i + 3] = Math.round(190 * (0.25 + 0.75 * fade))
    }
  }
  ctx.putImageData(image, 0, 0)

  // Keep only the part inside Texas
  const clipped = document.createElement("canvas")
  clipped.width = GRID_W
  clipped.height = gridH
  const out = clipped.getContext("2d")!
  out.beginPath()
  for (const ring of outline) {
    ring.forEach(([lon, lat], k) => {
      const x = ((lon - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * GRID_W
      const y = ((yTop - mercY(lat)) / (yTop - yBottom)) * gridH
      if (k === 0) out.moveTo(x, y)
      else out.lineTo(x, y)
    })
    out.closePath()
  }
  out.clip()
  // Just enough blur to soften the edges between categories
  out.filter = "blur(1.5px)"
  out.drawImage(surface, 0, 0)
  return clipped.toDataURL()
}

/** Map of Texas colored by the latest AQI at each monitor, blended in between. */
export function AqiHeatmap({ sites, pin, selected }: AqiHeatmapProps) {
  const container = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const [dots, setDots] = useState<Map<string, CircleMarker>>()

  // Picking a monitor re-renders the page, which passes new copies of these
  // props. Rebuild the map only when their contents change, so it keeps its zoom.
  const sitesJson = JSON.stringify(sites)
  const pinJson = JSON.stringify(pin ?? null)

  useEffect(() => {
    const sites: MonitorReading[] = JSON.parse(sitesJson)
    const pin: Pin | null = JSON.parse(pinJson)
    let map: import("leaflet").Map | undefined
    let cancelled = false

    async function setup() {
      const L = (await import("leaflet")).default
      const outline = await fetch("/texas.json").then((r) => r.json())
      if (cancelled || !container.current) return

      map = L.map(container.current, {
        zoomControl: false,
        scrollWheelZoom: true,
        attributionControl: true,
      })
      // A view must be set before vector layers are added
      map.fitBounds(
        [
          [25.8, -106.7],
          [36.5, -93.5],
        ],
        { paddingTopLeft: [window.innerWidth >= 1024 ? 440 : 0, 0] },
      )
      L.control.zoom({ position: "bottomright" }).addTo(map)
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 12,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map)

      const rings: number[][][] = outline.geometry.coordinates.map(
        (polygon: number[][][]) => polygon[0],
      )
      if (sites.length > 0) {
        L.imageOverlay(
          drawSurface(sites, rings),
          [
            [BOUNDS.south, BOUNDS.west],
            [BOUNDS.north, BOUNDS.east],
          ],
          { opacity: 0.85, interactive: false },
        ).addTo(map)
      }
      L.geoJSON(outline, {
        style: { color: "#2f7d57", weight: 1.5, fill: false, opacity: 0.6 },
        interactive: false,
      }).addTo(map)

      // Each monitor: a small dot with its reading on hover. Clicking one
      // shows that monitor in the side panel (?site=<name>).
      const style = getComputedStyle(document.documentElement)
      const byName = new Map<string, CircleMarker>()
      for (const s of sites) {
        const category = getCategory(s.aqi)
        const dot = L.circleMarker([s.lat, s.lon], {
          ...DOT,
          fillColor: style.getPropertyValue(`--aqi-${category.key}`).trim(),
          fillOpacity: 1,
        })
          .bindTooltip(
            `<b>${escapeHtml(s.site)}</b><br>AQI ${s.aqi} · ${category.name}<br><span style="opacity:.7">${s.pollutant}</span>`,
          )
          .on("click", () =>
            router.push(`${pathname}?site=${encodeURIComponent(s.site)}`, {
              scroll: false,
            }),
          )
          .addTo(map)
        byName.set(s.site, dot)
      }

      if (pin) {
        const icon = L.divIcon({
          className: "",
          html: `<div class="map-pin"><svg width="30" height="40" viewBox="0 0 30 40" aria-hidden="true"><path d="M15 39C15 39 28 24 28 14A13 13 0 0 0 2 14C2 24 15 39 15 39Z" fill="#ffffff" stroke="#2f7d57" stroke-width="2.5"/><circle cx="15" cy="14" r="5" fill="#2f7d57"/></svg><span>${escapeHtml(pin.label)}</span></div>`,
          iconSize: [30, 40],
          iconAnchor: [15, 39],
        })
        L.marker([pin.lat, pin.lon], { icon, keyboard: false }).addTo(map)
      }
      setDots(byName)
    }

    setup()
    return () => {
      cancelled = true
      map?.remove()
    }
  }, [sitesJson, pinJson, pathname, router])

  // Draw the picked monitor larger, on top of the others
  useEffect(() => {
    dots?.forEach((dot, name) => {
      dot.setStyle(name === selected ? PICKED_DOT : DOT)
      if (name === selected) dot.bringToFront()
    })
  }, [dots, selected])

  return (
    <div
      ref={container}
      role="region"
      aria-label="Map of Texas air quality"
      className="h-full w-full bg-sky"
    />
  )
}

/** Small key for the heatmap colors. */
export function HeatmapLegend({ date }: { date?: string }) {
  return (
    <div className="pointer-events-auto rounded-xl bg-card/95 px-3 py-2 text-xs shadow-raised">
      <div className="mb-1.5 font-medium">AQI{date ? ` · ${date}` : ""}</div>
      <div className="flex gap-0.5">
        {categories.slice(0, 5).map((c) => (
          <div key={c.key} className="flex flex-col items-center gap-1">
            <span
              className="h-2 w-10 first:rounded-l"
              style={{ background: `var(--aqi-${c.key})` }}
            />
            <span className="text-muted-foreground">{c.lo}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
