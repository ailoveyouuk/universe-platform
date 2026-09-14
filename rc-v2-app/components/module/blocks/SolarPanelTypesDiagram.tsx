// ─────────────────────────────────────────────────────────────────────────────
// SolarPanelTypesDiagram — RC Diagram Design Language v1.2 (comparison-panel variant)
//
// 3-column comparison of solar panel technologies:
//   Monocrystalline | Polycrystalline | Thin-Film
//
// Each column shows a crystal-structure illustration, the efficiency
// headline, and the panel's identity. The dense specs — relative cost,
// lifespan, best-for, advantages, limitations — used to be tiny
// hand-wrapped SVG text (7.5–8px in a 920-unit canvas), the same
// mobile-legibility problem the other comparison-panel diagrams hit.
// Following the GeothermalPlantTypesDiagram / MooringSystemsDiagram
// precedent, those rows have moved to real HTML `.rc-detail-card`s below
// the diagram: always legible at any viewport, synced to the same
// hover/tap highlight as the SVG panel. The crystal-structure icons and
// efficiency bar are the actual illustration and are unchanged.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'
// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:       brand.green,
  greenDim:    rcRgba(brand.green, 0.12),
  greenMid:    rcRgba(brand.green, 0.40),
  greenBright: rcRgba(brand.green, 0.70),
  amber:       brand.amber,
  amberDim:    rcRgba(brand.amber, 0.12),
  amberMid:    rcRgba(brand.amber, 0.40),
  amberBright: rcRgba(brand.amber, 0.70),
  blue:        brand.blue,
  blueDim:     rcRgba(brand.blue, 0.12),
  white90:     'rgba(255,255,255,0.90)',
  white70:     'rgba(255,255,255,0.70)',
  white65:     'rgba(255,255,255,0.65)',
  white50:     'rgba(255,255,255,0.50)',
  white45:     'rgba(255,255,255,0.45)',
  white35:     'rgba(255,255,255,0.35)',
  white20:     'rgba(255,255,255,0.20)',
  white18:     'rgba(255,255,255,0.18)',
  white10:     'rgba(255,255,255,0.10)',
  white08:     'rgba(255,255,255,0.08)',
  cardBg:      'rgba(10,15,20,0.80)',
  cardBorder:  'rgba(255,255,255,0.08)',
}

// ── Shared animation / interaction styles ─────────────────────────────────────
function DiagramStyles() {
  return (
    <style>{`
      .rc-panel-enter { opacity: 1; }
      @media (prefers-reduced-motion: no-preference) {
        .rc-panel-enter {
          opacity: 0;
          animation: rc-panel-in 0.55s cubic-bezier(0.16,1,0.3,1) both;
          animation-delay: var(--rc-delay, 0s);
        }
      }
      @keyframes rc-panel-in {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .rc-panel-hit { cursor: pointer; transition: opacity 0.18s ease; }
      .rc-detail-card { cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease; }
      .rc-detail-card:focus-visible, .rc-panel-hit:focus-visible {
        outline: 2px solid ${RC.green}; outline-offset: 2px;
      }
      @media (max-width: 767px) {
        .rc-panel-label { display: none; }
      }
    `}</style>
  )
}

