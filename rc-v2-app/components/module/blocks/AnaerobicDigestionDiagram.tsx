// ─────────────────────────────────────────────────────────────────────────────
// AnaerobicDigestionDiagram — RC Diagram Design Language v1.2 (process-flow variant)
//
// Vertical process flow diagram showing the 4 biochemical stages of
// anaerobic digestion (AD):
//
//   [Wet Feedstock Input]
//        ↓
//   Stage 1 — HYDROLYSIS
//        Complex polymers → Simple monomers
//        (cellulose, proteins, fats → sugars, amino acids, fatty acids)
//        ↓
//   Stage 2 — ACIDOGENESIS
//        Simple monomers → Volatile Fatty Acids (VFAs) + H₂ + CO₂
//        ↓
//   Stage 3 — ACETOGENESIS
//        VFAs → Acetic acid + H₂ + CO₂
//        ↓
//   Stage 4 — METHANOGENESIS
//        Acetic acid / H₂ / CO₂ → CH₄ + CO₂  [BIOGAS]
//
//   Side channel (Stage 5): Digestate → Biofertiliser (circular economy)
//
// Vertical adaptation of the "process-flow" shape (see GridIntegrationDiagram
// for the horizontal reference build): same tokens, BlueprintFrame, staggered
// entrance and mobile-legibility fix, but stages stack top-to-bottom and the
// connecting arrows point down instead of across. The digestate/biofertiliser
// branch reads as a distinct, named, described step in the source material —
// not a footnote — so it is promoted to its own interactive stage (index 5)
// rather than folded into the Methanogenesis card.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'
// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:       brand.green,
  greenDim:    rcRgba(brand.green, 0.12),
  greenMid:    rcRgba(brand.green, 0.35),
  greenBright: rcRgba(brand.green, 0.65),
  amber:       brand.amber,
  amberDim:    rcRgba(brand.amber, 0.12),
  amberMid:    rcRgba(brand.amber, 0.38),
  amberBright: rcRgba(brand.amber, 0.65),
  blue:        brand.blue,
  blueDim:     rcRgba(brand.blue, 0.12),
  blueMid:     rcRgba(brand.blue, 0.38),
  teal:        brand.teal,
  tealDim:     rcRgba(brand.teal, 0.14),
  tealMid:     rcRgba(brand.teal, 0.40),
  white90:     'rgba(255,255,255,0.90)',
  white70:     'rgba(255,255,255,0.70)',
  white65:     'rgba(255,255,255,0.65)',
  white50:     'rgba(255,255,255,0.50)',
  white45:     'rgba(255,255,255,0.45)',
  white35:     'rgba(255,255,255,0.35)',
  white18:     'rgba(255,255,255,0.18)',
  white15:     'rgba(255,255,255,0.15)',
  white10:     'rgba(255,255,255,0.10)',
  white08:     'rgba(255,255,255,0.08)',
  cardBg:      'rgba(10,15,20,0.85)',
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
      .rc-legend-item { cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease; }
      .rc-legend-item:focus-visible, .rc-panel-hit:focus-visible {
        outline: 2px solid ${RC.green}; outline-offset: 2px;
      }
      /* Same mobile fix as the other variants: below ~768px the diagram has
         shrunk enough that inline SVG label/detail text is no longer
         legible. Hide it and let the legend row (plain HTML, always full
         size) carry the reading; the step badge gets a size bump so each
         stage still reads as "a numbered thing". */
      @media (max-width: 767px) {
        .rc-panel-label { display: none; }
        .rc-panel-chipgroup { transform-box: fill-box; transform-origin: center; transform: scale(1.4); }
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
        <pattern id="rcGridAD" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowAD" cx="50%" cy="30%" r="65%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridAD)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowAD)" />
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

const W = 880
const H = 660

// ── Stage layout ──────────────────────────────────────────────────────────────
const STAGE_W  = 440   // main column card width
const STAGE_H  = 95
const STAGE_X  = 60    // left edge of main column
const STAGE_RX = 10
const ARROW_W  = 18

