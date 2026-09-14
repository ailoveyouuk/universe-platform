'use client'

// ─────────────────────────────────────────────────────────────────────────────
// SolarResourceMapDiagram — RC Diagram Design Language v1.2 (map variant)
//
// World map of photovoltaic output (PVOUT). Equirectangular SVG projection
// with colour-coded solar irradiance zones. Ported onto the map variant's
// standard card shell (figure/header/badge), RC tokens, corner-bracket
// MapFrame, staggered entrance, and click-to-pin + keyboard-focusable zones,
// matching GlobalCCSMap.tsx (the reference build for this variant).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'

// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:       brand.green,
  greenDim:    rcRgba(brand.green, 0.15),
  greenMid:    rcRgba(brand.green, 0.40),
  blue:        brand.blue,
  amber:       brand.amber,
  bgDark:      '#0f172a',
  bgMid:       '#1e293b',
  bgPanel:     '#162032',
  text:        '#e2e8f0',
  textMuted:   '#94a3b8',
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
// glow, since the ocean background + graticule already carry the diagram's texture)
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

// ── Solar irradiance colour scale (low → high kWh/kWp/year) ──────────────────
// Deep blue → purple → orange → bright yellow
const SOLAR_SCALE = [
  { min: 0,    max: 800,  color: '#2e5090', label: '< 800',      desc: 'Low (northern latitudes)' },
  { min: 800,  max: 1100, color: '#4a7ab5', label: '800–1100',   desc: 'Below average' },
  { min: 1100, max: 1400, color: '#6aad6e', label: '1100–1400',  desc: 'Average' },
  { min: 1400, max: 1700, color: '#d4a820', label: '1400–1700',  desc: 'Good' },
  { min: 1700, max: 2000, color: '#e07820', label: '1700–2000',  desc: 'Very good' },
  { min: 2000, max: 2500, color: '#d04020', label: '2000–2500',  desc: 'Excellent' },
  { min: 2500, max: 9999, color: '#b01010', label: '> 2500',     desc: 'Exceptional (desert)' },
]

function pvColor(kwhkwp: number) {
  const band = SOLAR_SCALE.find(b => kwhkwp >= b.min && kwhkwp < b.max)
  return band?.color ?? SOLAR_SCALE[0].color
}

// ── Equirectangular projection ────────────────────────────────────────────────
const MAP_W = 820
const MAP_H = 400

function lonlatToXY(lon: number, lat: number): [number, number] {
  const x = ((lon + 180) / 360) * MAP_W
  const y = ((90 - lat) / 180) * MAP_H
  return [x, y]
}

// ── Solar irradiance zones (simplified lat/lon polygons) ─────────────────────
// Each zone: array of [lon,lat] vertices forming a rough region, + pvout value

interface Zone {
  id: string
  name: string
  pvout: number       // kWh/kWp/year
  cx: number          // label centre lon
  cy: number          // label centre lat
  path: [number, number][]
}

