// ─────────────────────────────────────────────────────────────────────────────
// NorthSeaMap — RC Diagram Design Language v1.2 (map variant)
//
// Interactive SVG map of the North Sea region showing:
//   • Oil & gas fields  (amber dots)
//   • Offshore wind zones  (green shaded polygons)
//   • CO₂ storage sites  (blue diamond markers)
//   • Key CCS infrastructure labels
//
// Three independently togglable data layers, restyled onto the shared RC
// map shell (figure/header/badge, MapFrame corner brackets, staggered
// rc-map-enter entrance, rc-map-hit focus styling) established by
// GlobalCCSMap.tsx. Layer toggles are now rc-legend-item-style chips
// (tinted background + colored border when active) rather than bespoke
// pill buttons, but remain independent on/off switches, not a single-select.
// All map geometry, projection math, field/site data and tooltip logic are
// unchanged from the previous build.
//
// Countries shown: UK, Norway, Denmark, Netherlands, Germany, Belgium, France
//
// Data sources:
//   NSTA (North Sea Transition Authority) — Carbon Storage Licences 2024
//   Global CCS Institute — Status of CCS 2024
//   Crown Estate / The Carbon Trust — Offshore Wind Lease Areas
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'

// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:      brand.green,
  greenDim:   rcRgba(brand.green, 0.18),
  greenMid:   rcRgba(brand.green, 0.40),
  amber:      brand.amber,
  amberDim:   rcRgba(brand.amber, 0.18),
  amberMid:   rcRgba(brand.amber, 0.40),
  blue:       brand.blue,
  blueDim:    rcRgba(brand.blue, 0.22),
  blueMid:    rcRgba(brand.blue, 0.45),
  white90:    'rgba(255,255,255,0.90)',
  white70:    'rgba(255,255,255,0.70)',
  white50:    'rgba(255,255,255,0.50)',
  white35:    'rgba(255,255,255,0.35)',
  white20:    'rgba(255,255,255,0.20)',
  white12:    'rgba(255,255,255,0.12)',
  white08:    'rgba(255,255,255,0.08)',
  white18:    'rgba(255,255,255,0.18)',
  cardBg:     'rgba(10,15,20,0.85)',
  cardBorder: 'rgba(255,255,255,0.08)',
}

// ── Shared animation / interaction styles ─────────────────────────────────────
function DiagramStyles() {
  return (
    <style>{`
      .rc-map-enter { opacity: 1; }
      @media (prefers-reduced-motion: no-preference) {
        .rc-map-enter {
          opacity: 0;
          animation: rc-map-in 0.5s cubic-bezier(0.16,1,0.3,1) both;
          animation-delay: var(--rc-delay, 0s);
        }
      }
      @keyframes rc-map-in {
        from { opacity: 0; transform: scale(0.85); }
        to   { opacity: 1; transform: scale(1); }
      }
      .rc-map-hit { cursor: pointer; }
      .rc-map-hit:focus-visible { outline: 2px solid ${RC.green}; outline-offset: 2px; }
      .rc-legend-item { cursor: default; }
    `}</style>
  )
}

// ── Map frame: corner brackets only ───────────────────────────────────────────
// (the map variant's lighter-touch cousin of BlueprintFrame — no dot grid or
// glow, since the ocean gradient + graticule already carry the diagram's texture)
function MapFrame({ w, h }: { w: number; h: number }) {
  const b = 14
  return (
    <>
      {[
        { x: 10, y: 10, dx: 1, dy: 1 },
        { x: w - 10, y: 10, dx: -1, dy: 1 },
        { x: 10, y: h - 10, dx: 1, dy: -1 },
        { x: w - 10, y: h - 10, dx: -1, dy: -1 },
      ].map((c, i) => (
        <path key={i}
          d={`M${c.x} ${c.y + b * c.dy} L${c.x} ${c.y} L${c.x + b * c.dx} ${c.y}`}
          fill="none" stroke={RC.white18} strokeWidth={1.5} strokeLinecap="round" />
      ))}
    </>
  )
}

// ── Map viewport ──────────────────────────────────────────────────────────────
// Region: lon -5° → 13°, lat 49.5° → 63.5°
const LON_MIN = -5
const LON_MAX =  13
const LAT_MIN = 49.5
const LAT_MAX = 63.5
const W       = 900
const H       = 560