// Stage top-Y positions (top-down flow)
const INPUT_Y   = 28
const INPUT_H   = 56
const S1_Y      = 120
const S2_Y      = 240
const S3_Y      = 360
const S4_Y      = 480
const OUTPUT_Y  = 596

// ── Digestate side channel (Stage 5) ──────────────────────────────────────────
const SIDE_X    = 570   // right-side channel x
const SIDE_W    = 230
const SIDE_H    = 60
const SIDE_Y    = 508   // aligns with methanogenesis bottom

// ── Single source of truth for every stage ─────────────────────────────────────
interface StageDatum {
  index:      number
  name:       string
  desc:       string
  molecules:  string
  color:      string
  dim:        string
  mid:        string
}

const STAGE_DATA: StageDatum[] = [
  {
    index: 1,
    name: 'Hydrolysis',
    desc: 'Enzymes break complex polymers into simple monomers',
    molecules: 'Cellulose, proteins & fats → sugars, amino acids, fatty acids',
    color: RC.green,
    dim:   RC.greenDim,
    mid:   RC.greenMid,
  },
  {
    index: 2,
    name: 'Acidogenesis',
    desc: 'Fermentative bacteria convert monomers to volatile fatty acids',
    molecules: 'Sugars & amino acids → VFAs, alcohols + H₂ + CO₂',
    color: RC.amber,
    dim:   RC.amberDim,
    mid:   RC.amberMid,
  },
  {
    index: 3,
    name: 'Acetogenesis',
    desc: 'Acetogenic bacteria convert VFAs to simpler substrates',
    molecules: 'Volatile Fatty Acids → Acetic acid + H₂ + CO₂',
    color: RC.blue,
    dim:   RC.blueDim,
    mid:   RC.blueMid,
  },
  {
    index: 4,
    name: 'Methanogenesis',
    desc: 'Methanogenic archaea produce methane from H₂/CO₂ and acetate',
    molecules: 'Acetic acid + H₂ + CO₂ → CH₄ (~60%) + CO₂ (~40%)',
    color: RC.teal,
    dim:   RC.tealDim,
    mid:   RC.tealMid,
  },
  {
    index: 5,
    name: 'Digestate & Biofertiliser',
    desc: 'Nutrient-rich residue is returned to land — circular economy',
    molecules: 'Digestate → biofertiliser co-product (not a biogas precursor)',
    color: RC.green,
    dim:   RC.greenDim,
    mid:   RC.greenMid,
  },
]

const mainStages    = STAGE_DATA.slice(0, 4)
const digestateStage = STAGE_DATA[4]
const stageY = [S1_Y, S2_Y, S3_Y, S4_Y]

// ── Down-arrow connector ───────────────────────────────────────────────────────
function DownArrow({ x, y, color, active }: { x: number; y: number; color: string; active: boolean }) {
  const ax = x + STAGE_W / 2
  const opacity = active ? 0.95 : 0.55
  return (
    <g style={{ transition: 'opacity 0.18s ease' }}>
      <line x1={ax} y1={y} x2={ax} y2={y + 20 - 6}
        stroke={color} strokeWidth={active ? 2.5 : 2} strokeOpacity={opacity} />
      <polygon
        points={`${ax},${y + 20} ${ax - 6},${y + 8} ${ax + 6},${y + 8}`}
        fill={color} fillOpacity={opacity}
      />
    </g>
  )
}

