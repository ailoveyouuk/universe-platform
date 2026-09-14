// ─────────────────────────────────────────────────────────────────────────────
// HydrogenColoursDiagram — RC Diagram Design Language v1.2 (comparison-panel variant, dense)
//
// Seven-column comparison showing the hydrogen colour spectrum:
//   Green · Yellow · Pink · Blue · Turquoise · Grey · Brown
//
// Ported onto the standard RC card shell: BlueprintFrame, numbered/interactive
// panels, staggered entrance, hover/tap/focus highlight with sibling-dimming.
// Each column keeps the colour circle, name, source icon and carbon-intensity
// bar in the SVG (these are graphics, not prose — they read fine at any
// size). The source label stays in the SVG too but is hidden below 767px via
// `.rc-panel-label` — the full production method, source and carbon-intensity
// detail (previously tiny hand-wrapped SVG text at the bottom of each column,
// the same mobile-legibility problem as the other dense comparison diagrams)
// now lives in real HTML `.rc-detail-card`s below the diagram: always legible
// at any viewport, synced to the same hover/tap highlight as the SVG panel.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'

// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:      brand.green,
  white90:    'rgba(255,255,255,0.90)',
  white70:    'rgba(255,255,255,0.70)',
  white65:    'rgba(255,255,255,0.65)',
  white50:    'rgba(255,255,255,0.50)',
  white45:    'rgba(255,255,255,0.45)',
  white35:    'rgba(255,255,255,0.35)',
  white30:    'rgba(255,255,255,0.30)',
  white20:    'rgba(255,255,255,0.20)',
  white18:    'rgba(255,255,255,0.18)',
  white12:    'rgba(255,255,255,0.12)',
  white10:    'rgba(255,255,255,0.10)',
  white08:    'rgba(255,255,255,0.08)',
  cardBg:     'rgba(10,15,20,0.85)',
  cardBorder: 'rgba(255,255,255,0.08)',
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
        <pattern id="rcGridHC" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowHC" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridHC)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowHC)" />
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
const W   = 940
const H   = 290
const PAD = 14
const COL_W   = 118
const COL_GAP = 6
const COL_Y   = 20
const PANEL_H = 239

function colX(i: number): number {
  return PAD + i * (COL_W + COL_GAP)
}

// ── Colour data ───────────────────────────────────────────────────────────────

interface HColour {
  num:     number
  name:    string
  hex:     string
  dim:     string
  mid:     string
  ciLevel: number   // 0 = zero carbon … 4 = very high
  ciLabel: string
  source:  string    // '\n'-separated short source line(s), shown in SVG
  method:  string    // full production method sentence, shown in the detail card
  icon:    string
}

const colours: HColour[] = [
  {
    num:      1,
    name:     'Green',
    hex:      '#82BC00',
    dim:      'rgba(130,188,0,0.14)',
    mid:      'rgba(130,188,0,0.40)',
    ciLevel:  0,
    ciLabel:  'Zero carbon',
    source:   'Renewable\nelectricity',
    method:   'Electrolysis powered by wind, solar, or hydro — no CO₂ emissions',
    icon:     'renewable',
  },
  {
    num:      2,
    name:     'Yellow',
    hex:      '#F5C518',
    dim:      'rgba(245,197,24,0.14)',
    mid:      'rgba(245,197,24,0.40)',
    ciLevel:  1,
    ciLabel:  'Varies (grid mix)',
    source:   'Solar or\nmixed grid',
    method:   'Electrolysis powered by solar PV or the general electricity grid',
    icon:     'solar',
  },
  {
    num:      3,
    name:     'Pink',
    hex:      '#E86B8A',
    dim:      'rgba(232,107,138,0.14)',
    mid:      'rgba(232,107,138,0.40)',
    ciLevel:  1,
    ciLabel:  'Very low carbon',
    source:   'Nuclear\nelectricity',
    method:   'Electrolysis powered by nuclear electricity — reliable, low-carbon baseload',
    icon:     'nuclear',
  },
  {
    num:      4,
    name:     'Blue',
    hex:      '#4A9EBF',
    dim:      'rgba(74,158,191,0.14)',
    mid:      'rgba(74,158,191,0.40)',
    ciLevel:  2,
    ciLabel:  'Low–medium CO₂',
    source:   'Natural gas\n+ CCS',
    method:   'SMR or ATR from natural gas with carbon capture — 85–95% CO₂ captured',
    icon:     'gas',
  },
  {
    num:      5,
    name:     'Turquoise',
    hex:      '#00ACC1',
    dim:      'rgba(0,172,193,0.14)',
    mid:      'rgba(0,172,193,0.40)',
    ciLevel:  1,
    ciLabel:  'Low carbon',
    source:   'Natural gas\n(pyrolysis)',
    method:   'Methane pyrolysis: CH₄ → H₂ + solid carbon (not CO₂). Carbon stored or used',
    icon:     'pyrolysis',
  },
  {
    num:      6,
    name:     'Grey',
    hex:      '#78909C',
    dim:      'rgba(120,144,156,0.14)',
    mid:      'rgba(120,144,156,0.40)',
    ciLevel:  3,
    ciLabel:  '9–12 kg CO₂/kg H₂',
    source:   'Natural gas\n(no CCS)',
    method:   'Steam methane reforming (SMR) without carbon capture — ~48% of global supply',
    icon:     'gas',
  },
  {
    num:      7,
    name:     'Brown',
    hex:      '#8D6E63',
    dim:      'rgba(141,110,99,0.14)',
    mid:      'rgba(141,110,99,0.40)',
    ciLevel:  4,
    ciLabel:  '19–24 kg CO₂/kg H₂',
    source:   'Coal or\nbiomass',
    method:   'Coal gasification without CCS — highest carbon intensity. Dominant in China',
    icon:     'coal',
  },
]