function mx(lon: number): number {
  return ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * W
}
function my(lat: number): number {
  return ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H
}
function mPts(coords: [number, number][]): string {
  return coords.map(([lon, lat]) => `${mx(lon).toFixed(1)},${my(lat).toFixed(1)}`).join(' ')
}

// ── Country outline polygons (lon, lat) ───────────────────────────────────────
// Simplified coastlines — recognisable but not cartographically precise

// UK — Scotland east coast + northern England + SE England visible
const UK_POLY: [number, number][] = [
  // Start NW Scotland (left edge of viewport)
  [-5,58.5], [-4,58.5], [-2.5,58.7], [-0.5,58.2],
  // NE Scotland, east coast going south
  [-0.1,57.5], [0,57.1], [-0.3,56.5], [-1,55.9],
  [-1.5,55.0], [-2,54.3], [-1.5,54.0], [-1,53.9],
  // The Wash / East Anglia
  [0.1,53.4], [0.5,53.2], [1.2,52.8], [1.8,52.6],
  // Thames estuary / SE England
  [1.6,51.4], [1.1,51.0], [0.2,51.0], [-0.5,50.8],
  // South coast going west
  [-1.1,50.8], [-1.8,50.7], [-2.5,50.6], [-3.5,50.2],
  [-4.5,50.2], [-5,50.1],
  // West coast going north (left edge)
  [-5,51.0], [-5,52.0], [-5,53.0], [-4.5,53.3],
  [-4,53.5], [-3.5,54.0], [-3.0,54.5], [-3.5,55.5],
  [-4,56.0], [-4.5,57.0], [-5,57.5], [-5,58.5],
]

// Norway — west coast visible in viewport (roughly lon 4–13, lat 57.5–63.5)
const NORWAY_POLY: [number, number][] = [
  [4.5,58.0], [5.0,57.8], [6.0,57.9], [6.5,58.2],
  [5.5,59.0], [5.3,59.8], [5.2,60.5], [5.0,61.0],
  [5.5,61.5], [6.0,62.0], [7.0,62.5], [8.0,63.0],
  [9.0,63.3], [10.0,63.4], [11.0,63.5], [12.0,63.5], [13.0,63.5],
  // Right edge — inland across Norway/Sweden border area
  [13.0,59.5], [12.5,59.0], [11.5,59.0],
  // Oslofjord area
  [10.8,59.8], [10.5,59.1],
  // Skagerrak
  [9.5,58.5], [9.0,58.3], [8.5,58.1], [8.0,58.0],
  [7.5,57.7], [6.5,57.5], [5.5,57.6], [4.5,58.0],
]

// Denmark — Jutland peninsula + islands
const DENMARK_POLY: [number, number][] = [
  // Jutland west coast
  [8.1,57.0], [8.2,56.5], [8.1,56.0], [8.1,55.5], [8.6,55.0],
  // Tip of Jutland + Fyn/Sealand approximate
  [9.5,54.9], [10.0,55.0], [10.5,55.5], [11.0,55.6],
  [12.0,55.7], [12.6,55.6],
  // East coast
  [12.5,56.1], [12.2,56.4], [11.5,56.8], [10.8,57.5], [10.6,57.7],
  [10.3,57.8], [9.5,57.7], [8.8,57.3], [8.1,57.0],
]

// Netherlands
const NL_POLY: [number, number][] = [
  [3.5,51.4], [4.0,51.6], [4.5,51.8],
  [5.0,52.0], [5.3,52.5], [5.0,53.0], [4.5,53.2],
  [4.8,53.4], [5.5,53.4], [6.5,53.4], [7.0,53.4], [7.2,53.2],
  [7.0,52.5], [6.8,52.0], [6.5,51.8], [6.0,51.8], [5.8,51.5],
  [5.0,51.3], [4.3,51.2], [3.5,51.4],
]