// ── Stage card (illustration geometry — unchanged from the pre-v1.2 build,
//    aside from the rc-panel-label / rc-panel-chipgroup class hooks needed
//    for the shared mobile-legibility + interaction CSS) ─────────────────────
function StageCard({
  x, y, stage, isActive = false,
}: {
  x: number; y: number; stage: StageDatum; isActive?: boolean
}) {
  return (
    <g>
      {/* Card background */}
      <rect x={x} y={y} width={STAGE_W} height={STAGE_H} rx={STAGE_RX}
        fill={stage.dim} stroke={stage.mid} strokeWidth={1.2} />

      {/* Stage number badge */}
      <g className="rc-panel-chipgroup">
        <circle cx={x + 28} cy={y + STAGE_H / 2} r={17}
          fill={stage.color} fillOpacity={isActive ? 0.32 : 0.20} stroke={stage.color} strokeOpacity={0.60} strokeWidth={1.5} />
        <text x={x + 28} y={y + STAGE_H / 2 + 1}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={13} fontWeight="700" fontFamily="Inter, system-ui, sans-serif"
          fill={stage.color}>
          {stage.index}
        </text>
      </g>

      {/* Stage name */}
      <text className="rc-panel-label" x={x + 58} y={y + 26}
        fontSize={13} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={isActive ? RC.white90 : stage.color}
        dominantBaseline="middle">
        {stage.name.toUpperCase()}
      </text>

      {/* Description */}
      <text className="rc-panel-label" x={x + 58} y={y + 46}
        fontSize={10} fontFamily="Inter, system-ui, sans-serif"
        fill={RC.white70} dominantBaseline="middle">
        {stage.desc}
      </text>

      {/* Molecule transformation label */}
      <rect x={x + 58} y={y + 60} width={STAGE_W - 68} height={26} rx={5}
        fill="rgba(0,0,0,0.25)" stroke={stage.mid} strokeWidth={0.8} />
      <text className="rc-panel-label" x={x + 58 + (STAGE_W - 68) / 2} y={y + 73}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={9} fontFamily="Inter, system-ui, sans-serif"
        fill={RC.white50}>
        {stage.molecules}
      </text>
    </g>
  )
}

