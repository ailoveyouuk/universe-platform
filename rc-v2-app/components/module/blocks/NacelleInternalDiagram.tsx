// ─────────────────────────────────────────────────────────────────────────────
// NacelleInternalDiagram — RC Diagram Design Language v1.1 (reference build)
//
// Reusable pieces meant to be rolled out to the other ~30 diagrams:
//
//   1. Blueprint grid + corner brackets    → BlueprintFrame()
//   2. Numbered, colour-coded callouts     → Callout()  (uses CATEGORY colour)
//   3. Category colour key                 → CATEGORY_COLORS
//   4. A single data-driven component list → COMPONENTS (feeds the SVG
//      callouts AND the legend row — one source of truth)
//   5. Staggered entrance + hover/tap highlight → `active` state, shared
//      between the SVG callouts and the legend chips, with all animation
//      gated behind `prefers-reduced-motion: no-preference`
//   6. Dark glass card shell + legend row  → NacelleInternalDiagram()
//
// When redesigning another diagram, copy this file's structure rather than
// its specific geometry.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'

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
}

// ── Category colour key ───────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  mechanical: '#94A3B8', // slate — shafts, bearings, gearboxes
  electrical: '#4A9EBF', // RC blue — generators, sensors, control systems
  safety:     '#DAA520', // amber — brakes, protective systems
  structural: RC.green,  // RC green — load-bearing / whole-system components
} as const

type Category = keyof typeof CATEGORY_COLORS

const CATEGORY_LABEL: Record<Category, string> = {
  mechanical: 'Mechanical',
  electrical: 'Electrical',
  safety:     'Safety',
  structural: 'Structural',
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
  { index: 1, text: 'Main Shaft',            subtext: 'Low-speed, from rotor',        category: 'mechanical', side: 'left',  labelX: 148, labelY: 160, targetX: 0, targetY: 0 },
  { index: 2, text: 'Main Bearing',          subtext: 'Supports shaft load',          category: 'mechanical', side: 'left',  labelX: 148, labelY: 200, targetX: 0, targetY: 0 },
  { index: 3, text: 'Gearbox',               subtext: 'Steps up RPM ~100×',           category: 'mechanical', side: 'left',  labelX: 148, labelY: 240, targetX: 0, targetY: 0 },
  { index: 4, text: 'Brake System',          subtext: 'Disc brake, high-speed shaft', category: 'safety',     side: 'left',  labelX: 148, labelY: 280, targetX: 0, targetY: 0 },
  { index: 5, text: 'Yaw System',            subtext: 'Rotates nacelle to face wind', category: 'structural', side: 'left',  labelX: 148, labelY: 320, targetX: 0, targetY: 0 },
  { index: 6, text: 'Anemometer & Wind Vane', subtext: 'Wind speed / direction',      category: 'electrical', side: 'right', labelX: 660, labelY: 160, targetX: 0, targetY: 0 },
  { index: 7, text: 'Controller / Sensors',  subtext: 'Turbine management system',    category: 'electrical', side: 'right', labelX: 660, labelY: 200, targetX: 0, targetY: 0 },
  { index: 8, text: 'Generator',             subtext: 'Mechanical → electrical',      category: 'electrical', side: 'right', labelX: 660, labelY: 240, targetX: 0, targetY: 0 },
  { index: 9, text: 'Transformer',           subtext: 'Steps up voltage for export',  category: 'electrical', side: 'right', labelX: 660, labelY: 280, targetX: 0, targetY: 0 },
]