// Germany (North Sea coast only — Schleswig-Holstein + Lower Saxony)
const GERMANY_COAST: [number, number][] = [
  [7.0,53.4], [7.2,53.2], [8.0,53.5], [8.5,53.6],
  [9.0,53.7], [9.5,54.0], [10.0,54.5], [10.5,55.0],
  [11.0,55.0], [12.0,54.5], [12.5,54.2], [13.0,54.0],
  [13.0,53.5], [12.5,53.0], [11.0,52.5], [10.0,52.0],
  [9.0,52.5], [8.0,52.8], [7.5,52.5], [7.0,52.2], [7.0,52.8], [7.0,53.4],
]

// Belgium
const BELGIUM_POLY: [number, number][] = [
  [2.5,51.1], [3.5,51.4], [4.3,51.2], [4.5,51.0],
  [5.0,50.5], [6.0,50.1], [6.4,49.7],
  [5.5,49.5], [4.5,49.5], [3.0,50.0], [2.5,50.5], [2.5,51.1],
]

// France — northern coast visible (Calais area + Normandy)
const FRANCE_NORTH: [number, number][] = [
  [-5,49.5],[-4,48.8],[-3,48.5],[-2,48.6],[-1.5,49.2],
  [-0.5,49.5],[0.2,49.5],[0.7,49.7],[1.5,50.0],
  [2.5,51.0],[2.5,50.5],[2.0,50.5],[1.5,50.7],[0.5,50.5],
  [-0.5,49.7],[-1.5,48.5],[-2.5,47.8],[-3,47.5],[-4,47.3],
  [-5,48.0],[-5,49.5],
]

// ── Offshore wind zones (approximate lease boundaries) ────────────────────────
const DOGGER_BANK: [number, number][] = [
  [1.0,54.2],[1.5,54.0],[2.5,54.0],[3.5,54.5],
  [3.2,55.2],[2.0,55.5],[1.0,55.0],[0.8,54.5],
]
const HORNSEA: [number, number][] = [
  [1.5,53.5],[2.2,53.5],[2.5,53.8],[2.2,54.0],
  [1.5,54.0],[1.3,53.8],
]
const NORFOLK_ARRAY: [number, number][] = [
  [1.0,52.8],[2.0,52.8],[2.2,53.2],[1.5,53.3],[0.8,53.0],
]
const GREATER_GABBARD: [number, number][] = [
  [1.8,51.7],[2.3,51.7],[2.4,52.1],[1.9,52.2],[1.7,51.9],
]
const DUTCH_WIND_HOLLANDSE: [number, number][] = [
  [3.8,52.4],[4.5,52.4],[4.6,52.9],[3.9,52.9],
]
const DUTCH_WIND_BORSSELE: [number, number][] = [
  [3.0,51.6],[3.7,51.6],[3.8,52.0],[3.1,52.1],
]

// ── Oil & gas fields (amber dots) ─────────────────────────────────────────────
interface Field {
  name:    string
  lon:     number
  lat:     number
  country: 'UK' | 'NO'
}
const OIL_GAS_FIELDS: Field[] = [
  // UK sector
  { name: 'Forties',     lon:  0.4, lat: 57.7, country: 'UK' },
  { name: 'Brent',       lon:  1.7, lat: 61.0, country: 'UK' },
  { name: 'Buzzard',     lon: -0.7, lat: 58.3, country: 'UK' },
  { name: 'Britannia',   lon:  1.0, lat: 59.0, country: 'UK' },
  { name: 'Clair',       lon: -6.0, lat: 60.6, country: 'UK' },  // west of Shetland — outside view
  { name: 'Elgin-Franklin', lon: 2.0, lat: 57.8, country: 'UK' },
  { name: 'Captain',     lon:  0.0, lat: 58.0, country: 'UK' },
  { name: 'Andrew',      lon:  0.3, lat: 57.5, country: 'UK' },
  { name: 'Pierce',      lon:  1.3, lat: 57.5, country: 'UK' },
  // Norwegian sector
  { name: 'Ekofisk',     lon:  3.2, lat: 56.5, country: 'NO' },
  { name: 'Statfjord',   lon:  1.8, lat: 61.2, country: 'NO' },
  { name: 'Gullfaks',    lon:  2.2, lat: 61.2, country: 'NO' },
  { name: 'Troll',       lon:  3.7, lat: 60.6, country: 'NO' },
  { name: 'Oseberg',     lon:  2.8, lat: 60.5, country: 'NO' },
  { name: 'Snorre',      lon:  2.1, lat: 61.5, country: 'NO' },
]

