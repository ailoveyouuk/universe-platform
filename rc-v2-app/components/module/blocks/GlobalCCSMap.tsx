// ─────────────────────────────────────────────────────────────────────────────
// GlobalCCSMap — RC Diagram Design Language v1.2 (map variant)
//
// Interactive world map showing global CCS project distribution.
// Proportional bubbles (sqrt-scaled) per country.
// Pure SVG equirectangular projection — no external mapping library required.
//
// This is the reference build for the "map" shape — diagrams built around
// a geographic projection rather than an illustrated system (callout-line),
// a set of compared variants (comparison-panel), or an ordered sequence
// (process-flow). Same card shell (figure/header/badge), RC tokens, and
// staggered entrance as the other three variants. Two differences, both
// deliberate: the blueprint frame here is corner-brackets only — no dot
// grid or radial glow, since the map's own graticule and ocean gradient
// already carry plenty of texture and a second grid would compete with it.
// And there's no numbered-stage badge, since a map's items are data points,
// not a fixed sequence — the header badge just reads "RC Diagram · Map".
// Existing bubble hover interactivity is preserved; bubbles are now also
// keyboard-focusable and clickable-to-pin, matching the rest of the family.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'

// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:       brand.green,
  greenDim:    rcRgba(brand.green, 0.15),
  greenMid:    rcRgba(brand.green, 0.40),
  amber:       brand.amber,
  white90:     'rgba(255,255,255,0.90)',
  white70:     'rgba(255,255,255,0.70)',
  white50:     'rgba(255,255,255,0.50)',
  white35:     'rgba(255,255,255,0.35)',
  white20:     'rgba(255,255,255,0.20)',
  white12:     'rgba(255,255,255,0.12)',
  white08:     'rgba(255,255,255,0.08)',
  white18:     'rgba(255,255,255,0.18)',
  cardBg:      'rgba(10,15,20,0.85)',
  cardBorder:  'rgba(255,255,255,0.08)',
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

// ── Map dimensions ────────────────────────────────────────────────────────────
const W = 940
const H = 440

// ── Equirectangular projection ────────────────────────────────────────────────
function px(lon: number, lat: number): string {
  const x = ((lon + 180) / 360) * W
  const y = ((90 - lat) / 180) * H
  return `${x.toFixed(1)},${y.toFixed(1)}`
}

function pxArr(lon: number, lat: number): [number, number] {
  return [((lon + 180) / 360) * W, ((90 - lat) / 180) * H]
}

function polyPoints(coords: [number, number][]): string {
  return coords.map(([lon, lat]) => px(lon, lat)).join(' ')
}

// ── Simplified continent polygons (lon, lat) ─────────────────────────────────
// Approximate outlines — sufficient for map context, not cartographic accuracy

const NORTH_AMERICA: [number, number][] = [
  [-165,72],[-140,70],[-130,59],[-125,49],[-124,37],[-117,32],
  [-108,22],[-88,16],[-83,10],[-77,8],
  [-66,19],[-68,22],[-82,24],[-82,30],[-75,35],
  [-72,41],[-66,44],[-60,46],[-54,47],
  [-56,55],[-60,65],[-75,72],[-92,76],
  [-110,76],[-130,74],[-152,66],[-165,66],
]

const SOUTH_AMERICA: [number, number][] = [
  [-78,8],[-64,12],[-60,6],[-50,1],[-38,-3],
  [-35,-9],[-38,-15],[-42,-23],[-44,-28],
  [-52,-33],[-62,-42],[-66,-50],[-68,-55],
  [-64,-55],[-55,-47],[-44,-38],[-40,-20],
  [-38,-10],[-42,-2],[-50,0],[-72,12],
]

const EUROPE: [number, number][] = [
  [-10,36],[3,36],[12,37],[26,37],[36,36],[28,41],
  [28,45],[30,47],[24,47],[22,44],[18,42],[15,38],
  [12,38],[8,47],[5,48],[2,48],[-2,47],
  [-5,43],[-9,39],[-9,37],[-6,37],
]

const SCANDINAVIA: [number, number][] = [
  [5,57],[8,55],[10,55],[12,55],[12,57],[14,56],
  [16,57],[18,60],[20,60],[22,60],[24,60],[28,65],
  [30,70],[28,71],[24,70],[20,68],[18,70],[16,68],
  [14,64],[12,64],[10,63],[8,62],[6,62],[5,59],
]

const AFRICA: [number, number][] = [
  [-6,37],[2,37],[14,33],[18,32],[24,30],
  [28,30],[34,30],[38,22],[42,12],[44,8],
  [40,-5],[40,-12],[38,-20],
  [32,-30],[24,-35],[18,-35],
  [14,-25],[10,-5],[8,3],[3,4],[-5,4],
  [-15,5],[-17,8],[-17,15],
]