// ── Shared animation / interaction styles ─────────────────────────────────────
// Entrance stays motion-off by default; only browsers that don't request
// reduced motion get the staggered fade-in. Hover/tap highlight is instant
// either way — it's a state change, not decorative motion.
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
      /* Below ~700px rendered diagram width, sentence-length SVG text is no
         longer legible -- it shrinks with the whole diagram, not just the
         font-size we set. Hide it there and let the always-legible legend
         row do the reading; the numbered chip gets a modest size bump so
         the diagram still reads as "numbered parts", not blank shapes. */
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
        <pattern id="rcGrid" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.10)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill={`url(#rcGrid)`} />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlow)" />
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
        {/* larger invisible hit area than the visible chip -- real tap
            targets are hard enough to hit on a phone even before the
            diagram shrinks */}
        <circle cx={chipX} cy={c.labelY - 6} r={18} fill="transparent" />

        {/* connector line: label → elbow → target reticle */}
        <polyline
          points={`${lineStartX},${c.labelY - 3} ${elbowX},${c.labelY - 3} ${c.targetX},${c.targetY}`}
          fill="none" stroke={lineColor} strokeWidth={isActive ? 1.6 : 1} strokeLinejoin="round" />
        {/* target reticle */}
        <circle cx={c.targetX} cy={c.targetY} r={isActive ? 6 : 4.5} fill="none" stroke={color} strokeWidth={isActive ? 1.6 : 1.2} opacity={0.95} />
        <circle cx={c.targetX} cy={c.targetY} r={1.6} fill={color} />

        {/* numbered chip -- scales up slightly on mobile once the label
            text next to it is hidden, so it still reads as a marker */}
        <g className="rc-callout-chipgroup">
          <circle cx={chipX} cy={c.labelY - 6} r={chipR} fill={rcRgba(color, isActive ? 0.28 : 0.16)} stroke={color} strokeWidth={1.2} />
          <text x={chipX} y={c.labelY - 3} textAnchor="middle"
            fontSize={8} fontWeight="700" fontFamily="Montserrat, sans-serif" fill={color}>
            {String(c.index).padStart(2, '0')}
          </text>
        </g>

        {/* label + subtext -- hidden below md; at mobile diagram widths this
            text shrinks past legibility, so the legend row is the mobile
            reading surface instead (see DiagramStyles' media query) */}
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

// ── Internal component box helper ─────────────────────────────────────────────
function ComponentBox({
  x, y, w, h, label, color = 'rgba(130,188,0,0.20)', stroke = RC.green,
}: {
  x: number; y: number; w: number; h: number
  label?: string
  color?: string; stroke?: string
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4}
        fill={color} stroke={stroke} strokeWidth={1.2} opacity={0.92} />
      <rect x={x} y={y} width={w} height={h} rx={4}
        fill="none" stroke={rcRgba('#FFFFFF', 0.08)} strokeWidth={1} />
      {label && (
        <text x={x + w / 2} y={y + h / 2 + 3} textAnchor="middle"
          fontSize={7} fontWeight="700" fontFamily="Montserrat, sans-serif"
          fill={stroke} opacity={0.95}>
          {label}
        </text>
      )}
    </g>
  )
}