// ── CO₂ storage sites (blue diamonds) ────────────────────────────────────────
interface StorageSite {
  name:    string
  lon:     number
  lat:     number
  status:  'operational' | 'development' | 'proposed'
  detail:  string
}
const CO2_SITES: StorageSite[] = [
  {
    name:   'Sleipner',
    lon:     1.9, lat: 58.4,
    status: 'operational',
    detail: 'Operational since 1996 · 22+ Mt CO₂ stored · Equinor',
  },
  {
    name:   'Northern Endurance',
    lon:     0.5, lat: 54.5,
    status: 'development',
    detail: 'East Coast Cluster CCS hub · bp/Equinor/TotalEnergies',
  },
  {
    name:   'Viking CCS',
    lon:     0.1, lat: 53.5,
    status: 'development',
    detail: 'Endurance aquifer · Harbour Energy · Humber cluster',
  },
  {
    name:   'Acorn',
    lon:    -1.8, lat: 57.6,
    status: 'development',
    detail: 'St Fergus terminal · Storegga/Shell/North Sea Midstream',
  },
  {
    name:   'Goldeneye',
    lon:    -0.2, lat: 57.9,
    status: 'development',
    detail: 'Depleted gas field · Shell/Storegga · Acorn project',
  },
  {
    name:   'Northern Lights',
    lon:     4.8, lat: 61.0,
    status: 'operational',
    detail: 'Cross-border CO₂ shipping hub · Norway · Equinor/Shell/TotalEnergies',
  },
  {
    name:   'Porthos (Rotterdam)',
    lon:     4.1, lat: 51.9,
    status: 'development',
    detail: 'Rotterdam CCUS port hub · P18-A depleted gas field',
  },
]

// ── Layers type ───────────────────────────────────────────────────────────────
interface Layers {
  oilGas:    boolean
  windZones: boolean
  co2Sites:  boolean
}

// ── Diamond path helper ───────────────────────────────────────────────────────
function diamond(cx: number, cy: number, r: number): string {
  return `M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z`
}

// ── Component ─────────────────────────────────────────────────────────────────
interface NorthSeaMapProps {
  title?:   string
  caption?: string
}

