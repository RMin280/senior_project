// Texas Air Check demo. Talks to the Flask API on the same server.
"use strict";

// ---------- constants ----------
const AQI_CATS = [
  { max: 50, name: "Good", color: "#00e400" },
  { max: 100, name: "Moderate", color: "#ffff00" },
  { max: 150, name: "Unhealthy for Sensitive Groups", color: "#ff7e00" },
  { max: 200, name: "Unhealthy", color: "#ff0000" },
  { max: 300, name: "Very Unhealthy", color: "#8f3f97" },
  { max: 100000, name: "Hazardous", color: "#7e0023" },
];
const GRADE_COLORS = {
  A: ["#0ca30c", "#fff"], B: ["#6aa632", "#fff"], C: ["#fab219", "#0b0b0b"],
  D: ["#ec835a", "#0b0b0b"], F: ["#d03b3b", "#fff"],
};
const LIMITED_COLOR = "#898781";
const EXAMPLES = [
  ["Houston", "77002"], ["Dallas", "75201"], ["Austin", "78701"], ["San Antonio", "78205"],
  ["El Paso", "79901"], ["Lubbock", "79401"], ["Tyler", "75701"], ["Brownwood", "76801"],
];
// Fixed color per model (color follows the model, never its rank)
const MODEL_SLOTS = ["LightGBM", "Persistence", "k-nearest neighbors", "SVM (RBF kernel)",
  "Random forest", "Ridge regression", "Neural network (MLP)", "Seasonal average"];
const SERIES = {
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
  dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const isDark = () => matchMedia("(prefers-color-scheme: dark)").matches &&
  document.documentElement.dataset.theme !== "light" || document.documentElement.dataset.theme === "dark";
const seriesColor = (i) => SERIES[isDark() ? "dark" : "light"][i % 8];
const modelColor = (m) => seriesColor(Math.max(0, MODEL_SLOTS.indexOf(m)));
const cat = (aqi) => AQI_CATS.find((c) => aqi <= c.max);
const pct = (x) => `${Math.round(x * 100)}%`;
const fmtDate = (s) => new Date(s + "T12:00:00").toLocaleDateString("en-US",
  { month: "short", day: "numeric", year: "numeric" });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function api(path) {
  const r = await fetch(path);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || `Request failed (${r.status})`);
  return body;
}

function catChip(aqi) {
  const c = cat(aqi);
  return `<span class="cat-chip"><i style="background:${c.color}"></i>${c.name}</span>`;
}
function gradePill(grade, reliable = true) {
  if (!reliable) return `<span class="grade-pill" style="background:${LIMITED_COLOR}">?</span>`;
  const [bg, fg] = GRADE_COLORS[grade];
  return `<span class="grade-pill" style="background:${bg};color:${fg}">${grade}</span>`;
}

// ---------- charts ----------
const charts = {};
function chartDefaults() {
  Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", sans-serif';
  Chart.defaults.font.size = 12;
  Chart.defaults.color = cssVar("--muted");
  Chart.defaults.borderColor = cssVar("--grid");
  Chart.defaults.maintainAspectRatio = false;
  Object.assign(Chart.defaults.plugins.tooltip, {
    backgroundColor: cssVar("--surface"), titleColor: cssVar("--ink"), bodyColor: cssVar("--ink-2"),
    borderColor: cssVar("--border"), borderWidth: 1, padding: 10, cornerRadius: 10,
    boxPadding: 4, usePointStyle: true,
  });
  Chart.defaults.plugins.legend.display = false;
}
function draw(id, config) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart($(id), config);
}
// Faint EPA category bands behind AQI charts
const aqiBands = {
  id: "aqiBands",
  beforeDraw(chart) {
    const { ctx, chartArea: a, scales: { y } } = chart;
    if (!a) return;
    let lo = 0;
    ctx.save();
    for (const c of AQI_CATS) {
      const top = y.getPixelForValue(Math.min(c.max, y.max));
      const bottom = y.getPixelForValue(Math.max(lo, y.min));
      if (bottom > a.top && top < a.bottom) {
        ctx.fillStyle = c.color + (isDark() ? "14" : "1f");
        ctx.fillRect(a.left, Math.max(top, a.top), a.right - a.left, Math.min(bottom, a.bottom) - Math.max(top, a.top));
      }
      lo = c.max;
      if (c.max >= y.max) break;
    }
    ctx.restore();
  },
};
const lineScaleX = (n) => ({
  type: "category", grid: { display: false },
  ticks: { maxTicksLimit: n, autoSkip: true, maxRotation: 0,
    callback(v) { const s = this.getLabelForValue(v); return fmtDate(s).replace(/, \d{4}$/, ""); } },
});

