// ─────────────────────────────────────────────────────────────────────────────
// HydrogenFuelCellDiagram — RC Diagram Design Language v1.2 (callout-line
// variant, cross-section adaptation)
//
// Cross-section diagram of a Proton Exchange Membrane (PEM) Fuel Cell
//
// Shows the step-by-step electrochemical reaction:
//
//   Step 1 — H₂ fed to ANODE → split into 2H⁺ + 2e⁻ (platinum catalyst)
//   Step 2 — H⁺ protons cross PEM membrane (left → right)
//   Step 3 — Electrons travel through EXTERNAL CIRCUIT → electricity output
//   Step 4 — At CATHODE: O₂ + 4H⁺ + 4e⁻ → 2H₂O  (water + heat exhaust)
//
// Overall reaction: 2H₂ + O₂ → 2H₂O + electricity + heat
//
// Layout (left-to-right):
//   Anode zone | GDL | Catalyst | PEM | Catalyst | GDL | Cathode zone
//   + external circuit across the top
//   + step callouts below
//
// Ported from an earlier "Mauna Loa Design Language" pass (card shell + RC
// tokens only, no BlueprintFrame/interactivity/mobile fix) to v1.2 — same
// tokens, BlueprintFrame, staggered entrance, hover/tap dimming and
// mobile-legibility fix as GrovesFuelCellDiagram/SolarPVCellDiagram. All
// original cross-section geometry (flow plates, GDL, catalyst, membrane,
// molecules, proton flow, wires) is unchanged; only the interactive/styling
// layer around it is new. The four reaction-step boxes become numbered,
// hoverable/tappable callouts with sibling-dimming; the zone labels, flow
// arrow captions, molecule labels and key-facts row are exactly the text
// this port hides below ~768px — the HTML legend/detail-cards underneath
// carry that reading on mobile.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'
// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:      brand.green,
  greenDim:   rcRgba(brand.green, 0.12),
  greenMid:   rcRgba(brand.green, 0.40),
  blue:       brand.blue,
  blueDim:    rcRgba(brand.blue, 0.14),
  blueMid:    rcRgba(brand.blue, 0.44),
  orange:     brand.orange,
  orangeDim:  rcRgba(brand.orange, 0.14),
  orangeMid:  rcRgba(brand.orange, 0.44),
  amber:      brand.amber,
  amberDim:   rcRgba(brand.amber, 0.14),
  teal:       brand.cyan,
  tealDim:    rcRgba(brand.cyan, 0.14),
  tealMid:    rcRgba(brand.cyan, 0.44),
  white90:    'rgba(255,255,255,0.90)',
  white70:    'rgba(255,255,255,0.70)',
  white50:    'rgba(255,255,255,0.50)',
  white35:    'rgba(255,255,255,0.35)',
  white20:    'rgba(255,255,255,0.20)',
  white12:    'rgba(255,255,255,0.12)',
  white10:    'rgba(255,255,255,0.10)',
  white08:    'rgba(255,255,255,0.08)',
  cardBg:     'rgba(10,15,20,0.85)',
  cardBorder: 'rgba(255,255,255,0.08)',
}

const W = 940
const H = 530
const PAD = 18

// ── Core geometry ─────────────────────────────────────────────────────────────
// The cell cross-section occupies y=80..370, centred horizontally
const CELL_Y     = 78
const CELL_H     = 270

// Zone widths (left → right)
const ANODE_X    = 60   // anode flow plate start
const ANODE_W    = 136  // anode flow plate width
const GDL_W      = 34   // gas diffusion layers
const CAT_W      = 20   // catalyst layers
const MEM_W      = 52   // PEM membrane
const CATH_X     = ANODE_X + ANODE_W + GDL_W + CAT_W + MEM_W + CAT_W + GDL_W
const CATH_W     = 136  // cathode flow plate width
const CELL_RIGHT = CATH_X + CATH_W  // ~532

// Derived x positions
const GDL_A_X    = ANODE_X + ANODE_W
const CAT_A_X    = GDL_A_X + GDL_W
const MEM_X      = CAT_A_X + CAT_W
const CAT_C_X    = MEM_X + MEM_W
const GDL_C_X    = CAT_C_X + CAT_W