// ── Source Icons (inline SVG groups) ─────────────────────────────────────────
// Each icon rendered centered at (cx, cy) with size ~40×40

function IconRenewable({ cx, cy, col }: { cx: number; cy: number; col: string }) {
  // Simplified wind turbine silhouette
  return (
    <g>
      {/* Tower */}
      <rect x={cx - 2.5} y={cy - 14} width={5} height={26} rx={1.5}
        fill={col} fillOpacity={0.70} />
      {/* Hub */}
      <circle cx={cx} cy={cy - 14} r={4} fill={col} fillOpacity={0.85} />
      {/* 3 blades */}
      {[0, 120, 240].map((deg, i) => {
        const rad = (deg - 90) * Math.PI / 180
        const bx  = cx + Math.cos(rad) * 18
        const by  = cy - 14 + Math.sin(rad) * 18
        return (
          <line key={i}
            x1={cx} y1={cy - 14} x2={bx} y2={by}
            stroke={col} strokeWidth={3} strokeLinecap="round" strokeOpacity={0.70} />
        )
      })}
    </g>
  )
}

function IconSolar({ cx, cy, col }: { cx: number; cy: number; col: string }) {
  // Simple solar panel grid
  const pw = 34; const ph = 26
  return (
    <g>
      <rect x={cx - pw / 2} y={cy - ph / 2} width={pw} height={ph} rx={2}
        fill={col} fillOpacity={0.18} stroke={col} strokeWidth={1.2} strokeOpacity={0.60} />
      {/* Grid lines */}
      {[-8, 0, 8].map((dx) => (
        <line key={dx} x1={cx + dx} y1={cy - ph / 2} x2={cx + dx} y2={cy + ph / 2}
          stroke={col} strokeWidth={0.8} strokeOpacity={0.40} />
      ))}
      <line x1={cx - pw / 2} y1={cy} x2={cx + pw / 2} y2={cy}
        stroke={col} strokeWidth={0.8} strokeOpacity={0.40} />
      {/* Sun */}
      <circle cx={cx + 22} cy={cy - 20} r={5} fill={col} fillOpacity={0.80} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const r = deg * Math.PI / 180
        return (
          <line key={deg}
            x1={cx + 22 + Math.cos(r) * 7} y1={cy - 20 + Math.sin(r) * 7}
            x2={cx + 22 + Math.cos(r) * 10} y2={cy - 20 + Math.sin(r) * 10}
            stroke={col} strokeWidth={1} strokeOpacity={0.60} />
        )
      })}
    </g>
  )
}

