// ─────────────────────────────────────────────────────────────────────────────
// FloatingWindTimelineDiagram — RC Diagram Design Language v1.2 (process-flow variant)
//
// Horizontal milestone timeline tracing floating offshore wind development:
//
//   1990s        2009         2015         2017         2018         2020s        2023
//  Concept     Hywind      Saitec       Hywind      BW Ideol    Commercial    Global
//  Emerges      Demo        SATH        Scotland     Floatgen      Scale      Deployment
//
// A timeline is an ordered sequence of dated milestones, which is the same
// underlying shape as GridIntegrationDiagram's "process-flow" — numbered/
// ordered nodes connected by a line that brightens near the active node,
// plus an HTML legend below. Adapted here for dates instead of numbered
// steps: the interactive unit is a whole milestone (node + connector +
// year/title/description), and highlighting one brightens the axis
// segments feeding into and out of it. Green nodes = prototype/pilot era ·
// amber nodes = commercial era. All original SVG geometry — node
// positions, era brackets, alternating above/below text layout — is
// unchanged; only the interactivity/styling/mobile layer is added.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'
// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:      brand.green,
  greenDim:   rcRgba(brand.green, 0.12),
  greenMid:   rcRgba(brand.green, 0.55),
  amber:      brand.amber,
  amberDim:   rcRgba(brand.amber, 0.12),
  amberMid:   rcRgba(brand.amber, 0.55),
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
      /* Same mobile fix as the other variants: below ~768px the diagram has
         shrunk enough that inline SVG label/detail text is no longer
         legible. Hide it and let the legend row (plain HTML, always full
         size) carry the reading; the node gets a size bump so each
         milestone still reads as "a dated thing". */
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
        <pattern id="rcGridFT" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowFT" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridFT)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowFT)" />
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
const W      = 920
const H      = 340
const AXIS_Y = 178   // horizontal timeline axis
const NODE_R = 8     // milestone circle radius
const PAD_L  = 50    // left padding (first node x)
const PAD_R  = 50    // right padding (last node x)

// ── Milestone definitions ─────────────────────────────────────────────────────
type Side = 'up' | 'down'

interface Milestone {
  index:    number     // 1-based order, used for interactivity + legend
  year:     string
  title:    string
  desc:     string[]   // 2 short text lines
  color:    string     // node fill / accent
  dimColor: string     // node glow background
  side:     Side       // text above ('up') or below ('down') the axis
}

const MILESTONES: Milestone[] = [
  {
    index:    1,
    year:     '1990s',
    title:    'Concept Emerges',
    desc:     ['Fixed-bottom turbines in Denmark;', 'deeper-water potential recognised'],
    color:    RC.green,
    dimColor: RC.greenDim,
    side:     'up',
  },
  {
    index:    2,
    year:     '2009',
    title:    'Hywind Demo',
    desc:     ['World\'s 1st full-scale floating', 'turbine — Equinor spar, Norway'],
    color:    RC.green,
    dimColor: RC.greenDim,
    side:     'down',
  },
  {
    index:    3,
    year:     '2015',
    title:    'Saitec SATH',
    desc:     ['Concrete twin-hull barge with', 'single mooring — oil & gas lessons'],
    color:    RC.green,
    dimColor: RC.greenDim,
    side:     'up',
  },
  {
    index:    4,
    year:     '2017',
    title:    'Hywind Scotland',
    desc:     ['World\'s 1st commercial floating', 'farm — 30 MW off Aberdeenshire'],
    color:    RC.amber,
    dimColor: RC.amberDim,
    side:     'down',
  },
  {
    index:    5,
    year:     '2018',
    title:    'BW Ideol Floatgen',
    desc:     ['World\'s 1st floating barge design', 'for offshore wind, France'],
    color:    RC.green,
    dimColor: RC.greenDim,
    side:     'up',
  },
  {
    index:    6,
    year:     '2020s',
    title:    'Commercial Scale',
    desc:     ['Global pipeline accelerates:', 'ScotWind, Utsira Nord, Redwood Coast'],
    color:    RC.amber,
    dimColor: RC.amberDim,
    side:     'down',
  },
  {
    index:    7,
    year:     '2023',
    title:    'Global Deployment',
    desc:     ['DemoSATH (Spain), Provence Grand', 'Large (25 MW), Guanlan (China)'],
    color:    RC.amber,
    dimColor: RC.amberDim,
    side:     'up',
  },
]

// ── Node x-positions (evenly spaced) ─────────────────────────────────────────
const N    = MILESTONES.length
const SPAN = W - PAD_L - PAD_R
const CX   = MILESTONES.map((_, i) => Math.round(PAD_L + (i / (N - 1)) * SPAN))
// → [50, 187, 323, 460, 597, 733, 870]