function catLegend() {
  $("cat-legend").innerHTML = AQI_CATS.slice(0, 4).map((c) =>
    `<span><i style="background:${c.color}"></i>${c.name === "Unhealthy for Sensitive Groups" ? "Sensitive groups" : c.name}</span>`).join("");
}

// ---------- 1. find a place ----------
let lastPlace = null;

async function loadZip(zip) {
  $("find-error").hidden = true;
  try {
    const z = await api(`/api/zip/${encodeURIComponent(zip)}`);
    await loadCounty(z.county.county_code, z);
  } catch (e) {
    $("find-error").textContent = e.message;
    $("find-error").hidden = false;
  }
}

async function loadCounty(code, zipInfo = null) {
  const [summary, county, history] = await Promise.all([
    api(`/api/counties/${code}/summary`), api(`/api/counties/${code}`),
    api(`/api/counties/${code}/history`)]);
  const forecast = zipInfo ? zipInfo.forecast :
    await api(`/api/counties/${code}/forecast`).catch(() => null);
  lastPlace = { code, zipInfo, summary, county, history, forecast };
  renderPlace();
  $("place").hidden = false;
  $("place").scrollIntoView({ behavior: "smooth" });
}

function renderPlace() {
  const { zipInfo, summary: s, county, history, forecast } = lastPlace;
  $("place-zip").textContent = zipInfo ? `Zip ${zipInfo.zip}` : "County";
  $("place-name").textContent = `${s.county_name} County`;
  $("place-note").textContent = zipInfo && zipInfo.uses_nearest_county
    ? `${zipInfo.home_county_name} County has no air monitor, so this uses the nearest monitored county (${zipInfo.distance_km} km away).`
    : `Based on EPA monitors in ${s.county_name} County, ${s.years[0]}–${s.years[1]}.`;

  const g = $("place-grade");
  if (s.reliable) {
    const [bg, fg] = GRADE_COLORS[s.grade];
    g.style.background = bg; g.style.color = fg; g.textContent = s.grade;
    $("place-rank").textContent = `#${s.rank} of ${s.rank_of} Texas counties`;
  } else {
    g.style.background = LIMITED_COLOR; g.style.color = "#fff"; g.textContent = "?";
    $("place-rank").textContent = "Not ranked: limited data";
  }
  $("place-score").textContent = Math.round(s.score);
  $("place-warnings").innerHTML = s.notes.map((n) => `<div class="note">${esc(n)}</div>`).join("");

  $("t-good").textContent = pct(s.pct_good);
  $("t-good-sub").textContent = `${pct(s.pct_moderate)} moderate`;
  $("t-unh").textContent = s.unhealthy_days_per_year;
  $("t-med").textContent = Math.round(s.median_aqi);
  $("t-med-sub").textContent = cat(s.median_aqi).name;
  if (s.trend) {
    const arrow = { improving: "↓", worsening: "↑", steady: "→" }[s.trend.direction];
    $("t-trend").textContent = `${arrow} ${s.trend.direction[0].toUpperCase()}${s.trend.direction.slice(1)}`;
    $("t-trend-sub").textContent = `${s.trend.aqi_per_year > 0 ? "+" : ""}${s.trend.aqi_per_year} AQI per year since ${s.yearly[0].year}`;
  } else {
    $("t-trend").textContent = "—"; $("t-trend-sub").textContent = "Not enough years of data";
  }

  // Forecast
  if (forecast) {
    $("fc-body").innerHTML = `
      <div class="muted small">For ${fmtDate(forecast.forecast_date)}</div>
      <div class="fc-main"><span class="fc-aqi">${forecast.predicted_aqi}</span>${catChip(forecast.predicted_aqi)}</div>
      <div class="muted small">Usually within ±${Math.round(forecast.expected_error)} AQI for this county.
      Latest reading: ${county.latest_aqi} on ${fmtDate(county.latest_date)}.</div>
      <p class="muted small">EPA's yearly files run a few months behind, so this forecasts the day after the newest data. With a live feed (AirNow) it would be tomorrow.</p>`;
  } else {
    $("fc-body").innerHTML = `<p class="muted">No forecast: this county's monitors stopped reporting recently.</p>`;
  }

  // Drivers
  const names = { "PM2.5": "Fine particles from smoke, traffic and industry", Ozone: "Smog formed by sunlight and exhaust",
    PM10: "Dust and coarse particles", NO2: "Exhaust from cars and power plants", CO: "Carbon monoxide", SO2: "Sulfur dioxide" };
  $("drivers").innerHTML = Object.entries(s.main_pollutants).map(([p, share]) => `
    <div class="driver-row" title="${esc(names[p] || p)}"><b>${esc(p)}</b>
      <div class="driver-bar"><span style="width:${share * 100}%"></span></div>
      <span class="num">${pct(share)}</span></div>`).join("") +
    `<p class="muted small">Share of days each pollutant set the AQI. ${Object.keys(s.main_pollutants).map((p) => names[p] ? `<b>${esc(p)}</b>: ${names[p].toLowerCase()}.` : "").join(" ")}</p>`;
  $("worst-months").textContent = `Worst months on average: ${s.worst_months.map((m) => MONTHS[m - 1]).join(" and ")}.`;

  // Daily chart
  const pts = history.points;
  const ymax = Math.max(150, Math.ceil((Math.max(...pts.map((p) => p.aqi)) + 10) / 25) * 25);
  draw("chart-daily", {
    type: "line",
    data: { labels: pts.map((p) => p.date),
      datasets: [{ label: "AQI", data: pts.map((p) => p.aqi), borderColor: seriesColor(0), borderWidth: 2,
        pointRadius: 0, pointHoverRadius: 5, pointHoverBorderColor: cssVar("--surface"), pointHoverBorderWidth: 2,
        pointHoverBackgroundColor: seriesColor(0), tension: 0.2 }] },
    options: {
      interaction: { mode: "index", intersect: false },
      scales: { x: lineScaleX(8), y: { min: 0, max: ymax, ticks: { stepSize: 50 }, grid: { color: cssVar("--grid") } } },
      plugins: { tooltip: { callbacks: {
        title: (it) => fmtDate(it[0].label),
        label: (it) => ` AQI ${it.raw} · ${cat(it.raw).name}`,
        afterLabel: (it) => pts[it.dataIndex].driver ? ` Driven by ${pts[it.dataIndex].driver}` : "" } } },
    },
    plugins: [aqiBands],
  });

  // Yearly chart
  draw("chart-yearly", {
    type: "bar",
    data: { labels: s.yearly.map((y) => y.year),
      datasets: [{ label: "Unhealthy days", data: s.yearly.map((y) => y.unhealthy_days),
        backgroundColor: seriesColor(0), borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: "bottom",
        maxBarThickness: 36 }] },
    options: {
      scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: cssVar("--grid") } } },
      plugins: { tooltip: { callbacks: {
        label: (it) => { const y = s.yearly[it.dataIndex]; return ` ${y.unhealthy_days} unhealthy days · ${pct(y.pct_good)} good · avg AQI ${y.mean_aqi}`; } } } },
    },
  });
}

