// ─────────────────────────────────────────────────────────────────────────────
// PumpedStorageHydroDiagram — RC Diagram Design Language v1.2 (comparison-panel variant)
//
// Cross-section diagram illustrating how pumped-storage hydropower (PSH) works
// as the world's dominant form of grid-scale energy storage. Two panels show
// the SAME system in its two operating modes side by side — Generation
// (discharge) and Charging (pumping) — so this follows the comparison-panel
// shape (see FixedFoundationTypesDiagram.tsx, the reference build) rather than
// the callout-line shape: the interactive unit is a whole panel, not a single
// labelled part.
//
// Left panel — GENERATION MODE (discharge):
//   Upper reservoir → Penstock → Turbine → Lower reservoir
//   Grid receives electricity
//
// Right panel — CHARGING MODE (pumping):
//   Lower reservoir → Pump → Penstock → Upper reservoir
//   Grid supplies surplus electricity
//
// Centre — key facts panel (static, shared by both modes)
// Bottom — source note
//
// All original SVG geometry/illustration is preserved exactly — only the
// BlueprintFrame signature, staggered entrance, hover/tap/focus interactivity
// with sibling-dimming, and the mobile-legibility fix (inline SVG text
// hidden below 768px, HTML legend carries the reading) have been added.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'
// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:       brand.green,
  greenDim:    rcRgba(brand.green, 0.12),
  greenMid:    rcRgba(brand.green, 0.38),
  greenBright: rcRgba(brand.green, 0.65),
  amber:       brand.amber,
  amberDim:    rcRgba(brand.amber, 0.12),
  amberMid:    rcRgba(brand.amber, 0.40),
  blue:        brand.blue,
  blueDim:     rcRgba(brand.blue, 0.14),
  blueMid:     rcRgba(brand.blue, 0.42),
  blueBright:  rcRgba(brand.blue, 0.80),
  cyan:        '#29B6D8',
  cyanDim:     'rgba(41,182,216,0.14)',
  cyanMid:     'rgba(41,182,216,0.40)',
  white90:     'rgba(255,255,255,0.90)',
  white70:     'rgba(255,255,255,0.70)',
  white50:     'rgba(255,255,255,0.50)',
  white35:     'rgba(255,255,255,0.35)',
  white20:     'rgba(255,255,255,0.20)',
  white12:     'rgba(255,255,255,0.12)',
  white08:     'rgba(255,255,255,0.08)',
  cardBg:      'rgba(10,15,20,0.85)',
  cardBorder:  'rgba(255,255,255,0.08)',
}

const W = 940
const H = 540

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
      /* Same mobile fix as the other comparison-panel diagrams: below ~768px
         the diagram has shrunk enough that inline SVG text is no longer
         legible. Hide it and let the legend/detail cards (plain HTML, always
         full-size) carry the reading. */
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
        <pattern id="rcGridPS" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white08} />
        </pattern>
        <radialGradient id="rcGlowPS" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.blue, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.blue, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridPS)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowPS)" />
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

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: mode panel (generation or charging)
// ─────────────────────────────────────────────────────────────────────────────

function MountainShape({ x, peakX, peakY, baseY, fill, stroke }: {
  x: number; peakX: number; peakY: number; baseY: number; fill: string; stroke: string
}) {
  return (
    <polygon
      points={`${x},${baseY} ${peakX},${peakY} ${x + 280},${baseY}`}
      fill={fill} stroke={stroke} strokeWidth={1}
    />
  )
}

function WaterRect({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4}
        fill={color} fillOpacity={0.18} stroke={color} strokeWidth={1.5} strokeOpacity={0.55} />
      {/* Wavy surface lines */}
      {[6, 13].map(dy => (
        <path key={dy}
          d={`M ${x + 8} ${y + dy} q ${w * 0.12} -4 ${w * 0.25} 0 q ${w * 0.12} 4 ${w * 0.25} 0 q ${w * 0.12} -4 ${w * 0.25} 0`}
          fill="none" stroke={color} strokeWidth={1} strokeOpacity={0.40}
        />
      ))}
    </g>
  )
}