const ASIA: [number, number][] = [
  [26,42],[36,37],[44,37],[52,36],[56,26],
  [60,22],[68,24],[72,22],[72,8],[79,8],[82,10],
  [88,22],[92,22],[98,16],[100,2],[104,1],[108,2],
  [115,4],[120,2],[124,14],[118,22],[122,30],
  [120,38],[126,42],[130,42],[136,34],[138,35],
  [140,40],[128,44],[122,52],[116,52],[110,53],
  [100,50],[90,48],[82,48],[76,42],[68,42],
  [60,44],[52,48],[44,44],[38,44],[34,42],[26,44],
]

const AUSTRALIA: [number, number][] = [
  [114,-22],[118,-20],[122,-18],[128,-14],[136,-12],
  [140,-16],[144,-18],[148,-18],[152,-24],[152,-28],
  [152,-32],[150,-38],[146,-38],[140,-36],
  [136,-35],[132,-34],[128,-32],[122,-26],[116,-26],
]

const GREENLAND: [number, number][] = [
  [-46,84],[-18,76],[-18,70],[-22,62],
  [-40,60],[-46,62],[-52,70],[-52,76],
]

const CONTINENTS = [
  NORTH_AMERICA, SOUTH_AMERICA, EUROPE, SCANDINAVIA,
  AFRICA, ASIA, AUSTRALIA, GREENLAND,
]

// ── CCS project data (Global CCS Institute, 2024) ─────────────────────────────
interface CCSCountry {
  country: string
  count:   number
  lon:     number
  lat:     number
}

const CCS_DATA: CCSCountry[] = [
  { country: 'USA',          count: 121, lon:  -96, lat:  38 },
  { country: 'China',        count:  54, lon:  105, lat:  35 },
  { country: 'UK',           count:  34, lon:   -2, lat:  54 },
  { country: 'Norway',       count:  18, lon:   10, lat:  64 },
  { country: 'Australia',    count:  16, lon:  134, lat: -25 },
  { country: 'Canada',       count:  15, lon:  -95, lat:  58 },
  { country: 'Netherlands',  count:  12, lon:  5.3, lat:52.4 },
  { country: 'Germany',      count:  10, lon: 10.5, lat:  51 },
  { country: 'Denmark',      count:   8, lon:   10, lat:  56 },
  { country: 'Saudi Arabia', count:   7, lon:   45, lat:  24 },
  { country: 'Japan',        count:   6, lon:  138, lat:  37 },
  { country: 'South Korea',  count:   5, lon:  128, lat:  37 },
  { country: 'Brazil',       count:   4, lon:  -51, lat: -10 },
  { country: 'France',       count:   4, lon:    2, lat:  46 },
  { country: 'UAE',          count:   3, lon:   54, lat:  24 },
  { country: 'Ireland',      count:   2, lon:   -8, lat:  53 },
  { country: 'Belgium',      count:   2, lon:  4.5, lat:50.5 },
]

const MAX_COUNT = 121
const MAX_R     = 36

function bubbleR(count: number): number {
  return Math.max(5, MAX_R * Math.sqrt(count / MAX_COUNT))
}

// ── Legend bubble sizes ───────────────────────────────────────────────────────
const LEGEND_STEPS = [100, 50, 10, 2]

// ── Component ─────────────────────────────────────────────────────────────────
interface GlobalCCSMapProps {
  title?:   string
  caption?: string
}