// External circuit arc (top)
const EXT_Y      = CELL_Y - 40

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
      .rc-legend-item { cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease; }
      .rc-legend-item:focus-visible, .rc-panel-hit:focus-visible {
        outline: 2px solid ${RC.green}; outline-offset: 2px;
      }
      /* Same mobile fix as the other RC Diagram variants: below ~768px the
         cross-section has shrunk enough that inline SVG label/zone/flow
         text is no longer legible. Hide it and let the legend + key-facts
         list (plain HTML, always full size) carry the reading; the step
         badges get a size bump so each callout still reads as "a numbered
         thing" pointing at part of the cell. */
      @media (max-width: 767px) {
        .rc-panel-label { display: none; }
        .rc-panel-chipgroup { transform-box: fill-box; transform-origin: center; transform: scale(1.5); }
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
        <pattern id="rcGridHF" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowHF" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridHF)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowHF)" />
      {[
        { x: 10, y: 10, dx: 1, dy: 1 },
        { x: w - 10, y: 10, dx: -1, dy: 1 },
        { x: 10, y: h - 10, dx: 1, dy: -1 },
        { x: w - 10, y: h - 10, dx: -1, dy: -1 },
      ].map((c, i) => (
        <path key={i}
          d={`M${c.x} ${c.y + b * c.dy} L${c.x} ${c.y} L${c.x + b * c.dx} ${c.y}`}
          fill="none" stroke={RC.white20} strokeWidth={1.5} strokeLinecap="round" />
      ))}
    </>
  )
}

// ── H₂ molecule dots ──────────────────────────────────────────────────────────
function H2Molecules({ x, count, col }: { x: number; count: number; col: string }) {
  const positions = [
    { y: CELL_Y + 50 }, { y: CELL_Y + 100 }, { y: CELL_Y + 150 },
    { y: CELL_Y + 200 }, { y: CELL_Y + 230 },
  ].slice(0, count)
  return (
    <g>
      {positions.map((p, i) => (
        <g key={i}>
          {/* Two bonded circles representing H₂ */}
          <circle cx={x - 5} cy={p.y} r={6} fill={col} fillOpacity={0.60} />
          <circle cx={x + 5} cy={p.y} r={6} fill={col} fillOpacity={0.60} />
          <line x1={x - 5} y1={p.y} x2={x + 5} y2={p.y}
            stroke={col} strokeWidth={2.5} strokeOpacity={0.40} />
          <text className="rc-panel-label" x={x} y={p.y + 14} textAnchor="middle"
            fontSize={6.5} fontFamily="Inter, system-ui, sans-serif"
            fill={col} fillOpacity={0.65}>
            H₂
          </text>
        </g>
      ))}
    </g>
  )
}

// ── O₂ molecules ──────────────────────────────────────────────────────────────
function O2Molecules({ x, count, col }: { x: number; count: number; col: string }) {
  const positions = [
    { y: CELL_Y + 50 }, { y: CELL_Y + 100 }, { y: CELL_Y + 160 },
    { y: CELL_Y + 210 },
  ].slice(0, count)
  return (
    <g>
      {positions.map((p, i) => (
        <g key={i}>
          <circle cx={x - 6} cy={p.y} r={7} fill={col} fillOpacity={0.55} />
          <circle cx={x + 6} cy={p.y} r={7} fill={col} fillOpacity={0.55} />
          <line x1={x - 6} y1={p.y} x2={x + 6} y2={p.y}
            stroke={col} strokeWidth={2.5} strokeOpacity={0.35} />
          <text className="rc-panel-label" x={x} y={p.y + 16} textAnchor="middle"
            fontSize={6.5} fontFamily="Inter, system-ui, sans-serif"
            fill={col} fillOpacity={0.65}>
            O₂
          </text>
        </g>
      ))}
    </g>
  )
}