// ── Layout y-coordinates for "up" and "down" text blocks ─────────────────────
const UP = {
  titleY:  50,                          // title baseline (above axis)
  desc1Y:  66,                          // desc line 1 baseline
  desc2Y:  81,                          // desc line 2 baseline
  connY1:  92,                          // connector top (just below text)
  connY2:  AXIS_Y - NODE_R - 2,        // connector bottom (just above node) = 168
  yearY:   AXIS_Y + 23,                 // year label (below axis)            = 201
}

const DOWN = {
  yearY:   AXIS_Y - 20,                 // year label (above axis)            = 158
  connY1:  AXIS_Y + NODE_R + 2,         // connector top (just below node)    = 188
  connY2:  228,                         // connector bottom
  titleY:  242,                         // title baseline (below axis)
  desc1Y:  258,                         // desc line 1 baseline
  desc2Y:  273,                         // desc line 2 baseline
}

// ── Era bracket geometry ──────────────────────────────────────────────────────
// Prototype era: nodes 0–4 (1990s → BW Ideol Floatgen)
// Commercial era: nodes 5–6 (2020s → 2023)
const ERA_BRACKET_TOP = 6
const ERA_BRACKET_H   = 20

const PROTO_X1 = CX[0] - 35    //  15
const PROTO_X2 = CX[4] + 45    // 642
const COMM_X1  = CX[5] - 32    // 701
const COMM_X2  = CX[6] + 47    // 917

// ── Axis segment between two adjacent milestones ─────────────────────────────
// Brightens when either endpoint milestone is active — same idea as
// GridIntegrationDiagram's FlowArrow, but the timeline's connector is a
// single continuous axis rather than discrete arrows between icons, so we
// draw it as per-gap segments that can each brighten independently.
function AxisSegment({ x1, x2, y, baseColor, active }: { x1: number; x2: number; y: number; baseColor: string; active: boolean }) {
  return (
    <line
      x1={x1} y1={y} x2={x2} y2={y}
      stroke={active ? RC.white90 : baseColor}
      strokeWidth={active ? 3.5 : 2.5}
      strokeOpacity={active ? 0.95 : 0.55}
      strokeLinecap="round"
      style={{ transition: 'stroke 0.18s ease, stroke-width 0.18s ease, stroke-opacity 0.18s ease' }}
    />
  )
}