function IconNuclear({ cx, cy, col }: { cx: number; cy: number; col: string }) {
  // Atom symbol — nucleus + 2 elliptical orbits
  return (
    <g>
      {/* Nucleus */}
      <circle cx={cx} cy={cy} r={5} fill={col} fillOpacity={0.80} />
      {/* Orbit 1 (horizontal ellipse) */}
      <ellipse cx={cx} cy={cy} rx={20} ry={8}
        fill="none" stroke={col} strokeWidth={1.3} strokeOpacity={0.55} />
      {/* Orbit 2 (tilted 60°) */}
      <ellipse cx={cx} cy={cy} rx={20} ry={8}
        fill="none" stroke={col} strokeWidth={1.3} strokeOpacity={0.55}
        transform={`rotate(60, ${cx}, ${cy})`} />
      {/* Orbit 3 (tilted -60°) */}
      <ellipse cx={cx} cy={cy} rx={20} ry={8}
        fill="none" stroke={col} strokeWidth={1.3} strokeOpacity={0.55}
        transform={`rotate(-60, ${cx}, ${cy})`} />
    </g>
  )
}

function IconGas({ cx, cy, col }: { cx: number; cy: number; col: string }) {
  // Oil pump / derrick silhouette
  return (
    <g>
      {/* Derrick frame */}
      <polygon
        points={`${cx},${cy - 22} ${cx - 16},${cy + 10} ${cx + 16},${cy + 10}`}
        fill="none" stroke={col} strokeWidth={1.5} strokeOpacity={0.65} />
      {/* Cross beam */}
      <line x1={cx - 12} y1={cy - 4} x2={cx + 12} y2={cy - 4}
        stroke={col} strokeWidth={1.5} strokeOpacity={0.55} />
      {/* Center line */}
      <line x1={cx} y1={cy - 22} x2={cx} y2={cy + 10}
        stroke={col} strokeWidth={1} strokeOpacity={0.45} />
      {/* Base */}
      <line x1={cx - 18} y1={cy + 10} x2={cx + 18} y2={cy + 10}
        stroke={col} strokeWidth={2} strokeOpacity={0.65} />
    </g>
  )
}

function IconPyrolysis({ cx, cy, col }: { cx: number; cy: number; col: string }) {
  // Molecule: CH₄ → H₂ + C  (methane breaking apart)
  // Show CH4 on left, arrow, H2 + C block on right
  return (
    <g>
      {/* CH₄ molecule */}
      <circle cx={cx - 16} cy={cy} r={8} fill={col} fillOpacity={0.20} stroke={col} strokeWidth={1.2} strokeOpacity={0.55} />
      <text x={cx - 16} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize={7} fontWeight="700" fontFamily="Inter, system-ui, sans-serif" fill={col} fillOpacity={0.80}>
        CH₄
      </text>
      {/* Arrow */}
      <line x1={cx - 4} y1={cy} x2={cx + 4} y2={cy}
        stroke={col} strokeWidth={1.5} strokeOpacity={0.60} />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fontSize={8} fontFamily="Inter, system-ui, sans-serif" fill={col} fillOpacity={0.60}>
        →
      </text>
      {/* H₂ */}
      <circle cx={cx + 14} cy={cy - 7} r={6} fill={col} fillOpacity={0.25} stroke={col} strokeWidth={1.2} strokeOpacity={0.55} />
      <text x={cx + 14} y={cy - 6} textAnchor="middle" dominantBaseline="middle"
        fontSize={6.5} fontWeight="700" fontFamily="Inter, system-ui, sans-serif" fill={col} fillOpacity={0.80}>
        H₂
      </text>
      {/* Solid C */}
      <rect x={cx + 8} y={cy + 3} width={12} height={10} rx={2}
        fill={col} fillOpacity={0.25} stroke={col} strokeWidth={1} strokeOpacity={0.55} />
      <text x={cx + 14} y={cy + 8} textAnchor="middle" dominantBaseline="middle"
        fontSize={6.5} fontWeight="700" fontFamily="Inter, system-ui, sans-serif" fill={col} fillOpacity={0.80}>
        C(s)
      </text>
    </g>
  )
}

function IconCoal({ cx, cy, col }: { cx: number; cy: number; col: string }) {
  // Coal lump + smoke / CO₂ above
  return (
    <g>
      {/* Coal lump */}
      <ellipse cx={cx} cy={cy + 8} rx={16} ry={10}
        fill={col} fillOpacity={0.30} stroke={col} strokeWidth={1.2} strokeOpacity={0.60} />
      <text x={cx} y={cy + 9} textAnchor="middle" dominantBaseline="middle"
        fontSize={7} fontFamily="Inter, system-ui, sans-serif" fill={col} fillOpacity={0.75}>
        COAL
      </text>
      {/* CO₂ smoke puffs */}
      {[-10, 0, 10].map((dx, i) => (
        <text key={i} x={cx + dx} y={cy - 2 - i * 7}
          textAnchor="middle" fontSize={8}
          fontFamily="Inter, system-ui, sans-serif" fill={col} fillOpacity={0.45}>
          〜
        </text>
      ))}
    </g>
  )
}