// ── Blueprint frame: grid + corner brackets ───────────────────────────────────
function BlueprintFrame({ w, h }: { w: number; h: number }) {
  const b = 14
  return (
    <>
      <defs>
        <pattern id="rcGridSP" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowSP" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.07)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridSP)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowSP)" />
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

// ── Canvas constants ──────────────────────────────────────────────────────────
const W       = 940
const H       = 300
const PAD     = 18
const PANEL_W = (W - PAD * 2 - 20) / 3   // ~294px per panel
const PANEL_H = 260
const TOP_Y   = 20

function colX(col: number) {
  return PAD + col * (PANEL_W + 10)
}

// ── Crystal Structure Icons ───────────────────────────────────────────────────
// Each ~80×60 centred at (cx, cy) — original illustration, unchanged.

function IconMonoCrystal({ cx, cy }: { cx: number; cy: number }) {
  // Single perfect diamond/crystal lattice pattern — uniform black cells with thin metal lines
  const cells: [number, number][] = []
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++)
      cells.push([cx - 32 + col * 17, cy - 28 + row * 17])

  return (
    <g>
      {cells.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={15} height={15} rx={0}
          fill={RC.green} fillOpacity={0.22} stroke={RC.green} strokeOpacity={0.5} strokeWidth={0.8}/>
      ))}
      {/* Uniform grid lines showing perfect crystal — horizontal */}
      {[0,1,2,3,4].map(r => (
        <line key={`h${r}`} x1={cx-33} y1={cy-28+r*17} x2={cx+35} y2={cy-28+r*17}
          stroke={RC.green} strokeOpacity={0.30} strokeWidth={0.5}/>
      ))}
      {[0,1,2,3,4].map(c => (
        <line key={`v${c}`} x1={cx-33+c*17} y1={cy-29} x2={cx-33+c*17} y2={cy+39}
          stroke={RC.green} strokeOpacity={0.30} strokeWidth={0.5}/>
      ))}
    </g>
  )
}

function IconPolyCrystal({ cx, cy }: { cx: number; cy: number }) {
  // Irregular mosaic — random-shaped polygons suggesting polycrystalline grain boundaries
  const grains = [
    `${cx-33},${cy-28} ${cx-12},${cy-28} ${cx-15},${cy-8} ${cx-33},${cy-5}`,
    `${cx-12},${cy-28} ${cx+10},${cy-30} ${cx+8},${cy-10} ${cx-15},${cy-8}`,
    `${cx+10},${cy-30} ${cx+35},${cy-26} ${cx+32},${cy-4} ${cx+8},${cy-10}`,
    `${cx-33},${cy-5} ${cx-15},${cy-8} ${cx-18},${cy+14} ${cx-33},${cy+12}`,
    `${cx-15},${cy-8} ${cx+8},${cy-10} ${cx+5},${cy+12} ${cx-18},${cy+14}`,
    `${cx+8},${cy-10} ${cx+32},${cy-4} ${cx+30},${cy+16} ${cx+5},${cy+12}`,
    `${cx-33},${cy+12} ${cx-18},${cy+14} ${cx-20},${cy+36} ${cx-33},${cy+34}`,
    `${cx-18},${cy+14} ${cx+5},${cy+12} ${cx+2},${cy+36} ${cx-20},${cy+36}`,
    `${cx+5},${cy+12} ${cx+30},${cy+16} ${cx+28},${cy+38} ${cx+2},${cy+36}`,
  ]
  const blues = ['rgba(74,158,191,0.25)', 'rgba(74,158,191,0.15)', 'rgba(74,158,191,0.30)',
                  'rgba(74,158,191,0.18)', 'rgba(74,158,191,0.28)', 'rgba(74,158,191,0.12)',
                  'rgba(74,158,191,0.22)', 'rgba(74,158,191,0.32)', 'rgba(74,158,191,0.20)']

  return (
    <g>
      {grains.map((points, i) => (
        <polygon key={i} points={points} fill={blues[i]}
          stroke={RC.blue} strokeOpacity={0.50} strokeWidth={0.8}/>
      ))}
    </g>
  )
}

function IconThinFilm({ cx, cy }: { cx: number; cy: number }) {
  // Thin horizontal layers — showing the deposition layers of thin film
  const layers = [
    { y: cy - 28, h: 10, fill: 'rgba(218,165,32,0.35)', label: 'Metal contact' },
    { y: cy - 17, h:  7, fill: 'rgba(218,165,32,0.20)', label: 'TCO layer' },
    { y: cy - 9,  h: 14, fill: 'rgba(218,165,32,0.40)', label: 'Absorber (CdTe/CIGS)' },
    { y: cy + 6,  h:  6, fill: 'rgba(218,165,32,0.18)', label: 'Buffer layer' },
    { y: cy + 13, h: 10, fill: 'rgba(218,165,32,0.30)', label: 'TCO (front)' },
    { y: cy + 24, h:  7, fill: 'rgba(218,165,32,0.15)', label: 'Glass substrate' },
  ]
  return (
    <g>
      {layers.map(({ y, h, fill }, i) => (
        <rect key={i} x={cx - 33} y={y} width={66} height={h} rx={1}
          fill={fill} stroke={RC.amber} strokeOpacity={0.35} strokeWidth={0.6}/>
      ))}
    </g>
  )
}