// ── Full diagram SVG ──────────────────────────────────────────────────────────
function ADFlowSVG({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  const isDimmed = (i: number) => active !== null && active !== i

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      style={{ maxWidth: W, minWidth: 300, display: 'block', margin: '0 auto' }}
      aria-label="Anaerobic digestion vertical process flow diagram"
    >
      <BlueprintFrame w={W} h={H} />

      {/* ── "ANAEROBIC DIGESTER" vessel outline ─────────────────────────── */}
      <rect x={STAGE_X - 18} y={INPUT_Y - 4} width={STAGE_W + 36}
        height={OUTPUT_Y + 32 - (INPUT_Y - 4)} rx={16}
        fill="none" stroke={RC.white08} strokeWidth={1.5} strokeDasharray="6 4" />
      <text x={STAGE_X + STAGE_W + 20} y={INPUT_Y + 24}
        fontSize={9} fontFamily="Inter, system-ui, sans-serif"
        fill={RC.white35} textAnchor="start">
        DIGESTER
      </text>
      <text x={STAGE_X + STAGE_W + 20} y={INPUT_Y + 36}
        fontSize={9} fontFamily="Inter, system-ui, sans-serif"
        fill={RC.white35} textAnchor="start">
        VESSEL
      </text>

      {/* ── INPUT: Wet Feedstock ─────────────────────────────────────────── */}
      <rect x={STAGE_X} y={INPUT_Y} width={STAGE_W} height={INPUT_H} rx={STAGE_RX}
        fill={RC.greenDim} stroke={RC.green} strokeWidth={1.5} />
      <text x={STAGE_X + STAGE_W / 2} y={INPUT_Y + 20}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={12} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={RC.green}>
        WET FEEDSTOCK INPUT
      </text>
      <text x={STAGE_X + STAGE_W / 2} y={INPUT_Y + 40}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={10} fontFamily="Inter, system-ui, sans-serif"
        fill={RC.white70}>
        Food waste · Sewage sludge · Animal manure · Agricultural slurry
      </text>

      {/* ── Arrow: Input → Stage 1 ───────────────────────────────────────── */}
      <DownArrow x={STAGE_X} y={INPUT_Y + INPUT_H + 1} color={RC.green} active={active === 1} />

      {/* ── Stage cards + connecting arrows ─────────────────────────────── */}
      {mainStages.map((stage, i) => {
        const isActive = active === stage.index
        return (
          <g
            key={stage.index}
            className="rc-panel-hit"
            style={{ opacity: isDimmed(stage.index) ? 0.32 : 1 }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${stage.name}`}
            onMouseEnter={() => setActive(stage.index)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(stage.index)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === stage.index ? null : stage.index)}
          >
            <g className="rc-panel-enter" style={{ '--rc-delay': `${i * 0.08}s` } as React.CSSProperties}>
              <StageCard x={STAGE_X} y={stageY[i]} stage={stage} isActive={isActive} />
              {i < mainStages.length - 1 && (
                <DownArrow
                  x={STAGE_X}
                  y={stageY[i] + STAGE_H + 1}
                  color={mainStages[i + 1].color}
                  active={active === stage.index || active === mainStages[i + 1].index}
                />
              )}
            </g>
          </g>
        )
      })}

      {/* ── Arrow: Stage 4 → Biogas output ──────────────────────────────── */}
      <DownArrow x={STAGE_X} y={S4_Y + STAGE_H + 1} color={RC.teal} active={active === 4} />

      {/* ── BIOGAS OUTPUT ────────────────────────────────────────────────── */}
      <rect x={STAGE_X} y={OUTPUT_Y} width={STAGE_W} height={40} rx={STAGE_RX}
        fill={RC.tealDim} stroke={RC.teal} strokeWidth={1.5} />
      <text x={STAGE_X + STAGE_W / 2} y={OUTPUT_Y + 14}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={12} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={RC.teal}>
        BIOGAS OUTPUT
      </text>
      <text x={STAGE_X + STAGE_W / 2} y={OUTPUT_Y + 30}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={10} fontFamily="Inter, system-ui, sans-serif"
        fill={RC.white70}>
        ~55–70% CH₄ + ~30–45% CO₂ — used for heat, electricity, or upgraded to biomethane
      </text>

      {/* ── DIGESTATE side channel (Stage 5) ─────────────────────────────── */}
      {(() => {
        const isActive = active === digestateStage.index
        const dimmed = isDimmed(digestateStage.index)
        return (
          <g
            className="rc-panel-hit"
            style={{ opacity: dimmed ? 0.32 : 1 }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${digestateStage.name}`}
            onMouseEnter={() => setActive(digestateStage.index)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(digestateStage.index)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === digestateStage.index ? null : digestateStage.index)}
          >
            <g className="rc-panel-enter" style={{ '--rc-delay': '0.32s' } as React.CSSProperties}>
              {/* Horizontal connector from digester */}
              <line
                x1={STAGE_X + STAGE_W + 18}
                y1={S4_Y + STAGE_H / 2}
                x2={SIDE_X}
                y2={S4_Y + STAGE_H / 2}
                stroke={digestateStage.mid}
                strokeWidth={active === 4 || isActive ? 2 : 1.5}
                strokeOpacity={active === 4 || isActive ? 0.9 : 0.6}
                strokeDasharray="5 3"
              />
              <line
                x1={SIDE_X + SIDE_W / 2}
                y1={S4_Y + STAGE_H / 2}
                x2={SIDE_X + SIDE_W / 2}
                y2={SIDE_Y}
                stroke={digestateStage.mid}
                strokeWidth={active === 4 || isActive ? 2 : 1.5}
                strokeOpacity={active === 4 || isActive ? 0.9 : 0.6}
              />
              {/* Digestate card */}
              <rect x={SIDE_X} y={SIDE_Y} width={SIDE_W} height={SIDE_H} rx={8}
                fill={digestateStage.dim} stroke={digestateStage.mid} strokeWidth={1} />

              {/* Step number badge */}
              <g className="rc-panel-chipgroup">
                <circle cx={SIDE_X + 20} cy={SIDE_Y + SIDE_H / 2} r={11}
                  fill={digestateStage.color} fillOpacity={isActive ? 0.32 : 0.20}
                  stroke={digestateStage.color} strokeWidth={1.2} />
                <text x={SIDE_X + 20} y={SIDE_Y + SIDE_H / 2 + 1}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={9} fontWeight="700" fontFamily="Inter, system-ui, sans-serif"
                  fill={digestateStage.color}>
                  5
                </text>
              </g>

              <text className="rc-panel-label" x={SIDE_X + SIDE_W / 2 + 6} y={SIDE_Y + 18}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={11} fontWeight="700"
                fontFamily="Inter, system-ui, sans-serif"
                fill={isActive ? RC.white90 : RC.green}>
                DIGESTATE
              </text>
              <text className="rc-panel-label" x={SIDE_X + SIDE_W / 2} y={SIDE_Y + 35}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={9.5} fontFamily="Inter, system-ui, sans-serif"
                fill={RC.white70}>
                Nutrient-rich biofertiliser
              </text>
              <text className="rc-panel-label" x={SIDE_X + SIDE_W / 2} y={SIDE_Y + 49}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={9} fontFamily="Inter, system-ui, sans-serif"
                fill={RC.white50}>
                Returned to land — circular economy
              </text>

              {/* ── Circular economy label ───────────────────────────────── */}
              <text className="rc-panel-label" x={SIDE_X + SIDE_W / 2} y={SIDE_Y + 76}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={9} fontFamily="Inter, system-ui, sans-serif"
                fill={RC.green} fontStyle="italic">
                ♻ Circular Economy Co-Product
              </text>
            </g>
          </g>
        )
      })()}

      {/* ── Legend: micro-organism note (static annotation, not a stage) ──── */}
      <rect x={SIDE_X} y={120} width={SIDE_W} height={80} rx={8}
        fill={RC.white08} stroke={RC.cardBorder} strokeWidth={1} />
      <text x={SIDE_X + SIDE_W / 2} y={138}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={10} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={RC.white70}>
        Key Conditions
      </text>
      <text x={SIDE_X + 12} y={158} fontSize={9} fontFamily="Inter, system-ui, sans-serif" fill={RC.white50}>• Temperature: 35–55 °C (mesophilic/thermophilic)</text>
      <text x={SIDE_X + 12} y={172} fontSize={9} fontFamily="Inter, system-ui, sans-serif" fill={RC.white50}>• pH: 6.8–7.4 for methanogenesis</text>
      <text x={SIDE_X + 12} y={186} fontSize={9} fontFamily="Inter, system-ui, sans-serif" fill={RC.white50}>• Strictly anaerobic (no oxygen)</text>

      {/* ── Source note ──────────────────────────────────────────────────── */}
      <text x={W / 2} y={H - 10}
        textAnchor="middle"
        fontSize={8.5}
        fontFamily="Inter, system-ui, sans-serif"
        fill={RC.white35}>
        Source: IEA Bioenergy Task 37 — Biogas & Biomethane; IRENA Bioenergy Report 2023
      </text>
    </svg>
  )
}

