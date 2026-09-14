// ─────────────────────────────────────────────────────────────────────────────
// BECCSProcessDiagram — RC Diagram Design Language v1.2 (process-flow variant,
// circular/cyclic adaptation)
//
// Circular flow diagram illustrating the BECCS (Bioenergy with Carbon Capture
// and Storage) negative-emissions cycle, contrasted with conventional
// fossil fuel combustion:
//
//   BECCS cycle (top arc) — the four numbered, interactive stages:
//     [1 Biomass Grows] → absorbs CO₂ from atmosphere
//     [2 Biomass Plant] → generates electricity + releases CO₂
//     [3 Carbon Capture] → captures CO₂ stream
//     [4 Underground Storage] → permanently sequesters CO₂
//     NET RESULT: NEGATIVE EMISSIONS (static conclusion, not a numbered stage)
//
//   Fossil reference (bottom-left callout) — static context, not part of the
//   numbered flow: fossil fuel combustion releases CO₂ with no removal path.
//
//   Key facts panel (right side) — static context: aviation fuel, grid
//   backup, IPCC scenarios. Left as a plain reading list rather than
//   individually interactive callouts; it isn't an enumerable process.
//
// Same tokens, BlueprintFrame, staggered entrance and mobile-legibility
// fix as GridIntegrationDiagram (the reference build). The interactive unit
// is a whole cycle stage — for stage 3 that includes its "CO₂ intercepted"
// annotation, and for stage 4 it includes the underground-storage block
// below it, since together those read as one step in the cycle.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'
// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:       brand.green,
  greenDim:    rcRgba(brand.green, 0.13),
  greenMid:    rcRgba(brand.green, 0.38),
  greenBright: rcRgba(brand.green, 0.70),
  amber:       brand.amber,
  amberDim:    rcRgba(brand.amber, 0.12),
  amberMid:    rcRgba(brand.amber, 0.40),
  amberBright: rcRgba(brand.amber, 0.65),
  blue:        brand.blue,
  blueDim:     rcRgba(brand.blue, 0.12),
  blueMid:     rcRgba(brand.blue, 0.40),
  teal:        brand.teal,
  tealDim:     rcRgba(brand.teal, 0.14),
  tealMid:     rcRgba(brand.teal, 0.40),
  red:         brand.red,
  redDim:      rcRgba(brand.red, 0.12),
  redMid:      rcRgba(brand.red, 0.40),
  white90:     'rgba(255,255,255,0.90)',
  white70:     'rgba(255,255,255,0.70)',
  white50:     'rgba(255,255,255,0.50)',
  white35:     'rgba(255,255,255,0.35)',
  white20:     'rgba(255,255,255,0.20)',
  white15:     'rgba(255,255,255,0.15)',
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
      /* Same mobile fix as the other RC Diagram variants: below ~768px the
         diagram has shrunk enough that inline SVG label/detail text is no
         longer legible. Hide it and let the legend row (plain HTML, always
         full size) carry the reading; the step badge gets a size bump so
         each stage still reads as "a numbered thing". */
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
        <pattern id="rcGridBE" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white15} />
        </pattern>
        <radialGradient id="rcGlowBE" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} rx={14} fill={RC.cardBg} stroke={RC.cardBorder} strokeWidth={1} />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridBE)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowBE)" />
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

const W = 940
const H = 580

// ── BECCS cycle nodes (4 positions along a horizontal top row) ────────────────
// Laid out left-to-right with circular return arrow underneath
const CYCLE_Y    = 140   // centre-y of cycle nodes
const NODE_W     = 155
const NODE_H     = 92
const NODE_RX    = 10
const NODE_XPOS  = [40, 218, 400, 578]   // left edges of 4 nodes

// ── Underground storage (below the cycle) ─────────────────────────────────────
const STORE_X    = 420
const STORE_Y    = 320
const STORE_W    = 200
const STORE_H    = 74

// ── Fossil contrast panel (bottom-left) ──────────────────────────────────────
const FOSSIL_X   = 40
const FOSSIL_Y   = 370
const FOSSIL_W   = 290
const FOSSIL_H   = 90

// ── Key facts panel (right side) ─────────────────────────────────────────────
const FACT_X     = 750
const FACT_Y     = 60
const FACT_W     = 168
const FACT_H     = 340

// ── Net result badges ─────────────────────────────────────────────────────────
const BADGE_Y    = 488

