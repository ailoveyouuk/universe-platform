'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'
// ─────────────────────────────────────────────────────────────────────────────
// GrovesFuelCellDiagram — Grove's 1839 Gaseous Voltaic Battery
// The first hydrogen fuel cell: two Pt electrodes, H2/O2, H2SO4 electrolyte
// RC Diagram Design Language v1.2 — callout-line variant
// ─────────────────────────────────────────────────────────────────────────────

// ── RC Design Tokens ─────────────────────────────────────────────────────────
const RC = {
  green:      brand.green,
  greenDim:   rcRgba(brand.green, 0.15),
  white90:    'rgba(255,255,255,0.90)',
  white65:    'rgba(255,255,255,0.65)',
  white45:    'rgba(255,255,255,0.45)',
  white30:    'rgba(255,255,255,0.30)',
  white18:    'rgba(255,255,255,0.18)',
  white10:    'rgba(255,255,255,0.08)',
  white22:    'rgba(255,255,255,0.22)',
  cardBg:     'rgba(10,15,20,0.80)',
  cardBorder: 'rgba(255,255,255,0.08)',
  bgDark:     '#0f172a',
  bgMid:      '#1e293b',
  bgPanel:    '#162032',
  text:       '#e2e8f0',
  textMuted:  '#94a3b8',
}

// ── Colours (original apparatus palette, preserved) ───────────────────────────
const COL = {
  glass:     '#a0c8e0',
  glassEdge: '#6ab0d0',
  acid:      '#e8e850',
  acidLight: '#f0f060',
  h2:        '#8080ff',
  o2:        '#ff8040',
  platinum:  '#c0c0c0',
  wire:      '#b87333',
  lightbulb: '#f0e040',
  bubble:    '#ffffff',
}

// ── Category colour key ───────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  gas:       COL.h2,       // trapped gas reservoirs — H2 / O2
  electrode: COL.platinum, // platinum electrode strips
  circuit:   COL.wire,     // wire / lightbulb / current path
  chemistry: RC.green,     // acid electrolyte + net reaction
} as const

type Category = keyof typeof CATEGORY_COLORS

const CATEGORY_LABEL: Record<Category, string> = {
  gas:       'Gas',
  electrode: 'Electrode',
  circuit:   'Circuit',
  chemistry: 'Chemistry',
}

// ── Single source of truth for every labelled component ──────────────────────
interface DiagramComponent {
  index: number
  text: string
  subtext: string
  category: Category
  side: 'left' | 'right'
  labelX: number
  labelY: number
  targetX: number
  targetY: number
}

const COMPONENTS: DiagramComponent[] = [
  { index: 1, text: 'Hydrogen Tube',    subtext: 'Inverted tube, H₂ trapped at top',   category: 'gas',       side: 'left',  labelX: 148, labelY: 100, targetX: 0, targetY: 0 },
  { index: 2, text: 'Platinum Electrode', subtext: 'Anode — oxidises H₂',              category: 'electrode', side: 'left',  labelX: 148, labelY: 140, targetX: 0, targetY: 0 },
  { index: 3, text: 'Sulphuric Acid Trough', subtext: 'Dilute H₂SO₄ electrolyte',       category: 'chemistry', side: 'left',  labelX: 148, labelY: 180, targetX: 0, targetY: 0 },
  { index: 4, text: 'Connecting Wire',  subtext: 'Carries current to the load',        category: 'circuit',   side: 'left',  labelX: 148, labelY: 220, targetX: 0, targetY: 0 },
  { index: 5, text: 'Lightbulb Load',   subtext: 'Demonstrates the generated current', category: 'circuit',   side: 'right', labelX: 572, labelY: 100, targetX: 0, targetY: 0 },
  { index: 6, text: 'Oxygen Tube',      subtext: 'Inverted tube, O₂ trapped at top',   category: 'gas',       side: 'right', labelX: 572, labelY: 140, targetX: 0, targetY: 0 },
  { index: 7, text: 'Platinum Electrode', subtext: 'Cathode — reduces O₂',             category: 'electrode', side: 'right', labelX: 572, labelY: 180, targetX: 0, targetY: 0 },
]

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
        <pattern id="rcGridGF" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowGF" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.10)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridGF)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowGF)" />
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
      <g className="rc-callout-enter" style={{ '--rc-delay': `${c.index * 0.07}s` } as React.CSSProperties}>
        <circle cx={chipX} cy={c.labelY - 6} r={18} fill="transparent" />

        <polyline
          points={`${lineStartX},${c.labelY - 3} ${elbowX},${c.labelY - 3} ${c.targetX},${c.targetY}`}
          fill="none" stroke={lineColor} strokeWidth={isActive ? 1.6 : 1} strokeLinejoin="round" />
        <circle cx={c.targetX} cy={c.targetY} r={isActive ? 6 : 4.5} fill="none" stroke={color} strokeWidth={isActive ? 1.6 : 1.2} opacity={0.95} />
        <circle cx={c.targetX} cy={c.targetY} r={1.6} fill={color} />

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
        <text className="rc-callout-subtext" x={textX} y={c.labelY + 11} textAnchor={isLeft ? 'end' : 'start'}
          fontSize={7.5} fontFamily="Montserrat, sans-serif" fill={RC.white45}>
          {c.subtext}
        </text>
      </g>
    </g>
  )
}

