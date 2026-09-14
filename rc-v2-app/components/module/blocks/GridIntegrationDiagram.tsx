// ─────────────────────────────────────────────────────────────────────────────
// GridIntegrationDiagram — RC Diagram Design Language v1.2 (process-flow variant)
//
// Five-stage horizontal flow schematic showing how onshore wind connects
// to the national grid and delivers electricity to homes:
//
//  [Wind Farm] → [Farm Transformer] → [HV Transmission] → [Grid Substation] → [Homes]
//
// This is the reference build for the "process-flow" shape — diagrams that
// walk through ordered stages connected by arrows, rather than labelling
// parts of one system (callout-line) or comparing N variants side by side
// (comparison-panel). Same tokens, BlueprintFrame, staggered entrance, and
// mobile-legibility fix as the other two variants — but the interactive
// unit is a whole stage (icon + label + step badge), and highlighting a
// stage also brightens the arrows feeding into and out of it, since those
// arrows are what makes it a *flow* rather than a row of unrelated parts.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'
// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:      brand.green,
  greenDim:   rcRgba(brand.green, 0.12),
  greenMid:   rcRgba(brand.green, 0.50),
  amber:      brand.amber,
  amberDim:   rcRgba(brand.amber, 0.12),
  amberMid:   rcRgba(brand.amber, 0.45),
  white90:    'rgba(255,255,255,0.90)',
  white65:    'rgba(255,255,255,0.65)',
  white45:    'rgba(255,255,255,0.45)',
  white30:    'rgba(255,255,255,0.30)',
  white15:    'rgba(255,255,255,0.15)',
  white08:    'rgba(255,255,255,0.08)',
  white10:    'rgba(255,255,255,0.08)',
  white18:    'rgba(255,255,255,0.18)',
  cardBg:     'rgba(10,15,20,0.80)',
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
      .rc-legend-item { cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease; }
      .rc-legend-item:focus-visible, .rc-panel-hit:focus-visible {
        outline: 2px solid ${RC.green}; outline-offset: 2px;
      }
      /* Same mobile fix as the other two variants: below ~768px the diagram
         has shrunk enough that inline SVG label/detail text is no longer
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
        <pattern id="rcGridGI" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowGI" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridGI)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowGI)" />
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
const W        = 920
const H        = 260
const ICON_Y   = 110    // vertical centre of all icons
const LABEL_Y  = 175    // main stage label y
const DETAIL_Y = 191    // detail line 1 y
const BASE_Y   = 135    // ground level line y

// Five stage centre-x positions
const STAGES = [82, 255, 460, 665, 838]

// ── Icon sub-components ───────────────────────────────────────────────────────

// Three wind turbines in a row
function WindFarmIcon({ cx, cy }: { cx: number; cy: number }) {
  const offsets = [-26, 0, 26]
  return (
    <g>
      {offsets.map((dx, i) => {
        const tx = cx + dx
        const hub = cy - 14
        const baseY = BASE_Y
        return (
          <g key={i}>
            <line x1={tx} y1={hub} x2={tx} y2={baseY}
              stroke={RC.greenMid} strokeWidth={2.5} strokeLinecap="round"/>
            {[0, 120, 240].map((deg) => {
              const rad = (deg * Math.PI) / 180
              return (
                <line key={deg}
                  x1={tx} y1={hub}
                  x2={tx + Math.sin(rad) * 14}
                  y2={hub - Math.cos(rad) * 14}
                  stroke={RC.green} strokeWidth={1.8} strokeLinecap="round"
                />
              )
            })}
            <circle cx={tx} cy={hub} r={3} fill={RC.green}/>
          </g>
        )
      })}
      <line x1={cx - 42} y1={BASE_Y} x2={cx + 42} y2={BASE_Y}
        stroke={RC.white15} strokeWidth={1}/>
    </g>
  )
}

// Step-up transformer box with voltage arrow
function TransformerIcon({ cx, cy }: { cx: number; cy: number }) {
  const boxTop = cy - 24
  const boxBot = cy + 18
  return (
    <g>
      <rect x={cx - 26} y={boxTop} width={52} height={boxBot - boxTop} rx={5}
        fill={RC.greenDim} stroke={RC.green} strokeWidth={1.8}/>
      {/* Up arrow (voltage step-up) */}
      <line x1={cx} y1={cy + 10} x2={cx} y2={cy - 10}
        stroke={RC.green} strokeWidth={2} strokeLinecap="round"/>
      <polygon
        points={`${cx},${cy - 16} ${cx - 5},${cy - 8} ${cx + 5},${cy - 8}`}
        fill={RC.green}/>
      {/* kV label */}
      <text x={cx} y={cy + 32}
        textAnchor="middle" fontSize={7.5} fontWeight="600"
        fontFamily="Montserrat, sans-serif" fill={RC.green}>
        ↑ kV
      </text>
      <line x1={cx - 42} y1={BASE_Y} x2={cx + 42} y2={BASE_Y}
        stroke={RC.white15} strokeWidth={1}/>
    </g>
  )
}

