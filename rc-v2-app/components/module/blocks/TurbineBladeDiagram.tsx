// ─────────────────────────────────────────────────────────────────────────────
// TurbineBladeDiagram — RC Diagram Design Language v1.2
// Blade side profile + cross-section callout: length annotation (>80m),
// airfoil layers, and material badges.
//
// Ported from the Nacelle Internal Components reference build: numbered
// category-coloured callouts, blueprint grid + corner brackets, a
// data-driven legend row, staggered entrance + hover/tap highlight, and
// the mobile fix (inline SVG labels hidden below md).
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'

// ── RC Design Tokens ─────────────────────────────────────────────────────────
const RC = {
  blue:       brand.blue,
  green:      brand.green,
  greenDim:   rcRgba(brand.green, 0.15),
  amber:      brand.amber,
  white90:    'rgba(255,255,255,0.90)',
  white65:    'rgba(255,255,255,0.65)',
  white45:    'rgba(255,255,255,0.45)',
  white30:    'rgba(255,255,255,0.30)',
  white18:    'rgba(255,255,255,0.18)',
  white10:    'rgba(255,255,255,0.08)',
  white22:    'rgba(255,255,255,0.22)',
  cardBg:     'rgba(10,15,20,0.80)',
  cardBorder: 'rgba(255,255,255,0.08)',
}

// ── Category colour key (same four categories across every RC diagram) ───────
const CATEGORY_COLORS = {
  mechanical: '#94A3B8',
  electrical: '#4A9EBF',
  safety:     '#DAA520',
  structural: RC.green,
} as const

type Category = keyof typeof CATEGORY_COLORS

const CATEGORY_LABEL: Record<Category, string> = {
  mechanical: 'Mechanical',
  electrical: 'Electrical',
  safety:     'Safety',
  structural: 'Structural',
}

interface DiagramComponent {
  index: number
  text: string
  subtext?: string
  category: Category
  side: 'left' | 'right'
  labelX: number
  labelY: number
  targetX: number
  targetY: number
}

// ── Shared animation / interaction styles ─────────────────────────────────────
function DiagramStyles() {
  return (
    <style>{`
      .rc-callout-enter { opacity: 1; }
      @media (prefers-reduced-motion: no-preference) {
        .rc-callout-enter {
          opacity: 0;
          animation: rc-callout-in 0.55s cubic-bezier(0.16,1,0.3,1) both;
          animation-delay: var(--rc-delay, 0s);
        }
      }
      @keyframes rc-callout-in {
        from { opacity: 0; transform: translateY(3px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .rc-callout-hit { cursor: pointer; transition: opacity 0.18s ease; }
      .rc-legend-item { cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease; }
      .rc-legend-item:focus-visible, .rc-callout-hit:focus-visible {
        outline: 2px solid ${RC.green}; outline-offset: 2px;
      }
      @media (max-width: 767px) {
        .rc-callout-label, .rc-callout-subtext { display: none; }
        .rc-callout-chipgroup { transform-box: fill-box; transform-origin: center; transform: scale(1.6); }
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
        <pattern id="rcGridTB" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowTB" cx="46%" cy="55%" r="55%">
          <stop offset="0%" stopColor={rcRgba(brand.blue, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.blue, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridTB)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowTB)" />
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

// ── Numbered, colour-coded, interactive callout ───────────────────────────────
function Callout({
  c, active, onEnter, onLeave, onToggle,
}: {
  c: DiagramComponent
  active: number | null
  onEnter: () => void
  onLeave: () => void
  onToggle: () => void
}) {
  const color = CATEGORY_COLORS[c.category]
  const isActive  = active === c.index
  const isDimmed  = active !== null && !isActive
  const chipR = 8
  const isLeft = c.side === 'left'
  const chipX = isLeft ? c.labelX + chipR + 4 : c.labelX - chipR - 4
  const textX = isLeft ? chipX - chipR - 6 : chipX + chipR + 6
  const lineColor = isActive ? color : RC.white22

  return (
    <g
      className="rc-callout-hit"
      style={{ opacity: isDimmed ? 0.32 : 1 }}
      tabIndex={0}
      role="button"
      aria-label={`Highlight ${c.text}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onToggle}
    >
      <g className="rc-callout-enter" style={{ '--rc-delay': `${c.index * 0.07}s` } as React.CSSProperties}>
        <circle cx={chipX} cy={c.labelY - 6} r={18} fill="transparent" />

        <line x1={isLeft ? c.labelX + 2 : c.labelX - 2} y1={c.labelY - 3} x2={c.targetX} y2={c.targetY}
          stroke={lineColor} strokeWidth={isActive ? 1.6 : 1} />
        <circle cx={c.targetX} cy={c.targetY} r={isActive ? 5.5 : 4} fill="none" stroke={color} strokeWidth={isActive ? 1.6 : 1.2} opacity={0.95} />
        <circle cx={c.targetX} cy={c.targetY} r={1.5} fill={color} />

        <g className="rc-callout-chipgroup">
          <circle cx={chipX} cy={c.labelY - 6} r={chipR} fill={rcRgba(color, isActive ? 0.28 : 0.16)} stroke={color} strokeWidth={1.2} />
          <text x={chipX} y={c.labelY - 3} textAnchor="middle"
            fontSize={8} fontWeight="700" fontFamily="Montserrat, sans-serif" fill={color}>
            {String(c.index).padStart(2, '0')}
          </text>
        </g>

        <text className="rc-callout-label" x={textX} y={c.labelY} textAnchor={isLeft ? 'end' : 'start'}
          fontSize={9} fontWeight="600" fontFamily="Montserrat, sans-serif" fill={isActive ? RC.white90 : RC.white65}>
          {c.text}
        </text>
        {c.subtext && (
          <text className="rc-callout-subtext" x={textX} y={c.labelY + 11} textAnchor={isLeft ? 'end' : 'start'}
            fontSize={7.5} fontFamily="Montserrat, sans-serif" fill={RC.white45}>
            {c.subtext}
          </text>
        )}
      </g>
    </g>
  )
}