const iconMap: Record<string, (props: { cx: number; cy: number; col: string }) => JSX.Element> = {
  renewable: IconRenewable,
  solar:     IconSolar,
  nuclear:   IconNuclear,
  gas:       IconGas,
  pyrolysis: IconPyrolysis,
  coal:      IconCoal,
}

// ── CI bar colours ─────────────────────────────────────────────────────────────
// ciLevel 0=zero, 1=very low, 2=low-medium, 3=high, 4=very high
const ciColours = [
  '#82BC00',     // 0 — green
  '#A8D500',     // 1 — light green
  '#F5C518',     // 2 — amber
  '#E8832A',     // 3 — orange
  '#E05252',     // 4 — red
]

// ── Utility: wrap text ─────────────────────────────────────────────────────────
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (test.length > maxChars && current.length > 0) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

// ── Single colour column ──────────────────────────────────────────────────────
function ColourColumn({ col, c, isActive }: { col: number; c: HColour; isActive: boolean }) {
  const cx = colX(col)
  const IconComp = iconMap[c.icon]
  const sourceLines = c.source.split('\n')
  const midX = cx + COL_W / 2

  return (
    <g>
      {/* Column background */}
      <rect x={cx} y={COL_Y} width={COL_W} height={PANEL_H} rx={8}
        fill={c.dim} stroke={isActive ? c.hex : c.mid} strokeWidth={isActive ? 1.8 : 1.2} />

      {/* Colour circle */}
      <circle cx={midX} cy={COL_Y + 32} r={24}
        fill={c.hex} fillOpacity={0.88} />
      {/* Inner highlight */}
      <circle cx={midX - 7} cy={COL_Y + 24} r={6}
        fill="white" fillOpacity={0.18} />

      {/* Colour name */}
      <text x={midX} y={COL_Y + 75}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={13} fontWeight="800"
        fontFamily="Inter, system-ui, sans-serif" fill={c.hex}>
        {c.name}
      </text>

      {/* Source icon */}
      <IconComp cx={midX} cy={COL_Y + 115} col={c.hex} />

      {/* Separator */}
      <line x1={cx + 8} y1={COL_Y + 142} x2={cx + COL_W - 8} y2={COL_Y + 142}
        stroke={c.mid} strokeWidth={0.8} strokeOpacity={0.50} />

      {/* Source label — short, but hidden on mobile; HTML detail card carries it there */}
      {sourceLines.map((ln, li) => (
        <text key={li} className="rc-panel-label"
          x={midX} y={COL_Y + 154 + li * 12}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={8.5} fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif" fill={c.hex} fillOpacity={0.90}>
          {ln}
        </text>
      ))}

      {/* CI badge */}
      <rect x={cx + 8} y={COL_Y + 184} width={COL_W - 16} height={24} rx={5}
        fill={ciColours[c.ciLevel]} fillOpacity={0.20}
        stroke={ciColours[c.ciLevel]} strokeWidth={0.8} strokeOpacity={0.50} />
      {wrapText(c.ciLabel, 14).map((ln, li) => (
        <text key={li} className="rc-panel-label"
          x={midX} y={COL_Y + 194 + li * 11}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={7.5} fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
          fill={ciColours[c.ciLevel]} fillOpacity={0.90}>
          {ln}
        </text>
      ))}

      {/* CI bar */}
      <rect x={cx + 8} y={COL_Y + 218} width={COL_W - 16} height={7} rx={3.5}
        fill={RC.white12} />
      <rect x={cx + 8} y={COL_Y + 218}
        width={Math.max((COL_W - 16) * (c.ciLevel / 4), 7)}
        height={7} rx={3.5}
        fill={ciColours[c.ciLevel]} fillOpacity={0.75} />

      {/* Number badge — echoes the family's numbered-panel convention */}
      <circle cx={cx + COL_W - 16} cy={COL_Y + PANEL_H - 16} r={9}
        fill={c.hex} fillOpacity={isActive ? 0.30 : 0.16} stroke={c.hex} strokeOpacity={0.60} strokeWidth={1} />
      <text x={cx + COL_W - 16} y={COL_Y + PANEL_H - 13}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={8} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={c.hex}>
        {String(c.num).padStart(2, '0')}
      </text>
    </g>
  )
}

