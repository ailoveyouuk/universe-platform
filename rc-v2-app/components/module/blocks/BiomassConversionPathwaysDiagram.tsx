// ─────────────────────────────────────────────────────────────────────────────
// BiomassConversionPathwaysDiagram — RC Diagram Design Language v1.2
//
// Three-column flowchart illustrating the biomass conversion value chain:
//   Feedstocks (6) → Conversion Technologies (5) → Energy Outputs (6)
//
// Unlike the process-flow reference (GridIntegrationDiagram, a single
// five-stage chain), this is a many-to-few-to-many mapping: each of the
// 17 boxes across three columns is its own interactive unit, numbered
// sequentially 1–17 so a single `active` id can be looked up against any
// arrow — feedstock→technology or technology→output — that touches it,
// without needing to know which "stage" it belongs to. Highlighting a
// feedstock brightens its outgoing arrows; highlighting a technology
// brightens both its incoming and outgoing arrows; highlighting an output
// brightens its incoming arrows. Every original Card/arrow/ColHeader
// geometry function is unchanged — only interactivity, numbering, the
// blueprint frame, and mobile-legible legend are layered on top.
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
  amberMid:    rcRgba(brand.amber, 0.40),
  amberBright: rcRgba(brand.amber, 0.60),
  blue:        brand.blue,
  blueDim:     rcRgba(brand.blue, 0.12),
  blueMid:     rcRgba(brand.blue, 0.40),
  blueBright:  rcRgba(brand.blue, 0.65),
  teal:        brand.teal,
  tealDim:     rcRgba(brand.teal, 0.12),
  white90:     'rgba(255,255,255,0.90)',
  white70:     'rgba(255,255,255,0.70)',
  white65:     'rgba(255,255,255,0.65)',
  white50:     'rgba(255,255,255,0.50)',
  white45:     'rgba(255,255,255,0.45)',
  white30:     'rgba(255,255,255,0.30)',
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
      /* Same mobile fix as the other RC Diagram v1.2 variants: below ~768px
         inline SVG label/sub text is no longer legible. Hide it and let the
         grouped legend (plain HTML, always full size) carry the reading;
         the numbered badge gets a size bump so each box still reads as
         "a numbered thing" on its own. */
      @media (max-width: 767px) {
        .rc-panel-label { display: none; }
        .rc-panel-chipgroup { transform-box: fill-box; transform-origin: center; transform: scale(1.35); }
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
        <pattern id="rcGridBC" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowBC" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.07)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridBC)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowBC)" />
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

// ── Canvas dimensions ─────────────────────────────────────────────────────────
const W  = 960
const H  = 640

// ── Column layout ─────────────────────────────────────────────────────────────
const COL1_X   = 30          // feedstocks column left edge
const COL2_X   = 340         // technologies column left edge
const COL3_X   = 650         // outputs column left edge
const CARD_W   = 240
const CARD_H   = 62
const COL_RX   = 8

// ── Row positions for each column ────────────────────────────────────────────
// Feedstocks: 6 items
const F_ROWS   = [80, 155, 230, 305, 380, 455]
// Technologies: 5 items — spread to match feedstock span
const T_ROWS   = [107, 200, 293, 368, 443]
// Outputs: 6 items
const O_ROWS   = [80, 155, 230, 305, 380, 455]

// ── Single source of truth for every box, numbered 1–17 across all
//    three columns so one `active` id can be matched against any edge. ──────
// Feedstocks: ids 1–6
const feedstocks = [
  { id: 1, label: 'Wood & Forest Residues',   icon: '🪵', tech: [0, 1] },   // → combustion, gasification
  { id: 2, label: 'Agricultural Residues',    icon: '🌾', tech: [0, 2, 3] }, // → combustion, AD, fermentation
  { id: 3, label: 'Municipal Solid Waste',    icon: '♻️', tech: [0, 2] },    // → combustion, AD
  { id: 4, label: 'Energy Crops',             icon: '🌿', tech: [0, 3] },    // → combustion, fermentation
  { id: 5, label: 'Wet Waste / Manure',       icon: '💧', tech: [2] },       // → AD
  { id: 6, label: 'Vegetable & Waste Oils',   icon: '🫙', tech: [4] },       // → transesterification
]

// Technologies: ids 7–11 (5 + offset of the 6 feedstocks)
const TECH_OFFSET = 6
const technologies = [
  { id: 7,  label: 'Direct Combustion',   sub: 'Burns biomass for heat/steam', outputs: [0, 1] },
  { id: 8,  label: 'Gasification',        sub: 'Partial oxidation → syngas',   outputs: [2] },
  { id: 9,  label: 'Anaerobic Digestion', sub: 'Microbial breakdown (no O₂)',  outputs: [3] },
  { id: 10, label: 'Fermentation',        sub: 'Yeast/bacteria → ethanol',      outputs: [4] },
  { id: 11, label: 'Transesterification', sub: 'Chemical → biodiesel (FAME)',   outputs: [5] },
]

// Outputs: ids 12–17 (6 + offset of feedstocks + technologies)
const OUTPUT_OFFSET = 11
const outputs = [
  { id: 12, label: 'Heat & Steam',           sub: 'Industrial/domestic heat, CHP' },
  { id: 13, label: 'Electricity',            sub: 'Grid power via steam turbine' },
  { id: 14, label: 'Syngas (H₂/CO)',         sub: 'Fuel for engines or turbines' },
  { id: 15, label: 'Biogas / Biomethane',    sub: 'Grid injection, CHP, transport' },
  { id: 16, label: 'Bioethanol',             sub: 'Transport fuel blend (E5–E85)' },
  { id: 17, label: 'Biodiesel (FAME)',       sub: 'B5–B100 transport fuel blend' },
]

const TOTAL_ITEMS = feedstocks.length + technologies.length + outputs.length // 17

// ── Edges: every feedstock→technology and technology→output connection,
//    each carrying the two box ids it touches so activating either end
//    (or both) can be checked with a single `touches()` test. ───────────────
interface Edge { a: number; b: number; x1: number; y1: number; x2: number; y2: number; color: string; key: string }

const edges: Edge[] = [
  ...feedstocks.flatMap((f) =>
    f.tech.map((ti) => {
      const t = technologies[ti]
      return {
        a: f.id, b: t.id,
        x1: COL1_X + CARD_W, y1: F_ROWS[f.id - 1] + CARD_H / 2,
        x2: COL2_X,           y2: T_ROWS[ti] + CARD_H / 2,
        color: RC.green,
        key: `ft-${f.id}-${t.id}`,
      }
    })
  ),
  ...technologies.flatMap((t, ti) =>
    t.outputs.map((oi) => {
      const o = outputs[oi]
      return {
        a: t.id, b: o.id,
        x1: COL2_X + CARD_W, y1: T_ROWS[ti] + CARD_H / 2,
        x2: COL3_X,           y2: O_ROWS[oi] + CARD_H / 2,
        color: RC.amber,
        key: `to-${t.id}-${o.id}`,
      }
    })
  ),
]

function touches(edge: Edge, active: number | null) {
  return active !== null && (edge.a === active || edge.b === active)
}

// ── Arrow between two box edges — brightens when either connected box
//    is active, generalized from the reference's flanking-stage FlowArrow
//    to "any edge touching the active box". ──────────────────────────────────
function FlowArrow({ x1, y1, x2, y2, baseColor, active }: {
  x1: number; y1: number; x2: number; y2: number; baseColor: string; active: boolean
}) {
  const mx = (x1 + x2) / 2
  const color = active ? RC.white90 : baseColor
  const opacity = active ? 0.9 : 0.4
  return (
    <g style={{ transition: 'opacity 0.18s ease' }}>
      <path
        d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={active ? 2 : 1.5}
        strokeOpacity={opacity}
      />
      <polygon
        points={`${x2},${y2} ${x2 - 6},${y2 - 4} ${x2 - 6},${y2 + 4}`}
        fill={color}
        fillOpacity={opacity}
      />
    </g>
  )
}

// ── Card component (unchanged geometry) ───────────────────────────────────────
function Card({
  x, y, w, h, rx,
  bg, border, label, sub, icon, labelColor,
}: {
  x: number; y: number; w: number; h: number; rx: number
  bg: string; border: string; label: string; sub?: string; icon?: string
  labelColor: string
}) {
  const cy = sub ? y + 20 : y + h / 2
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={rx}
        fill={bg} stroke={border} strokeWidth={1} />
      {icon && (
        <text x={x + 14} y={cy + 4} fontSize={16} dominantBaseline="middle">{icon}</text>
      )}
      <text
        className="rc-panel-label"
        x={icon ? x + 36 : x + 12}
        y={sub ? y + 21 : cy}
        fontSize={11.5}
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="600"
        fill={labelColor}
        dominantBaseline="middle"
      >
        {label}
      </text>
      {sub && (
        <text
          className="rc-panel-label"
          x={x + 12}
          y={y + 42}
          fontSize={9.5}
          fontFamily="Inter, system-ui, sans-serif"
          fill={RC.white50}
          dominantBaseline="middle"
        >
          {sub}
        </text>
      )}
    </g>
  )
}