export function NorthSeaMap({ title, caption }: NorthSeaMapProps) {
  const [layers, setLayers] = useState<Layers>({
    oilGas:    true,
    windZones: true,
    co2Sites:  true,
  })

  // Hover (mouse/keyboard-focus) and pin (click-to-select) state, keyed by a
  // stable per-marker id shared across the oil & gas and CO₂ storage layers.
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [pinnedKey, setPinnedKey]   = useState<string | null>(null)

  function toggleLayer(key: keyof Layers) {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const windZones = [
    DOGGER_BANK, HORNSEA, NORFOLK_ARRAY, GREATER_GABBARD,
    DUTCH_WIND_HOLLANDSE, DUTCH_WIND_BORSSELE,
  ]

  // Filter out fields outside viewport
  const visibleFields = OIL_GAS_FIELDS.filter(f =>
    f.lon >= LON_MIN && f.lon <= LON_MAX &&
    f.lat >= LAT_MIN && f.lat <= LAT_MAX
  )
  const visibleSites = CO2_SITES.filter(s =>
    s.lon >= LON_MIN && s.lon <= LON_MAX &&
    s.lat >= LAT_MIN && s.lat <= LAT_MAX
  )

  // Combined lookup for the tooltip — only markers whose layer is currently
  // switched on are eligible, so a pin left over from a disabled layer
  // simply renders nothing.
  const tooltipItems: { key: string; name: string; detail: string; lon: number; lat: number }[] = [
    ...(layers.oilGas ? visibleFields.map(f => ({
      key:    `field-${f.name}`,
      name:   f.name,
      detail: `${f.country === 'UK' ? 'UKCS' : 'NCS'} field`,
      lon:    f.lon,
      lat:    f.lat,
    })) : []),
    ...(layers.co2Sites ? visibleSites.map(s => ({
      key:    `co2-${s.name}`,
      name:   s.name,
      detail: s.detail,
      lon:    s.lon,
      lat:    s.lat,
    })) : []),
  ]
  const activeKey = pinnedKey ?? hoveredKey
  const active    = tooltipItems.find(t => t.key === activeKey) ?? null

  return (
    <figure
      className="mb-8 rounded-xl overflow-hidden w-full"
      style={{
        background:     RC.cardBg,
        border:         `1px solid ${RC.cardBorder}`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <DiagramStyles />

      {/* Card header */}
      <div
        className="px-6 pt-6 pb-4 flex items-start justify-between gap-4 flex-wrap"
        style={{ borderBottom: `1px solid ${RC.cardBorder}` }}
      >
        <div>
          <h3
            className="font-heading font-bold text-base leading-snug"
            style={{ color: RC.white90, fontFamily: "'Montserrat', sans-serif" }}
          >
            {title || 'North Sea Energy & CO₂ Storage Infrastructure'}
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white35, fontFamily: "'Montserrat', sans-serif" }}>
            Toggle layers below — hover or tap a marker for details
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.greenDim, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · Map
        </span>
      </div>

      {/* Layer toggles — rc-legend-item chip convention, independent on/off switches */}
      <div
        className="px-6 pt-5 pb-1 flex flex-wrap items-center justify-center gap-2.5"
      >
        {([
          { key: 'oilGas',    label: 'Oil & Gas Fields',    color: RC.amber },
          { key: 'windZones', label: 'Offshore Wind Zones', color: RC.green },
          { key: 'co2Sites',  label: 'CO₂ Storage Sites',   color: RC.blue  },
        ] as const).map(({ key, label, color }) => {
          const isActive = layers[key]
          return (
            <button
              key={key}
              type="button"
              className="rc-map-hit flex items-center gap-2 rounded-full px-3 py-1.5"
              onClick={() => toggleLayer(key)}
              aria-pressed={isActive}
              aria-label={`${label} layer — ${isActive ? 'on' : 'off'}`}
              style={{
                background:   isActive ? rcRgba(color, 0.15) : 'rgba(255,255,255,0.04)',
                border:       `1px solid ${isActive ? color : RC.white20}`,
                color:        isActive ? color : RC.white50,
                fontSize:     11,
                fontWeight:   600,
                fontFamily:   "'Montserrat', sans-serif",
                transition:   'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
              }}
            >
              <span style={{
                width:        8,
                height:       8,
                borderRadius: '50%',
                background:   isActive ? color : 'transparent',
                border:       `1.5px solid ${color}`,
                flexShrink:   0,
              }} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Map body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ maxWidth: W, minWidth: 320, display: 'block', borderRadius: 8 }}
          aria-label="North Sea map showing oil and gas fields, offshore wind zones, and CO₂ storage sites"
        >
          <defs>
            <radialGradient id="nsOcean" cx="50%" cy="50%">
              <stop offset="0%"   stopColor="#0d2030" />
              <stop offset="100%" stopColor="#060a0e" />
            </radialGradient>
            <pattern id="windPattern" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
              <line x1="0" y1="6" x2="6" y2="0" stroke={RC.green} strokeWidth={0.6} opacity={0.4} />
            </pattern>
          </defs>

          {/* Ocean background */}
          <rect width={W} height={H} fill="url(#nsOcean)" rx={8} />
          <MapFrame w={W} h={H} />

          {/* ── Offshore Wind Zones ─────────────────────────────────────── */}
          {layers.windZones && windZones.map((zone, i) => (
            <g key={`wind${i}`}>
              <polygon
                points={mPts(zone)}
                fill="url(#windPattern)"
                stroke={RC.green}
                strokeWidth={1.2}
                opacity={0.85}
              />
              <polygon
                points={mPts(zone)}
                fill={RC.greenDim}
                stroke="none"
              />
            </g>
          ))}

          {/* ── Country fills ───────────────────────────────────────────── */}
          {([
            [UK_POLY,       '#1a2030'],
            [NORWAY_POLY,   '#1a2030'],
            [DENMARK_POLY,  '#1a2030'],
            [NL_POLY,       '#1a2030'],
            [GERMANY_COAST, '#1a2030'],
            [BELGIUM_POLY,  '#1a2030'],
            [FRANCE_NORTH,  '#1a2030'],
          ] as [[number,number][], string][]).map(([poly, fill], i) => (
            <polygon key={`land${i}`}
              points={mPts(poly)}
              fill={fill}
              stroke="rgba(180,200,220,0.22)"
              strokeWidth={0.8}
              strokeLinejoin="round"
            />
          ))}

          {/* ── Country labels ──────────────────────────────────────────── */}
          {([
            { label: 'UK',          lon: -2.0, lat: 56.5 },
            { label: 'Scotland',    lon: -3.2, lat: 57.2 },
            { label: 'Norway',      lon:  7.5, lat: 61.8 },
            { label: 'Denmark',     lon: 10.0, lat: 56.5 },
            { label: 'Netherlands', lon:  5.2, lat: 52.2 },
            { label: 'Germany',     lon:  9.5, lat: 53.0 },
            { label: 'Belgium',     lon:  4.5, lat: 50.5 },
            { label: 'France',      lon: -1.0, lat: 50.0 },
          ] as {label:string;lon:number;lat:number}[]).map(({ label, lon, lat }) => (
            <text key={label}
              x={mx(lon)} y={my(lat)}
              fill={RC.white35}
              fontSize={10}
              fontWeight={500}
              fontFamily="Inter, sans-serif"
              textAnchor="middle"
            >{label}</text>
          ))}

          {/* North Sea label */}
          <text x={mx(3)} y={my(57)}
            fill={RC.white20}
            fontSize={13}
            fontWeight={300}
            fontStyle="italic"
            fontFamily="Inter, sans-serif"
            textAnchor="middle"
          >North Sea</text>

          {/* ── Oil & Gas Field dots ────────────────────────────────────── */}
          {layers.oilGas && visibleFields.map((f, i) => {
            const key      = `field-${f.name}`
            const isActive = activeKey === key
            return (
              <g key={f.name}
                className="rc-map-hit rc-map-enter"
                style={{ '--rc-delay': `${i * 0.02}s` } as React.CSSProperties}
                tabIndex={0}
                role="button"
                aria-label={`${f.name}: ${f.country === 'UK' ? 'UKCS' : 'NCS'} oil & gas field`}
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
                onFocus={() => setHoveredKey(key)}
                onBlur={() => setHoveredKey(null)}
                onClick={() => setPinnedKey(pinnedKey === key ? null : key)}
              >
                <circle cx={mx(f.lon)} cy={my(f.lat)} r={9} fill="transparent" />
                {isActive && (
                  <circle cx={mx(f.lon)} cy={my(f.lat)} r={8}
                    fill="none"
                    stroke={RC.amber}
                    strokeWidth={1.5}
                    opacity={0.5}
                  />
                )}
                <circle cx={mx(f.lon)} cy={my(f.lat)} r={5}
                  fill={RC.amber}
                  stroke={RC.amberMid}
                  strokeWidth={isActive ? 2 : 1.5}
                  opacity={0.9}
                />
              </g>
            )
          })}

          {/* ── CO₂ Storage Site diamonds ──────────────────────────────── */}
          {layers.co2Sites && visibleSites.map((s, i) => {
            const isOp     = s.status === 'operational'
            const cx       = mx(s.lon)
            const cy       = my(s.lat)
            const r        = isOp ? 9 : 7
            const key      = `co2-${s.name}`
            const isActive = activeKey === key
            return (
              <g key={s.name}
                className="rc-map-hit rc-map-enter"
                style={{ '--rc-delay': `${(visibleFields.length + i) * 0.02}s` } as React.CSSProperties}
                tabIndex={0}
                role="button"
                aria-label={`${s.name}: ${s.detail}`}
                onMouseEnter={() => setHoveredKey(key)}
                onMouseLeave={() => setHoveredKey(null)}
                onFocus={() => setHoveredKey(key)}
                onBlur={() => setHoveredKey(null)}
                onClick={() => setPinnedKey(pinnedKey === key ? null : key)}
              >
                {/* Hit area */}
                <circle cx={cx} cy={cy} r={14} fill="transparent" />
                {/* Pulse ring for operational sites, plus an active/pinned ring */}
                {(isOp || isActive) && (
                  <circle cx={cx} cy={cy} r={r + 5}
                    fill="none"
                    stroke={RC.blue}
                    strokeWidth={isActive ? 1.5 : 1}
                    opacity={isActive ? 0.6 : 0.35}
                  />
                )}
                {/* Diamond */}
                <path
                  d={diamond(cx, cy, r)}
                  fill={isOp ? RC.blue : RC.blueDim}
                  stroke={RC.blue}
                  strokeWidth={isOp || isActive ? 1.5 : 1}
                  opacity={0.9}
                />
                {/* Site label */}
                <text
                  x={cx + r + 5} y={cy + 4}
                  fill={RC.blue}
                  fontSize={9}
                  fontWeight={600}
                  fontFamily="Inter, sans-serif"
                >{s.name}</text>
              </g>
            )
          })}

          {/* ── Hover / focus / pin tooltip, positioned from the active marker ─── */}
          {active && (() => {
            const tx  = Math.min(mx(active.lon) + 12, W - 190)
            const ty  = Math.max(my(active.lat) - 44, 6)
            const w2  = 180
            const h2  = 44
            return (
              <g>
                <rect x={tx} y={ty} width={w2} height={h2}
                  fill="rgba(7,11,16,0.96)"
                  stroke="rgba(74,158,191,0.45)"
                  strokeWidth={1}
                  rx={5}
                />
                <text x={tx + 10} y={ty + 15}
                  fill={RC.white90}
                  fontSize={11} fontWeight={700}
                  fontFamily="Inter, sans-serif"
                >{active.name}</text>
                <text x={tx + 10} y={ty + 31}
                  fill={RC.white50}
                  fontSize={9}
                  fontFamily="Inter, sans-serif"
                >{active.detail}</text>
              </g>
            )
          })()}
        </svg>
      </div>

      {/* Legend */}
      <div
        className="px-6 py-4 flex flex-wrap gap-5 justify-center items-center"
        style={{ borderTop: `1px solid ${RC.cardBorder}` }}
      >
        {/* Oil & gas */}
        <div className="rc-legend-item flex items-center gap-1.5">
          <svg width={12} height={12}>
            <circle cx={6} cy={6} r={5} fill={RC.amber} opacity={0.9} />
          </svg>
          <span className="text-[10px]" style={{ color: RC.white50, fontFamily: "'Montserrat', sans-serif" }}>
            Oil &amp; gas field
          </span>
        </div>
        {/* Wind zone */}
        <div className="rc-legend-item flex items-center gap-1.5">
          <svg width={14} height={12}>
            <rect x={0} y={0} width={14} height={12} fill={RC.greenDim} stroke={RC.green} strokeWidth={1} rx={2} />
          </svg>
          <span className="text-[10px]" style={{ color: RC.white50, fontFamily: "'Montserrat', sans-serif" }}>
            Offshore wind zone
          </span>
        </div>
        {/* CO₂ operational */}
        <div className="rc-legend-item flex items-center gap-1.5">
          <svg width={14} height={14}>
            <path d={diamond(7, 7, 7)} fill={RC.blue} stroke={RC.blue} strokeWidth={1} opacity={0.9} />
          </svg>
          <span className="text-[10px]" style={{ color: RC.white50, fontFamily: "'Montserrat', sans-serif" }}>
            CO₂ storage (operational)
          </span>
        </div>
        {/* CO₂ development */}
        <div className="rc-legend-item flex items-center gap-1.5">
          <svg width={14} height={14}>
            <path d={diamond(7, 7, 6)} fill={RC.blueDim} stroke={RC.blue} strokeWidth={1} opacity={0.9} />
          </svg>
          <span className="text-[10px]" style={{ color: RC.white50, fontFamily: "'Montserrat', sans-serif" }}>
            CO₂ storage (development)
          </span>
        </div>
      </div>

      {/* Caption / Source */}
      <p
        className="px-6 py-3 text-xs text-center"
        style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white35, fontFamily: "'Montserrat', sans-serif" }}
      >
        {caption ?? 'Sources: NSTA Carbon Storage Licences 2024 · Global CCS Institute 2024 · Crown Estate Offshore Wind Leasing'}
      </p>
    </figure>
  )
}
