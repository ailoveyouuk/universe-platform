// ─────────────────────────────────────────────────────────────────────────────
// FixedFoundationTypesDiagram — RC Diagram Design Language v1.2 (comparison-panel variant)
// 4 fixed offshore foundation types side by side: Monopile · Gravity-Based ·
// Tripod · Jacket. Shared waterline & seabed; depth scale on left.
//
// This is the reference build for the "comparison panel" shape — diagrams
// that show N variants of the same kind of thing side by side, rather than
// labelled parts of one system (that's the callout-line shape used by
// NacelleInternalDiagram and friends). Same RC tokens, BlueprintFrame,
// staggered entrance, hover/tap highlight, and mobile-legibility fix — but
// the interactive unit is a whole panel, numbered 01–04, instead of a
// callout+target. The legend row is what stays legible on mobile once the
// inline SVG labels (which shrink with the whole diagram) are hidden.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'

// ── RC Design Tokens ─────────────────────────────────────────────────────────
const RC = {
  green:      brand.green,
  greenDim:   rcRgba(brand.green, 0.15),
  blue:       brand.blue,
  blueDim:    rcRgba(brand.blue, 0.20),
  amber:      brand.amber,
  white90:    'rgba(255,255,255,0.90)',
  white65:    'rgba(255,255,255,0.65)',
  white45:    'rgba(255,255,255,0.45)',
  white30:    'rgba(255,255,255,0.30)',
  white18:    'rgba(255,255,255,0.18)',
  white10:    'rgba(255,255,255,0.08)',
  seaFill:    'rgba(10,50,100,0.40)',
  seabedFill: 'rgba(100,80,45,0.55)',
  steelFill:  rcRgba(brand.green, 0.70),
  steelStr:   brand.green,
  concrete:   'rgba(160,155,140,0.70)',
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
      /* Same mobile fix as the callout-line diagrams: below ~768px the
         diagram has shrunk enough that inline SVG name/depth/description
         text is no longer legible. Hide it and let the legend row (plain
         HTML, always full-size) carry the reading; the numbered badge gets
         a size bump so each panel still reads as "a numbered thing". */
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
        <pattern id="rcGridFF" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowFF" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridFF)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowFF)" />
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

// ── Layout constants ──────────────────────────────────────────────────────────
const W = 900
const H = 520
const WATER_Y  = 140   // waterline y
const SEABED_Y = 380   // nominal seabed y (for labelling)
const COLS     = [100, 280, 460, 640]  // centre x of each column

// Tower stub above waterline (shared)
const TOWER_H = 90
const TOWER_W = 10

// ── Shared structural stroke style ───────────────────────────────────────────
const SS = { stroke: RC.steelStr, strokeWidth: 3, strokeLinecap: 'round' as const }

// ── Tower stub helper ─────────────────────────────────────────────────────────
function TowerStub({ cx }: { cx: number }) {
  return (
    <>
      {/* Tower (above waterline) */}
      <rect
        x={cx - TOWER_W / 2} y={WATER_Y - TOWER_H}
        width={TOWER_W} height={TOWER_H}
        rx={2}
        fill="rgba(150,165,180,0.75)"
        stroke="rgba(200,215,230,0.50)"
        strokeWidth={1}
      />
      {/* Nacelle stub */}
      <rect
        x={cx - 18} y={WATER_Y - TOWER_H - 12}
        width={36} height={13}
        rx={3}
        fill="rgba(130,145,160,0.80)"
        stroke="rgba(200,215,230,0.50)"
        strokeWidth={1}
      />
      {/* Blade stubs */}
      <line x1={cx} y1={WATER_Y - TOWER_H - 6}
        x2={cx} y2={WATER_Y - TOWER_H - 38}
        stroke={RC.green} strokeWidth={4} strokeLinecap="round" />
      <line x1={cx} y1={WATER_Y - TOWER_H - 6}
        x2={cx - 26} y2={WATER_Y - TOWER_H + 14}
        stroke={RC.green} strokeWidth={4} strokeLinecap="round" />
      <line x1={cx} y1={WATER_Y - TOWER_H - 6}
        x2={cx + 26} y2={WATER_Y - TOWER_H + 14}
        stroke={RC.green} strokeWidth={4} strokeLinecap="round" />
    </>
  )
}

// ── Foundation A: Monopile ────────────────────────────────────────────────────
function Monopile({ cx }: { cx: number }) {
  const MONO_W = 20
  const MONO_BOTTOM = SEABED_Y + 50  // driven 50px into seabed
  return (
    <>
      <TowerStub cx={cx} />
      {/* Single large steel tube */}
      <rect
        x={cx - MONO_W / 2} y={WATER_Y - 6}
        width={MONO_W} height={MONO_BOTTOM - (WATER_Y - 6)}
        rx={3}
        fill={RC.steelFill}
        stroke={RC.steelStr}
        strokeWidth={1.5}
        opacity={0.85}
      />
      {/* Transition piece at waterline */}
      <rect
        x={cx - MONO_W / 2 - 4} y={WATER_Y - 12}
        width={MONO_W + 8} height={14}
        rx={2}
        fill="rgba(130,188,0,0.50)"
        stroke={RC.steelStr}
        strokeWidth={1}
      />
    </>
  )
}

// ── Foundation B: Gravity-Based (GBF) ────────────────────────────────────────
function GravityBased({ cx }: { cx: number }) {
  const BASE_W = 70
  const BASE_H = 28
  const SKIRT_H = 14
  return (
    <>
      <TowerStub cx={cx} />
      {/* Vertical column from waterline to base */}
      <rect
        x={cx - 8} y={WATER_Y}
        width={16} height={SEABED_Y - WATER_Y - BASE_H}
        rx={2}
        fill={RC.concrete}
        stroke="rgba(200,195,180,0.60)"
        strokeWidth={1.2}
      />
      {/* Wide base sitting on seabed */}
      <rect
        x={cx - BASE_W / 2} y={SEABED_Y - BASE_H}
        width={BASE_W} height={BASE_H}
        rx={4}
        fill={RC.concrete}
        stroke="rgba(200,195,180,0.60)"
        strokeWidth={1.5}
      />
      {/* Ballast skirt */}
      <rect
        x={cx - BASE_W / 2 + 5} y={SEABED_Y}
        width={BASE_W - 10} height={SKIRT_H}
        rx={2}
        fill="rgba(140,135,120,0.60)"
        stroke="rgba(180,175,160,0.50)"
        strokeWidth={1}
      />
      {/* Dome on base */}
      <ellipse cx={cx} cy={SEABED_Y - BASE_H} rx={20} ry={10}
        fill="rgba(160,155,140,0.60)" stroke="rgba(200,195,180,0.50)" strokeWidth={1} />
    </>
  )
}

// ── Foundation C: Tripod ──────────────────────────────────────────────────────
function Tripod({ cx }: { cx: number }) {
  const LEG_SPREAD = 52
  const LEG_TOP_Y  = WATER_Y + 30   // where legs splay from central column
  const LEG_BOT_Y  = SEABED_Y + 10  // pile tips
  return (
    <>
      <TowerStub cx={cx} />
      {/* Central column */}
      <rect
        x={cx - 7} y={WATER_Y - 4}
        width={14} height={LEG_TOP_Y - (WATER_Y - 4)}
        rx={2}
        fill={RC.steelFill}
        stroke={RC.steelStr}
        strokeWidth={1.5}
        opacity={0.90}
      />
      {/* Three legs (2D: left, centre-back, right) */}
      {/* Left leg */}
      <line x1={cx} y1={LEG_TOP_Y}
        x2={cx - LEG_SPREAD} y2={LEG_BOT_Y}
        stroke={RC.steelStr} strokeWidth={5} strokeLinecap="round" opacity={0.85} />
      {/* Right leg */}
      <line x1={cx} y1={LEG_TOP_Y}
        x2={cx + LEG_SPREAD} y2={LEG_BOT_Y}
        stroke={RC.steelStr} strokeWidth={5} strokeLinecap="round" opacity={0.85} />
      {/* Centre/back leg (slightly faded) */}
      <line x1={cx} y1={LEG_TOP_Y}
        x2={cx} y2={LEG_BOT_Y}
        stroke={RC.steelStr} strokeWidth={4} strokeLinecap="round" opacity={0.45} />
      {/* Cross-braces */}
      <line x1={cx - LEG_SPREAD / 2} y1={LEG_TOP_Y + (LEG_BOT_Y - LEG_TOP_Y) * 0.4}
        x2={cx + LEG_SPREAD / 2} y2={LEG_TOP_Y + (LEG_BOT_Y - LEG_TOP_Y) * 0.6}
        stroke={RC.steelStr} strokeWidth={2} opacity={0.55} />
      {/* Pile caps */}
      {[-LEG_SPREAD, 0, LEG_SPREAD].map((dx) => (
        <circle key={dx}
          cx={cx + dx} cy={LEG_BOT_Y}
          r={5} fill={RC.steelFill} stroke={RC.steelStr} strokeWidth={1.2} />
      ))}
    </>
  )
}

// ── Foundation D: Jacket ──────────────────────────────────────────────────────
function Jacket({ cx }: { cx: number }) {
  const TOP_W    = 16   // jacket width at waterline
  const BOT_W    = 72   // jacket width at seabed
  const JAC_TOP  = WATER_Y + 5
  const JAC_BOT  = SEABED_Y + 10

  const LLX = cx - BOT_W / 2  // left leg bottom x
  const RLX = cx + BOT_W / 2  // right leg bottom x
  const LTX = cx - TOP_W / 2  // left leg top x
  const RTX = cx + TOP_W / 2  // right leg top x

  // Brace levels (interpolated fraction)
  const braceYs = [0.25, 0.50, 0.75]

  return (
    <>
      <TowerStub cx={cx} />
      {/* Left and right main legs */}
      <line x1={LTX} y1={JAC_TOP} x2={LLX} y2={JAC_BOT}
        stroke={RC.steelStr} strokeWidth={4} strokeLinecap="round" opacity={0.90} />
      <line x1={RTX} y1={JAC_TOP} x2={RLX} y2={JAC_BOT}
        stroke={RC.steelStr} strokeWidth={4} strokeLinecap="round" opacity={0.90} />

      {/* X-braces at each level */}
      {braceYs.map((f, i) => {
        const y = JAC_TOP + (JAC_BOT - JAC_TOP) * f
        const lx = LTX + (LLX - LTX) * f
        const rx = RTX + (RLX - RTX) * f
        const yNext = JAC_TOP + (JAC_BOT - JAC_TOP) * (f + 0.25)
        const lxNext = LTX + (LLX - LTX) * (f + 0.25)
        const rxNext = RTX + (RLX - RTX) * (f + 0.25)
        return (
          <g key={i}>
            {/* Horizontal ring */}
            <line x1={lx} y1={y} x2={rx} y2={y}
              stroke={RC.steelStr} strokeWidth={2} opacity={0.65} />
            {/* X braces */}
            <line x1={lx} y1={y} x2={rxNext} y2={yNext}
              stroke={RC.steelStr} strokeWidth={1.8} opacity={0.55} />
            <line x1={rx} y1={y} x2={lxNext} y2={yNext}
              stroke={RC.steelStr} strokeWidth={1.8} opacity={0.55} />
          </g>
        )
      })}

      {/* Base horizontal */}
      <line x1={LLX} y1={JAC_BOT} x2={RLX} y2={JAC_BOT}
        stroke={RC.steelStr} strokeWidth={2} opacity={0.65} />

      {/* Pile caps at base */}
      {[LLX, RLX].map((x) => (
        <circle key={x} cx={x} cy={JAC_BOT}
          r={6} fill={RC.steelFill} stroke={RC.steelStr} strokeWidth={1.2} />
      ))}
    </>
  )
}

// ── Depth scale ───────────────────────────────────────────────────────────────
function DepthScale() {
  const X   = 46
  const ticks = [
    { y: WATER_Y,       label: '0 m'   },
    { y: WATER_Y + 60,  label: '−15 m' },
    { y: WATER_Y + 120, label: '−30 m' },
    { y: WATER_Y + 180, label: '−50 m' },
    { y: WATER_Y + 240, label: '−80 m' },
  ]
  return (
    <g>
      <line x1={X} y1={WATER_Y} x2={X} y2={WATER_Y + 260}
        stroke="rgba(74,158,191,0.40)" strokeWidth={1} />
      {ticks.map(({ y, label }) => (
        <g key={label}>
          <line x1={X - 5} y1={y} x2={X + 5} y2={y}
            stroke="rgba(74,158,191,0.50)" strokeWidth={1} />
          <text x={X - 8} y={y + 4} textAnchor="end"
            fontSize={7.5} fontFamily="Montserrat, sans-serif"
            fill="rgba(74,158,191,0.65)">
            {label}
          </text>
        </g>
      ))}
      <text
        x={X - 16} y={WATER_Y + 130}
        textAnchor="middle"
        fontSize={7.5}
        fontFamily="Montserrat, sans-serif"
        fill="rgba(74,158,191,0.50)"
        transform={`rotate(-90, ${X - 16}, ${WATER_Y + 130})`}
      >
        Water Depth
      </text>
    </g>
  )
}

// ── Single source of truth for every panel ────────────────────────────────────
interface PanelData {
  index: number
  name: string
  depth: string
  desc: string
  Illustration: ({ cx }: { cx: number }) => JSX.Element
}

const PANELS: PanelData[] = [
  { index: 1, name: 'Monopile',      depth: '0 – 30 m',   desc: 'Single large steel\ntube driven into seabed',       Illustration: Monopile },
  { index: 2, name: 'Gravity-Based', depth: '0 – 30 m',   desc: 'Wide concrete base sits\non prepared seabed',       Illustration: GravityBased },
  { index: 3, name: 'Tripod',        depth: '25 – 50 m',  desc: 'Central column with\n3 braced steel legs',         Illustration: Tripod },
  { index: 4, name: 'Jacket',        depth: '40 – 80 m',  desc: 'Lattice frame; 3–4 legs\nfor deep or rough seabed', Illustration: Jacket },
]

// ── Main SVG ──────────────────────────────────────────────────────────────────
function FoundationsSVG({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: W, minWidth: 320 }}
      aria-label="Fixed offshore wind foundation types: monopile, gravity-based, tripod, jacket"
    >
      <BlueprintFrame w={W} h={H} />

      {/* ── Water fill ── */}
      <rect x={60} y={WATER_Y} width={W - 70} height={SEABED_Y - WATER_Y}
        fill={RC.seaFill} />

      {/* Waterline dashed */}
      <line x1={60} y1={WATER_Y} x2={W - 10} y2={WATER_Y}
        stroke="rgba(74,158,191,0.45)" strokeWidth={1} strokeDasharray="6 8" />
      <text x={W - 14} y={WATER_Y - 5} textAnchor="end"
        fontSize={8} fontFamily="Montserrat, sans-serif"
        fill="rgba(74,158,191,0.60)" fontStyle="italic">
        Sea level
      </text>

      {/* ── Seabed ── */}
      <rect x={60} y={SEABED_Y} width={W - 70} height={H - SEABED_Y - 80}
        fill={RC.seabedFill} />
      <line x1={60} y1={SEABED_Y} x2={W - 10} y2={SEABED_Y}
        stroke="rgba(140,110,60,0.55)" strokeWidth={1.5} />
      <text x={W - 14} y={SEABED_Y - 5} textAnchor="end"
        fontSize={8} fontFamily="Montserrat, sans-serif"
        fill="rgba(160,130,80,0.60)" fontStyle="italic">
        Seabed
      </text>

      {/* ── Depth scale ── */}
      <DepthScale />

      {/* ── Column dividers (subtle) ── */}
      {[1, 2, 3].map((i) => (
        <line key={i}
          x1={(COLS[i - 1] + COLS[i]) / 2} y1={20}
          x2={(COLS[i - 1] + COLS[i]) / 2} y2={H - 80}
          stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      ))}

      {/* ── Foundations + labels, one interactive panel per type ── */}
      {PANELS.map((p) => {
        const cx = COLS[p.index - 1]
        const baseY = H - 80
        const isActive = active === p.index
        const isDimmed = active !== null && !isActive
        const Illustration = p.Illustration
        return (
          <g
            key={p.index}
            className="rc-panel-hit"
            style={{ opacity: isDimmed ? 0.32 : 1 }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${p.name}`}
            onMouseEnter={() => setActive(p.index)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(p.index)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === p.index ? null : p.index)}
          >
            <g className="rc-panel-enter" style={{ '--rc-delay': `${p.index * 0.08}s` } as React.CSSProperties}>
              {/* Column highlight backdrop, brightens while active */}
              <rect x={cx - 90} y={20} width={180} height={H - 100}
                fill={RC.green} opacity={isActive ? 0.06 : 0} />

              <Illustration cx={cx} />

              {/* Numbered chip */}
              <g className="rc-panel-chipgroup">
                <circle cx={cx} cy={baseY - 4} r={9} fill={rcRgba(RC.green, isActive ? 0.28 : 0.16)} stroke={RC.green} strokeWidth={1.2} />
                <text x={cx} y={baseY - 1} textAnchor="middle"
                  fontSize={8} fontWeight="700" fontFamily="Montserrat, sans-serif" fill={RC.green}>
                  {String(p.index).padStart(2, '0')}
                </text>
              </g>

              {/* Name / depth / description — hidden on mobile, legend carries it there */}
              <text className="rc-panel-label" x={cx} y={baseY + 20} textAnchor="middle"
                fontSize={11} fontWeight="700" fontFamily="Montserrat, sans-serif"
                fill={isActive ? RC.white90 : RC.green}>
                {p.name}
              </text>
              <text className="rc-panel-label" x={cx} y={baseY + 34} textAnchor="middle"
                fontSize={8.5} fontFamily="Montserrat, sans-serif"
                fill={RC.blue}>
                {p.depth}
              </text>
              {p.desc.split('\n').map((line, li) => (
                <text key={li} className="rc-panel-label" x={cx} y={baseY + 48 + li * 12} textAnchor="middle"
                  fontSize={7.5} fontFamily="Montserrat, sans-serif"
                  fill={RC.white45}>
                  {line}
                </text>
              ))}
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
      {PANELS.map((p) => {
        const isActive = active === p.index
        return (
          <div
            key={p.index}
            className="rc-legend-item flex items-start gap-2.5 min-w-[170px] rounded-md px-1.5 py-1 -mx-1.5"
            style={{
              background: isActive ? rcRgba(RC.green, 0.10) : 'transparent',
              border: `1px solid ${isActive ? rcRgba(RC.green, 0.35) : 'transparent'}`,
            }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${p.name}`}
            onMouseEnter={() => setActive(p.index)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(p.index)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === p.index ? null : p.index)}
          >
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
              style={{ background: rcRgba(RC.green, isActive ? 0.28 : 0.16), border: `1px solid ${RC.green}`, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
            >
              {String(p.index).padStart(2, '0')}
            </span>
            <span>
              <span className="block text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white65, fontFamily: "'Montserrat', sans-serif" }}>
                {p.name}
              </span>
              <span className="block text-[11px]" style={{ color: RC.blue, fontFamily: "'Montserrat', sans-serif" }}>
                {p.depth}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────
export function FixedFoundationTypesDiagram() {
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
            Fixed Offshore Wind Foundation Types
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
            Structural approach varies with water depth — tap a type below to highlight it
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.greenDim, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · 01–04
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <FoundationsSVG active={active} setActive={setActive} />
      </div>

      {/* Legend / index */}
      <Legend active={active} setActive={setActive} />

      {/* Caption */}
      <figcaption
        className="px-6 py-3 text-xs"
        style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white30 }}
      >
        The four main foundation types used in fixed offshore wind: Monopile, Gravity-Based, Tripod, and Jacket
      </figcaption>
    </figure>
  )
}