// ── Helper: electrode tube ────────────────────────────────────────────────────

function ElectrodeTube({
  cx, baseY, gasColor, gasLabel, label,
}: {
  cx: number; baseY: number; gasColor: string; gasLabel: string; label: string
}) {
  const tubeW  = 44
  const tubeH  = 160
  const acidH  = 80   // acid fills lower portion
  const gasH   = 60   // gas trapped at top of inverted tube
  const ptH    = 36   // platinum strip height

  const tubeX = cx - tubeW / 2
  const tubeY = baseY - tubeH

  return (
    <g>
      {/* Tube body (inverted — open end down, immersed in acid trough) */}
      {/* Outer glass */}
      <rect x={tubeX} y={tubeY} width={tubeW} height={tubeH} rx={4}
        fill="none" stroke={COL.glassEdge} strokeWidth={2} />
      {/* Glass fill (transparent) */}
      <rect x={tubeX + 2} y={tubeY + 2} width={tubeW - 4} height={tubeH - 4} rx={3}
        fill={COL.glass} fillOpacity={0.08} />

      {/* Acid fill inside tube */}
      <rect x={tubeX + 2} y={tubeY + gasH} width={tubeW - 4} height={acidH - 6} rx={2}
        fill={COL.acid} fillOpacity={0.25} />

      {/* Trapped gas at top */}
      <rect x={tubeX + 2} y={tubeY + 2} width={tubeW - 4} height={gasH - 4} rx={2}
        fill={gasColor} fillOpacity={0.35} />

      {/* Gas label */}
      <text x={cx} y={tubeY + gasH / 2 + 4} textAnchor="middle"
        fill={gasColor} fontSize={13} fontWeight="700" fontFamily="sans-serif" fillOpacity={0.9}>
        {gasLabel}
      </text>

      {/* Platinum electrode strip */}
      <rect x={cx - 5} y={tubeY + gasH + 4} width={10} height={ptH} rx={2}
        fill={COL.platinum} stroke="#909090" strokeWidth={1} />

      {/* Platinum label */}
      <text x={cx + 10} y={tubeY + gasH + ptH / 2 + 4} fill={RC.textMuted} fontSize={8} fontFamily="sans-serif">Pt</text>

      {/* Bubbles (gas) */}
      {[0, 8, 16].map((off, i) => (
        <circle key={i} cx={cx - 6 + (i % 2) * 12} cy={tubeY + gasH - 8 - off} r={2.5}
          fill={gasColor} fillOpacity={0.5} />
      ))}

      {/* Tube label */}
      <text x={cx} y={tubeY - 12} textAnchor="middle"
        fill={RC.text} fontSize={11} fontWeight="600" fontFamily="sans-serif">
        {label}
      </text>
    </g>
  )
}

// ── Acid trough ───────────────────────────────────────────────────────────────

function AcidTrough({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      {/* Trough sides */}
      <rect x={x} y={y} width={w} height={h} rx={4} fill={RC.bgMid} stroke={COL.glassEdge} strokeWidth={2} />
      {/* Acid fill */}
      <rect x={x + 3} y={y + 4} width={w - 6} height={h - 8} rx={2}
        fill={COL.acid} fillOpacity={0.22} />
      {/* Surface shimmer */}
      <line x1={x + 6} y1={y + 6} x2={x + w - 6} y2={y + 6}
        stroke={COL.acidLight} strokeWidth={1} strokeOpacity={0.4} />
      {/* Label */}
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle"
        fill={COL.acid} fontSize={10} fontWeight="600" fontFamily="sans-serif" opacity={0.8}>
        H₂SO₄
      </text>
      <text x={x + w / 2} y={y + h / 2 + 17} textAnchor="middle"
        fill={RC.textMuted} fontSize={8} fontFamily="sans-serif" fontStyle="italic">
        dilute sulphuric acid
      </text>
    </g>
  )
}