// ---------- 2. compare ----------
let lastCompare = null;

async function compare(a, b) {
  $("cmp-error").hidden = true;
  try {
    const [za, zb] = await Promise.all([api(`/api/zip/${encodeURIComponent(a)}`), api(`/api/zip/${encodeURIComponent(b)}`)]);
    const [sa, sb] = await Promise.all([
      api(`/api/counties/${za.county.county_code}/summary`), api(`/api/counties/${zb.county.county_code}/summary`)]);
    lastCompare = [[za, sa], [zb, sb]];
    renderCompare();
    $("cmp-result").hidden = false;
  } catch (e) {
    $("cmp-error").textContent = e.message; $("cmp-error").hidden = false;
  }
}

function renderCompare() {
  const [[za, sa], [zb, sb]] = lastCompare;
  const label = (z, s) => `${esc(s.county_name)} County<div class="muted small">zip ${z.zip}${z.uses_nearest_county ? ` · nearest monitor for ${esc(z.home_county_name)}` : ""}</div>`;
  // [label, valueA, valueB, display fn, which is better: "high" | "low" | null]
  const rows = [
    ["Clean Air Score", sa.score, sb.score, (v, s) => `${Math.round(v)} ${gradePill(s.grade, s.reliable)}`, "high"],
    ["Rank in Texas", sa.rank, sb.rank, (v, s) => v ? `#${v} of ${s.rank_of}` : "not ranked", "low"],
    ["Days with good air", sa.pct_good, sb.pct_good, pct, "high"],
    ["Unhealthy days a year", sa.unhealthy_days_per_year, sb.unhealthy_days_per_year, (v) => v, "low"],
    ["Typical AQI", sa.median_aqi, sb.median_aqi, (v) => Math.round(v), "low"],
    ["Worst day (2021–2025)", sa.worst_aqi, sb.worst_aqi, (v) => v, "low"],
    ["Trend", sa.trend?.aqi_per_year, sb.trend?.aqi_per_year, (v, s) => s.trend ? s.trend.direction : "—", "low"],
    ["Tomorrow's forecast", za.forecast?.predicted_aqi, zb.forecast?.predicted_aqi, (v) => v == null ? "—" : `${v} ${catChip(v)}`, "low"],
  ];
  const better = (x, y, dir) => {
    if (x == null || y == null || x === y || !dir) return [false, false];
    return dir === "high" ? [x > y, y > x] : [x < y, y < x];
  };
  $("cmp-table").innerHTML = `<thead><tr><th></th><th>${label(za, sa)}</th><th>${label(zb, sb)}</th></tr></thead><tbody>` +
    rows.map(([name, a, b, fmt, dir]) => {
      const [ba, bb] = better(a, b, dir);
      return `<tr><td class="muted">${name}</td><td class="${ba ? "better" : ""}">${fmt(a, sa)}</td><td class="${bb ? "better" : ""}">${fmt(b, sb)}</td></tr>`;
    }).join("") + "</tbody>";

  const years = [...new Set([...sa.yearly, ...sb.yearly].map((y) => y.year))].sort();
  const series = (s) => years.map((yr) => s.yearly.find((y) => y.year === yr)?.mean_aqi ?? null);
  $("cmp-legend").innerHTML = [sa, sb].map((s, i) => `<span><i class="line" style="background:${seriesColor(i)}"></i>${esc(s.county_name)}</span>`).join("");
  draw("chart-cmp", {
    type: "line",
    data: { labels: years, datasets: [sa, sb].map((s, i) => ({
      label: s.county_name, data: series(s), borderColor: seriesColor(i), backgroundColor: seriesColor(i),
      borderWidth: 2, pointRadius: 4, pointHoverRadius: 6, pointBorderColor: cssVar("--surface"), pointBorderWidth: 2,
      spanGaps: true, tension: 0.2 })) },
    options: {
      interaction: { mode: "index", intersect: false },
      scales: { x: { grid: { display: false } }, y: { beginAtZero: false, grid: { color: cssVar("--grid") }, title: { display: true, text: "Average AQI" } } },
      plugins: { tooltip: { callbacks: { label: (it) => ` ${it.dataset.label}: avg AQI ${it.raw}` } } },
    },
  });
}