// ── Full diagram SVG ──────────────────────────────────────────────────────────
function HydrogenColoursSVG({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: W, minWidth: 360, display: 'block' }}
      aria-label="The hydrogen colour spectrum, categorised by production method"
    >
      <BlueprintFrame w={W} h={H} />

      {colours.map((c, i) => {
        const isActive = active === c.num
        const isDimmed = active !== null && !isActive
        return (
          <g
            key={c.name}
            className="rc-panel-hit"
            style={{ opacity: isDimmed ? 0.32 : 1 }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${c.name} hydrogen`}
            onMouseEnter={() => setActive(c.num)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(c.num)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === c.num ? null : c.num)}
          >
            <g className="rc-panel-enter" style={{ '--rc-delay': `${i * 0.06}s` } as React.CSSProperties}>
              <ColourColumn col={i} c={c} isActive={isActive} />
            </g>
          </g>
        )
      })}

      {/* Axis annotation */}
      <text x={PAD} y={H - 10}
        fontSize={8} fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}>
        ← Lower carbon intensity
      </text>
      <text x={W - PAD} y={H - 10} textAnchor="end"
        fontSize={8} fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}>
        Higher carbon intensity →
      </text>
    </svg>
  )
}

// ── Detail cards — source / method / carbon intensity, always legible ─────────
function DetailCards({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  return (
    <div
      className="px-6 py-4 grid gap-3"
      style={{ borderTop: `1px solid ${RC.cardBorder}`, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}
    >
      {colours.map((c) => {
        const isActive = active === c.num
        return (
          <div
            key={c.name}
            className="rc-detail-card rounded-lg p-3"
            style={{
              background: isActive ? rcRgba(c.hex, 0.10) : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isActive ? rcRgba(c.hex, 0.45) : RC.cardBorder}`,
            }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${c.name} hydrogen`}
            onMouseEnter={() => setActive(c.num)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(c.num)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === c.num ? null : c.num)}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: rcRgba(c.hex, isActive ? 0.28 : 0.16), border: `1px solid ${c.hex}`, color: c.hex, fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                {String(c.num).padStart(2, '0')}
              </span>
              <span className="text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white65, fontFamily: 'Inter, system-ui, sans-serif' }}>
                {c.name} hydrogen
              </span>
            </div>
            <dl className="text-[11px] leading-snug space-y-1.5" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              {[
                { lbl: 'Source',           val: c.source.replace('\n', ' ') },
                { lbl: 'Production method', val: c.method },
                { lbl: 'Carbon intensity', val: c.ciLabel },
              ].map((row) => (
                <div key={row.lbl}>
                  <dt className="uppercase tracking-wide text-[9px] font-bold" style={{ color: c.hex, opacity: 0.85 }}>{row.lbl}</dt>
                  <dd className="mt-0.5" style={{ color: RC.white65 }}>{row.val}</dd>
                </div>
              ))}
            </dl>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function HydrogenColoursDiagram({
  title   = 'The Hydrogen Colour Spectrum',
  caption,
}: {
  title?: string
  caption?: string
}) {
  const [active, setActive] = useState<number | null>(null)

  return (
    <figure
      className="my-8 w-full rounded-xl overflow-hidden"
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
        <h3
          className="font-heading font-bold text-base leading-snug flex-1"
          style={{ color: RC.white90, fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          {title}
        </h3>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: rcRgba(brand.green, 0.15), color: RC.green, fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          RC Diagram · Comparison
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <HydrogenColoursSVG active={active} setActive={setActive} />
      </div>

      {/* Detail cards */}
      <DetailCards active={active} setActive={setActive} />

      {/* Caption */}
      {caption && (
        <figcaption
          className="px-6 py-3 text-xs"
          style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white50 }}
        >
          {caption}
        </figcaption>
      )}

      {/* Source note */}
      <p style={{
        color:      RC.white30,
        fontSize:   10,
        margin:     0,
        padding:    '10px 24px',
        textAlign:  'center',
        fontFamily: 'Inter, system-ui, sans-serif',
        borderTop:  `1px solid ${RC.cardBorder}`,
      }}>
        Source: IEA Global Hydrogen Review 2023; IRENA Green Hydrogen Cost Reduction 2024
      </p>
    </figure>
  )
}