// ── Geometry + the single source of truth for callouts ───────────────────────
const ROOT_X = 80
const TIP_X  = 680
const BY     = 120
const ROOT_H = 44
const TIP_H  = 4
const XS_CX  = 370
const XS_CY  = 285
const XS_R   = 70
const VW = 800
const VH = 480

const COMPONENTS: DiagramComponent[] = [
  { index: 1, text: 'Leading Edge',       subtext: 'Fiberglass / carbon fibre', category: 'structural', side: 'left',  labelX: XS_CX - XS_R - 14, labelY: XS_CY - 12, targetX: XS_CX - 58, targetY: XS_CY },
  { index: 2, text: 'Balsa / Foam Core',  subtext: 'Lightweight infill',        category: 'mechanical', side: 'left',  labelX: XS_CX - XS_R - 14, labelY: XS_CY + 24, targetX: XS_CX - 32, targetY: XS_CY + 14 },
  { index: 3, text: 'Structural Spar',    subtext: 'Main load-bearing beam',    category: 'structural', side: 'right', labelX: XS_CX + XS_R + 14, labelY: XS_CY - 12, targetX: XS_CX, targetY: XS_CY - 22 },
  { index: 4, text: 'Trailing Edge',      subtext: 'Aerodynamic profile',       category: 'mechanical', side: 'right', labelX: XS_CX + XS_R + 14, labelY: XS_CY + 24, targetX: XS_CX + 58, targetY: XS_CY },
]