// ---------- 3. map + rankings ----------
let map, tiles, rankings = [];

function tileUrl() {
  return `https://{s}.basemaps.cartocdn.com/${isDark() ? "dark_all" : "light_all"}/{z}/{x}/{y}{r}.png`;
}

function renderMap() {
  if (!map) {
    map = L.map("leaflet", { scrollWheelZoom: false }).setView([31.2, -99.3], 6);
    tiles = L.tileLayer(tileUrl(), { maxZoom: 12, subdomains: "abcd",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>' }).addTo(map);
  } else {
    tiles.setUrl(tileUrl());
    map.eachLayer((l) => { if (l instanceof L.CircleMarker) map.removeLayer(l); });
  }
  const bounds = [];
  for (const r of rankings) {
    const fill = r.reliable ? GRADE_COLORS[r.grade][0] : LIMITED_COLOR;
    const m = L.circleMarker([r.lat, r.lon], { radius: 10, color: cssVar("--surface"), weight: 2,
      fillColor: fill, fillOpacity: 0.95, dashArray: r.reliable ? null : "3 3" }).addTo(map);
    m.bindTooltip(`<b>${esc(r.county_name)}</b> · ${r.reliable ? `${r.grade} (${Math.round(r.score)})` : "limited data"}`);
    m.on("click", () => loadCounty(r.county_code));
    bounds.push([r.lat, r.lon]);
  }
  if (bounds.length) map.fitBounds(bounds, { padding: [24, 24] });
  $("grade-legend").innerHTML = Object.entries(GRADE_COLORS).map(([g, [c]]) => `<span><i style="background:${c};border-radius:50%"></i>${g}</span>`).join("") +
    `<span><i style="background:${LIMITED_COLOR};border-radius:50%"></i>Limited data</span>`;

  $("rank-body").innerHTML = rankings.map((r) => `
    <tr data-code="${r.county_code}" class="${r.reliable ? "" : "dim"}">
      <td class="num">${r.rank ?? "—"}</td><td>${esc(r.county_name)}${r.reliable ? "" : ' <span class="small">(limited data)</span>'}</td>
      <td class="num">${Math.round(r.score)}</td><td>${gradePill(r.grade, r.reliable)}</td>
      <td class="num">${r.unhealthy_days_per_year}</td></tr>`).join("");
}

// ---------- 4. model lab ----------
let comparison = null, labPreds = null;
const picked = new Set(["LightGBM", "Persistence", "k-nearest neighbors"]);

function renderLabSummary() {
  const c = comparison;
  const models = c.models;
  $("lab-intro").textContent = `Eight approaches, all trained on 2015–2022, tuned on 2023, and scored on the same ${c.n_test_days.toLocaleString()} county-days they never saw (${fmtDate(c.test_start)} – ${fmtDate(c.test_end)}). MAE = average miss in AQI points.`;
  $("mae-box").style.height = `${models.length * 34 + 40}px`;
  draw("chart-mae", {
    type: "bar",
    data: { labels: models.map((m) => m.model), datasets: [{ label: "MAE", data: models.map((m) => +m.mae.toFixed(2)),
      backgroundColor: models.map((m) => modelColor(m.model)), borderRadius: { topRight: 4, bottomRight: 4 },
      borderSkipped: "left", barThickness: 18 }] },
    options: {
      indexAxis: "y",
      scales: { x: { beginAtZero: true, grid: { color: cssVar("--grid") }, title: { display: true, text: "Average error (AQI points)" } },
        y: { grid: { display: false }, ticks: { color: cssVar("--ink-2") } } },
      plugins: { tooltip: { callbacks: { label: (it) => { const m = models[it.dataIndex];
        return ` MAE ${m.mae.toFixed(2)} · ${pct(m.category_accuracy)} right category`; } } } },
    },
  });
  const best = models[0].model;
  $("lab-table").innerHTML = `<thead><tr><th>#</th><th>Model</th><th class="num">MAE</th><th class="num">RMSE</th>
    <th class="num">Right category</th><th class="num">vs. "tomorrow = today"</th><th class="num">MAE on unhealthy days</th><th class="num">Train time</th></tr></thead><tbody>` +
    models.map((m, i) => `<tr class="${m.model === best ? "best" : ""}"><td class="num">${i + 1}</td>
      <td><span class="legend"><span><i style="background:${modelColor(m.model)}"></i></span></span> ${esc(m.model)}</td>
      <td class="num">${m.mae.toFixed(2)}</td><td class="num">${m.rmse.toFixed(2)}</td>
      <td class="num">${pct(m.category_accuracy)}</td>
      <td class="num">${m.model === "Persistence" ? "—" : `${m.mae_vs_persistence > 0 ? "" : "+"}${(-m.mae_vs_persistence * 100).toFixed(1)}%`}</td>
      <td class="num">${m.mae_unhealthy_days.toFixed(1)}</td><td class="num">${m.seconds ? `${m.seconds}s` : "—"}</td></tr>`).join("") + "</tbody>";
  $("lab-about").innerHTML = models.map((m) => `<li><b>${esc(m.model)}</b>: ${esc(m.about)}</li>`).join("");

  $("model-picks").innerHTML = MODEL_SLOTS.filter((n) => models.some((m) => m.model === n)).map((n) => `
    <label class="${picked.has(n) ? "on" : ""}"><input type="checkbox" value="${esc(n)}" ${picked.has(n) ? "checked" : ""}>
    <i style="width:10px;height:10px;border-radius:50%;background:${modelColor(n)};display:inline-block"></i>${esc(n)}</label>`).join("");
}

async function loadLabCounty(code) {
  labPreds = await api(`/api/models/predictions/${code}`);
  renderLabChart();
}

function renderLabChart() {
  if (!labPreds) return;
  const n = +$("lab-window").value;
  const start = Math.max(0, labPreds.dates.length - n);
  const dates = labPreds.dates.slice(start), actual = labPreds.actual.slice(start);
  const chosen = MODEL_SLOTS.filter((m) => picked.has(m) && labPreds.predictions[m]);
  const ink = cssVar("--ink");
  $("lab-legend").innerHTML = `<span><i class="line" style="background:${ink}"></i>Actual AQI</span>` +
    chosen.map((m) => `<span><i class="line" style="background:${modelColor(m)}"></i>${esc(m)}</span>`).join("");
  const datasets = [{ label: "Actual AQI", data: actual, borderColor: ink, backgroundColor: ink, borderWidth: 2.5,
    pointRadius: 0, pointHoverRadius: 5, tension: 0.15 }]
    .concat(chosen.map((m) => ({ label: m, data: labPreds.predictions[m].slice(start), borderColor: modelColor(m),
      backgroundColor: modelColor(m), borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0.15 })));
  draw("chart-lab", {
    type: "line", data: { labels: dates, datasets },
    options: { interaction: { mode: "index", intersect: false },
      scales: { x: lineScaleX(8), y: { beginAtZero: true, grid: { color: cssVar("--grid") } } },
      plugins: { tooltip: { callbacks: { title: (it) => fmtDate(it[0].label),
        label: (it) => ` ${it.dataset.label}: ${Math.round(it.raw)}` } } } },
    plugins: [aqiBands],
  });
  const maes = chosen.map((m) => {
    const p = labPreds.predictions[m].slice(start);
    const mae = p.reduce((acc, v, i) => acc + Math.abs(v - actual[i]), 0) / p.length;
    return `${m} ${mae.toFixed(1)}`;
  });
  $("lab-mae").textContent = maes.length ? `Average miss in this window: ${maes.join(" · ")}` : "";
}

// ---------- startup ----------
async function init() {
  chartDefaults();
  catLegend();
  $("examples").innerHTML = EXAMPLES.map(([name, zip]) => `<button class="chip" data-zip="${zip}">${name} ${zip}</button>`).join("");
  $("examples").addEventListener("click", (e) => {
    const zip = e.target.closest("[data-zip]")?.dataset.zip;
    if (zip) { $("find-zip").value = zip; loadZip(zip); }
  });
  $("find-form").addEventListener("submit", (e) => { e.preventDefault(); loadZip($("find-zip").value.trim()); });
  $("compare-form").addEventListener("submit", (e) => { e.preventDefault(); compare($("cmp-a").value.trim(), $("cmp-b").value.trim()); });
  $("rank-body").addEventListener("click", (e) => {
    const code = e.target.closest("tr")?.dataset.code;
    if (code) loadCounty(+code);
  });

  const [health, ranks] = await Promise.all([api("/api/health"), api("/api/rankings")]);
  $("data-through").textContent = `Data through ${fmtDate(health.data_through)}.`;
  rankings = ranks;
  renderMap();
  compare($("cmp-a").value, $("cmp-b").value);

  try {
    comparison = await api("/api/models/comparison");
    renderLabSummary();
    const sel = $("lab-county");
    const options = [...rankings].filter((r) => r.reliable).sort((a, b) => a.county_name.localeCompare(b.county_name));
    sel.innerHTML = options.map((r) => `<option value="${r.county_code}" ${r.county_code === 201 ? "selected" : ""}>${esc(r.county_name)}</option>`).join("");
    sel.addEventListener("change", () => loadLabCounty(+sel.value));
    $("lab-window").addEventListener("change", renderLabChart);
    $("model-picks").addEventListener("change", (e) => {
      const m = e.target.value;
      if (e.target.checked) {
        if (picked.size >= 3) { e.target.checked = false; return; }
        picked.add(m);
      } else picked.delete(m);
      e.target.closest("label").classList.toggle("on", e.target.checked);
      renderLabChart();
    });
    await loadLabCounty(+sel.value);
  } catch (e) {
    $("lab-intro").textContent = `Model comparison not available yet: ${e.message}`;
  }

  // Re-draw charts when the OS switches light/dark
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    chartDefaults();
    if (lastPlace) renderPlace();
    if (lastCompare) renderCompare();
    renderMap();
    if (comparison) { renderLabSummary(); renderLabChart(); }
  });
}

init();