// ── Main SVG ──────────────────────────────────────────────────────────────────
function NacelleSVG({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  const VW = 800
  const VH = 420

  const NX  = 170
  const NY  = 130
  const NW  = 460
  const NH  = 180
  const SY  = NY + NH / 2

  const SHAFT_X1  = NX - 40
  const SHAFT_X2  = NX + NW - 30
  const BEARING_X = NX + 18
  const GEARBOX_X = NX + 80
  const GEARBOX_W = 80
  const BRAKE_X   = NX + 200
  const GEN_X     = NX + 260
  const GEN_W     = 90
  const TRANS_X   = NX + 370
  const TRANS_W   = 50

  const targets: Record<number, { x: number; y: number }> = {
    1: { x: SHAFT_X1 + 5, y: SY - 3 },
    2: { x: BEARING_X + 10, y: SY - 10 },
    3: { x: GEARBOX_X + 10, y: SY + 20 },
    4: { x: BRAKE_X - 4, y: SY + 15 },
    5: { x: NX + NW / 2 - 20, y: NY + NH - 4 },
    6: { x: NX + NW - 51, y: NY + 14 },
    7: { x: NX + NW - 55, y: NY + 28 },
    8: { x: GEN_X + GEN_W - 10, y: SY - 20 },
    9: { x: TRANS_X + TRANS_W / 2, y: SY - 22 },
  }
  const wired = COMPONENTS.map((c) => ({ ...c, targetX: targets[c.index].x, targetY: targets[c.index].y }))

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      width="100%"
      style={{ maxWidth: 800, minWidth: 280 }}
      aria-label="Nacelle internal components diagram"
    >
      <defs>
        <linearGradient id="nacelleBg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(20,40,60,0.65)" />
          <stop offset="100%" stopColor="rgba(10,20,35,0.65)" />
        </linearGradient>
        <filter id="rcSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>

      <BlueprintFrame w={VW} h={VH} />

      <rect x={NX + NW / 2 - 12} y={NY + NH} width={24} height={60}
        rx={3} fill="rgba(150,165,180,0.55)" stroke="rgba(200,215,230,0.40)" strokeWidth={1} />

      <ellipse cx={NX + NW / 2} cy={NY + NH} rx={40} ry={8}
        fill={rcRgba('#4A9EBF', 0.30)} stroke={rcRgba('#4A9EBF', 0.70)} strokeWidth={1.5} />
      <text x={NX + NW / 2} y={NY + NH + 4} textAnchor="middle"
        fontSize={6.5} fontFamily="Montserrat, sans-serif" fill={rcRgba('#4A9EBF', 0.80)}>
        Yaw Ring
      </text>

      <path
        filter="url(#rcSoftShadow)"
        d={`M${NX} ${NY + 12}
            Q${NX} ${NY} ${NX + 12} ${NY}
            L${NX + NW - 20} ${NY}
            Q${NX + NW} ${NY} ${NX + NW} ${NY + 12}
            L${NX + NW} ${NY + NH - 12}
            Q${NX + NW} ${NY + NH} ${NX + NW - 12} ${NY + NH}
            L${NX + 12} ${NY + NH}
            Q${NX} ${NY + NH} ${NX} ${NY + NH - 12} Z`}
        fill="url(#nacelleBg)"
        stroke={rcRgba(brand.green, 0.45)}
        strokeWidth={1.5}
      />

      <path
        d={`M${NX} ${SY - 18} Q${NX - 30} ${SY} ${NX} ${SY + 18} Z`}
        fill="rgba(150,165,180,0.70)"
        stroke="rgba(200,215,230,0.50)"
        strokeWidth={1}
      />

      <line x1={SHAFT_X1} y1={SY} x2={SHAFT_X2} y2={SY}
        stroke="rgba(200,215,230,0.60)" strokeWidth={6} strokeLinecap="round" />
      <line x1={SHAFT_X1} y1={SY} x2={SHAFT_X2} y2={SY}
        stroke={rcRgba(brand.green, 0.30)} strokeWidth={3} strokeLinecap="round" />

      <ellipse cx={BEARING_X + 10} cy={SY} rx={12} ry={18}
        fill="rgba(90,100,115,0.80)" stroke="rgba(200,215,230,0.55)" strokeWidth={1.2} />
      <ellipse cx={BEARING_X + 10} cy={SY} rx={5} ry={7}
        fill={rcRgba(brand.green, 0.40)} stroke={RC.green} strokeWidth={1} />

      <ComponentBox
        x={GEARBOX_X} y={SY - 32} w={GEARBOX_W} h={64}
        label="GEARBOX" color="rgba(90,100,115,0.75)"
        stroke={CATEGORY_COLORS.mechanical}
      />
      <circle cx={GEARBOX_X + 28} cy={SY} r={14}
        fill="none" stroke={rcRgba(CATEGORY_COLORS.mechanical, 0.45)} strokeWidth={2} />
      <circle cx={GEARBOX_X + 28} cy={SY} r={6}
        fill={rcRgba(CATEGORY_COLORS.mechanical, 0.25)} stroke={rcRgba(CATEGORY_COLORS.mechanical, 0.65)} strokeWidth={1} />
      <circle cx={GEARBOX_X + 55} cy={SY} r={9}
        fill="none" stroke={rcRgba(CATEGORY_COLORS.mechanical, 0.35)} strokeWidth={2} />

      <line x1={GEARBOX_X + GEARBOX_W} y1={SY} x2={GEN_X} y2={SY}
        stroke={rcRgba(CATEGORY_COLORS.safety, 0.60)} strokeWidth={3} strokeLinecap="round" />

      <ellipse cx={BRAKE_X} cy={SY} rx={6} ry={20}
        fill={rcRgba(CATEGORY_COLORS.safety, 0.25)} stroke={rcRgba(CATEGORY_COLORS.safety, 0.70)} strokeWidth={1.5} />
      <ellipse cx={BRAKE_X} cy={SY} rx={3} ry={8}
        fill={rcRgba(CATEGORY_COLORS.safety, 0.40)} />

      <ComponentBox
        x={GEN_X} y={SY - 36} w={GEN_W} h={72}
        label="GENERATOR" color={rcRgba(CATEGORY_COLORS.electrical, 0.18)}
        stroke={CATEGORY_COLORS.electrical}
      />
      {[0, 1, 2].map((i) => (
        <ellipse key={i}
          cx={GEN_X + 18 + i * 18} cy={SY} rx={7} ry={14}
          fill="none" stroke={rcRgba(CATEGORY_COLORS.electrical, 0.35)} strokeWidth={1} />
      ))}

      <ComponentBox
        x={TRANS_X} y={SY - 28} w={TRANS_W} h={56}
        label="TRANS-FORMER" color={rcRgba(brand.green, 0.14)}
        stroke={rcRgba(brand.green, 0.55)}
      />
      {[0, 1, 2].map((i) => (
        <line key={i}
          x1={TRANS_X + 8} y1={SY - 18 + i * 12} x2={TRANS_X + TRANS_W - 8} y2={SY - 18 + i * 12}
          stroke={rcRgba(brand.green, 0.30)} strokeWidth={1} />
      ))}

      <rect x={NX + NW - 80} y={NY + 12} width={58} height={38} rx={4}
        fill={rcRgba(CATEGORY_COLORS.electrical, 0.18)} stroke={rcRgba(CATEGORY_COLORS.electrical, 0.55)} strokeWidth={1} />
      <text x={NX + NW - 51} y={NY + 28} textAnchor="middle"
        fontSize={6} fontFamily="Montserrat, sans-serif" fill={rcRgba(CATEGORY_COLORS.electrical, 0.85)}>
        CONTROLLER
      </text>
      {[0, 1, 2].map((i) => (
        <circle key={i}
          cx={NX + NW - 70 + i * 10} cy={NY + 38} r={2}
          fill={i === 1 ? RC.green : rcRgba(CATEGORY_COLORS.electrical, 0.60)} />
      ))}

      <line x1={NX + NW - 50} y1={NY} x2={NX + NW - 50} y2={NY - 22}
        stroke="rgba(210,220,230,0.55)" strokeWidth={1.2} />
      <circle cx={NX + NW - 50} cy={NY - 24} r={3}
        fill="rgba(210,220,230,0.70)" />
      <line x1={NX + NW - 50} y1={NY - 24}
        x2={NX + NW - 40} y2={NY - 32}
        stroke="rgba(210,220,230,0.55)" strokeWidth={1} />

      {[-20, 0, 20].map((dx) => (
        <rect key={dx}
          x={NX + NW / 2 + dx - 7} y={NY + NH - 8}
          width={14} height={10} rx={2}
          fill={rcRgba(CATEGORY_COLORS.electrical, 0.25)} stroke={rcRgba(CATEGORY_COLORS.electrical, 0.50)} strokeWidth={0.8} />
      ))}

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
            className="rc-legend-item flex items-center gap-2 min-w-[140px] rounded-md px-1.5 py-1 -mx-1.5"
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
export function NacelleInternalDiagram() {
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
            Nacelle Internal Components
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
            Key systems inside the offshore wind turbine nacelle — tap a part below to highlight it
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.greenDim, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · 01–09
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <NacelleSVG active={active} setActive={setActive} />
      </div>

      {/* Legend / index */}
      <Legend active={active} setActive={setActive} />

      {/* Caption */}
      <figcaption
        className="px-6 py-3 text-xs"
        style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white30 }}
      >
        Internal components of the offshore wind turbine nacelle — generator, gearbox, main shaft, and control systems
      </figcaption>
    </figure>
  )
}