// ── Legend / mode summary data (drives HTML legend + badge) ──────────────────
interface ModeData {
  index: number
  name: string
  headline: string
  when: string
  desc: string
  color: string
  dim: string
  mid: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function PumpedStorageHydroDiagram({
  title   = 'How Pumped-Storage Hydropower Works',
  caption,
}: {
  title?: string
  caption?: string
}) {
  const [active, setActive] = useState<number | null>(null)

  const MODES: ModeData[] = [
    {
      index: 1,
      name: 'Generation Mode',
      headline: 'Releasing Energy',
      when: 'When: Peak demand / grid frequency drops',
      desc: 'Water falls through the penstock, the turbine spins, and electricity is generated for the grid.',
      color: RC.green, dim: RC.greenDim, mid: RC.greenMid,
    },
    {
      index: 2,
      name: 'Charging Mode',
      headline: 'Storing Energy',
      when: 'When: Low demand / surplus wind or solar',
      desc: 'Surplus electricity drives the pump, moving water uphill where it is stored as potential energy.',
      color: RC.amber, dim: RC.amberDim, mid: RC.amberMid,
    },
  ]

  // ── Layout constants ───────────────────────────────────────────────────────
  const TOP_Y       = 48    // top of diagram area
  const PANEL_W     = 370
  const L_X         = 28   // left panel start
  const R_X         = W - PANEL_W - 28  // right panel start
  const CENTRE_X    = L_X + PANEL_W     // centre divider x

  // Mountain geometry (left panel — generation)
  const LM_BASE_Y   = 380
  const LM_PEAK_X   = L_X + 130
  const LM_PEAK_Y   = 130

  // Mountain geometry (right panel — charging, mirrored)
  const RM_BASE_Y   = 380
  const RM_PEAK_X   = R_X + 140
  const RM_PEAK_Y   = 130

  // Upper/lower reservoir sizes
  const RES_W       = 100
  const RES_H       = 26
  const UP_RES_Y    = 158   // upper reservoir top-y (sits on mountain near peak)
  const LO_RES_Y    = 350   // lower reservoir top-y

  // Powerhouse box
  const PH_W        = 64
  const PH_H        = 52
  const L_PH_X      = L_X + 190   // powerhouse x (gen panel, right side of mountain)
  const L_PH_Y      = 295
  const R_PH_X      = R_X + 42    // powerhouse x (charge panel, left side of mountain)
  const R_PH_Y      = 295

  const isDimmed = (idx: number) => active !== null && active !== idx

  return (
    <figure
      className="my-8 rounded-xl overflow-hidden w-full"
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
            style={{ color: RC.white90, fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            {title}
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white50, fontFamily: 'Inter, system-ui, sans-serif' }}>
            The world's dominant form of grid-scale storage — tap a mode below to highlight it
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.blueDim, color: RC.blue, fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          RC Diagram · 01–02
        </span>
      </div>

      {/* SVG */}
      <div className="px-4 py-5 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', maxWidth: W, display: 'block', margin: '0 auto' }}
          aria-label={title}
        >
          <defs>
            {/* Arrowhead — green (generation) */}
            <marker id="psh-arrow-gen" markerWidth="8" markerHeight="8"
              refX="4" refY="3" orient="auto">
              <polygon points="0 0, 7 3, 0 6" fill={RC.green} fillOpacity={0.70} />
            </marker>
            {/* Arrowhead — amber (charging) */}
            <marker id="psh-arrow-chg" markerWidth="8" markerHeight="8"
              refX="4" refY="3" orient="auto">
              <polygon points="0 0, 7 3, 0 6" fill={RC.amber} fillOpacity={0.70} />
            </marker>
            {/* Arrowhead — blue (grid) */}
            <marker id="psh-arrow-grid" markerWidth="8" markerHeight="8"
              refX="4" refY="3" orient="auto">
              <polygon points="0 0, 7 3, 0 6" fill={RC.blue} fillOpacity={0.80} />
            </marker>
          </defs>

          <BlueprintFrame w={W} h={H} />

          {/* ── Card background ───────────────────────────────────────────── */}
          <rect width={W} height={H} rx={14}
            fill="none" stroke={RC.cardBorder} strokeWidth={1} />

          {/* ── Centre divider / key facts panel (static, shared by both modes) ── */}
          <rect x={CENTRE_X + 2} y={TOP_Y} width={W - PANEL_W * 2 - 60} height={H - TOP_Y - 20} rx={8}
            fill={RC.white08} stroke={RC.cardBorder} strokeWidth={1} />

          {/* VS label */}
          <text x={(L_X + PANEL_W + R_X) / 2} y={TOP_Y + 30}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={14} fontWeight="900"
            fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}>
            ↔
          </text>

          {/* Key facts */}
          {[
            { label: 'GLOBAL PSH', value: '~180 GW' },
            { label: 'STORAGE SHARE', value: '>90%' },
            { label: 'RESPONSE TIME', value: '<60 sec' },
            { label: 'ROUND-TRIP EFF.', value: '70–85%' },
            { label: 'LIFESPAN', value: '50–100 yr' },
          ].map((f, i) => (
            <g key={i}>
              <text
                x={(L_X + PANEL_W + R_X) / 2} y={TOP_Y + 65 + i * 60}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={8.5} letterSpacing="0.07em"
                fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}>
                {f.label}
              </text>
              <text
                x={(L_X + PANEL_W + R_X) / 2} y={TOP_Y + 83 + i * 60}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={15} fontWeight="700"
                fontFamily="Inter, system-ui, sans-serif" fill={RC.blue}>
                {f.value}
              </text>
            </g>
          ))}

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* LEFT PANEL — GENERATION MODE (interactive unit 01)               */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <g
            className="rc-panel-hit"
            style={{ opacity: isDimmed(1) ? 0.32 : 1 }}
            tabIndex={0}
            role="button"
            aria-label="Highlight Generation Mode"
            onMouseEnter={() => setActive(1)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(1)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === 1 ? null : 1)}
          >
            <g className="rc-panel-enter" style={{ '--rc-delay': '0.08s' } as React.CSSProperties}>

              {/* Mode header label */}
              <rect x={L_X} y={TOP_Y} width={PANEL_W} height={30} rx={8}
                fill={RC.greenDim} stroke={RC.greenMid} strokeWidth={1} />
              <text className="rc-panel-label" x={L_X + PANEL_W / 2} y={TOP_Y + 15}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={11} fontWeight="700" letterSpacing="0.08em"
                fontFamily="Inter, system-ui, sans-serif" fill={RC.green}>
                ⚡ GENERATION MODE — Releasing Energy
              </text>

              {/* Mountain */}
              <MountainShape
                x={L_X} peakX={LM_PEAK_X} peakY={LM_PEAK_Y} baseY={LM_BASE_Y}
                fill="rgba(40,55,70,0.60)" stroke={RC.white12}
              />

              {/* Upper reservoir — generation (high) */}
              <WaterRect x={LM_PEAK_X - RES_W / 2} y={UP_RES_Y} w={RES_W} h={RES_H} color={RC.green} />
              <text className="rc-panel-label" x={LM_PEAK_X} y={UP_RES_Y - 10}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={9} fontWeight="600"
                fontFamily="Inter, system-ui, sans-serif" fill={RC.green}>
                UPPER RESERVOIR
              </text>
              <text className="rc-panel-label" x={LM_PEAK_X} y={UP_RES_Y - 22}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={8} fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}>
                HIGH LEVEL (full)
              </text>

              {/* Penstock — generation (water flows DOWN, left panel) */}
              {/* Diagonal pipe from upper res to powerhouse */}
              <line
                x1={LM_PEAK_X + 24} y1={UP_RES_Y + RES_H}
                x2={L_PH_X + 12}    y2={L_PH_Y}
                stroke={RC.green} strokeWidth={5} strokeOpacity={0.35}
              />
              {/* Water flow arrow on penstock */}
              <line
                x1={LM_PEAK_X + 24} y1={UP_RES_Y + RES_H + 20}
                x2={L_PH_X + 12}    y2={L_PH_Y - 12}
                stroke={RC.green} strokeWidth={2} strokeOpacity={0.75}
                strokeDasharray="6 3"
                markerEnd="url(#psh-arrow-gen)"
              />
              <text className="rc-panel-label"
                x={(LM_PEAK_X + 24 + L_PH_X + 12) / 2 - 28}
                y={(UP_RES_Y + RES_H + 20 + L_PH_Y - 12) / 2 - 4}
                textAnchor="middle" fontSize={8}
                fontFamily="Inter, system-ui, sans-serif" fill={RC.green} fillOpacity={0.80}
                transform={`rotate(-38, ${(LM_PEAK_X + 24 + L_PH_X + 12) / 2 - 28}, ${(UP_RES_Y + RES_H + 20 + L_PH_Y - 12) / 2 - 4})`}>
                PENSTOCK
              </text>

              {/* Powerhouse (generation) */}
              <rect x={L_PH_X} y={L_PH_Y} width={PH_W} height={PH_H} rx={6}
                fill={RC.greenDim} stroke={RC.green} strokeWidth={1.5} />
              <text className="rc-panel-label" x={L_PH_X + PH_W / 2} y={L_PH_Y + 18}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={9} fontWeight="700"
                fontFamily="Inter, system-ui, sans-serif" fill={RC.green}>
                TURBINE
              </text>
              <text className="rc-panel-label" x={L_PH_X + PH_W / 2} y={L_PH_Y + 32}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={8} fontFamily="Inter, system-ui, sans-serif" fill={RC.white50}>
                GENERATOR
              </text>
              <text x={L_PH_X + PH_W / 2} y={L_PH_Y + 44}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={16} fontFamily="Inter, system-ui, sans-serif" fill={RC.green}>
                ⚙
              </text>

              {/* Lower reservoir (gen panel — low level after use) */}
              <WaterRect x={L_X + PANEL_W - RES_W - 30} y={LO_RES_Y} w={RES_W + 40} h={RES_H} color={RC.blue} />
              <text className="rc-panel-label" x={L_X + PANEL_W - 30 - RES_W / 2 + 20} y={LO_RES_Y + RES_H + 12}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={9} fontWeight="600"
                fontFamily="Inter, system-ui, sans-serif" fill={RC.blue}>
                LOWER RESERVOIR
              </text>
              <text className="rc-panel-label" x={L_X + PANEL_W - 30 - RES_W / 2 + 20} y={LO_RES_Y + RES_H + 24}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={8} fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}>
                LOW LEVEL (filling)
              </text>

              {/* Water exit pipe from powerhouse to lower res */}
              <line
                x1={L_PH_X + PH_W / 2} y1={L_PH_Y + PH_H}
                x2={L_PH_X + PH_W / 2} y2={LO_RES_Y}
                stroke={RC.blue} strokeWidth={4} strokeOpacity={0.35}
              />
              <line
                x1={L_PH_X + PH_W / 2} y1={L_PH_Y + PH_H + 10}
                x2={L_PH_X + PH_W / 2} y2={LO_RES_Y - 6}
                stroke={RC.blue} strokeWidth={2} strokeOpacity={0.70}
                strokeDasharray="6 3"
                markerEnd="url(#psh-arrow-grid)"
              />

              {/* Grid output arrow from powerhouse */}
              <line
                x1={L_PH_X + PH_W} y1={L_PH_Y + PH_H / 2}
                x2={L_X + PANEL_W - 4} y2={L_PH_Y + PH_H / 2}
                stroke={RC.green} strokeWidth={2} strokeOpacity={0.70}
                markerEnd="url(#psh-arrow-gen)"
              />
              <text className="rc-panel-label" x={L_PH_X + PH_W + 12} y={L_PH_Y + PH_H / 2 - 10}
                fontSize={9} fontWeight="600"
                fontFamily="Inter, system-ui, sans-serif" fill={RC.green}>
                ELECTRICITY
              </text>
              <text className="rc-panel-label" x={L_PH_X + PH_W + 12} y={L_PH_Y + PH_H / 2 + 2}
                fontSize={9} fontFamily="Inter, system-ui, sans-serif" fill={RC.white50}>
                TO GRID ⚡
              </text>

              {/* "HIGH DEMAND" context */}
              <rect x={L_X + 8} y={LM_BASE_Y + 6} width={PANEL_W - 16} height={36} rx={6}
                fill={RC.greenDim} stroke={RC.greenMid} strokeWidth={0.8} />
              <text className="rc-panel-label" x={L_X + PANEL_W / 2} y={LM_BASE_Y + 17}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={9} fontWeight="700"
                fontFamily="Inter, system-ui, sans-serif" fill={RC.green}>
                When: Peak demand / grid frequency drops
              </text>
              <text className="rc-panel-label" x={L_X + PANEL_W / 2} y={LM_BASE_Y + 30}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={8.5} fontFamily="Inter, system-ui, sans-serif" fill={RC.white50}>
                Water falls through penstock → turbine spins → electricity generated
              </text>
            </g>
          </g>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* RIGHT PANEL — CHARGING MODE (interactive unit 02)                */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <g
            className="rc-panel-hit"
            style={{ opacity: isDimmed(2) ? 0.32 : 1 }}
            tabIndex={0}
            role="button"
            aria-label="Highlight Charging Mode"
            onMouseEnter={() => setActive(2)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(2)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === 2 ? null : 2)}
          >
            <g className="rc-panel-enter" style={{ '--rc-delay': '0.16s' } as React.CSSProperties}>

              {/* Mode header label */}
              <rect x={R_X} y={TOP_Y} width={PANEL_W} height={30} rx={8}
                fill={RC.amberDim} stroke={RC.amberMid} strokeWidth={1} />
              <text className="rc-panel-label" x={R_X + PANEL_W / 2} y={TOP_Y + 15}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={11} fontWeight="700" letterSpacing="0.08em"
                fontFamily="Inter, system-ui, sans-serif" fill={RC.amber}>
                🔋 CHARGING MODE — Storing Energy
              </text>

              {/* Mountain */}
              <MountainShape
                x={R_X} peakX={RM_PEAK_X} peakY={RM_PEAK_Y} baseY={RM_BASE_Y}
                fill="rgba(40,55,70,0.60)" stroke={RC.white12}
              />

              {/* Upper reservoir (charge panel — low, being filled) */}
              <WaterRect x={RM_PEAK_X - RES_W / 2} y={UP_RES_Y} w={RES_W} h={RES_H} color={RC.amber} />
              <text className="rc-panel-label" x={RM_PEAK_X} y={UP_RES_Y - 10}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={9} fontWeight="600"
                fontFamily="Inter, system-ui, sans-serif" fill={RC.amber}>
                UPPER RESERVOIR
              </text>
              <text className="rc-panel-label" x={RM_PEAK_X} y={UP_RES_Y - 22}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={8} fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}>
                HIGH LEVEL (filling)
              </text>

              {/* Penstock — charging (water pumped UP) */}
              <line
                x1={R_PH_X + PH_W - 12} y1={R_PH_Y}
                x2={RM_PEAK_X - 24}      y2={UP_RES_Y + RES_H}
                stroke={RC.amber} strokeWidth={5} strokeOpacity={0.35}
              />
              {/* Flow arrow (upward) */}
              <line
                x1={R_PH_X + PH_W - 12} y1={R_PH_Y - 12}
                x2={RM_PEAK_X - 24}      y2={UP_RES_Y + RES_H + 20}
                stroke={RC.amber} strokeWidth={2} strokeOpacity={0.75}
                strokeDasharray="6 3"
                markerEnd="url(#psh-arrow-chg)"
              />
              <text className="rc-panel-label"
                x={(R_PH_X + PH_W - 12 + RM_PEAK_X - 24) / 2 + 20}
                y={(R_PH_Y - 12 + UP_RES_Y + RES_H + 20) / 2 + 6}
                textAnchor="middle" fontSize={8}
                fontFamily="Inter, system-ui, sans-serif" fill={RC.amber} fillOpacity={0.80}
                transform={`rotate(38, ${(R_PH_X + PH_W - 12 + RM_PEAK_X - 24) / 2 + 20}, ${(R_PH_Y - 12 + UP_RES_Y + RES_H + 20) / 2 + 6})`}>
                PENSTOCK
              </text>

              {/* Powerhouse (charging) */}
              <rect x={R_PH_X} y={R_PH_Y} width={PH_W} height={PH_H} rx={6}
                fill={RC.amberDim} stroke={RC.amber} strokeWidth={1.5} />
              <text className="rc-panel-label" x={R_PH_X + PH_W / 2} y={R_PH_Y + 18}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={9} fontWeight="700"
                fontFamily="Inter, system-ui, sans-serif" fill={RC.amber}>
                PUMP
              </text>
              <text className="rc-panel-label" x={R_PH_X + PH_W / 2} y={R_PH_Y + 32}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={8} fontFamily="Inter, system-ui, sans-serif" fill={RC.white50}>
                MOTOR
              </text>
              <text x={R_PH_X + PH_W / 2} y={R_PH_Y + 44}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={16} fontFamily="Inter, system-ui, sans-serif" fill={RC.amber}>
                ⚙
              </text>

              {/* Lower reservoir (charge panel — full, ready to pump) */}
              <WaterRect x={R_X + 28} y={LO_RES_Y} w={RES_W + 40} h={RES_H} color={RC.cyan} />
              <text className="rc-panel-label" x={R_X + 28 + (RES_W + 40) / 2} y={LO_RES_Y + RES_H + 12}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={9} fontWeight="600"
                fontFamily="Inter, system-ui, sans-serif" fill={RC.cyan}>
                LOWER RESERVOIR
              </text>
              <text className="rc-panel-label" x={R_X + 28 + (RES_W + 40) / 2} y={LO_RES_Y + RES_H + 24}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={8} fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}>
                LOW LEVEL (draining)
              </text>

              {/* Pump intake from lower res */}
              <line
                x1={R_PH_X + PH_W / 2} y1={LO_RES_Y}
                x2={R_PH_X + PH_W / 2} y2={R_PH_Y + PH_H}
                stroke={RC.cyan} strokeWidth={4} strokeOpacity={0.35}
              />
              <line
                x1={R_PH_X + PH_W / 2} y1={LO_RES_Y - 6}
                x2={R_PH_X + PH_W / 2} y2={R_PH_Y + PH_H + 10}
                stroke={RC.cyan} strokeWidth={2} strokeOpacity={0.70}
                strokeDasharray="6 3"
                markerEnd="url(#psh-arrow-chg)"
              />

              {/* Grid input arrow to powerhouse */}
              <line
                x1={R_X + 4} y1={R_PH_Y + PH_H / 2}
                x2={R_PH_X}  y2={R_PH_Y + PH_H / 2}
                stroke={RC.amber} strokeWidth={2} strokeOpacity={0.70}
                markerEnd="url(#psh-arrow-chg)"
              />
              <text className="rc-panel-label" x={R_X + 6} y={R_PH_Y + PH_H / 2 - 10}
                fontSize={9} fontWeight="600"
                fontFamily="Inter, system-ui, sans-serif" fill={RC.amber}>
                ELECTRICITY
              </text>
              <text className="rc-panel-label" x={R_X + 6} y={R_PH_Y + PH_H / 2 + 2}
                fontSize={9} fontFamily="Inter, system-ui, sans-serif" fill={RC.white50}>
                FROM GRID ⚡
              </text>

              {/* "SURPLUS ENERGY" context */}
              <rect x={R_X + 8} y={RM_BASE_Y + 6} width={PANEL_W - 16} height={36} rx={6}
                fill={RC.amberDim} stroke={RC.amberMid} strokeWidth={0.8} />
              <text className="rc-panel-label" x={R_X + PANEL_W / 2} y={RM_BASE_Y + 17}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={9} fontWeight="700"
                fontFamily="Inter, system-ui, sans-serif" fill={RC.amber}>
                When: Low demand / surplus wind or solar
              </text>
              <text className="rc-panel-label" x={R_X + PANEL_W / 2} y={RM_BASE_Y + 30}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={8.5} fontFamily="Inter, system-ui, sans-serif" fill={RC.white50}>
                Surplus electricity drives pump → water stored as potential energy
              </text>
            </g>
          </g>

          {/* ── "REVERSIBLE TURBINE" label centre ─────────────────────────── */}
          <text x={W / 2} y={310}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={8} fontFamily="Inter, system-ui, sans-serif"
            fill={RC.white35} letterSpacing="0.06em">
            ← REVERSIBLE PUMP-TURBINE →
          </text>

          {/* ── Source note ───────────────────────────────────────────────── */}
          <text x={W / 2} y={H - 10}
            textAnchor="middle"
            fontSize={8} fontFamily="Inter, system-ui, sans-serif"
            fill={RC.white35}>
            Source: IEA Electricity Security — Pumped-Storage Hydropower (2022); IHA Hydropower Status Report 2024
          </text>
        </svg>
      </div>

      {/* Legend / mode summary — carries the reading on mobile once the inline
          SVG text above is hidden below 767px */}
      <div
        className="px-6 py-4 flex flex-wrap gap-x-6 gap-y-3"
        style={{ borderTop: `1px solid ${RC.cardBorder}` }}
      >
        {MODES.map((m) => {
          const isActive = active === m.index
          return (
            <div
              key={m.index}
              className="rc-legend-item flex items-start gap-2.5 min-w-[240px] flex-1 rounded-md px-1.5 py-1 -mx-1.5"
              style={{
                background: isActive ? rcRgba(m.color, 0.10) : 'transparent',
                border: `1px solid ${isActive ? m.mid : 'transparent'}`,
              }}
              tabIndex={0}
              role="button"
              aria-label={`Highlight ${m.name}`}
              onMouseEnter={() => setActive(m.index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(m.index)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active === m.index ? null : m.index)}
            >
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
                style={{ background: rcRgba(m.color, isActive ? 0.28 : 0.16), border: `1px solid ${m.color}`, color: m.color, fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                {String(m.index).padStart(2, '0')}
              </span>
              <span>
                <span className="block text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white70, fontFamily: 'Inter, system-ui, sans-serif' }}>
                  {m.name} — {m.headline}
                </span>
                <span className="block text-[11px] mt-0.5" style={{ color: RC.white50, fontFamily: 'Inter, system-ui, sans-serif' }}>
                  {m.desc}
                </span>
                <span className="block text-[10.5px] mt-0.5" style={{ color: m.color, fontFamily: 'Inter, system-ui, sans-serif' }}>
                  {m.when}
                </span>
              </span>
            </div>
          )
        })}
      </div>

      {caption && (
        <figcaption
          className="px-6 py-3 text-xs"
          style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white35, fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