// ── Single source of truth: the 4 numbered cycle stages ───────────────────────
// (node title/line1/line2 text is the original illustration copy, unchanged;
// `label`/`legendDetail` are the friendlier names used in the legend + a11y.)
const nodes = [
  {
    icon: '🌱',
    title: 'BIOMASS GROWTH',
    line1: 'Crops & forests grow,',
    line2: 'absorbing CO₂ from air',
    label: 'Biomass Grows',
    color: RC.green,
    dim:   RC.greenDim,
    mid:   RC.greenMid,
  },
  {
    icon: '🏭',
    title: 'BIOENERGY PLANT',
    line1: 'Biomass combusted;',
    line2: 'electricity generated',
    label: 'Biomass Plant',
    color: RC.amber,
    dim:   RC.amberDim,
    mid:   RC.amberMid,
  },
  {
    icon: '⚗️',
    title: 'CO₂ CAPTURED',
    line1: 'Flue-gas CO₂ captured',
    line2: 'before release to air',
    label: 'Carbon Capture',
    color: RC.blue,
    dim:   RC.blueDim,
    mid:   RC.blueMid,
  },
  {
    icon: '🪨',
    title: 'CO₂ STORED',
    line1: 'Compressed CO₂ piped',
    line2: 'to deep rock formations',
    label: 'Underground Storage',
    color: RC.teal,
    dim:   RC.tealDim,
    mid:   RC.tealMid,
  },
]

// ── Node card ─────────────────────────────────────────────────────────────────
function NodeCard({ x, node, idx }: { x: number; node: typeof nodes[0]; idx: number }) {
  return (
    <g>
      <rect x={x} y={CYCLE_Y - NODE_H / 2} width={NODE_W} height={NODE_H} rx={NODE_RX}
        fill={node.dim} stroke={node.mid} strokeWidth={1.5} />

      {/* Step badge */}
      <g className="rc-panel-chipgroup">
        <circle cx={x + 18} cy={CYCLE_Y - NODE_H / 2 + 14} r={10}
          fill={node.color} fillOpacity={0.25} stroke={node.color} strokeOpacity={0.70} strokeWidth={1} />
        <text x={x + 18} y={CYCLE_Y - NODE_H / 2 + 15}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={10} fontWeight="700" fontFamily="Inter, system-ui, sans-serif"
          fill={node.color}>
          {idx + 1}
        </text>
      </g>

      {/* Icon */}
      <text x={x + NODE_W / 2} y={CYCLE_Y - 18}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={22}>
        {node.icon}
      </text>

      {/* Title */}
      <text className="rc-panel-label" x={x + NODE_W / 2} y={CYCLE_Y + 12}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={10} fontWeight="700" letterSpacing="0.06em"
        fontFamily="Inter, system-ui, sans-serif"
        fill={node.color}>
        {node.title}
      </text>

      {/* Sub lines */}
      <text className="rc-panel-label" x={x + NODE_W / 2} y={CYCLE_Y + 28}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={8.5} fontFamily="Inter, system-ui, sans-serif"
        fill={RC.white70}>
        {node.line1}
      </text>
      <text className="rc-panel-label" x={x + NODE_W / 2} y={CYCLE_Y + 40}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={8.5} fontFamily="Inter, system-ui, sans-serif"
        fill={RC.white70}>
        {node.line2}
      </text>
    </g>
  )
}

// ── Right-facing arrow between nodes ─────────────────────────────────────────
function RightArrow({ x, color, active }: { x: number; color: string; active: boolean }) {
  const opacity = active ? 0.95 : 0.55
  return (
    <g style={{ transition: 'opacity 0.18s ease' }}>
      <line x1={x} y1={CYCLE_Y} x2={x + 14} y2={CYCLE_Y}
        stroke={color} strokeWidth={active ? 2.5 : 2} strokeOpacity={opacity} />
      <polygon
        points={`${x + 18},${CYCLE_Y} ${x + 8},${CYCLE_Y - 5} ${x + 8},${CYCLE_Y + 5}`}
        fill={color} fillOpacity={opacity}
      />
    </g>
  )
}