export function GlobalCCSMap({ title, caption }: GlobalCCSMapProps) {
  const [active, setActive] = useState<CCSCountry | null>(null)

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
            {title || 'Global CCS Project Distribution'}
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white35, fontFamily: "'Montserrat', sans-serif" }}>
            Bubble size proportional to CCS project count — hover or tap for details
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.greenDim, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · Map
        </span>
      </div>

      {/* Map body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ maxWidth: W, minWidth: 320, display: 'block', borderRadius: 8 }}
          aria-label="World map showing global distribution of CCS projects"
        >
          <defs>
            <radialGradient id="gccsBubble" cx="38%" cy="32%">
              <stop offset="0%"   stopColor={RC.green} stopOpacity={0.95} />
              <stop offset="100%" stopColor={RC.green} stopOpacity={0.35} />
            </radialGradient>
            <radialGradient id="gccsOcean" cx="50%" cy="50%">
              <stop offset="0%"   stopColor="#0d2030" />
              <stop offset="100%" stopColor="#060a0f" />
            </radialGradient>
          </defs>

          {/* Ocean background */}
          <rect width={W} height={H} fill="url(#gccsOcean)" rx={8} />
          <MapFrame w={W} h={H} />

          {/* Graticule (latitude/longitude grid) */}
          {[-60, -30, 0, 30, 60].map(lat => {
            const [, y] = pxArr(0, lat)
            return (
              <line key={`lat${lat}`}
                x1={0} y1={y} x2={W} y2={y}
                stroke={RC.white08} strokeWidth={lat === 0 ? 1 : 0.5}
                strokeDasharray={lat === 0 ? '4 4' : undefined}
              />
            )
          })}
          {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map(lon => {
            const [x] = pxArr(lon, 0)
            return (
              <line key={`lon${lon}`}
                x1={x} y1={0} x2={x} y2={H}
                stroke={RC.white08} strokeWidth={0.5}
              />
            )
          })}

          {/* Equator label */}
          <text
            x={8}
            y={pxArr(0, 0)[1] - 4}
            fill={RC.white20}
            fontSize={8}
            fontFamily="Inter, sans-serif"
          >Equator</text>

          {/* Continent fills */}
          {CONTINENTS.map((poly, i) => (
            <polygon key={i}
              points={polyPoints(poly)}
              fill="rgba(180,200,220,0.07)"
              stroke="rgba(180,200,220,0.20)"
              strokeWidth={0.7}
              strokeLinejoin="round"
            />
          ))}

          {/* CCS bubbles — rendered in ascending count order so large bubbles go under */}
          {[...CCS_DATA]
            .sort((a, b) => a.count - b.count)
            .map((d, i) => {
              const [bx, by] = pxArr(d.lon, d.lat)
              const r        = bubbleR(d.count)
              const isActive = active?.country === d.country
              return (
                <g key={d.country}
                  className="rc-map-hit rc-map-enter"
                  style={{ '--rc-delay': `${i * 0.03}s` } as React.CSSProperties}
                  tabIndex={0}
                  role="button"
                  aria-label={`${d.country}: ${d.count} CCS projects`}
                  onMouseEnter={() => setActive(d)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(d)}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive(isActive ? null : d)}
                >
                  {/* Invisible hit area */}
                  <circle cx={bx} cy={by} r={r + 6} fill="transparent" />
                  {/* Glow ring on hover */}
                  {isActive && (
                    <circle cx={bx} cy={by} r={r + 5}
                      fill="none"
                      stroke={RC.green}
                      strokeWidth={1.5}
                      opacity={0.5}
                    />
                  )}
                  {/* Main bubble */}
                  <circle cx={bx} cy={by} r={r}
                    fill="url(#gccsBubble)"
                    stroke={RC.green}
                    strokeWidth={isActive ? 2 : 1}
                    opacity={isActive ? 1 : 0.80}
                    style={{ transition: 'opacity 0.15s ease, stroke-width 0.15s ease' }}
                  />
                  {/* Count label inside large bubbles */}
                  {r >= 14 && (
                    <text
                      x={bx} y={by + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="rgba(0,0,0,0.85)"
                      fontSize={r >= 26 ? 13 : r >= 18 ? 11 : 9}
                      fontWeight={700}
                      fontFamily="Inter, sans-serif"
                    >{d.count}</text>
                  )}
                </g>
              )
            })}

          {/* Hover / focus tooltip rendered inside SVG for accurate positioning */}
          {active && (() => {
            const [tx, ty] = pxArr(active.lon, active.lat)
            const r        = bubbleR(active.count)
            const tipX     = Math.min(tx + r + 8, W - 160)
            const tipY     = Math.max(ty - 30, 6)
            return (
              <g>
                <rect x={tipX} y={tipY} width={150} height={40}
                  fill="rgba(7,11,16,0.96)"
                  stroke={RC.greenMid || 'rgba(130,188,0,0.40)'}
                  strokeWidth={1}
                  rx={5}
                />
                <text x={tipX + 10} y={tipY + 15}
                  fill={RC.green}
                  fontSize={12} fontWeight={700}
                  fontFamily="Inter, sans-serif"
                >{active.country}</text>
                <text x={tipX + 10} y={tipY + 30}
                  fill={RC.white70}
                  fontSize={11}
                  fontFamily="Inter, sans-serif"
                >{active.count} projects</text>
              </g>
            )
          })()}
        </svg>
      </div>

      {/* Legend */}
      <div
        className="px-6 py-4 flex flex-wrap items-center justify-center gap-5"
        style={{ borderTop: `1px solid ${RC.cardBorder}` }}
      >
        <span className="rc-legend-item text-[10px]" style={{ color: RC.white35, fontFamily: "'Montserrat', sans-serif" }}>
          Scale:
        </span>
        {LEGEND_STEPS.map(n => {
          const r = bubbleR(n)
          const d = r * 2 + 4
          return (
            <div key={n} className="rc-legend-item flex items-center gap-1.5">
              <svg width={d} height={d} style={{ overflow: 'visible' }}>
                <defs>
                  <radialGradient id={`lgBub${n}`} cx="38%" cy="32%">
                    <stop offset="0%"   stopColor={RC.green} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={RC.green} stopOpacity={0.35} />
                  </radialGradient>
                </defs>
                <circle cx={d / 2} cy={d / 2} r={r}
                  fill={`url(#lgBub${n})`}
                  stroke={RC.green}
                  strokeWidth={1}
                  opacity={0.8}
                />
              </svg>
              <span className="text-[10px]" style={{ color: RC.white50, fontFamily: "'Montserrat', sans-serif" }}>
                {n} projects
              </span>
            </div>
          )
        })}
      </div>

      {/* Caption / Source */}
      <p
        className="px-6 py-3 text-xs text-center"
        style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white35, fontFamily: "'Montserrat', sans-serif" }}
      >
        {caption ?? 'Source: Global CCS Institute — Status of Carbon Capture and Storage 2024'}
      </p>
    </figure>
  )
}