// ── Column header (unchanged geometry) ────────────────────────────────────────
function ColHeader({ x, label, color }: { x: number; label: string; color: string }) {
  return (
    <g>
      <rect x={x} y={28} width={CARD_W} height={30} rx={6}
        fill={color} fillOpacity={0.18} stroke={color} strokeOpacity={0.4} strokeWidth={1} />
      <text x={x + CARD_W / 2} y={43} textAnchor="middle"
        fontSize={11} fontFamily="Inter, system-ui, sans-serif"
        fontWeight="700" fill={color} dominantBaseline="middle"
        letterSpacing="0.08em"
      >
        {label}
      </text>
    </g>
  )
}

// ── Numbered badge, overlapping the top-right corner of a box ────────────────
function IndexBadge({ x, y, w, id, color, active }: {
  x: number; y: number; w: number; id: number; color: string; active: boolean
}) {
  const cx = x + w - 16
  const cy = y + 14
  return (
    <g className="rc-panel-chipgroup">
      <circle cx={cx} cy={cy} r={9.5}
        fill={rcRgba(color, active ? 0.32 : 0.16)}
        stroke={color} strokeWidth={1.2} />
      <text x={cx} y={cy + 3.5}
        textAnchor="middle" fontSize={8.5} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill={color}>
        {id}
      </text>
    </g>
  )
}