// ── Full SVG diagram ──────────────────────────────────────────────────────────
function TimelineSVG({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: W, minWidth: 320 }}
      aria-label="Floating offshore wind historical development timeline"
    >
      <BlueprintFrame w={W} h={H} />

      {/* ── ERA BRACKET: Prototype & Pilot ── */}
      <rect
        x={PROTO_X1} y={ERA_BRACKET_TOP}
        width={PROTO_X2 - PROTO_X1} height={ERA_BRACKET_H}
        rx={5} fill={RC.greenDim} stroke={`${RC.green}35`} strokeWidth={1}
      />
      <text
        x={(PROTO_X1 + PROTO_X2) / 2} y={ERA_BRACKET_TOP + 14}
        textAnchor="middle" fontSize={8} fontWeight="800" letterSpacing="1.2"
        fontFamily="Montserrat, sans-serif" fill={RC.green}
      >
        PROTOTYPE &amp; PILOT ERA
      </text>

      {/* ── ERA BRACKET: Commercial ── */}
      <rect
        x={COMM_X1} y={ERA_BRACKET_TOP}
        width={COMM_X2 - COMM_X1} height={ERA_BRACKET_H}
        rx={5} fill={RC.amberDim} stroke={`${RC.amber}35`} strokeWidth={1}
      />
      <text
        x={(COMM_X1 + COMM_X2) / 2} y={ERA_BRACKET_TOP + 14}
        textAnchor="middle" fontSize={8} fontWeight="800" letterSpacing="1.2"
        fontFamily="Montserrat, sans-serif" fill={RC.amber}
      >
        COMMERCIAL ERA
      </text>

      {/* ── AXIS LINE — drawn as per-gap segments that brighten near the active milestone ── */}
      {MILESTONES.slice(0, -1).map((m, i) => {
        const isActive = active === m.index || active === MILESTONES[i + 1].index
        // Segment colour follows whichever side of the era divide it sits on
        const baseColor = i < 5 ? RC.green : RC.amber
        return (
          <AxisSegment
            key={`seg-${m.index}`}
            x1={CX[i]} x2={CX[i + 1]} y={AXIS_Y}
            baseColor={baseColor}
            active={isActive}
          />
        )
      })}

      {/* ── FUTURE ARROW ── */}
      <polyline
        points={`${CX[N - 1] + 1},${AXIS_Y} ${CX[N - 1] + 22},${AXIS_Y}`}
        stroke={RC.amber} strokeWidth={2} strokeOpacity={0.5}
        strokeLinecap="round"
        markerEnd="none"
      />
      <polygon
        points={`${CX[N - 1] + 22},${AXIS_Y - 4} ${CX[N - 1] + 30},${AXIS_Y} ${CX[N - 1] + 22},${AXIS_Y + 4}`}
        fill={RC.amber} opacity={0.45}
      />
      <text
        x={CX[N - 1] + 34} y={AXIS_Y + 4}
        fontSize={7} fontFamily="Montserrat, sans-serif"
        fill={RC.amber} opacity={0.5}
        fontStyle="italic"
      >
        Future
      </text>

      {/* ── MILESTONES ── */}
      {MILESTONES.map((m, i) => {
        const cx  = CX[i]
        const isUp = m.side === 'up'
        const L   = isUp ? UP : DOWN
        const isActive = active === m.index
        const isDimmed = active !== null && !isActive

        return (
          <g
            key={m.year}
            className="rc-panel-hit"
            style={{ opacity: isDimmed ? 0.32 : 1 }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${m.year} — ${m.title}`}
            onMouseEnter={() => setActive(m.index)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(m.index)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === m.index ? null : m.index)}
          >
            <g className="rc-panel-enter" style={{ '--rc-delay': `${i * 0.07}s` } as React.CSSProperties}>

              {/* Node glow halo */}
              <circle
                cx={cx} cy={AXIS_Y} r={NODE_R + 5}
                fill={m.dimColor}
              />

              {/* Connector line (between text block and node) */}
              <line
                x1={cx} y1={isUp ? UP.connY1 : DOWN.connY1}
                x2={cx} y2={isUp ? UP.connY2 : DOWN.connY2}
                stroke={m.color} strokeWidth={1.2} strokeOpacity={0.5}
                strokeDasharray="3 3"
              />

              {/* Node circle */}
              <g className="rc-panel-chipgroup">
                <circle
                  cx={cx} cy={AXIS_Y} r={NODE_R}
                  fill={m.color} fillOpacity={isActive ? 0.32 : 0.18}
                  stroke={m.color} strokeWidth={2}
                />
                {/* Inner dot */}
                <circle cx={cx} cy={AXIS_Y} r={3} fill={m.color} />
              </g>

              {/* Year label */}
              <text
                className="rc-panel-label"
                x={cx} y={isUp ? UP.yearY : DOWN.yearY}
                textAnchor="middle"
                fontSize={8} fontWeight="700"
                fontFamily="Montserrat, sans-serif"
                fill={m.color}
              >
                {m.year}
              </text>

              {/* Title */}
              <text
                className="rc-panel-label"
                x={cx} y={isUp ? UP.titleY : DOWN.titleY}
                textAnchor="middle"
                fontSize={9.5} fontWeight="700"
                fontFamily="Montserrat, sans-serif"
                fill={isActive ? RC.white90 : RC.white90}
              >
                {m.title}
              </text>

              {/* Description lines */}
              {m.desc.map((line, li) => (
                <text
                  className="rc-panel-label"
                  key={li}
                  x={cx}
                  y={isUp
                    ? (li === 0 ? UP.desc1Y : UP.desc2Y)
                    : (li === 0 ? DOWN.desc1Y : DOWN.desc2Y)
                  }
                  textAnchor="middle"
                  fontSize={7.8}
                  fontFamily="Montserrat, sans-serif"
                  fill={RC.white45}
                >
                  {line}
                </text>
              ))}
            </g>
          </g>
        )
      })}

      {/* ── Vertical divider between eras ── */}
      <line
        x1={(CX[4] + CX[5]) / 2} y1={ERA_BRACKET_TOP + ERA_BRACKET_H + 4}
        x2={(CX[4] + CX[5]) / 2} y2={H - 20}
        stroke={RC.white08} strokeWidth={1} strokeDasharray="3 5"
      />
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
      {MILESTONES.map((m) => {
        const isActive = active === m.index
        return (
          <div
            key={m.index}
            className="rc-legend-item flex items-start gap-2.5 min-w-[170px] max-w-[220px] rounded-md px-1.5 py-1 -mx-1.5"
            style={{
              background: isActive ? rcRgba(m.color, 0.10) : 'transparent',
              border: `1px solid ${isActive ? rcRgba(m.color, 0.35) : 'transparent'}`,
            }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${m.year} — ${m.title}`}
            onMouseEnter={() => setActive(m.index)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(m.index)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === m.index ? null : m.index)}
          >
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
              style={{ background: rcRgba(m.color, isActive ? 0.28 : 0.16), border: `1px solid ${m.color}`, color: m.color, fontFamily: "'Montserrat', sans-serif" }}
            >
              {m.index}
            </span>
            <span className="flex flex-col">
              <span className="block text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white65, fontFamily: "'Montserrat', sans-serif" }}>
                {m.year} · {m.title}
              </span>
              <span className="block text-[11px] leading-snug mt-0.5" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
                {m.desc.join(' ')}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export interface FloatingWindTimelineDiagramProps {
  title:    string
  caption?: string
}

export function FloatingWindTimelineDiagram({ title, caption }: FloatingWindTimelineDiagramProps) {
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
          RC Diagram · Timeline
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <TimelineSVG active={active} setActive={setActive} />
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