const ZONES: Zone[] = [
  // Sahara / N Africa — highest
  { id: 'sahara', name: 'Sahara',       pvout: 2300, cx: 15,   cy: 24,
    path: [[-15,37],[30,37],[30,35],[40,30],[40,20],[35,15],[20,15],[0,15],[-5,20],[-10,25],[-15,30]] },
  // Arabian Peninsula
  { id: 'arabia', name: 'Arabia',       pvout: 2200, cx: 45,   cy: 23,
    path: [[35,30],[55,30],[60,22],[56,12],[45,12],[37,16],[33,25]] },
  // Middle East / Iran
  { id: 'mideast', name: 'Middle East', pvout: 2000, cx: 55,   cy: 32,
    path: [[35,38],[60,38],[60,30],[56,22],[45,22],[37,26],[33,35]] },
  // SW USA / Sonoran Desert
  { id: 'swusa', name: 'SW USA',        pvout: 2100, cx: -113, cy: 34,
    path: [[-125,37],[-104,37],[-104,30],[-117,28],[-125,30]] },
  // N Mexico
  { id: 'nmex', name: 'N Mexico',       pvout: 2050, cx: -104, cy: 26,
    path: [[-117,28],[-97,26],[-97,18],[-105,14],[-120,18]] },
  // Atacama / Andean Desert
  { id: 'atacama', name: 'Atacama',     pvout: 2400, cx: -69,  cy: -24,
    path: [[-73,-18],[-65,-18],[-64,-30],[-71,-36],[-76,-25]] },
  // Kalahari / S Africa
  { id: 'kalahari', name: 'S Africa',   pvout: 2100, cx: 22,   cy: -27,
    path: [[15,-20],[35,-20],[35,-35],[25,-38],[15,-30]] },
  // Australia interior
  { id: 'aussie', name: 'Australia',    pvout: 2050, cx: 130,  cy: -25,
    path: [[114,-20],[145,-20],[148,-35],[138,-38],[118,-35],[110,-26]] },
  // India
  { id: 'india', name: 'India',         pvout: 1700, cx: 78,   cy: 22,
    path: [[68,35],[80,35],[90,26],[92,20],[80,8],[76,8],[68,22],[64,28]] },
  // China (south)
  { id: 'china-s', name: 'China S',     pvout: 1400, cx: 108,  cy: 28,
    path: [[98,38],[122,38],[125,22],[115,18],[105,20],[98,28]] },
  // China (north/Gobi)
  { id: 'gobi', name: 'Gobi',           pvout: 1800, cx: 105,  cy: 42,
    path: [[88,48],[120,48],[122,38],[98,38],[88,40]] },
  // Europe (south)
  { id: 'eu-s', name: 'S Europe',       pvout: 1550, cx: 10,   cy: 40,
    path: [[-8,44],[28,44],[30,36],[20,34],[10,36],[0,36],[-5,38]] },
  // Europe (north)
  { id: 'eu-n', name: 'N Europe',       pvout: 950,  cx: 12,   cy: 54,
    path: [[-5,60],[25,60],[30,52],[28,44],[10,44],[-8,46]] },
  // Scandinavia
  { id: 'scandi', name: 'Scandinavia',  pvout: 800,  cx: 18,   cy: 63,
    path: [[4,72],[32,72],[32,60],[25,58],[10,58],[4,62]] },
  // UK / Ireland
  { id: 'uk', name: 'UK',               pvout: 900,  cx: -2,   cy: 54,
    path: [[-8,58],[2,58],[2,50],[-6,48],[-8,52]] },
  // Eastern USA
  { id: 'eusa', name: 'E USA',          pvout: 1350, cx: -83,  cy: 38,
    path: [[-90,48],[-66,48],[-66,30],[-80,28],[-90,30],[-97,36]] },
  // SE USA / Sunbelt
  { id: 'seusa', name: 'SE USA',        pvout: 1650, cx: -88,  cy: 31,
    path: [[-97,36],[-80,28],[-80,24],[-95,24],[-100,28]] },
  // SE Asia
  { id: 'seasia', name: 'SE Asia',      pvout: 1500, cx: 108,  cy: 10,
    path: [[95,20],[130,20],[140,10],[130,0],[110,0],[100,5],[94,12]] },
  // Sub-Saharan Africa (non-desert)
  { id: 'subsahara', name: 'C Africa',  pvout: 1700, cx: 25,   cy: 0,
    path: [[-15,15],[40,15],[40,-5],[30,-5],[20,-10],[0,-5],[-10,5]] },
  // S America (tropical)
  { id: 'samaz', name: 'Amazon',        pvout: 1450, cx: -58,  cy: -5,
    path: [[-73,5],[-35,5],[-35,-15],[-50,-20],[-70,-18],[-80,-5],[-80,2]] },
  // Brazil (NE)
  { id: 'braz-ne', name: 'NE Brazil',   pvout: 1900, cx: -42,  cy: -10,
    path: [[-47,-2],[-35,-2],[-35,-18],[-47,-18],[-50,-10]] },
  // Canada
  { id: 'canada', name: 'Canada',       pvout: 1050, cx: -96,  cy: 56,
    path: [[-140,60],[-60,60],[-60,48],[-80,44],[-90,44],[-100,48],[-140,48]] },
  // Russia / Siberia
  { id: 'russia', name: 'Russia',       pvout: 900,  cx: 90,   cy: 60,
    path: [[30,72],[180,72],[180,52],[140,48],[105,48],[80,52],[55,55],[30,62]] },
  // Japan / Korea
  { id: 'japan', name: 'Japan/Korea',   pvout: 1250, cx: 135,  cy: 36,
    path: [[124,42],[142,44],[146,34],[140,30],[130,30],[126,34]] },
]

// ── Simplified continent outlines (stroke only) ──────────────────────────────