// ── Interactive box wrapper — same rc-panel-hit contract as the reference:
//    hover/focus/click sets `active`, siblings dim to 0.32. ──────────────────
function InteractiveBox({
  id, active, setActive, delayIndex, children,
}: {
  id: number; active: number | null; setActive: (n: number | null) => void
  delayIndex: number; children: React.ReactNode
}) {
  const isActive = active === id
  const isDimmed = active !== null && !isActive
  return (
    <g
      className="rc-panel-hit"
      style={{ opacity: isDimmed ? 0.32 : 1 }}
      tabIndex={0}
      role="button"
      aria-label={`Highlight item ${id}`}
      onMouseEnter={() => setActive(id)}
      onMouseLeave={() => setActive(null)}
      onFocus={() => setActive(id)}
      onBlur={() => setActive(null)}
      onClick={() => setActive(active === id ? null : id)}
    >
      <g className="rc-panel-enter" style={{ '--rc-delay': `${delayIndex * 0.035}s` } as React.CSSProperties}>
        {children}
      </g>
    </g>
  )
}

// ── Full diagram SVG ──────────────────────────────────────────────────────────
function BiomassFlowSVG({ title, active, setActive }: {
  title: string; active: number | null; setActive: (n: number | null) => void
}) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      style={{ maxWidth: W, minWidth: 360, display: 'block', margin: '0 auto' }}
      aria-label={title}
    >
      {/* ── Background ──────────────────────────────────────────────────── */}
      <rect width={W} height={H} rx={14} fill={RC.cardBg} stroke={RC.cardBorder} strokeWidth={1} />

      <BlueprintFrame w={W} h={H} />

      {/* ── Column separators (subtle vertical dividers) ───────────────── */}
      <line x1={320} y1={18} x2={320} y2={H - 18}
        stroke={RC.white15} strokeWidth={1} strokeDasharray="4 4" />
      <line x1={630} y1={18} x2={630} y2={H - 18}
        stroke={RC.white15} strokeWidth={1} strokeDasharray="4 4" />

      {/* ── Column headers ───────────────────────────────────────────────── */}
      <ColHeader x={COL1_X} label="FEEDSTOCKS"             color={RC.green} />
      <ColHeader x={COL2_X} label="CONVERSION TECHNOLOGY"  color={RC.amber} />
      <ColHeader x={COL3_X} label="ENERGY OUTPUTS"          color={RC.blue} />

      {/* ── Arrows — brighten whichever ones touch the active box ───────── */}
      {edges.map((e) => (
        <FlowArrow key={e.key}
          x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          baseColor={e.color} active={touches(e, active)} />
      ))}

      {/* ── Feedstock boxes — ids 1–6 ────────────────────────────────────── */}
      {feedstocks.map((f, i) => (
        <InteractiveBox key={`f-${f.id}`} id={f.id} active={active} setActive={setActive} delayIndex={f.id}>
          <Card
            x={COL1_X} y={F_ROWS[i]} w={CARD_W} h={CARD_H} rx={COL_RX}
            bg={RC.greenDim} border={RC.greenMid}
            label={f.label} icon={f.icon} labelColor={RC.white90}
          />
          <IndexBadge x={COL1_X} y={F_ROWS[i]} w={CARD_W} id={f.id} color={RC.green} active={active === f.id} />
        </InteractiveBox>
      ))}

      {/* ── Technology boxes — ids 7–11 ──────────────────────────────────── */}
      {technologies.map((t, i) => (
        <InteractiveBox key={`t-${t.id}`} id={t.id} active={active} setActive={setActive} delayIndex={t.id}>
          <Card
            x={COL2_X} y={T_ROWS[i]} w={CARD_W} h={CARD_H} rx={COL_RX}
            bg={RC.amberDim} border={RC.amberMid}
            label={t.label} sub={t.sub} labelColor={RC.amber}
          />
          <IndexBadge x={COL2_X} y={T_ROWS[i]} w={CARD_W} id={t.id} color={RC.amber} active={active === t.id} />
        </InteractiveBox>
      ))}

      {/* ── Output boxes — ids 12–17 ─────────────────────────────────────── */}
      {outputs.map((o, i) => (
        <InteractiveBox key={`o-${o.id}`} id={o.id} active={active} setActive={setActive} delayIndex={o.id}>
          <Card
            x={COL3_X} y={O_ROWS[i]} w={CARD_W} h={CARD_H} rx={COL_RX}
            bg={RC.blueDim} border={RC.blueMid}
            label={o.label} sub={o.sub} labelColor={RC.blue}
          />
          <IndexBadge x={COL3_X} y={O_ROWS[i]} w={CARD_W} id={o.id} color={RC.blue} active={active === o.id} />
        </InteractiveBox>
      ))}

      {/* ── Bottom note ──────────────────────────────────────────────────── */}
      <text
        x={W / 2} y={H - 16}
        textAnchor="middle"
        fontSize={9}
        fontFamily="Inter, system-ui, sans-serif"
        fill={RC.white30}
      >
        Source: IEA Bioenergy Technology Overview 2023
      </text>
    </svg>
  )
}

