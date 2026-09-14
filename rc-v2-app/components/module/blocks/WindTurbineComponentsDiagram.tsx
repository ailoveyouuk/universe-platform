// ─────────────────────────────────────────────────────────────────────────────
// WindTurbineComponentsDiagram — RC Diagram Design Language v1.2
// Labeled silhouette of a fixed offshore wind turbine showing all
// principal components from blade tip to monopile foundation.
//
// Ported from the Nacelle Internal Components diagram's reference build:
// numbered category-coloured callouts, blueprint grid + corner brackets,
// a data-driven legend row, staggered entrance + hover/tap highlight, and
// the mobile fix (inline SVG labels hidden below md — the legend is the
// legible reading surface there; see DiagramStyles below).
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'

// ── RC Design Tokens ─────────────────────────────────────────────────────────
const RC = {
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
        <pattern id="rcGridTC" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowTC" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridTC)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowTC)" />
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
  const lineStartX = isLeft ? c.labelX - 4 : c.labelX + 4
  const elbowX = isLeft ? c.targetX - 16 : c.targetX + 16
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
      <g className="rc-callout-enter" style={{ '--rc-delay': `${c.index * 0.05}s` } as React.CSSProperties}>
        <circle cx={chipX} cy={c.labelY - 6} r={18} fill="transparent" />

        <polyline
          points={`${lineStartX},${c.labelY - 3} ${elbowX},${c.labelY - 3} ${c.targetX},${c.targetY}`}
          fill="none" stroke={lineColor} strokeWidth={isActive ? 1.6 : 1} strokeLinejoin="round" />
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
          <text className="rc-callout-subtext" x={textX} y={c.labelY + 10} textAnchor={isLeft ? 'end' : 'start'}
            fontSize={7.5} fontFamily="Montserrat, sans-serif" fill={RC.white45}>
            {c.subtext}
          </text>
        )}
      </g>
    </g>
  )
}

// ── Main diagram SVG ──────────────────────────────────────────────────────────
const CX        = 400
const HUB_Y     = 168
const BLADE_LEN = 100
const NACELLE_X = CX
const NACELLE_W = 68
const NACELLE_H = 24
const NACELLE_Y = HUB_Y - NACELLE_H / 2
const TOWER_TOP = NACELLE_Y + NACELLE_H
const WATER_Y   = 390
const SEABED_Y  = 440
const TOWER_BOT = WATER_Y - 5
const TOWER_W   = 14
const MONO_W    = 18
const VW = 800
const VH = 540