// ── Main SVG ──────────────────────────────────────────────────────────────────
function BladeSVG({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      width="100%"
      style={{ maxWidth: 800, minWidth: 280 }}
      aria-label="Offshore wind turbine blade diagram"
    >
      <BlueprintFrame w={VW} h={VH} />

      <defs>
        <linearGradient id="bladeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(130,188,0,0.70)" />
          <stop offset="100%" stopColor="rgba(74,158,191,0.25)" />
        </linearGradient>
        <linearGradient id="xsGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(74,158,191,0.25)" />
          <stop offset="100%" stopColor="rgba(10,20,35,0.60)" />
        </linearGradient>
        <clipPath id="xsClip">
          <circle cx={XS_CX} cy={XS_CY} r={XS_R - 1} />
        </clipPath>
      </defs>

      <path
        d={`M${ROOT_X} ${BY - ROOT_H / 2}
            C${ROOT_X + 80} ${BY - ROOT_H / 2 - 8},
             ${TIP_X - 120} ${BY - TIP_H / 2 - 2},
             ${TIP_X} ${BY}
            C${TIP_X - 120} ${BY + TIP_H / 2 + 2},
             ${ROOT_X + 80} ${BY + ROOT_H / 2 + 8},
             ${ROOT_X} ${BY + ROOT_H / 2} Z`}
        fill="url(#bladeGrad)"
        stroke="rgba(130,188,0,0.60)"
        strokeWidth={1.5}
      />

      <path
        d={`M${ROOT_X + 30} ${BY - ROOT_H / 2 + 8}
            C${ROOT_X + 100} ${BY - 14},
             ${TIP_X - 100} ${BY - 2},
             ${TIP_X - 10} ${BY}`}
        fill="none" stroke="rgba(218,165,32,0.45)" strokeWidth={2} strokeDasharray="6 4"
      />
      <path
        d={`M${ROOT_X + 30} ${BY + ROOT_H / 2 - 8}
            C${ROOT_X + 100} ${BY + 14},
             ${TIP_X - 100} ${BY + 2},
             ${TIP_X - 10} ${BY}`}
        fill="none" stroke="rgba(218,165,32,0.45)" strokeWidth={2} strokeDasharray="6 4"
      />

      <ellipse cx={ROOT_X} cy={BY} rx={6} ry={ROOT_H / 2}
        fill="rgba(150,165,180,0.80)" stroke="rgba(200,215,230,0.55)" strokeWidth={1.5} />

      <line x1={ROOT_X} y1={BY - ROOT_H / 2 - 20} x2={TIP_X} y2={BY - ROOT_H / 2 - 20}
        stroke={RC.blue} strokeWidth={1} />
      <line x1={ROOT_X} y1={BY - ROOT_H / 2 - 26} x2={ROOT_X} y2={BY - ROOT_H / 2 - 14}
        stroke={RC.blue} strokeWidth={1} />
      <line x1={TIP_X} y1={BY - ROOT_H / 2 - 26} x2={TIP_X} y2={BY - ROOT_H / 2 - 14}
        stroke={RC.blue} strokeWidth={1} />
      <text x={(ROOT_X + TIP_X) / 2} y={BY - ROOT_H / 2 - 26} textAnchor="middle"
        fontSize={11} fontWeight="700" fontFamily="Montserrat, sans-serif"
        fill={RC.blue}>
        &gt;80 metres
      </text>

      <line
        x1={XS_CX} y1={BY + ROOT_H / 4}
        x2={XS_CX} y2={XS_CY - XS_R}
        stroke={RC.white30} strokeWidth={1} strokeDasharray="4 4"
      />
      <circle cx={XS_CX} cy={BY} r={5} fill={RC.blue} opacity={0.7} />

      <circle cx={XS_CX} cy={XS_CY} r={XS_R}
        fill="rgba(10,20,35,0.85)" stroke={RC.blue} strokeWidth={1.5} />

      <g clipPath="url(#xsClip)">
        <ellipse cx={XS_CX} cy={XS_CY} rx={62} ry={30}
          fill="rgba(74,158,191,0.18)" stroke={RC.blue} strokeWidth={2} />
        <rect x={XS_CX - 5} y={XS_CY - 28} width={10} height={56}
          rx={2} fill="rgba(218,165,32,0.40)" stroke="rgba(218,165,32,0.80)" strokeWidth={1.2} />
        <rect x={XS_CX - 62 + 4} y={XS_CY - 24} width={48} height={48}
          rx={4} fill="rgba(130,188,0,0.12)" stroke="rgba(130,188,0,0.30)" strokeWidth={0.8} />
        <rect x={XS_CX + 10} y={XS_CY - 24} width={48} height={48}
          rx={4} fill="rgba(130,188,0,0.12)" stroke="rgba(130,188,0,0.30)" strokeWidth={0.8} />
        <circle cx={XS_CX - 62} cy={XS_CY} r={10}
          fill="rgba(74,158,191,0.35)" stroke={RC.blue} strokeWidth={1.5} />
        <circle cx={XS_CX + 62} cy={XS_CY} r={4}
          fill="rgba(255,255,255,0.20)" stroke="rgba(255,255,255,0.40)" strokeWidth={1} />
      </g>

      <text x={XS_CX} y={XS_CY - XS_R - 8} textAnchor="middle"
        fontSize={8} fontWeight="600" fontFamily="Montserrat, sans-serif"
        fill={RC.blue} opacity={0.80}>
        Cross-Section A–A
      </text>

      {[
        { x: 80,  label: 'Composite Materials',    sub: 'Fiberglass + carbon fibre', color: RC.blue },
        { x: 310, label: 'Anti-Corrosion Coating', sub: 'For offshore environment',  color: RC.green },
        { x: 540, label: 'Aerodynamic Profile',    sub: 'Airfoil cross-section',     color: RC.amber },
      ].map(({ x, label, sub, color }) => (
        <g key={label}>
          <rect x={x} y={410} width={200} height={52} rx={8}
            fill="rgba(255,255,255,0.04)" stroke={color} strokeWidth={1} opacity={0.90} />
          <text x={x + 100} y={432} textAnchor="middle"
            fontSize={9} fontWeight="700" fontFamily="Montserrat, sans-serif"
            fill={color}>
            {label}
          </text>
          <text x={x + 100} y={448} textAnchor="middle"
            fontSize={8} fontFamily="Montserrat, sans-serif"
            fill={RC.white45}>
            {sub}
          </text>
        </g>
      ))}

      {COMPONENTS.map((c) => (
        <Callout
          key={c.index}
          c={c}
          active={active}
          onEnter={() => setActive(c.index)}
          onLeave={() => setActive(null)}
          onToggle={() => setActive(active === c.index ? null : c.index)}
        />
      ))}
    </svg>
  )
}