const CONTINENT_PATHS = [
  // Africa (simplified)
  'M 198 155 L 240 142 L 272 142 L 300 155 L 315 175 L 310 200 L 300 220 L 285 240 L 270 250 L 258 280 L 248 310 L 240 320 L 228 310 L 215 285 L 205 260 L 195 230 L 190 200 Z',
  // Europe
  'M 195 100 L 240 90 L 270 95 L 290 105 L 285 125 L 270 135 L 240 142 L 198 155 L 180 145 L 175 130 L 185 115 Z',
  // Asia (simplified)
  'M 290 105 L 340 95 L 400 90 L 500 88 L 560 100 L 590 120 L 580 145 L 550 170 L 530 190 L 510 200 L 490 220 L 465 240 L 440 240 L 420 225 L 410 205 L 385 195 L 360 185 L 330 175 L 310 155 L 300 135 L 295 118 Z',
  // North America
  'M 45 95 L 100 82 L 130 88 L 155 95 L 165 115 L 160 140 L 145 165 L 125 185 L 100 195 L 80 215 L 65 230 L 60 210 L 50 175 L 40 145 L 40 120 Z',
  // South America
  'M 95 220 L 130 220 L 145 240 L 148 270 L 138 300 L 125 330 L 105 360 L 90 355 L 78 335 L 72 305 L 75 275 L 80 250 Z',
  // Australia
  'M 490 250 L 540 245 L 570 258 L 580 285 L 570 310 L 550 325 L 520 330 L 495 318 L 480 295 L 480 268 Z',
]

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipData {
  name: string
  pvout: number
  x: number
  y: number
}

// ── Zone path builder ─────────────────────────────────────────────────────────

function buildSvgPath(latlons: [number, number][]): string {
  if (latlons.length === 0) return ''
  const pts = latlons.map(([lon, lat]) => lonlatToXY(lon, lat))
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ' Z'
}

// ── Component ─────────────────────────────────────────────────────────────────
interface SolarResourceMapDiagramProps {
  title?:   string
  caption?: string
}