// ── Proton particles crossing membrane ────────────────────────────────────────
function ProtonFlow() {
  const protons = [
    { y: CELL_Y + 70,  progress: 0.2 },
    { y: CELL_Y + 120, progress: 0.5 },
    { y: CELL_Y + 170, progress: 0.8 },
    { y: CELL_Y + 220, progress: 0.4 },
  ]
  return (
    <g>
      {protons.map((pt, i) => {
        const px = MEM_X + MEM_W * pt.progress
        return (
          <g key={i}>
            <circle cx={px} cy={pt.y} r={5.5}
              fill={RC.blue} fillOpacity={0.75} />
            <text className="rc-panel-label" x={px} y={pt.y + 1}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={6} fontWeight="800"
              fontFamily="Inter, system-ui, sans-serif" fill="white">
              H⁺
            </text>
          </g>
        )
      })}
      {/* Directional arrow through membrane */}
      <line x1={MEM_X + 4} y1={CELL_Y + CELL_H / 2}
        x2={MEM_X + MEM_W - 4} y2={CELL_Y + CELL_H / 2}
        stroke={RC.blue} strokeWidth={1} strokeOpacity={0.30}
        strokeDasharray="4 3" />
      <polygon
        points={`${MEM_X + MEM_W - 4},${CELL_Y + CELL_H / 2 - 4} ${MEM_X + MEM_W + 4},${CELL_Y + CELL_H / 2} ${MEM_X + MEM_W - 4},${CELL_Y + CELL_H / 2 + 4}`}
        fill={RC.blue} fillOpacity={0.35} />
    </g>
  )
}

// ── Water droplets at cathode ─────────────────────────────────────────────────
function WaterOutput() {
  const drops = [
    { y: CELL_Y + 90 }, { y: CELL_Y + 150 }, { y: CELL_Y + 210 },
  ]
  return (
    <g>
      {drops.map((d, i) => (
        <g key={i}>
          {/* Teardrop */}
          <path
            d={`M ${CATH_X + 90} ${d.y - 10} Q ${CATH_X + 98} ${d.y + 4} ${CATH_X + 90} ${d.y + 10} Q ${CATH_X + 82} ${d.y + 4} ${CATH_X + 90} ${d.y - 10}`}
            fill={RC.teal} fillOpacity={0.55} />
          <text className="rc-panel-label" x={CATH_X + 90} y={d.y + 22} textAnchor="middle"
            fontSize={6.5} fontFamily="Inter, system-ui, sans-serif"
            fill={RC.teal} fillOpacity={0.70}>
            H₂O
          </text>
        </g>
      ))}
    </g>
  )
}

// ── Reaction-step callouts (single source of truth) ───────────────────────────
interface ReactionStep {
  num:  number
  col:  string
  dim:  string
  x:    number
  label: string
  detail: string
}

const STEPS: ReactionStep[] = [
  {
    num: 1, col: RC.blue, dim: RC.blueDim, x: ANODE_X + ANODE_W / 2,
    label: 'H₂ → 2H⁺ + 2e⁻', detail: 'Split at anode catalyst',
  },
  {
    num: 2, col: RC.green, dim: RC.greenDim, x: MEM_X + MEM_W / 2,
    label: 'Protons cross PEM', detail: 'H⁺ migrates through membrane',
  },
  {
    num: 3, col: RC.green, dim: RC.greenDim, x: (ANODE_X + ANODE_W / 2 + CATH_X + CATH_W / 2) / 2,
    label: 'External circuit', detail: 'e⁻ flow → electricity',
  },
  {
    num: 4, col: RC.orange, dim: RC.orangeDim, x: CATH_X + CATH_W / 2,
    label: 'O₂ + 4H⁺ + 4e⁻ → 2H₂O', detail: 'Recombine at cathode + heat',
  },
]

const KEY_FACTS = [
  { label: 'Efficiency',  value: 'Up to 60% (CHP: 85%)',   col: RC.green },
  { label: 'Emissions',   value: 'H₂O only — zero CO₂',    col: RC.teal  },
  { label: 'Refuel time', value: '3–5 minutes',            col: RC.blue  },
  { label: 'Fuel',        value: 'Pure H₂ (or reformate)', col: RC.amber },
]