// ── Efficiency bar ────────────────────────────────────────────────────────────
function EfficiencyBar({ x, y, width, pct, color }: {
  x: number; y: number; width: number; pct: number; color: string
}) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={7} rx={3.5}
        fill="rgba(255,255,255,0.06)"/>
      <rect x={x} y={y} width={width * pct} height={7} rx={3.5}
        fill={color} fillOpacity={0.75}/>
    </g>
  )
}

// ── Cost dots ─────────────────────────────────────────────────────────────────
function CostDots({ x, y, filled, color }: { x: number; y: number; filled: number; color: string }) {
  return (
    <g>
      {[0,1,2].map(i => (
        <circle key={i} cx={x + i * 14} cy={y} r={5}
          fill={i < filled ? color : 'none'}
          stroke={color} strokeWidth={1.5} fillOpacity={0.8}/>
      ))}
    </g>
  )
}

// ── Tag pill ──────────────────────────────────────────────────────────────────
function Tag({ x, y, text, positive, color }: {
  x: number; y: number; text: string; positive: boolean; color: string
}) {
  const bg = positive
    ? `${color}20`
    : 'rgba(255,255,255,0.05)'
  const fg = positive ? color : 'rgba(255,255,255,0.45)'
  const len = text.length
  const tw  = len * 5.4 + 20
  return (
    <g>
      <rect x={x} y={y - 9} width={tw} height={17} rx={8}
        fill={bg} stroke={fg} strokeWidth={0.8} strokeOpacity={0.5}/>
      <text className="rc-panel-label" x={x + tw / 2} y={y + 3}
        textAnchor="middle" fontSize={7.5} fontWeight="600"
        fontFamily="Montserrat, sans-serif" fill={fg}>
        {text}
      </text>
    </g>
  )
}

// ── Panel type data ───────────────────────────────────────────────────────────
interface PanelType {
  name:       string
  subtitle:   string
  color:      string
  dimColor:   string
  effLabel:   string
  effPct:     number   // 0–1 for the bar
  costFilled: number   // 1–3 dots filled
  costLabel:  string
  lifespan:   string
  bestFor:    string
  pros:       string[]
  cons:       string[]
  Icon:       React.ComponentType<{ cx: number; cy: number }>
}

const PANELS: PanelType[] = [
  {
    name:       'Monocrystalline',
    subtitle:   'Single crystal silicon',
    color:      RC.green,
    dimColor:   RC.greenDim,
    effLabel:   '20–24%',
    effPct:     0.82,
    costFilled: 3,
    costLabel:  'Higher cost',
    lifespan:   '25–30+ years',
    bestFor:    'Space-constrained rooftops',
    pros:       ['Highest efficiency', 'Best low-light output', 'Longest lifespan'],
    cons:       ['Most expensive', 'Drops in high heat'],
    Icon:       IconMonoCrystal,
  },
  {
    name:       'Polycrystalline',
    subtitle:   'Multiple crystal silicon',
    color:      RC.blue,
    dimColor:   RC.blueDim,
    effLabel:   '15–18%',
    effPct:     0.60,
    costFilled: 2,
    costLabel:  'Mid-range cost',
    lifespan:   '20–25 years',
    bestFor:    'Land-abundant utility projects',
    pros:       ['Lower manufacturing cost', 'Good diffuse light performance'],
    cons:       ['Lower efficiency', 'Larger footprint per W'],
    Icon:       IconPolyCrystal,
  },
  {
    name:       'Thin-Film',
    subtitle:   'CdTe / CIGS / a-Si',
    color:      RC.amber,
    dimColor:   RC.amberDim,
    effLabel:   '10–23%',
    effPct:     0.50,
    costFilled: 1,
    costLabel:  'Lowest material cost',
    lifespan:   '20–25 years',
    bestFor:    'Flexible / building-integrated',
    pros:       ['Flexible & lightweight', 'Low material use', 'Great for BIPV'],
    cons:       ['Lower efficiency (a-Si)', 'Larger land area needed'],
    Icon:       IconThinFilm,
  },
]