// ── Wire ──────────────────────────────────────────────────────────────────────

function Wire({ points }: { points: [number, number][] }) {
  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  return <path d={d} fill="none" stroke={COL.wire} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
}

// ── Lightbulb ─────────────────────────────────────────────────────────────────

function Lightbulb({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      {/* Glow */}
      <circle cx={cx} cy={cy} r={26} fill={COL.lightbulb} fillOpacity={0.08} />
      {/* Globe */}
      <circle cx={cx} cy={cy - 5} r={18} fill={COL.lightbulb} fillOpacity={0.15} stroke={COL.lightbulb} strokeWidth={1.5} />
      {/* Base */}
      <rect x={cx - 8} y={cy + 10} width={16} height={10} rx={2}
        fill="#888" stroke="#666" strokeWidth={1} />
      <rect x={cx - 6} y={cy + 18} width={12} height={6} rx={1}
        fill="#777" stroke="#555" strokeWidth={1} />
      {/* Filament */}
      <path d={`M ${cx - 5} ${cy + 2} Q ${cx} ${cy - 8} ${cx + 5} ${cy + 2}`}
        fill="none" stroke={COL.lightbulb} strokeWidth={1.5} />
      {/* Rays */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180
        return (
          <line key={deg}
            x1={cx + 20 * Math.cos(rad)} y1={(cy - 5) + 20 * Math.sin(rad)}
            x2={cx + 28 * Math.cos(rad)} y2={(cy - 5) + 28 * Math.sin(rad)}
            stroke={COL.lightbulb} strokeWidth={1} strokeOpacity={0.5}
          />
        )
      })}
      <text x={cx} y={cy + 38} textAnchor="middle" fill="#DAA520" fontSize={9} fontFamily="sans-serif">
        Load
      </text>
    </g>
  )
}