// ── Interactive reaction-step callout ─────────────────────────────────────────
function StepCallout({
  step, active, setActive,
}: {
  step: ReactionStep
  active: number | null
  setActive: (n: number | null) => void
}) {
  const boxW = 118
  const boxH = 48
  const bx = Math.min(Math.max(step.x - boxW / 2, PAD), W - PAD - boxW)
  const by = CELL_Y + CELL_H + 46
  const isActive = active === step.num
  const isDimmed = active !== null && !isActive

  return (
    <g
      className="rc-panel-hit"
      style={{ opacity: isDimmed ? 0.32 : 1 }}
      tabIndex={0}
      role="button"
      aria-label={`Highlight step ${step.num}: ${step.label}`}
      onMouseEnter={() => setActive(step.num)}
      onMouseLeave={() => setActive(null)}
      onFocus={() => setActive(step.num)}
      onBlur={() => setActive(null)}
      onClick={() => setActive(active === step.num ? null : step.num)}
    >
      <g className="rc-panel-enter" style={{ '--rc-delay': `${step.num * 0.07}s` } as React.CSSProperties}>
        {/* Connector line up into the cross-section */}
        <line x1={step.x} y1={CELL_Y + CELL_H + 36} x2={step.x} y2={by}
          stroke={isActive ? step.col : step.dim} strokeWidth={isActive ? 1.6 : 1}
          strokeOpacity={isActive ? 0.85 : 0.35} strokeDasharray="3 3" />
        <circle cx={step.x} cy={CELL_Y + CELL_H + 6} r={isActive ? 5 : 3.5}
          fill="none" stroke={step.col} strokeWidth={isActive ? 1.6 : 1.1} opacity={0.95} />

        {/* Box */}
        <rect x={bx} y={by} width={boxW} height={boxH} rx={7}
          fill={step.dim} stroke={step.col} strokeWidth={isActive ? 1.6 : 1} strokeOpacity={isActive ? 0.85 : 0.50} />

        {/* Step number */}
        <g className="rc-panel-chipgroup">
          <circle cx={bx + 14} cy={by + 14} r={9}
            fill={step.col} fillOpacity={isActive ? 0.32 : 0.25} stroke={step.col} strokeOpacity={0.70} strokeWidth={1.2} />
          <text x={bx + 14} y={by + 15}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={10} fontWeight="800"
            fontFamily="Inter, system-ui, sans-serif" fill={step.col}>
            {step.num}
          </text>
        </g>

        {/* Text lines */}
        <text className="rc-panel-label" x={bx + boxW / 2 + 6} y={by + 12}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={8.5} fontFamily="Inter, system-ui, sans-serif"
          fill={isActive ? RC.white90 : RC.white70}>
          {step.label}
        </text>
        <text className="rc-panel-label" x={bx + boxW / 2 + 6} y={by + 26}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={8.5} fontFamily="Inter, system-ui, sans-serif"
          fill={isActive ? RC.white90 : RC.white70}>
          {step.detail}
        </text>
      </g>
    </g>
  )
}