// Two transmission pylons with sagging power lines
function TransmissionIcon({ cx, cy }: { cx: number; cy: number }) {
  const p1 = cx - 26
  const p2 = cx + 26
  const pylonTop = cy - 30
  return (
    <g>
      {/* Pylons */}
      {[p1, p2].map((px, i) => (
        <g key={i}>
          <line x1={px} y1={pylonTop} x2={px} y2={BASE_Y}
            stroke={RC.white45} strokeWidth={1.5}/>
          <line x1={px - 12} y1={pylonTop + 6} x2={px + 12} y2={pylonTop + 6}
            stroke={RC.white45} strokeWidth={1.5}/>
          <line x1={px - 8} y1={pylonTop + 16} x2={px + 8} y2={pylonTop + 16}
            stroke={RC.white45} strokeWidth={1.5}/>
          {/* Diagonal braces */}
          <line x1={px - 6} y1={BASE_Y - 10} x2={px} y2={pylonTop + 22}
            stroke={RC.white30} strokeWidth={1}/>
          <line x1={px + 6} y1={BASE_Y - 10} x2={px} y2={pylonTop + 22}
            stroke={RC.white30} strokeWidth={1}/>
        </g>
      ))}
      {/* Sagging power lines — 3 cables */}
      {[-6, 0, 6].map((dy, i) => (
        <path key={i}
          d={`M ${p1 - 12},${pylonTop + 6 + dy * 0.5} Q ${cx},${pylonTop + 20 + Math.abs(dy) * 2} ${p2 + 12},${pylonTop + 6 + dy * 0.5}`}
          stroke="rgba(255,210,60,0.55)" fill="none" strokeWidth={0.9}
        />
      ))}
      <line x1={cx - 50} y1={BASE_Y} x2={cx + 50} y2={BASE_Y}
        stroke={RC.white15} strokeWidth={1}/>
    </g>
  )
}

// Main grid substation
function SubstationIcon({ cx, cy }: { cx: number; cy: number }) {
  const top = cy - 26
  const bot = cy + 18
  return (
    <g>
      {/* Main building */}
      <rect x={cx - 28} y={top} width={56} height={bot - top} rx={4}
        fill={RC.amberDim} stroke={RC.amber} strokeWidth={1.8}/>
      {/* Grid symbol */}
      <line x1={cx - 12} y1={cy - 4} x2={cx + 12} y2={cy - 4}
        stroke={RC.amber} strokeWidth={1.5}/>
      <line x1={cx - 12} y1={cy + 4} x2={cx + 12} y2={cy + 4}
        stroke={RC.amber} strokeWidth={1.5}/>
      {[cx - 12, cx - 4, cx + 4, cx + 12].map((bx, i) => (
        <line key={i} x1={bx} y1={cy - 8} x2={bx} y2={cy + 8}
          stroke={RC.amber} strokeWidth={1.5}/>
      ))}
      {/* Insulators on top */}
      {[cx - 14, cx, cx + 14].map((ix, i) => (
        <g key={i}>
          <circle cx={ix} cy={top - 4} r={3.5} fill={RC.amberDim} stroke={RC.amber} strokeWidth={1}/>
          <line x1={ix} y1={top} x2={ix} y2={top - 8}
            stroke={RC.amber} strokeWidth={1} opacity={0.6}/>
        </g>
      ))}
      <line x1={cx - 44} y1={BASE_Y} x2={cx + 44} y2={BASE_Y}
        stroke={RC.white15} strokeWidth={1}/>
    </g>
  )
}