// ── Public component ──────────────────────────────────────────────────────────

export interface SolarPanelTypesDiagramProps {
  title:    string
  caption?: string
}

export function SolarPanelTypesDiagram({ title, caption }: SolarPanelTypesDiagramProps) {
  const [active, setActive] = useState<number | null>(null)

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
            Crystal structure, efficiency and cost tradeoffs — tap a technology to see full specs
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.greenDim, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · Comparison
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', maxWidth: W, display: 'block', margin: '0 auto' }}
          aria-label={title}
        >
          <BlueprintFrame w={W} h={H} />

          {PANELS.map((type, col) => {
            const x         = colX(col)
            const cx        = x + PANEL_W / 2
            const { color, dimColor, Icon } = type
            const isActive  = active === col
            const isDimmed  = active !== null && !isActive

            // Section Y positions within the panel
            const nameY     = TOP_Y + 46
            const subY      = TOP_Y + 59
            const divY      = subY + 8
            const effLabelY = TOP_Y + 86
            const effBarY   = TOP_Y + 92
            const iconBoxY  = TOP_Y + 112
            const iconBoxH  = PANEL_H - (iconBoxY - TOP_Y) - 14
            const iconCY    = iconBoxY + iconBoxH / 2

            return (
              <g
                key={type.name}
                className="rc-panel-hit"
                style={{ opacity: isDimmed ? 0.32 : 1 }}
                tabIndex={0}
                role="button"
                aria-label={`Highlight ${type.name}`}
                onMouseEnter={() => setActive(col)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(col)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(active === col ? null : col)}
              >
                <g className="rc-panel-enter" style={{ '--rc-delay': `${col * 0.10}s` } as React.CSSProperties}>
                  {/* Panel card */}
                  <rect x={x} y={TOP_Y} width={PANEL_W} height={PANEL_H} rx={10}
                    fill={dimColor} stroke={isActive ? color : `${color}35`} strokeWidth={isActive ? 1.8 : 1}/>

                  {/* Top colour accent bar */}
                  <rect x={x} y={TOP_Y} width={PANEL_W} height={4} rx={2}
                    fill={color} fillOpacity={0.7}/>

                  {/* Number badge */}
                  <circle cx={x + 20} cy={TOP_Y + 20} r={13}
                    fill={color} fillOpacity={isActive ? 0.32 : 0.20} stroke={color} strokeOpacity={0.60} strokeWidth={1}/>
                  <text x={x + 20} y={TOP_Y + 21}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={13} fontWeight="700"
                    fontFamily="Montserrat, sans-serif" fill={color}>
                    {col + 1}
                  </text>

                  {/* Type name */}
                  <text className="rc-panel-label" x={cx} y={nameY}
                    textAnchor="middle" fontSize={12} fontWeight="800"
                    fontFamily="Montserrat, sans-serif" fill={color}>
                    {type.name}
                  </text>
                  <text className="rc-panel-label" x={cx} y={subY}
                    textAnchor="middle" fontSize={8}
                    fontFamily="Montserrat, sans-serif" fill={RC.white45}>
                    {type.subtitle}
                  </text>

                  {/* Divider */}
                  <line x1={x+20} y1={divY} x2={x+PANEL_W-20} y2={divY}
                    stroke={`${color}20`} strokeWidth={1}/>

                  {/* Efficiency */}
                  <text className="rc-panel-label" x={x+18} y={effLabelY}
                    fontSize={8} fontWeight="700"
                    fontFamily="Montserrat, sans-serif" fill={RC.white50}>
                    EFFICIENCY
                  </text>
                  <text className="rc-panel-label" x={x+PANEL_W-18} y={effLabelY}
                    textAnchor="end" fontSize={9} fontWeight="800"
                    fontFamily="Montserrat, sans-serif" fill={color}>
                    {type.effLabel}
                  </text>
                  <EfficiencyBar x={x+18} y={effBarY} width={PANEL_W-36} pct={type.effPct} color={color}/>

                  {/* Crystal/technology illustration area */}
                  <rect x={x+6} y={iconBoxY} width={PANEL_W-12} height={iconBoxH} rx={8}
                    fill="rgba(0,0,0,0.28)" stroke={`${color}35`} strokeWidth={0.7}/>
                  <Icon cx={cx} cy={iconCY}/>
                </g>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Detail cards — cost, lifespan, best-for and pros/cons per technology, always legible */}
      <div
        className="px-6 py-4 grid gap-3"
        style={{ borderTop: `1px solid ${RC.cardBorder}`, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
      >
        {PANELS.map((type, col) => {
          const isActive = active === col
          return (
            <div
              key={type.name}
              className="rc-detail-card rounded-lg p-3"
              style={{
                background: isActive ? rcRgba(type.color, 0.10) : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? rcRgba(type.color, 0.45) : RC.cardBorder}`,
              }}
              tabIndex={0}
              role="button"
              aria-label={`Highlight ${type.name}`}
              onMouseEnter={() => setActive(col)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(col)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active === col ? null : col)}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: rcRgba(type.color, isActive ? 0.28 : 0.16), border: `1px solid ${type.color}`, color: type.color, fontFamily: "'Montserrat', sans-serif" }}
                >
                  {String(col + 1).padStart(2, '0')}
                </span>
                <span className="text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white70, fontFamily: "'Montserrat', sans-serif" }}>
                  {type.name}
                </span>
              </div>

              <dl className="text-[11px] leading-snug space-y-1.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                <div>
                  <dt className="uppercase tracking-wide text-[9px] font-bold" style={{ color: type.color, opacity: 0.85 }}>Relative cost</dt>
                  <dd className="mt-0.5 flex items-center gap-2" style={{ color: RC.white70 }}>
                    <svg width={38} height={11} aria-hidden="true">
                      <CostDots x={5} y={5} filled={type.costFilled} color={type.color}/>
                    </svg>
                    {type.costLabel}
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide text-[9px] font-bold" style={{ color: type.color, opacity: 0.85 }}>Typical lifespan</dt>
                  <dd className="mt-0.5" style={{ color: RC.white70 }}>{type.lifespan}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide text-[9px] font-bold" style={{ color: type.color, opacity: 0.85 }}>Best for</dt>
                  <dd className="mt-0.5" style={{ color: RC.white70 }}>{type.bestFor}</dd>
                </div>
              </dl>

              <div className="mt-2.5">
                <p className="text-[9px] font-extrabold tracking-wide" style={{ color: type.color, fontFamily: "'Montserrat', sans-serif" }}>
                  ✓ ADVANTAGES
                </p>
                <ul className="text-[11px] leading-snug mt-1 space-y-0.5" style={{ color: RC.white65, fontFamily: "'Montserrat', sans-serif" }}>
                  {type.pros.map((pro) => (
                    <li key={pro}>{pro}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-2.5">
                <p className="text-[9px] font-extrabold tracking-wide" style={{ color: 'rgba(255,100,100,0.70)', fontFamily: "'Montserrat', sans-serif" }}>
                  ✕ LIMITATIONS
                </p>
                <ul className="text-[11px] leading-snug mt-1 space-y-0.5" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
                  {type.cons.map((con) => (
                    <li key={con}>{con}</li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </div>

      {caption && (
        <figcaption
          className="px-6 py-3 text-xs"
          style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white35 }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
