'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'
// ─────────────────────────────────────────────────────────────────────────────
// AnchorTypesDiagram — RC Diagram Design Language v1.2 (comparison-panel variant)
// 6 anchor types for floating offshore wind mooring systems, side by side.
// Follows the FixedFoundationTypesDiagram reference build: RC tokens,
// BlueprintFrame, staggered entrance, whole-panel hover/tap highlight with
// sibling dimming, and the mobile-legibility fix (inline SVG labels hidden
// below ~768px, HTML legend carries the reading there).
// ─────────────────────────────────────────────────────────────────────────────

const RC = {
  green:      brand.green,
  greenDim:   rcRgba(brand.green, 0.15),
  blue:       brand.blue,
  blueDim:    rcRgba(brand.blue, 0.20),
  amber:      brand.amber,
  bgDark:    '#0f172a',
  bgMid:     '#1e293b',
  bgPanel:   '#162032',
  text:      '#e2e8f0',
  textMuted: '#94a3b8',
  seabed:    '#2d3d1a',
  steel:     '#8899aa',
  white90:    'rgba(255,255,255,0.90)',
  white65:    'rgba(255,255,255,0.65)',
  white45:    'rgba(255,255,255,0.45)',
  white30:    'rgba(255,255,255,0.30)',
  white18:    'rgba(255,255,255,0.18)',
  white10:    'rgba(255,255,255,0.08)',
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
      /* Same mobile fix as the other comparison-panel diagrams: below ~768px
         the diagram has shrunk enough that inline SVG title/subtitle/tag
         text is no longer legible. Hide it and let the legend row (plain
         HTML, always full-size) carry the reading. */
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
        <pattern id="rcGridAT" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowAT" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridAT)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowAT)" />
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

// ── Seabed strip ─────────────────────────────────────────────────────────────

function SeabedStrip({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={22} fill={RC.seabed} />
      {[0.15, 0.35, 0.55, 0.75].map((f, i) => (
        <ellipse key={i} cx={x + w * f} cy={y + 8} rx={w * 0.04} ry={5} fill="#3d5c1a" opacity={0.7} />
      ))}
    </g>
  )
}

// ── Individual anchor illustrations ─────────────────────────────────────────

/** SEPLA — flat plate embedded in seabed, mooring line exits at angle */
function SEPLA({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      {/* Embedded plate (rotated ~45°) */}
      <rect
        x={cx - 16}
        y={cy - 4}
        width={32}
        height={8}
        rx={1}
        fill={RC.steel}
        stroke={RC.amber}
        strokeWidth={1.5}
        transform={`rotate(-30, ${cx}, ${cy})`}
      />
      {/* Mooring line */}
      <line x1={cx + 5} y1={cy - 14} x2={cx + 5} y2={cy - 46} stroke={RC.steel} strokeWidth={2} strokeDasharray="4 3" />
      {/* Padeye */}
      <circle cx={cx + 5} cy={cy - 14} r={3} fill={RC.amber} />
    </g>
  )
}

/** Drag VLA — fluke anchor dragged into seabed */
function DragVLA({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      {/* Shank */}
      <line x1={cx} y1={cy - 12} x2={cx + 14} y2={cy + 4} stroke={RC.steel} strokeWidth={3} strokeLinecap="round" />
      {/* Fluke */}
      <polygon
        points={`${cx + 14},${cy + 4} ${cx + 24},${cy - 6} ${cx + 8},${cy - 2}`}
        fill={RC.steel}
        stroke={RC.amber}
        strokeWidth={1.5}
      />
      {/* Crown */}
      <line x1={cx} y1={cy - 12} x2={cx - 6} y2={cy - 6} stroke={RC.steel} strokeWidth={2} strokeLinecap="round" />
      {/* Mooring line */}
      <line x1={cx} y1={cy - 12} x2={cx} y2={cy - 46} stroke={RC.steel} strokeWidth={2} strokeDasharray="4 3" />
      <circle cx={cx} cy={cy - 12} r={3} fill={RC.amber} />
    </g>
  )
}

/** Suction Anchor — open-bottom cylinder driven by suction pressure */
function SuctionCan({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      {/* Cylinder walls */}
      <rect x={cx - 12} y={cy - 24} width={24} height={24} rx={1} fill={RC.bgMid} stroke={RC.blue} strokeWidth={2} />
      {/* Cap */}
      <rect x={cx - 12} y={cy - 28} width={24} height={5} rx={1} fill={RC.steel} stroke={RC.blue} strokeWidth={1.5} />
      {/* Internal vacuum stripes */}
      <line x1={cx - 8} y1={cy - 22} x2={cx - 8} y2={cy - 6} stroke={RC.blue} strokeWidth={1} strokeOpacity={0.4} />
      <line x1={cx - 2} y1={cy - 22} x2={cx - 2} y2={cy - 6} stroke={RC.blue} strokeWidth={1} strokeOpacity={0.4} />
      <line x1={cx + 4} y1={cy - 22} x2={cx + 4} y2={cy - 6} stroke={RC.blue} strokeWidth={1} strokeOpacity={0.4} />
      {/* Mooring line */}
      <line x1={cx} y1={cy - 28} x2={cx} y2={cy - 58} stroke={RC.steel} strokeWidth={2} strokeDasharray="4 3" />
      <circle cx={cx} cy={cy - 28} r={3} fill={RC.amber} />
    </g>
  )
}

/** Driven Pile — long steel tube hammered into seabed */
function DrivenPile({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      {/* Pile tube */}
      <rect x={cx - 7} y={cy - 38} width={14} height={38} rx={2} fill={RC.bgMid} stroke={RC.steel} strokeWidth={2} />
      {/* Pile tip (tapered) */}
      <polygon
        points={`${cx - 7},${cy} ${cx + 7},${cy} ${cx},${cy + 10}`}
        fill={RC.steel}
      />
      {/* Driving striations */}
      {[10, 20, 30].map((off, i) => (
        <line key={i} x1={cx - 7} y1={cy - off} x2={cx + 7} y2={cy - off} stroke={RC.steel} strokeWidth={0.5} strokeOpacity={0.4} />
      ))}
      {/* Mooring attachment at top */}
      <rect x={cx - 12} y={cy - 44} width={24} height={8} rx={2} fill={RC.steel} stroke={RC.amber} strokeWidth={1.5} />
      {/* Mooring line */}
      <line x1={cx} y1={cy - 44} x2={cx} y2={cy - 74} stroke={RC.steel} strokeWidth={2} strokeDasharray="4 3" />
      <circle cx={cx} cy={cy - 44} r={3} fill={RC.amber} />
    </g>
  )
}

/** Gravity / Clump Weight — heavy mass on seabed */
function GravityAnchor({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      {/* Block */}
      <rect x={cx - 22} y={cy - 16} width={44} height={16} rx={2} fill={RC.steel} stroke={RC.textMuted} strokeWidth={1.5} />
      {/* Mass indicator hatching */}
      {[0, 8, 16, 24, 32].map((off, i) => (
        <line key={i} x1={cx - 22 + off} y1={cy - 16} x2={cx - 14 + off} y2={cy} stroke={RC.bgDark} strokeWidth={1.5} strokeOpacity={0.5} />
      ))}
      {/* Mooring line connection */}
      <line x1={cx} y1={cy - 16} x2={cx} y2={cy - 52} stroke={RC.steel} strokeWidth={2} strokeDasharray="4 3" />
      <circle cx={cx} cy={cy - 16} r={3} fill={RC.amber} />
    </g>
  )
}

/** Drilled & Grouted — borehole with grouted insert */
function DrilledGrouted({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      {/* Borehole */}
      <rect x={cx - 5} y={cy - 30} width={10} height={32} rx={1} fill="#2d4a1a" stroke={RC.steel} strokeWidth={1} strokeDasharray="2 2" />
      {/* Grouted section (darker fill) */}
      <rect x={cx - 5} y={cy - 26} width={10} height={28} rx={1} fill="#4a6a2a" />
      {/* Anchor rod */}
      <rect x={cx - 2} y={cy - 36} width={4} height={36} rx={1} fill={RC.steel} />
      {/* Grout plug top */}
      <ellipse cx={cx} cy={cy - 26} rx={6} ry={3} fill="#6a8a3a" />
      {/* Mooring line */}
      <line x1={cx} y1={cy - 36} x2={cx} y2={cy - 66} stroke={RC.steel} strokeWidth={2} strokeDasharray="4 3" />
      <circle cx={cx} cy={cy - 36} r={3} fill={RC.amber} />
    </g>
  )
}

// ── Single source of truth for every panel ────────────────────────────────────
interface AnchorData {
  index: number
  title: string
  subtitle: string
  tag: string
  tagColor: string
  render: (cx: number, cy: number) => React.ReactNode
  cyOff: number
}

const ANCHORS: AnchorData[] = [
  {
    index: 1,
    title: 'SEPLA',
    subtitle: 'Suction Embedded Plate Anchor — plate installed via suction then rotated to lock',
    tag: 'Taut & Catenary',
    tagColor: RC.green,
    render: (cx, cy) => <SEPLA cx={cx} cy={cy} />,
    cyOff: 0.72,
  },
  {
    index: 2,
    title: 'Drag VLA',
    subtitle: 'Vertical Load Anchor dragged along seabed to embed — resists high vertical loads',
    tag: 'Catenary',
    tagColor: RC.blue,
    render: (cx, cy) => <DragVLA cx={cx} cy={cy} />,
    cyOff: 0.72,
  },
  {
    index: 3,
    title: 'Suction Anchor',
    subtitle: 'Open-bottom cylinder driven by suction — suitable for soft clay seabeds',
    tag: 'Taut & Catenary',
    tagColor: RC.green,
    render: (cx, cy) => <SuctionCan cx={cx} cy={cy} />,
    cyOff: 0.78,
  },
  {
    index: 4,
    title: 'Driven Pile',
    subtitle: 'Steel pipe pile hammered into seabed — high capacity for hard substrates',
    tag: 'Catenary',
    tagColor: RC.blue,
    render: (cx, cy) => <DrivenPile cx={cx} cy={cy} />,
    cyOff: 0.82,
  },
  {
    index: 5,
    title: 'Drilled & Grouted',
    subtitle: 'Borehole drilled then filled with grout — used where driving is not feasible',
    tag: 'Taut Leg',
    tagColor: RC.amber,
    render: (cx, cy) => <DrilledGrouted cx={cx} cy={cy} />,
    cyOff: 0.80,
  },
  {
    index: 6,
    title: 'Gravity / Clump',
    subtitle: 'Heavy mass resting on seabed — simple, no installation equipment needed',
    tag: 'Catenary',
    tagColor: RC.blue,
    render: (cx, cy) => <GravityAnchor cx={cx} cy={cy} />,
    cyOff: 0.68,
  },
]

// ── Layout constants ──────────────────────────────────────────────────────────
const W = 900
const H = 400
const PAD = 20
const COLS = 6
const CELL_W = (W - PAD * 2 - (COLS - 1) * 8) / COLS
const CELL_H = 320
const CELL_Y = PAD + 32
const ILLUST_H = CELL_H - 72

// ── Anchor panel (cell) ────────────────────────────────────────────────────────
function AnchorPanel({
  a, cellX, active, setActive,
}: {
  a: AnchorData
  cellX: number
  active: number | null
  setActive: (n: number | null) => void
}) {
  const cx = cellX + CELL_W / 2
  const cy = CELL_Y + ILLUST_H * a.cyOff
  const isActive = active === a.index
  const isDimmed = active !== null && !isActive
  const clipId = `rcAnchorClip-${a.index}`

  return (
    <g
      className="rc-panel-hit"
      style={{ opacity: isDimmed ? 0.4 : 1 }}
      tabIndex={0}
      role="button"
      aria-label={`${a.title} — ${a.subtitle}`}
      onMouseEnter={() => setActive(a.index)}
      onMouseLeave={() => setActive(null)}
      onFocus={() => setActive(a.index)}
      onBlur={() => setActive(null)}
      onClick={() => setActive(active === a.index ? null : a.index)}
    >
      <g className="rc-panel-enter" style={{ '--rc-delay': `${a.index * 0.06}s` } as React.CSSProperties}>
        {/* Cell bg */}
        <rect x={cellX} y={CELL_Y} width={CELL_W} height={CELL_H} rx={6}
          fill={RC.bgPanel} stroke={isActive ? RC.green : RC.bgMid} strokeWidth={isActive ? 1.5 : 1} />

        {/* Illustration area */}
        <clipPath id={clipId}>
          <rect x={cellX + 1} y={CELL_Y + 1} width={CELL_W - 2} height={ILLUST_H} rx={5} />
        </clipPath>
        <rect x={cellX + 1} y={CELL_Y + 1} width={CELL_W - 2} height={ILLUST_H} rx={5} fill={RC.bgDark} />

        {/* Water background */}
        <rect x={cellX + 1} y={CELL_Y + 1} width={CELL_W - 2} height={ILLUST_H * 0.6} fill="#0d2030" opacity={0.5} />

        {/* Seabed */}
        <SeabedStrip x={cellX + 1} y={CELL_Y + ILLUST_H - 22} w={CELL_W - 2} />

        {/* Illustration */}
        <g clipPath={`url(#${clipId})`}>
          {a.render(cx, cy)}
        </g>

        {/* Numbered chip */}
        <g className="rc-panel-chipgroup">
          <circle cx={cellX + 16} cy={CELL_Y + 16} r={9} fill={rcRgba(RC.green, isActive ? 0.30 : 0.18)} stroke={RC.green} strokeWidth={1.2} />
          <text x={cellX + 16} y={CELL_Y + 19} textAnchor="middle"
            fontSize={8} fontWeight="700" fontFamily="Montserrat, sans-serif" fill={RC.green}>
            {String(a.index).padStart(2, '0')}
          </text>
        </g>

        {/* Title — hidden on mobile, legend carries it there */}
        <text className="rc-panel-label" x={cellX + CELL_W / 2} y={CELL_Y + ILLUST_H + 16} textAnchor="middle"
          fill={isActive ? RC.white90 : RC.text} fontSize={11} fontWeight="700" fontFamily="Montserrat, sans-serif">
          {a.title}
        </text>
        {/* Subtitle */}
        <foreignObject className="rc-panel-label" x={cellX + 6} y={CELL_Y + ILLUST_H + 22} width={CELL_W - 12} height={28}>
          <div
            style={{
              fontSize: 9,
              color: RC.textMuted,
              fontFamily: 'Montserrat, sans-serif',
              lineHeight: 1.3,
              textAlign: 'center',
            }}
          >
            {a.subtitle}
          </div>
        </foreignObject>
        {/* Tag */}
        <g className="rc-panel-label">
          <rect x={cellX + 6} y={CELL_Y + CELL_H - 20} width={a.tag.length * 6 + 10} height={14} rx={3} fill={a.tagColor} opacity={0.15} />
          <text x={cellX + 11} y={CELL_Y + CELL_H - 10} fill={a.tagColor} fontSize={8} fontWeight="600" fontFamily="Montserrat, sans-serif">
            {a.tag}
          </text>
        </g>
      </g>
    </g>
  )
}

// ── Main SVG ──────────────────────────────────────────────────────────────────
function AnchorsSVG({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: W, minWidth: 320 }}
      aria-label="Anchor types for floating offshore wind mooring systems"
    >
      <BlueprintFrame w={W} h={H} />

      {/* Cells */}
      {ANCHORS.map((a) => (
        <AnchorPanel
          key={a.index}
          a={a}
          cellX={PAD + (a.index - 1) * (CELL_W + 8)}
          active={active}
          setActive={setActive}
        />
      ))}
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
      {ANCHORS.map((a) => {
        const isActive = active === a.index
        return (
          <div
            key={a.index}
            className="rc-legend-item flex items-start gap-2.5 min-w-[170px] rounded-md px-1.5 py-1 -mx-1.5"
            style={{
              background: isActive ? rcRgba(RC.green, 0.10) : 'transparent',
              border: `1px solid ${isActive ? rcRgba(RC.green, 0.35) : 'transparent'}`,
            }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${a.title}`}
            onMouseEnter={() => setActive(a.index)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(a.index)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === a.index ? null : a.index)}
          >
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
              style={{ background: rcRgba(RC.green, isActive ? 0.30 : 0.18), border: `1px solid ${RC.green}`, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
            >
              {String(a.index).padStart(2, '0')}
            </span>
            <span>
              <span className="block text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white65, fontFamily: "'Montserrat', sans-serif" }}>
                {a.title}
              </span>
              <span className="block text-[11px] mt-0.5" style={{ color: a.tagColor, fontFamily: "'Montserrat', sans-serif" }}>
                {a.tag}
              </span>
              <span className="block text-[10.5px] mt-0.5" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
                {a.subtitle}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────

export default function AnchorTypesDiagram() {
  const [active, setActive] = useState<number | null>(null)

  return (
    <figure
      className="mb-8 rounded-xl overflow-hidden w-full"
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
            Anchor Types — Floating Offshore Wind Mooring Systems
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
            Anchor choice depends on seabed conditions and mooring line type — tap a type below to highlight it
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.greenDim, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · Comparison
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <AnchorsSVG active={active} setActive={setActive} />
      </div>

      {/* Legend / index */}
      <Legend active={active} setActive={setActive} />

      {/* Caption */}
      <figcaption
        className="px-6 py-3 text-xs"
        style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white30 }}
      >
        Six anchor types used in floating offshore wind mooring systems, grouped by mooring line compatibility: taut &amp; catenary, catenary, and taut leg
      </figcaption>
    </figure>
  )
}