// Cluster of two houses
function HomesIcon({ cx, cy }: { cx: number; cy: number }) {
  const houses: Array<{ dx: number; scale: number }> = [
    { dx: -19, scale: 1.0 },
    { dx:  19, scale: 0.85 },
  ]
  return (
    <g>
      {houses.map(({ dx, scale }, i) => {
        const hx = cx + dx
        const wallTop = cy - 2
        const wallBot = BASE_Y
        const roofPeak = cy - 20 * scale
        return (
          <g key={i}>
            <rect x={hx - 14 * scale} y={wallTop} width={28 * scale} height={wallBot - wallTop} rx={1}
              fill={RC.amberDim} stroke={RC.amber} strokeWidth={1.3}/>
            <polygon
              points={`${hx},${roofPeak} ${hx - 17 * scale},${wallTop} ${hx + 17 * scale},${wallTop}`}
              fill={RC.amberMid} stroke={RC.amber} strokeWidth={1.3}
            />
            <rect x={hx - 4 * scale} y={wallBot - 16 * scale} width={8 * scale} height={16 * scale}
              fill="rgba(218,165,32,0.25)"/>
          </g>
        )
      })}
      <line x1={cx - 44} y1={BASE_Y} x2={cx + 44} y2={BASE_Y}
        stroke={RC.white15} strokeWidth={1}/>
    </g>
  )
}

// ── Single source of truth for every stage ─────────────────────────────────────
interface StageData {
  index:   number
  label:   string
  detail1: string
  detail2: string
  color:   string
  Icon:    ({ cx, cy }: { cx: number; cy: number }) => JSX.Element
}

const STAGE_DATA: StageData[] = [
  { index: 1, label: 'Wind Farm',         detail1: 'Turbines generate AC',      detail2: 'at medium voltage',              color: RC.green,   Icon: WindFarmIcon },
  { index: 2, label: 'Farm Transformer',  detail1: 'Steps voltage up to',       detail2: '33–66 kV for export',            color: RC.green,   Icon: TransformerIcon },
  { index: 3, label: 'HV Transmission',   detail1: 'High-voltage lines carry',  detail2: 'power long distances',           color: RC.white45, Icon: TransmissionIcon },
  { index: 4, label: 'Grid Substation',   detail1: 'Steps voltage down &',      detail2: 'connects to national grid',      color: RC.amber,   Icon: SubstationIcon },
  { index: 5, label: 'Homes & Industry',  detail1: 'Distribution network',      detail2: 'delivers to end users',          color: RC.amber,   Icon: HomesIcon },
]

// ── Arrow between two stage centres ──────────────────────────────────────────
function FlowArrow({ x1, x2, y, active }: { x1: number; x2: number; y: number; active: boolean }) {
  const gap = 6
  const color = active ? RC.white90 : RC.green
  const opacity = active ? 0.9 : 0.6
  return (
    <g style={{ transition: 'opacity 0.18s ease' }}>
      <line x1={x1 + gap} y1={y} x2={x2 - gap - 8} y2={y}
        stroke={color} strokeWidth={active ? 2 : 1.5} strokeLinecap="round" opacity={opacity}/>
      <polygon
        points={`${x2 - gap},${y} ${x2 - gap - 8},${y - 4} ${x2 - gap - 8},${y + 4}`}
        fill={color} opacity={opacity}
      />
    </g>
  )
}