const COMPONENTS: DiagramComponent[] = [
  { index: 1,  text: 'Rotor Blades',       subtext: 'GFRP / carbon fibre',    category: 'mechanical', side: 'left',  labelX: 158, labelY: 78,  targetX: CX - 28, targetY: HUB_Y - 62 },
  { index: 2,  text: 'Low Speed Shaft',    subtext: undefined,                category: 'mechanical', side: 'left',  labelX: 158, labelY: 164, targetX: CX + 5, targetY: HUB_Y },
  { index: 3,  text: 'Rotor Hub',          subtext: 'Blade Pitch System',     category: 'safety',     side: 'left',  labelX: 158, labelY: 192, targetX: CX - 8, targetY: HUB_Y + 4 },
  { index: 4,  text: 'Yaw System',         subtext: undefined,                category: 'structural', side: 'left',  labelX: 158, labelY: 230, targetX: CX - TOWER_W / 2 - 2, targetY: TOWER_TOP + 18 },
  { index: 5,  text: 'Tower',              subtext: 'steel, 100m+',           category: 'structural', side: 'left',  labelX: 158, labelY: 310, targetX: CX - TOWER_W / 2 - 2, targetY: 310 },
  { index: 6,  text: 'Transition Piece',   subtext: undefined,                category: 'structural', side: 'left',  labelX: 158, labelY: 370, targetX: CX - MONO_W / 2 - 6, targetY: TOWER_BOT - 10 },
  { index: 7,  text: 'Foundation (Monopile)', subtext: 'driven into seabed',  category: 'structural', side: 'left',  labelX: 158, labelY: 420, targetX: CX - MONO_W / 2, targetY: WATER_Y + 35 },
  { index: 8,  text: 'Anemometer',         subtext: '& Wind Vane',            category: 'electrical', side: 'right', labelX: 466, labelY: 128, targetX: NACELLE_X + NACELLE_W - 10, targetY: NACELLE_Y - 18 },
  { index: 9,  text: 'Electrical Control', subtext: undefined,                category: 'electrical', side: 'right', labelX: 466, labelY: 162, targetX: NACELLE_X + NACELLE_W - 5, targetY: NACELLE_Y + 8 },
  { index: 10, text: 'Main Bearings',      subtext: '& Gearbox',              category: 'mechanical', side: 'right', labelX: 466, labelY: 185, targetX: CX + 20, targetY: HUB_Y - 2 },
  { index: 11, text: 'Generator',          subtext: undefined,                category: 'electrical', side: 'right', labelX: 466, labelY: 215, targetX: NACELLE_X + 40, targetY: NACELLE_Y + NACELLE_H / 2 },
  { index: 12, text: 'High Speed Shaft',   subtext: undefined,                category: 'mechanical', side: 'right', labelX: 466, labelY: 238, targetX: NACELLE_X + 25, targetY: NACELLE_Y + NACELLE_H - 4 },
  { index: 13, text: 'Nacelle',            subtext: undefined,                category: 'structural', side: 'right', labelX: 466, labelY: 262, targetX: NACELLE_X + NACELLE_W, targetY: NACELLE_Y + NACELLE_H - 2 },
  { index: 14, text: 'Power Cable',        subtext: undefined,                category: 'electrical', side: 'right', labelX: 466, labelY: 320, targetX: CX + TOWER_W / 2, targetY: 330 },
  { index: 15, text: 'To Grid',            subtext: 'via export cable',       category: 'electrical', side: 'right', labelX: 466, labelY: 462, targetX: CX + MONO_W / 2, targetY: SEABED_Y - 10 },
]