// ── Main SVG ──────────────────────────────────────────────────────────────────
function GrovesFuelCellSVG({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  const W = 720
  const H = 500

  const troughX = 120
  const troughY = 290
  const troughW = 480
  const troughH = 90

  const leftTubeCX  = 220
  const rightTubeCX = 500
  const tubeBaseY   = troughY + 16

  const bulbCX = W / 2
  const bulbCY = 120

  // Wire routing: from electrodes up and over through lightbulb
  const wireLeft:  [number, number][] = [
    [leftTubeCX,  tubeBaseY - 170],
    [leftTubeCX,  bulbCY + 30],
    [bulbCX - 16, bulbCY + 30],
  ]
  const wireRight: [number, number][] = [
    [rightTubeCX,  tubeBaseY - 170],
    [rightTubeCX,  bulbCY + 30],
    [bulbCX + 16,  bulbCY + 30],
  ]

  const targets: Record<number, { x: number; y: number }> = {
    1: { x: leftTubeCX, y: tubeBaseY - 160 - 30 },              // top of H2 tube (gas zone)
    2: { x: leftTubeCX, y: tubeBaseY - 160 + 60 + 18 },         // Pt strip in H2 tube
    3: { x: troughX + 40, y: troughY + troughH / 2 },           // acid trough
    4: { x: (leftTubeCX + bulbCX - 16) / 2, y: bulbCY + 30 },   // left wire run
    5: { x: bulbCX, y: bulbCY - 5 },                            // lightbulb globe
    6: { x: rightTubeCX, y: tubeBaseY - 160 - 30 },             // top of O2 tube (gas zone)
    7: { x: rightTubeCX, y: tubeBaseY - 160 + 60 + 18 },        // Pt strip in O2 tube
  }
  const wired = COMPONENTS.map((c) => ({ ...c, targetX: targets[c.index].x, targetY: targets[c.index].y }))

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: 800, minWidth: 280, display: 'block' }}
      aria-label="Grove's gaseous voltaic battery diagram"
    >
      <rect width={W} height={H} fill={RC.bgDark} rx={8} />

      <BlueprintFrame w={W} h={H} />

      {/* Title */}
      <text x={W / 2} y={30} textAnchor="middle" fill={RC.text} fontSize={15} fontWeight="700" fontFamily="sans-serif">
        Grove's Gaseous Voltaic Battery (1839)
      </text>
      <text x={W / 2} y={46} textAnchor="middle" fill={RC.textMuted} fontSize={10} fontFamily="sans-serif">
        The first hydrogen fuel cell — Sir William Grove, 1839
      </text>

      {/* Reaction labels at sides */}
      <text x={troughX - 14} y={troughY + 50} textAnchor="end" fill={COL.h2} fontSize={10} fontWeight="600" fontFamily="sans-serif">
        Anode (−)
      </text>
      <text x={troughX + troughW + 14} y={troughY + 50} textAnchor="start" fill={COL.o2} fontSize={10} fontWeight="600" fontFamily="sans-serif">
        Cathode (+)
      </text>

      {/* Wires */}
      <Wire points={wireLeft} />
      <Wire points={wireRight} />

      {/* Lightbulb */}
      <Lightbulb cx={bulbCX} cy={bulbCY} />

      {/* Current direction arrows */}
      <defs>
        <marker id="gfArrowhead" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill={COL.wire} />
        </marker>
      </defs>
      {/* Arrow on left wire */}
      <line x1={leftTubeCX} y1={tubeBaseY - 130} x2={leftTubeCX} y2={tubeBaseY - 100}
        stroke={COL.wire} strokeWidth={2} markerEnd="url(#gfArrowhead)" />
      <text x={leftTubeCX - 26} y={tubeBaseY - 112} fill={COL.wire} fontSize={8} fontFamily="sans-serif">
        e⁻ flow
      </text>

      {/* Acid trough */}
      <AcidTrough x={troughX} y={troughY} w={troughW} h={troughH} />

      {/* Electrode tubes */}
      <ElectrodeTube
        cx={leftTubeCX} baseY={tubeBaseY}
        gasColor={COL.h2} gasLabel="H₂" label="Hydrogen"
      />
      <ElectrodeTube
        cx={rightTubeCX} baseY={tubeBaseY}
        gasColor={COL.o2} gasLabel="O₂" label="Oxygen"
      />

      {/* Reaction annotations */}
      <g transform="translate(40, 370)">
        <text x={0} y={0} fill={COL.h2} fontSize={10} fontWeight="600" fontFamily="sans-serif">
          Anode: 2H₂ → 4H⁺ + 4e⁻
        </text>
        <text x={0} y={16} fill={COL.o2} fontSize={10} fontWeight="600" fontFamily="sans-serif">
          Cathode: O₂ + 4H⁺ + 4e⁻ → 2H₂O
        </text>
        <text x={0} y={32} fill={RC.green} fontSize={10} fontWeight="600" fontFamily="sans-serif">
          Net: 2H₂ + O₂ → 2H₂O + electricity
        </text>
      </g>

      {/* Historical context box */}
      <rect x={W - 210} y={370} width={200} height={80} rx={5}
        fill={RC.bgMid} stroke={RC.bgPanel} strokeWidth={1} />
      <text x={W - 110} y={388} textAnchor="middle" fill="#DAA520" fontSize={10} fontWeight="700" fontFamily="sans-serif">
        Historical Context
      </text>
      <foreignObject x={W - 208} y={394} width={196} height={56}>
        <div style={{ fontSize: 8.5, color: RC.textMuted, fontFamily: 'sans-serif', lineHeight: 1.35, padding: '0 6px' }}>
          Grove demonstrated that combining H₂ and O₂ via Pt electrodes in acid produced a sustained electric current — 185 years before commercial fuel cells.
        </div>
      </foreignObject>

      {wired.map((c) => (
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
export default function GrovesFuelCellDiagram() {
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
            Grove's Gaseous Voltaic Battery
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
            The first hydrogen fuel cell, 1839 — tap a part below to highlight it
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.greenDim, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · 01–07
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <GrovesFuelCellSVG active={active} setActive={setActive} />
      </div>

      {/* Legend / index */}
      <Legend active={active} setActive={setActive} />

      {/* Caption */}
      <figcaption
        className="px-6 py-3 text-xs"
        style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white30 }}
      >
        Sir William Grove's 1839 gaseous voltaic battery — two platinum electrodes in dilute sulphuric acid, combining hydrogen and oxygen to generate a sustained electric current
      </figcaption>
    </figure>
  )
}