// ── Legend, grouped into three column-headed sections ─────────────────────────
// With 17 interactive items a single flat legend row would be unwieldy, so
// it's organized to mirror the diagram's own three columns, each with its
// own heading (reusing the diagram's own column-header wording).
function LegendGroup({
  heading, color, items, active, setActive,
}: {
  heading: string; color: string
  items: { id: number; label: string }[]
  active: number | null; setActive: (n: number | null) => void
}) {
  return (
    <div className="flex-1 min-w-[220px]">
      <h4
        className="text-[10px] font-bold uppercase tracking-wider mb-2"
        style={{ color: rcRgba(color, 0.85), fontFamily: "'Montserrat', sans-serif", letterSpacing: '0.08em' }}
      >
        {heading}
      </h4>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {items.map((item) => {
          const isActive = active === item.id
          return (
            <div
              key={item.id}
              className="rc-legend-item flex items-start gap-2 min-w-[130px] rounded-md px-1.5 py-1 -mx-1.5"
              style={{
                background: isActive ? rcRgba(color, 0.10) : 'transparent',
                border: `1px solid ${isActive ? rcRgba(color, 0.35) : 'transparent'}`,
              }}
              tabIndex={0}
              role="button"
              aria-label={`Highlight ${item.label}`}
              onMouseEnter={() => setActive(item.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(item.id)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active === item.id ? null : item.id)}
            >
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
                style={{ background: rcRgba(color, isActive ? 0.28 : 0.16), border: `1px solid ${color}`, color, fontFamily: "'Montserrat', sans-serif" }}
              >
                {item.id}
              </span>
              <span className="block text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white65, fontFamily: "'Montserrat', sans-serif" }}>
                {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Legend({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  return (
    <div
      className="px-6 py-4 flex flex-wrap gap-x-8 gap-y-5"
      style={{ borderTop: `1px solid ${RC.cardBorder}` }}
    >
      <LegendGroup
        heading="Feedstocks"
        color={RC.green}
        items={feedstocks.map((f) => ({ id: f.id, label: f.label }))}
        active={active} setActive={setActive}
      />
      <LegendGroup
        heading="Conversion Technology"
        color={RC.amber}
        items={technologies.map((t) => ({ id: t.id, label: t.label }))}
        active={active} setActive={setActive}
      />
      <LegendGroup
        heading="Energy Outputs"
        color={RC.blue}
        items={outputs.map((o) => ({ id: o.id, label: o.label }))}
        active={active} setActive={setActive}
      />
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────
export function BiomassConversionPathwaysDiagram({
  title   = 'Biomass Conversion Pathways',
  caption,
}: {
  title?: string
  caption?: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const badgeRange = `01–${String(TOTAL_ITEMS).padStart(2, '0')}`

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
          RC Diagram · {badgeRange}
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <BiomassFlowSVG title={title} active={active} setActive={setActive} />
      </div>

      {/* Legend / index, grouped by column */}
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