function TurbineComponentsSVG({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      width="100%"
      style={{ maxWidth: 800, minWidth: 280 }}
      aria-label="Wind turbine components diagram"
    >
      <BlueprintFrame w={VW} h={VH} />

      {/* ── Sea / ground fills ── */}
      <rect x={0} y={0} width={800} height={WATER_Y} fill="rgba(10,25,45,0.30)" />
      <rect x={0} y={WATER_Y} width={800} height={SEABED_Y - WATER_Y} fill="rgba(10,35,75,0.45)" />
      <rect x={0} y={SEABED_Y} width={800} height={540 - SEABED_Y} fill="rgba(90,75,45,0.55)" />

      <line x1={0} y1={WATER_Y} x2={800} y2={WATER_Y}
        stroke="rgba(100,160,220,0.30)" strokeWidth={1} strokeDasharray="5 7" />
      <text x={14} y={WATER_Y - 5} fontSize={8} fill="rgba(100,160,220,0.60)"
        fontFamily="Montserrat, sans-serif" fontStyle="italic">Sea level</text>
      <text x={14} y={SEABED_Y - 5} fontSize={8} fill="rgba(160,130,80,0.60)"
        fontFamily="Montserrat, sans-serif" fontStyle="italic">Seabed</text>

      <rect
        x={CX - MONO_W / 2} y={TOWER_BOT} width={MONO_W} height={SEABED_Y + 30 - TOWER_BOT}
        rx={3} fill="rgba(160,170,180,0.50)" stroke="rgba(200,210,220,0.55)" strokeWidth={1.2}
      />

      <rect
        x={CX - MONO_W / 2 - 4} y={TOWER_BOT - 20} width={MONO_W + 8} height={24}
        rx={3} fill="rgba(140,155,170,0.65)" stroke="rgba(200,210,220,0.55)" strokeWidth={1}
      />

      <path
        d={`M${CX - TOWER_W / 2} ${TOWER_TOP}
            L${CX - TOWER_W / 2 - 4} ${TOWER_BOT - 20}
            L${CX + TOWER_W / 2 + 4} ${TOWER_BOT - 20}
            L${CX + TOWER_W / 2} ${TOWER_TOP} Z`}
        fill="rgba(160,175,190,0.70)"
        stroke="rgba(200,215,230,0.55)" strokeWidth={1}
      />

      <path
        d={`M${NACELLE_X} ${NACELLE_Y + 4}
            L${NACELLE_X + 8} ${NACELLE_Y}
            L${NACELLE_X + NACELLE_W} ${NACELLE_Y + 3}
            L${NACELLE_X + NACELLE_W} ${NACELLE_Y + NACELLE_H}
            L${NACELLE_X} ${NACELLE_Y + NACELLE_H} Z`}
        fill="rgba(140,155,170,0.80)"
        stroke="rgba(200,215,230,0.60)" strokeWidth={1.2}
      />
      <line x1={NACELLE_X + NACELLE_W - 10} y1={NACELLE_Y}
        x2={NACELLE_X + NACELLE_W - 10} y2={NACELLE_Y - 14}
        stroke="rgba(210,220,230,0.70)" strokeWidth={1.2} />
      <circle cx={NACELLE_X + NACELLE_W - 10} cy={NACELLE_Y - 16} r={3}
        fill="rgba(210,220,230,0.80)" />
      <line x1={NACELLE_X + NACELLE_W - 10} y1={NACELLE_Y - 16}
        x2={NACELLE_X + NACELLE_W - 2} y2={NACELLE_Y - 22}
        stroke="rgba(210,220,230,0.70)" strokeWidth={1} />

      {[0, 120, 240].map((deg) => (
        <path
          key={deg}
          d={`M${CX} ${HUB_Y}
              L${CX - 5} ${HUB_Y - BLADE_LEN}
              Q${CX} ${HUB_Y - BLADE_LEN - 12} ${CX + 5} ${HUB_Y - BLADE_LEN} Z`}
          fill={RC.green}
          opacity={0.88}
          transform={`rotate(${deg}, ${CX}, ${HUB_Y})`}
        />
      ))}

      <circle cx={CX} cy={HUB_Y} r={10} fill="rgba(150,165,180,0.90)"
        stroke="rgba(200,215,230,0.60)" strokeWidth={1.2} />
      <circle cx={CX} cy={HUB_Y} r={4} fill={RC.green} />

      <line x1={CX + TOWER_W / 2 - 2} y1={TOWER_TOP + 20}
        x2={CX + TOWER_W / 2 - 2} y2={TOWER_BOT}
        stroke={RC.amber} strokeWidth={2} opacity={0.55} strokeDasharray="4 4" />

      <text x={660} y={WATER_Y + 22} fontSize={9} fontWeight="600"
        fontFamily="Montserrat, sans-serif" fill="rgba(100,160,220,0.65)">
        Sea Water
      </text>

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

// ── Public component ─────────────────────────────────────────────────────────

export interface WindTurbineComponentsDiagramProps {
  title: string
  caption?: string
}

export function WindTurbineComponentsDiagram({ title, caption }: WindTurbineComponentsDiagramProps) {
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
        <div className="flex-1">
          <h3
            className="font-heading font-bold text-base leading-snug"
            style={{ color: RC.white90, fontFamily: "'Montserrat', sans-serif" }}
          >
            {title}
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
            Tap a part below to highlight it
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.greenDim, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · 01–15
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <TurbineComponentsSVG active={active} setActive={setActive} />
      </div>

      {/* Legend / index */}
      <Legend active={active} setActive={setActive} />

      {/* Caption */}
      {caption && (
        <figcaption
          className="px-6 py-3 text-xs"
          style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white30 }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