// ── Full diagram SVG ──────────────────────────────────────────────────────────
function BECCSFlowSVG({
  title, active, setActive,
}: {
  title: string
  active: number | null
  setActive: (n: number | null) => void
}) {
  const stageHit = (idx: number) => ({
    className: 'rc-panel-hit',
    style: { opacity: active !== null && active !== idx + 1 ? 0.32 : 1 },
    tabIndex: 0,
    role: 'button',
    'aria-label': `Highlight ${nodes[idx].label}`,
    onMouseEnter: () => setActive(idx + 1),
    onMouseLeave: () => setActive(null),
    onFocus: () => setActive(idx + 1),
    onBlur: () => setActive(null),
    onClick: () => setActive(active === idx + 1 ? null : idx + 1),
  } as const)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: W, display: 'block', margin: '0 auto' }}
      aria-label={title}
    >
      {/* ── Background / blueprint frame ─────────────────────────────────── */}
      <BlueprintFrame w={W} h={H} />

      {/* ── Header label ────────────────────────────────────────────────── */}
      <text x={390} y={30}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={10} fontWeight="700" letterSpacing="0.10em"
        fontFamily="Inter, system-ui, sans-serif"
        fill={RC.white35}>
        BECCS CARBON CYCLE
      </text>

      {/* ── Atmosphere band ─────────────────────────────────────────────── */}
      <rect x={30} y={56} width={710} height={22} rx={6}
        fill="rgba(74,158,191,0.08)" stroke={RC.blueMid} strokeWidth={0.8} />
      <text x={385} y={67}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={9} fontFamily="Inter, system-ui, sans-serif"
        fill={RC.blue}>
        ATMOSPHERE  —  CO₂ removed by growing biomass; CO₂ not released because it is captured
      </text>

      {/* ── Stage 1: Biomass Grows ──────────────────────────────────────── */}
      <g {...stageHit(0)}>
        <g className="rc-panel-enter" style={{ '--rc-delay': '0.08s' } as React.CSSProperties}>
          {/* CO₂ absorption arc (biomass → atmosphere, upward) */}
          <path
            d={`M ${NODE_XPOS[0] + NODE_W / 2} ${CYCLE_Y - NODE_H / 2} L ${NODE_XPOS[0] + NODE_W / 2} 80`}
            fill="none" stroke={RC.green} strokeWidth={1.5} strokeOpacity={0.50}
            strokeDasharray="4 3"
          />
          <polygon
            points={`${NODE_XPOS[0] + NODE_W / 2},76 ${NODE_XPOS[0] + NODE_W / 2 - 5},86 ${NODE_XPOS[0] + NODE_W / 2 + 5},86`}
            fill={RC.green} fillOpacity={0.50}
          />
          <text className="rc-panel-label" x={NODE_XPOS[0] + NODE_W / 2 - 30} y={100}
            fontSize={8} fontFamily="Inter, system-ui, sans-serif"
            fill={RC.green} fillOpacity={0.80}>
            CO₂ absorbed
          </text>

          <NodeCard x={NODE_XPOS[0]} node={nodes[0]} idx={0} />
        </g>
      </g>

      {/* ── Stage 2: Biomass Plant ──────────────────────────────────────── */}
      <g {...stageHit(1)}>
        <g className="rc-panel-enter" style={{ '--rc-delay': '0.16s' } as React.CSSProperties}>
          <NodeCard x={NODE_XPOS[1]} node={nodes[1]} idx={1} />
        </g>
      </g>

      {/* ── Stage 3: Carbon Capture ─────────────────────────────────────── */}
      <g {...stageHit(2)}>
        <g className="rc-panel-enter" style={{ '--rc-delay': '0.24s' } as React.CSSProperties}>
          {/* CO₂ NOT released (capture arc, node 3 → atmosphere blocked) */}
          <path
            d={`M ${NODE_XPOS[2] + NODE_W / 2} ${CYCLE_Y - NODE_H / 2} L ${NODE_XPOS[2] + NODE_W / 2} 80`}
            fill="none" stroke={RC.blue} strokeWidth={1.5} strokeOpacity={0.50}
            strokeDasharray="4 3"
          />
          {/* Red X to show blocked emission */}
          <line x1={NODE_XPOS[2] + NODE_W / 2 - 7} y1={76}
                x2={NODE_XPOS[2] + NODE_W / 2 + 7} y2={90}
            stroke={RC.red} strokeWidth={2} />
          <line x1={NODE_XPOS[2] + NODE_W / 2 + 7} y1={76}
                x2={NODE_XPOS[2] + NODE_W / 2 - 7} y2={90}
            stroke={RC.red} strokeWidth={2} />
          <text className="rc-panel-label" x={NODE_XPOS[2] + NODE_W / 2 + 10} y={100}
            fontSize={8} fontFamily="Inter, system-ui, sans-serif"
            fill={RC.red} fillOpacity={0.85}>
            CO₂ intercepted
          </text>

          <NodeCard x={NODE_XPOS[2]} node={nodes[2]} idx={2} />
        </g>
      </g>

      {/* ── Right arrows between nodes — brighten with either neighbour ─── */}
      {[0, 1, 2].map(i => (
        <RightArrow
          key={i}
          x={NODE_XPOS[i] + NODE_W + 1}
          color={nodes[i + 1].color}
          active={active === i + 1 || active === i + 2}
        />
      ))}

      {/* ── Stage 4: Underground Storage (node 4 + storage block below) ─── */}
      <g {...stageHit(3)}>
        <g className="rc-panel-enter" style={{ '--rc-delay': '0.32s' } as React.CSSProperties}>
          <NodeCard x={NODE_XPOS[3]} node={nodes[3]} idx={3} />

          {/* Down arrow: node 4 → underground storage */}
          <path
            d={`M ${NODE_XPOS[3] + NODE_W / 2} ${CYCLE_Y + NODE_H / 2} L ${NODE_XPOS[3] + NODE_W / 2} ${STORE_Y}`}
            fill="none" stroke={RC.teal} strokeWidth={2} strokeOpacity={0.55}
          />
          <polygon
            points={`${NODE_XPOS[3] + NODE_W / 2},${STORE_Y + 4} ${NODE_XPOS[3] + NODE_W / 2 - 6},${STORE_Y - 8} ${NODE_XPOS[3] + NODE_W / 2 + 6},${STORE_Y - 8}`}
            fill={RC.teal} fillOpacity={0.55}
          />

          {/* Underground storage block */}
          <rect x={STORE_X} y={STORE_Y} width={STORE_W} height={STORE_H} rx={10}
            fill={RC.tealDim} stroke={RC.teal} strokeWidth={1.5} />
          {/* Rock layer lines */}
          {[8, 18, 28].map(dy => (
            <line key={dy}
              x1={STORE_X + 10} y1={STORE_Y + STORE_H - dy}
              x2={STORE_X + STORE_W - 10} y2={STORE_Y + STORE_H - dy}
              stroke={RC.teal} strokeOpacity={0.15} strokeWidth={1}
            />
          ))}
          <text className="rc-panel-label" x={STORE_X + STORE_W / 2} y={STORE_Y + 24}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={11} fontWeight="700"
            fontFamily="Inter, system-ui, sans-serif"
            fill={RC.teal}>
            UNDERGROUND STORAGE
          </text>
          <text className="rc-panel-label" x={STORE_X + STORE_W / 2} y={STORE_Y + 42}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={9} fontFamily="Inter, system-ui, sans-serif"
            fill={RC.white70}>
            Depleted oil/gas reservoirs
          </text>
          <text className="rc-panel-label" x={STORE_X + STORE_W / 2} y={STORE_Y + 56}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={9} fontFamily="Inter, system-ui, sans-serif"
            fill={RC.white50}>
            Deep saline aquifers · 1+ km depth
          </text>

          {/* Indicates the carbon stays permanently underground — no return */}
          <text className="rc-panel-label" x={STORE_X + STORE_W / 2} y={STORE_Y + STORE_H + 18}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={8} fontFamily="Inter, system-ui, sans-serif"
            fill={RC.white35} fontStyle="italic">
            Permanently sealed — carbon does not return to atmosphere
          </text>
        </g>
      </g>

      {/* ── Fossil contrast box (static — reference context, not a stage) ── */}
      <rect x={FOSSIL_X} y={FOSSIL_Y} width={FOSSIL_W} height={FOSSIL_H} rx={10}
        fill={RC.redDim} stroke={RC.redMid} strokeWidth={1} />
      <text x={FOSSIL_X + 12} y={FOSSIL_Y + 20}
        fontSize={10} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={RC.red} dominantBaseline="middle">
        CONVENTIONAL FOSSIL FUEL (for comparison)
      </text>
      <text x={FOSSIL_X + 12} y={FOSSIL_Y + 40}
        fontSize={9} fontFamily="Inter, system-ui, sans-serif"
        fill={RC.white70} dominantBaseline="middle">
        Fossil carbon burned → 100% CO₂ released to atmosphere
      </text>
      <text x={FOSSIL_X + 12} y={FOSSIL_Y + 57}
        fontSize={9} fontFamily="Inter, system-ui, sans-serif"
        fill={RC.white70} dominantBaseline="middle">
        No biomass growth cycle → no atmospheric CO₂ removal
      </text>
      <text x={FOSSIL_X + 12} y={FOSSIL_Y + 74}
        fontSize={9} fontFamily="Inter, system-ui, sans-serif"
        fill={RC.red} fontWeight="600" dominantBaseline="middle">
        NET: +POSITIVE EMISSIONS — carbon stock permanently depleted
      </text>

      {/* ── Net result badges (static conclusion, not a numbered stage) ─── */}
      <rect x={350} y={BADGE_Y} width={220} height={52} rx={10}
        fill={RC.greenDim} stroke={RC.green} strokeWidth={1.5} />
      <text x={460} y={BADGE_Y + 18}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={12} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={RC.green}>
        BECCS NET RESULT
      </text>
      <text x={460} y={BADGE_Y + 36}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={11} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={RC.green}>
        ✓ NEGATIVE EMISSIONS
      </text>

      {/* ── Key facts panel (static context — not an enumerable process) ── */}
      <rect x={FACT_X} y={FACT_Y} width={FACT_W} height={FACT_H} rx={10}
        fill={RC.white08} stroke={RC.cardBorder} strokeWidth={1} />
      <text x={FACT_X + FACT_W / 2} y={FACT_Y + 18}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={10} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif"
        fill={RC.white70}>
        KEY FACTS
      </text>

      {[
        'IPCC 1.5°C scenarios',
        'require ~2–10 GtCO₂/yr',
        'removed by BECCS by 2050',
        '',
        'Drax Power Station (UK)',
        'world\'s largest BECCS',
        'pilot — 1Mt CO₂/yr target',
        '',
        'Only scalable tech with',
        'proven negative-emission',
        'commercial precedent',
        '',
        'IEA Net Zero 2050:',
        'BECCS contributes ~8%',
        'of total CO₂ removals',
      ].map((line, i) => (
        <text
          key={i}
          x={FACT_X + 10}
          y={FACT_Y + 38 + i * 18}
          fontSize={8.5}
          fontFamily="Inter, system-ui, sans-serif"
          fill={line === '' ? RC.white08 : (line.startsWith('IEA') || line.startsWith('IPCC') || line.startsWith('Drax') || line.startsWith('Only') ? RC.amber : RC.white50)}
          dominantBaseline="middle"
        >
          {line}
        </text>
      ))}

      {/* ── Source note ──────────────────────────────────────────────────── */}
      <text x={W / 2} y={H - 10}
        textAnchor="middle"
        fontSize={8.5}
        fontFamily="Inter, system-ui, sans-serif"
        fill={RC.white35}>
        Sources: IPCC AR6 (2022); IEA Net Zero by 2050 (2021); Drax Group BECCS Update 2023
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
      {nodes.map((node, i) => {
        const idx = i + 1
        const isActive = active === idx
        return (
          <div
            key={idx}
            className="rc-legend-item flex items-start gap-2.5 min-w-[150px] rounded-md px-1.5 py-1 -mx-1.5"
            style={{
              background: isActive ? rcRgba(node.color, 0.10) : 'transparent',
              border: `1px solid ${isActive ? rcRgba(node.color, 0.35) : 'transparent'}`,
            }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${node.label}`}
            onMouseEnter={() => setActive(idx)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(idx)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === idx ? null : idx)}
          >
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
              style={{ background: rcRgba(node.color, isActive ? 0.28 : 0.16), border: `1px solid ${node.color}`, color: node.color, fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              {idx}
            </span>
            <span className="block">
              <span className="block text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white70, fontFamily: 'Inter, system-ui, sans-serif' }}>
                {node.label}
              </span>
              <span className="block text-[11px]" style={{ color: RC.white50, fontFamily: 'Inter, system-ui, sans-serif' }}>
                {node.line1} {node.line2}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function BECCSProcessDiagram({
  title   = 'BECCS — Bioenergy with Carbon Capture & Storage',
  caption,
}: {
  title?: string
  caption?: string
}) {
  const [active, setActive] = useState<number | null>(null)

  return (
    <figure
      className="my-8 rounded-xl overflow-hidden"
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

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <BECCSFlowSVG title={title} active={active} setActive={setActive} />
      </div>

      {/* Legend / index */}
      <Legend active={active} setActive={setActive} />

      {/* Caption */}
      {caption && (
        <figcaption
          className="px-6 py-3 text-xs"
          style={{ borderTop: `1px solid ${RC.cardBorder}`, color: 'rgba(255,255,255,0.30)' }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