export default function SolarResourceMapDiagram({
  title = 'Global Photovoltaic Output (PVOUT) — Annual Solar Energy Yield',
  caption,
}: SolarResourceMapDiagramProps) {
  const [hover, setHover] = useState<TooltipData | null>(null)
  const [pinned, setPinned] = useState<TooltipData | null>(null)

  const active = hover ?? pinned

  const W = 860
  const H = 460
  const MAP_X = 20
  const MAP_Y = 14

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
            {title}
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white35, fontFamily: "'Montserrat', sans-serif" }}>
            Estimated kWh per kWp of installed PV capacity per year — hover or tap a zone for details
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
          style={{ maxWidth: W, minWidth: 320, display: 'block', background: RC.bgDark, borderRadius: 8 }}
          aria-label="World map showing global solar photovoltaic output by region"
        >
          <rect width={W} height={H} fill={RC.bgDark} rx={8} />
          <MapFrame w={W} h={H} />

          {/* Map background (ocean) */}
          <rect x={MAP_X} y={MAP_Y} width={MAP_W} height={MAP_H} rx={4} fill="#0d1f2d" />

          {/* Grid lines (latitude) */}
          {[-60, -30, 0, 30, 60].map((lat) => {
            const [, y] = lonlatToXY(0, lat)
            return (
              <g key={lat}>
                <line x1={MAP_X} y1={MAP_Y + y} x2={MAP_X + MAP_W} y2={MAP_Y + y} stroke="#1a3040" strokeWidth={lat === 0 ? 1.5 : 0.5} />
                <text x={MAP_X + 4} y={MAP_Y + y - 3} fill="#2a4560" fontSize={8} fontFamily="sans-serif">{lat}°</text>
              </g>
            )
          })}
          {/* Grid lines (longitude) */}
          {[-120, -60, 0, 60, 120].map((lon) => {
            const [x] = lonlatToXY(lon, 0)
            return (
              <line key={lon} x1={MAP_X + x} y1={MAP_Y} x2={MAP_X + x} y2={MAP_Y + MAP_H} stroke="#1a3040" strokeWidth={0.5} />
            )
          })}

          {/* Tropics */}
          {[23.5, -23.5].map((lat) => {
            const [, y] = lonlatToXY(0, lat)
            return (
              <line key={lat} x1={MAP_X} y1={MAP_Y + y} x2={MAP_X + MAP_W} y2={MAP_Y + y}
                stroke="#2a3a20" strokeWidth={1} strokeDasharray="6 4" />
            )
          })}

          {/* Solar zones */}
          {ZONES.map((zone, i) => {
            const d = buildSvgPath(zone.path)
            const col = pvColor(zone.pvout)
            const isPinned = pinned?.name === zone.name
            const isActive = active?.name === zone.name
            return (
              <g key={zone.id}
                className="rc-map-hit rc-map-enter"
                style={{ '--rc-delay': `${i * 0.02}s` } as React.CSSProperties}
                tabIndex={0}
                role="button"
                aria-label={`${zone.name}: ${zone.pvout.toLocaleString()} kWh/kWp/yr`}
                onFocus={() => {
                  const [labelX, labelY] = lonlatToXY(zone.cx, zone.cy)
                  setHover({ name: zone.name, pvout: zone.pvout, x: MAP_X + labelX, y: MAP_Y + labelY })
                }}
                onBlur={() => setHover(null)}
                onClick={(e) => {
                  const svg = e.currentTarget.ownerSVGElement!
                  const rect = svg.getBoundingClientRect()
                  const svgX = ((e.clientX - rect.left) / rect.width) * W
                  const svgY = ((e.clientY - rect.top) / rect.height) * H
                  setPinned(isPinned ? null : { name: zone.name, pvout: zone.pvout, x: svgX, y: svgY })
                }}
              >
                <path
                  d={d}
                  transform={`translate(${MAP_X}, ${MAP_Y})`}
                  fill={col}
                  fillOpacity={isActive ? 0.95 : 0.75}
                  stroke={isActive ? '#fff' : 'none'}
                  strokeWidth={isActive ? 1 : 0}
                  style={{ transition: 'fill-opacity 0.15s' }}
                  onMouseEnter={(e) => {
                    const svg = e.currentTarget.ownerSVGElement!
                    const rect = svg.getBoundingClientRect()
                    const svgX = ((e.clientX - rect.left) / rect.width) * W
                    const svgY = ((e.clientY - rect.top) / rect.height) * H
                    setHover({ name: zone.name, pvout: zone.pvout, x: svgX, y: svgY })
                  }}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            )
          })}

          {/* Tropic labels */}
          {[{ lat: 23.5, label: 'Tropic of Cancer' }, { lat: -23.5, label: 'Tropic of Capricorn' }].map(({ lat, label }) => {
            const [, y] = lonlatToXY(0, lat)
            return (
              <text key={label} x={MAP_X + 6} y={MAP_Y + y + 10} fill="#3a5a28" fontSize={7} fontFamily="sans-serif" fontStyle="italic">
                {label}
              </text>
            )
          })}

          {/* Hover / focus / pinned tooltip */}
          {active && (
            <g>
              <rect
                x={Math.min(active.x + 10, W - 145)}
                y={active.y - 30}
                width={135}
                height={46}
                rx={4}
                fill={RC.bgMid}
                stroke={RC.green}
                strokeWidth={1}
              />
              <text x={Math.min(active.x + 18, W - 137)} y={active.y - 14} fill={RC.text} fontSize={11} fontWeight="700" fontFamily="sans-serif">
                {active.name}
              </text>
              <text x={Math.min(active.x + 18, W - 137)} y={active.y + 1} fill={pvColor(active.pvout)} fontSize={11} fontWeight="600" fontFamily="sans-serif">
                {active.pvout.toLocaleString()} kWh/kWp/yr
              </text>
              <text x={Math.min(active.x + 18, W - 137)} y={active.y + 14} fill={RC.textMuted} fontSize={9} fontFamily="sans-serif">
                {SOLAR_SCALE.find(b => active.pvout >= b.min && active.pvout < b.max)?.desc}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div
        className="px-6 py-4 flex flex-wrap items-center justify-center gap-5"
        style={{ borderTop: `1px solid ${RC.cardBorder}` }}
      >
        <span className="rc-legend-item text-[10px]" style={{ color: RC.white35, fontFamily: "'Montserrat', sans-serif" }}>
          Annual Yield (kWh/kWp):
        </span>
        {SOLAR_SCALE.map((band, i) => (
          <div key={i} className="rc-legend-item flex items-center gap-1.5">
            <span
              className="inline-block rounded-sm"
              style={{ width: 14, height: 14, background: band.color }}
            />
            <span className="text-[10px]" style={{ color: RC.white50, fontFamily: "'Montserrat', sans-serif" }}>
              {band.label}
            </span>
          </div>
        ))}
      </div>

      {/* Caption / Source */}
      <p
        className="px-6 py-3 text-xs text-center"
        style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white35, fontFamily: "'Montserrat', sans-serif" }}
      >
        {caption ?? 'Indicative zones only. Data based on Global Solar Atlas / PVOUT estimates.'}
      </p>
    </figure>
  )
}