// ── Full diagram SVG ──────────────────────────────────────────────────────────
function GridFlowSVG({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  const arrowY = ICON_Y + 5

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: W, minWidth: 360 }}
      aria-label="Onshore wind grid integration flow diagram"
    >
      <BlueprintFrame w={W} h={H} />

      {/* Arrows between stages — brighten when either connected stage is active */}
      <FlowArrow x1={STAGES[0] + 44} x2={STAGES[1] - 28} y={arrowY} active={active === 1 || active === 2}/>
      <FlowArrow x1={STAGES[1] + 28} x2={STAGES[2] - 52} y={arrowY} active={active === 2 || active === 3}/>
      <FlowArrow x1={STAGES[2] + 52} x2={STAGES[3] - 30} y={arrowY} active={active === 3 || active === 4}/>
      <FlowArrow x1={STAGES[3] + 30} x2={STAGES[4] - 44} y={arrowY} active={active === 4 || active === 5}/>

      {/* Stages — one interactive unit per type */}
      {STAGE_DATA.map((s) => {
        const sx = STAGES[s.index - 1]
        const isActive = active === s.index
        const isDimmed = active !== null && !isActive
        const Icon = s.Icon
        return (
          <g
            key={s.index}
            className="rc-panel-hit"
            style={{ opacity: isDimmed ? 0.32 : 1 }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${s.label}`}
            onMouseEnter={() => setActive(s.index)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(s.index)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === s.index ? null : s.index)}
          >
            <g className="rc-panel-enter" style={{ '--rc-delay': `${s.index * 0.08}s` } as React.CSSProperties}>
              <Icon cx={sx} cy={ICON_Y} />

              <text className="rc-panel-label" x={sx} y={LABEL_Y}
                textAnchor="middle" fontSize={9.5} fontWeight="700"
                fontFamily="Montserrat, sans-serif" fill={isActive ? RC.white90 : s.color}>
                {s.label}
              </text>
              <text className="rc-panel-label" x={sx} y={DETAIL_Y}
                textAnchor="middle" fontSize={7.5}
                fontFamily="Montserrat, sans-serif" fill={RC.white45}>
                {s.detail1}
              </text>
              <text className="rc-panel-label" x={sx} y={DETAIL_Y + 13}
                textAnchor="middle" fontSize={7.5}
                fontFamily="Montserrat, sans-serif" fill={RC.white45}>
                {s.detail2}
              </text>

              {/* Step number badge */}
              <g className="rc-panel-chipgroup">
                <circle cx={sx} cy={H - 28} r={11}
                  fill={rcRgba(s.color, isActive ? 0.32 : 0.16)}
                  stroke={s.color} strokeWidth={1.2}/>
                <text x={sx} y={H - 24}
                  textAnchor="middle" fontSize={9} fontWeight="700"
                  fontFamily="Montserrat, sans-serif" fill={s.color}>
                  {s.index}
                </text>
              </g>
            </g>
          </g>
        )
      })}
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
            className="rc-legend-item flex items-start gap-2.5 min-w-[150px] rounded-md px-1.5 py-1 -mx-1.5"
            style={{
              background: isActive ? rcRgba(s.color, 0.10) : 'transparent',
              border: `1px solid ${isActive ? rcRgba(s.color, 0.35) : 'transparent'}`,
            }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${s.label}`}
            onMouseEnter={() => setActive(s.index)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(s.index)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === s.index ? null : s.index)}
          >
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
              style={{ background: rcRgba(s.color, isActive ? 0.28 : 0.16), border: `1px solid ${s.color}`, color: s.color, fontFamily: "'Montserrat', sans-serif" }}
            >
              {s.index}
            </span>
            <span className="block text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white65, fontFamily: "'Montserrat', sans-serif" }}>
              {s.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export interface GridIntegrationDiagramProps {
  title:    string
  caption?: string
}

export function GridIntegrationDiagram({ title, caption }: GridIntegrationDiagramProps) {
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
        <h3
          className="font-heading font-bold text-base leading-snug flex-1"
          style={{ color: RC.white90, fontFamily: "'Montserrat', sans-serif" }}
        >
          {title}
        </h3>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.greenDim, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · 01–05
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <GridFlowSVG active={active} setActive={setActive} />
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