// ── Legend row ─────────────────────────────────────────────────────────────
function Legend({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  return (
    <div
      className="px-6 py-4 flex flex-wrap gap-x-6 gap-y-2"
      style={{ borderTop: `1px solid ${RC.cardBorder}` }}
    >
      {COMPONENTS.map((c) => {
        const color = CATEGORY_COLORS[c.category]
        const isActive = active === c.index
        return (
          <div
            key={c.index}
            className="rc-legend-item flex items-center gap-2 min-w-[160px] rounded-md px-1.5 py-1 -mx-1.5"
            style={{
              background: isActive ? rcRgba(color, 0.10) : 'transparent',
              border: `1px solid ${isActive ? rcRgba(color, 0.35) : 'transparent'}`,
            }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${c.text}`}
            onMouseEnter={() => setActive(c.index)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(c.index)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === c.index ? null : c.index)}
          >
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
              style={{ background: rcRgba(color, isActive ? 0.28 : 0.16), border: `1px solid ${color}`, color, fontFamily: "'Montserrat', sans-serif" }}
            >
              {String(c.index).padStart(2, '0')}
            </span>
            <span className="text-xs" style={{ color: isActive ? RC.white90 : RC.white65, fontFamily: "'Montserrat', sans-serif" }}>
              {c.text}
            </span>
          </div>
        )
      })}
      <div className="basis-full h-0" />
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1">
        {(Object.keys(CATEGORY_COLORS) as Category[]).map((cat) => (
          <div key={cat} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[cat] }} />
            <span className="text-[10px] uppercase tracking-wide" style={{ color: RC.white30, fontFamily: "'Montserrat', sans-serif" }}>
              {CATEGORY_LABEL[cat]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────
export function TurbineBladeDiagram() {
  const [active, setActive] = useState<number | null>(null)

  return (
    <figure
      className="mb-8 rounded-xl overflow-hidden"
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
            Offshore Wind Turbine Blade Design
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
            Composite structure, airfoil cross-section — tap a part below to highlight it
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.greenDim, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · 01–04
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <BladeSVG active={active} setActive={setActive} />
      </div>

      {/* Legend / index */}
      <Legend active={active} setActive={setActive} />

      {/* Caption */}
      <figcaption
        className="px-6 py-3 text-xs"
        style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white30 }}
      >
        Offshore wind turbine blade design: composite materials, aerodynamic profile, and anti-corrosion coatings
      </figcaption>
    </figure>
  )
}