// ── HTML legend (reaction steps + key facts) ──────────────────────────────────
function Legend({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  return (
    <div
      className="px-6 py-4 flex flex-wrap gap-x-6 gap-y-2"
      style={{ borderTop: `1px solid ${RC.cardBorder}` }}
    >
      {STEPS.map((step) => {
        const isActive = active === step.num
        return (
          <div
            key={step.num}
            className="rc-legend-item flex items-start gap-2 min-w-[200px] rounded-md px-1.5 py-1 -mx-1.5"
            style={{
              background: isActive ? rcRgba(step.col, 0.10) : 'transparent',
              border: `1px solid ${isActive ? rcRgba(step.col, 0.35) : 'transparent'}`,
            }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight step ${step.num}: ${step.label}`}
            onMouseEnter={() => setActive(step.num)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(step.num)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === step.num ? null : step.num)}
          >
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
              style={{ background: rcRgba(step.col, isActive ? 0.28 : 0.16), border: `1px solid ${step.col}`, color: step.col, fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              {step.num}
            </span>
            <span>
              <span className="block text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white70, fontFamily: 'Inter, system-ui, sans-serif' }}>
                {step.label}
              </span>
              <span className="block text-[10px]" style={{ color: RC.white35, fontFamily: 'Inter, system-ui, sans-serif' }}>
                {step.detail}
              </span>
            </span>
          </div>
        )
      })}
      <div className="basis-full h-0" />
      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-1">
        {KEY_FACTS.map((f) => (
          <div key={f.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: f.col }} />
            <span className="text-[10px]" style={{ color: RC.white35, fontFamily: 'Inter, system-ui, sans-serif' }}>
              <span className="font-semibold" style={{ color: RC.white50 }}>{f.label}:</span> {f.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function HydrogenFuelCellDiagram({
  title   = 'How a Hydrogen Fuel Cell Works (PEM)',
  caption,
}: {
  title?: string
  caption?: string
}) {
  const [active, setActive] = useState<number | null>(null)

  // Midpoints for zone labels
  const anodeMid  = ANODE_X + ANODE_W / 2
  const gdlAMid   = GDL_A_X + GDL_W / 2
  const catAMid   = CAT_A_X + CAT_W / 2
  const memMid    = MEM_X + MEM_W / 2
  const catCMid   = CAT_C_X + CAT_W / 2
  const gdlCMid   = GDL_C_X + GDL_W / 2
  const cathMid   = CATH_X + CATH_W / 2

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
        <h3
          className="font-heading font-bold text-base leading-snug flex-1"
          style={{ color: RC.white90, fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          {title}
        </h3>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.greenDim, color: RC.green, fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          RC Diagram · 01–04
        </span>
      </div>

      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', maxWidth: W, minWidth: 320, display: 'block', margin: '0 auto' }}
          aria-label={title}
        >
          {/* Card background */}
          <rect width={W} height={H} rx={14}
            fill={RC.cardBg} stroke={RC.cardBorder} strokeWidth={1} />

          <BlueprintFrame w={W} h={H} />

          {/* Header band */}
          <rect x={PAD} y={10} width={W - PAD * 2} height={28} rx={7}
            fill={RC.white08} stroke={RC.cardBorder} strokeWidth={1} />
          <text x={W / 2} y={24}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={10} fontWeight="700" letterSpacing="0.09em"
            fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}>
            OVERALL REACTION: 2H₂ + O₂ → 2H₂O + ELECTRICITY + HEAT
          </text>

          {/* ── Cell Cross-Section ────────────────────────────────────────── */}

          {/* Anode flow plate (H₂ side) */}
          <rect x={ANODE_X} y={CELL_Y} width={ANODE_W} height={CELL_H} rx={8}
            fill={RC.blueDim} stroke={RC.blue} strokeWidth={1.5} />
          {/* Flow channels (serpentine grooves represented as lines) */}
          {[0.25, 0.42, 0.58, 0.75].map((frac, i) => (
            <line key={i}
              x1={ANODE_X + 10} y1={CELL_Y + CELL_H * frac}
              x2={ANODE_X + ANODE_W - 8} y2={CELL_Y + CELL_H * frac}
              stroke={RC.blue} strokeWidth={1} strokeOpacity={0.25} />
          ))}

          {/* H₂ molecules in anode channel */}
          <H2Molecules x={ANODE_X + 55} count={5} col={RC.blue} />

          {/* Anode GDL */}
          <rect x={GDL_A_X} y={CELL_Y} width={GDL_W} height={CELL_H}
            fill={RC.blueDim} stroke={RC.blue} strokeWidth={1} strokeOpacity={0.50} />
          {/* GDL texture (dots) */}
          {[0.2, 0.4, 0.6, 0.8].map((fy, yi) =>
            [0.3, 0.7].map((fx, xi) => (
              <circle key={`${yi}-${xi}`}
                cx={GDL_A_X + GDL_W * fx} cy={CELL_Y + CELL_H * fy}
                r={2} fill={RC.blue} fillOpacity={0.25} />
            ))
          )}

          {/* Anode catalyst layer */}
          <rect x={CAT_A_X} y={CELL_Y} width={CAT_W} height={CELL_H}
            fill="rgba(218,165,32,0.25)" stroke={RC.amber} strokeWidth={1} strokeOpacity={0.60} />

          {/* PEM Membrane */}
          <rect x={MEM_X} y={CELL_Y} width={MEM_W} height={CELL_H} rx={2}
            fill="rgba(130,188,0,0.08)" stroke={RC.green} strokeWidth={2} />
          {/* Membrane texture — vertical dashes */}
          {[0.15, 0.30, 0.45, 0.60, 0.75, 0.90].map((fy, i) => (
            <line key={i}
              x1={MEM_X + MEM_W / 2} y1={CELL_Y + CELL_H * fy - 5}
              x2={MEM_X + MEM_W / 2} y2={CELL_Y + CELL_H * fy + 5}
              stroke={RC.green} strokeWidth={1} strokeOpacity={0.25} />
          ))}

          {/* Proton flow through membrane */}
          <ProtonFlow />

          {/* Cathode catalyst layer */}
          <rect x={CAT_C_X} y={CELL_Y} width={CAT_W} height={CELL_H}
            fill="rgba(218,165,32,0.25)" stroke={RC.amber} strokeWidth={1} strokeOpacity={0.60} />

          {/* Cathode GDL */}
          <rect x={GDL_C_X} y={CELL_Y} width={GDL_W} height={CELL_H}
            fill={RC.orangeDim} stroke={RC.orange} strokeWidth={1} strokeOpacity={0.50} />
          {[0.2, 0.4, 0.6, 0.8].map((fy, yi) =>
            [0.3, 0.7].map((fx, xi) => (
              <circle key={`${yi}-${xi}`}
                cx={GDL_C_X + GDL_W * fx} cy={CELL_Y + CELL_H * fy}
                r={2} fill={RC.orange} fillOpacity={0.25} />
            ))
          )}

          {/* Cathode flow plate (O₂ / air side) */}
          <rect x={CATH_X} y={CELL_Y} width={CATH_W} height={CELL_H} rx={8}
            fill={RC.orangeDim} stroke={RC.orange} strokeWidth={1.5} />
          {[0.25, 0.42, 0.58, 0.75].map((frac, i) => (
            <line key={i}
              x1={CATH_X + 8} y1={CELL_Y + CELL_H * frac}
              x2={CATH_X + CATH_W - 10} y2={CELL_Y + CELL_H * frac}
              stroke={RC.orange} strokeWidth={1} strokeOpacity={0.25} />
          ))}

          {/* O₂ molecules */}
          <O2Molecules x={CATH_X + 46} count={4} col={RC.orange} />

          {/* Water output */}
          <WaterOutput />

          {/* ── External circuit (top arc) ─────────────────────────────── */}
          {/* Wire from anode top to load to cathode top */}
          <path
            d={`M ${ANODE_X + ANODE_W / 2} ${CELL_Y} L ${ANODE_X + ANODE_W / 2} ${EXT_Y} L ${CATH_X + CATH_W / 2} ${EXT_Y} L ${CATH_X + CATH_W / 2} ${CELL_Y}`}
            fill="none" stroke={RC.green} strokeWidth={2.5} strokeOpacity={0.70} />

          {/* Electron flow arrows on wire */}
          {[0.28, 0.50, 0.72].map((frac, i) => {
            const wx = ANODE_X + ANODE_W / 2 + (CATH_X + CATH_W / 2 - ANODE_X - ANODE_W / 2) * frac
            return (
              <g key={i}>
                <circle cx={wx} cy={EXT_Y} r={8}
                  fill="rgba(130,188,0,0.15)" stroke={RC.green} strokeWidth={1} strokeOpacity={0.60} />
                <text className="rc-panel-label" x={wx} y={EXT_Y + 1}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={8} fontWeight="800"
                  fontFamily="Inter, system-ui, sans-serif" fill={RC.green}>
                  e⁻
                </text>
              </g>
            )
          })}

          {/* Electricity output symbol (right of circuit) */}
          <rect x={CATH_X + CATH_W + 18} y={EXT_Y - 22} width={52} height={44} rx={8}
            fill="rgba(130,188,0,0.12)" stroke={RC.green} strokeWidth={1.5} strokeOpacity={0.60} />
          <text x={CATH_X + CATH_W + 44} y={EXT_Y - 8}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={16} fontFamily="Inter, system-ui, sans-serif" fill={RC.green}>
            ⚡
          </text>
          <text className="rc-panel-label" x={CATH_X + CATH_W + 44} y={EXT_Y + 10}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={8} fontWeight="700"
            fontFamily="Inter, system-ui, sans-serif" fill={RC.green} fillOpacity={0.80}>
            ELECTRICITY
          </text>
          {/* Connect wire to box */}
          <line x1={CATH_X + CATH_W / 2} y1={EXT_Y}
            x2={CATH_X + CATH_W + 18} y2={EXT_Y}
            stroke={RC.green} strokeWidth={2.5} strokeOpacity={0.70} />

          {/* ── Zone labels (bottom of each layer) ────────────────────── */}
          {[
            { x: anodeMid, label: 'ANODE',         sub: 'Flow Plate', col: RC.blue  },
            { x: gdlAMid,  label: 'GDL',            sub: 'Diffusion',  col: RC.blue  },
            { x: catAMid,  label: 'CAT.',           sub: 'Layer',      col: RC.amber },
            { x: memMid,   label: 'PEM',            sub: 'Membrane',   col: RC.green },
            { x: catCMid,  label: 'CAT.',           sub: 'Layer',      col: RC.amber },
            { x: gdlCMid,  label: 'GDL',            sub: 'Diffusion',  col: RC.orange},
            { x: cathMid,  label: 'CATHODE',        sub: 'Flow Plate', col: RC.orange},
          ].map((z, i) => (
            <g key={i}>
              <text className="rc-panel-label" x={z.x} y={CELL_Y + CELL_H + 16}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={8.5} fontWeight="700" letterSpacing="0.05em"
                fontFamily="Inter, system-ui, sans-serif" fill={z.col} fillOpacity={0.80}>
                {z.label}
              </text>
              <text className="rc-panel-label" x={z.x} y={CELL_Y + CELL_H + 28}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={7} fontFamily="Inter, system-ui, sans-serif"
                fill={RC.white35}>
                {z.sub}
              </text>
            </g>
          ))}

          {/* ── Input / output arrows ─────────────────────────────────── */}
          {/* H₂ input arrow (left) */}
          <line x1={PAD} y1={CELL_Y + CELL_H / 2}
            x2={ANODE_X - 4} y2={CELL_Y + CELL_H / 2}
            stroke={RC.blue} strokeWidth={2.5} strokeOpacity={0.70} />
          <polygon
            points={`${ANODE_X - 4},${CELL_Y + CELL_H / 2 - 5} ${ANODE_X + 6},${CELL_Y + CELL_H / 2} ${ANODE_X - 4},${CELL_Y + CELL_H / 2 + 5}`}
            fill={RC.blue} fillOpacity={0.70} />
          <text className="rc-panel-label" x={PAD + 22} y={CELL_Y + CELL_H / 2 - 12}
            textAnchor="middle" fontSize={10}
            fontFamily="Inter, system-ui, sans-serif" fill={RC.blue}>
            H₂
          </text>
          <text className="rc-panel-label" x={PAD + 26} y={CELL_Y + CELL_H / 2 - 2}
            textAnchor="middle" fontSize={8} fontWeight="700"
            fontFamily="Inter, system-ui, sans-serif" fill={RC.blue} fillOpacity={0.70}>
            FUEL IN
          </text>

          {/* Air/O₂ input arrow (right, entering cathode) */}
          <line x1={CATH_X + CATH_W + 4} y1={CELL_Y + CELL_H * 0.3}
            x2={CATH_X + CATH_W + 60} y2={CELL_Y + CELL_H * 0.3}
            stroke={RC.orange} strokeWidth={2} strokeOpacity={0.65} />
          <polygon
            points={`${CATH_X + CATH_W + 4},${CELL_Y + CELL_H * 0.3 - 5} ${CATH_X + CATH_W - 6},${CELL_Y + CELL_H * 0.3} ${CATH_X + CATH_W + 4},${CELL_Y + CELL_H * 0.3 + 5}`}
            fill={RC.orange} fillOpacity={0.65} />
          <text className="rc-panel-label" x={CATH_X + CATH_W + 40} y={CELL_Y + CELL_H * 0.3 - 12}
            textAnchor="middle" fontSize={10}
            fontFamily="Inter, system-ui, sans-serif" fill={RC.orange}>
            O₂
          </text>
          <text className="rc-panel-label" x={CATH_X + CATH_W + 40} y={CELL_Y + CELL_H * 0.3 - 2}
            textAnchor="middle" fontSize={8} fontWeight="700"
            fontFamily="Inter, system-ui, sans-serif" fill={RC.orange} fillOpacity={0.75}>
            AIR IN
          </text>

          {/* H₂O output arrow (right, exiting cathode) */}
          <line x1={CATH_X + CATH_W + 4} y1={CELL_Y + CELL_H * 0.72}
            x2={CATH_X + CATH_W + 60} y2={CELL_Y + CELL_H * 0.72}
            stroke={RC.teal} strokeWidth={2} strokeOpacity={0.65} />
          <polygon
            points={`${CATH_X + CATH_W + 60},${CELL_Y + CELL_H * 0.72 - 5} ${CATH_X + CATH_W + 70},${CELL_Y + CELL_H * 0.72} ${CATH_X + CATH_W + 60},${CELL_Y + CELL_H * 0.72 + 5}`}
            fill={RC.teal} fillOpacity={0.65} />
          <text className="rc-panel-label" x={CATH_X + CATH_W + 40} y={CELL_Y + CELL_H * 0.72 - 12}
            textAnchor="middle" fontSize={10}
            fontFamily="Inter, system-ui, sans-serif" fill={RC.teal}>
            H₂O
          </text>
          <text className="rc-panel-label" x={CATH_X + CATH_W + 40} y={CELL_Y + CELL_H * 0.72 - 2}
            textAnchor="middle" fontSize={8} fontWeight="700"
            fontFamily="Inter, system-ui, sans-serif" fill={RC.teal} fillOpacity={0.75}>
            WATER OUT
          </text>

          {/* ── Step callouts (below diagram) ────────────────────────── */}
          {STEPS.map((s) => (
            <StepCallout key={s.num} step={s} active={active} setActive={setActive} />
          ))}

          {/* ── Key facts row (bottom) ────────────────────────────────── */}
          {KEY_FACTS.map((f, i) => {
            const fw = 192; const fh = 32
            const fx = PAD + i * (fw + 12)
            const fy = H - fh - 14
            return (
              <g key={i}>
                <rect x={fx} y={fy} width={fw} height={fh} rx={6}
                  fill={RC.white08} stroke={RC.white12} strokeWidth={0.8} />
                <text className="rc-panel-label" x={fx + 10} y={fy + 11}
                  fontSize={7.5} fontWeight="700"
                  fontFamily="Inter, system-ui, sans-serif" fill={f.col} fillOpacity={0.75}>
                  {f.label.toUpperCase()}
                </text>
                <text className="rc-panel-label" x={fx + 10} y={fy + 23}
                  fontSize={9} fontFamily="Inter, system-ui, sans-serif"
                  fill={RC.white70}>
                  {f.value}
                </text>
              </g>
            )
          })}

          {/* Source note */}
          <text className="rc-panel-label" x={W - PAD} y={H - 8} textAnchor="end"
            fontSize={7.5} fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}>
            Source: IEA Hydrogen Technology Roadmap 2023; US DOE Fuel Cell Technologies Office
          </text>
        </svg>
      </div>

      {/* Legend / index */}
      <Legend active={active} setActive={setActive} />

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