// ── Legend row ─────────────────────────────────────────────────────────────
function Legend({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  return (
    <div
      className="px-6 py-4 flex flex-wrap gap-x-6 gap-y-3"
      style={{ borderTop: `1px solid ${RC.cardBorder}` }}
    >
      {STAGE_DATA.map((s) => {
        const isActive = active === s.index
        return (
          <div
            key={s.index}
            className="rc-legend-item flex items-start gap-2.5 min-w-[150px] max-w-[220px] rounded-md px-1.5 py-1 -mx-1.5"
            style={{
              background: isActive ? rcRgba(s.color, 0.10) : 'transparent',
              border: `1px solid ${isActive ? rcRgba(s.color, 0.35) : 'transparent'}`,
            }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${s.name}`}
            onMouseEnter={() => setActive(s.index)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(s.index)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === s.index ? null : s.index)}
          >
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
              style={{ background: rcRgba(s.color, isActive ? 0.28 : 0.16), border: `1px solid ${s.color}`, color: s.color, fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              {s.index}
            </span>
            <span className="flex flex-col">
              <span className="block text-xs font-semibold leading-tight" style={{ color: isActive ? RC.white90 : RC.white65, fontFamily: 'Inter, system-ui, sans-serif' }}>
                {s.name}
              </span>
              <span className="block text-[11px] leading-tight mt-0.5" style={{ color: RC.white45, fontFamily: 'Inter, system-ui, sans-serif' }}>
                {s.desc}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────
export function AnaerobicDigestionDiagram({
  title   = 'The Four Stages of Anaerobic Digestion',
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
          style={{ background: RC.greenDim, color: RC.green, fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          RC Diagram · 01–05
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <ADFlowSVG active={active} setActive={setActive} />
      </div>

      {/* Legend / index */}
      <Legend active={active} setActive={setActive} />

      {/* Caption */}
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
