// ─────────────────────────────────────────────────────────────────────────────
// FixedFoundationInstallationDiagram — RC Diagram Design Language v1.2
//
// Cross-section of a monopile fixed offshore wind installation
// Rotor · Nacelle · Tower · Transition Piece · Monopile · Scour Protection
// Depth scale on left · numbered, interactive callouts on right
//
// Ported from the Nacelle Internal Components reference build: numbered
// category-coloured callouts, blueprint grid + corner brackets, a
// data-driven legend row, staggered entrance + hover/tap highlight, and
// the mobile fix (inline SVG labels hidden below md — the legend is the
// legible reading surface there; see DiagramStyles below). All original
// illustration geometry (depth scale, cross-section, wave/seabed/scour
// artwork) is unchanged — only the label/interactivity layer is ported.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'

// ── RC Design Tokens ─────────────────────────────────────────────────────────
const RC = {
  green:       brand.green,
  greenDim:    rcRgba(brand.green, 0.15),
  greenMid:    rcRgba(brand.green, 0.50),
  blue:        brand.blue,
  blueDim:     rcRgba(brand.blue, 0.18),
  amber:       brand.amber,
  amberDim:    rcRgba(brand.amber, 0.25),
  white90:     'rgba(255,255,255,0.90)',
  white65:     'rgba(255,255,255,0.65)',
  white45:     'rgba(255,255,255,0.45)',
  white30:     'rgba(255,255,255,0.30)',
  white22:     'rgba(255,255,255,0.22)',
  white18:     'rgba(255,255,255,0.18)',
  white15:     'rgba(255,255,255,0.15)',
  white10:     'rgba(255,255,255,0.08)',
  white08:     'rgba(255,255,255,0.08)',
  seaFill:     'rgba(15,60,115,0.45)',
  seaDeep:     'rgba(8,35,75,0.60)',
  seabedFill:  'rgba(110,90,55,0.70)',
  seabedStr:   'rgba(140,115,70,0.80)',
  steelFill:   'rgba(155,170,188,0.85)',
  steelStr:    'rgba(200,215,230,0.60)',
  tpFill:      rcRgba(brand.amber, 0.75),
  tpStr:       brand.amber,
  cardBg:      'rgba(10,15,20,0.85)',
  cardBorder:  'rgba(255,255,255,0.08)',
}

// ── Category colour key (same four categories across every RC diagram) ───────
const CATEGORY_COLORS = {
  mechanical: '#94A3B8', // slate — steel structural/geotechnical elements
  electrical: '#4A9EBF', // RC blue — unused here, kept for legend parity
  safety:     '#DAA520', // amber — protective / connection-critical elements
  structural: RC.green,  // RC green — primary load-bearing elements
} as const

type Category = keyof typeof CATEGORY_COLORS

const CATEGORY_LABEL: Record<Category, string> = {
  mechanical: 'Mechanical',
  electrical: 'Electrical',
  safety:     'Safety',
  structural: 'Structural',
}

// ── Layout constants ──────────────────────────────────────────────────────────
const W         = 860
const H         = 570
const CX        = 310      // turbine centre-x
const WATERLINE = 215      // sea-surface y
const SEABED_Y  = 415      // seabed surface y
const PILE_BOT  = 510      // base of pile (buried section)

// Turbine dimensions
const HUB_Y       = 68     // nacelle / hub centre y
const BLADE_LEN   = 110    // half-rotor diameter in px
const TOWER_W_TOP = 12     // tower width at hub join (half)
const TOWER_W_BOT = 16     // tower width at TP (half)
const MP_R        = 24     // monopile half-width (radius)
const TP_H        = 28     // transition-piece height
const TP_Y        = WATERLINE - 14   // TP top y

// Label column
const LABEL_X     = 560    // x of annotation text
const TICK_X      = LABEL_X - 12  // x end of leader tick

// ── Shared animation / interaction styles ─────────────────────────────────────
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
        <pattern id="rcGridFI" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowFI" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.10)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridFI)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowFI)" />
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

// ── Single source of truth for every labelled, numbered component ────────────
interface DiagramComponent {
  index: number
  text: string
  subtext?: string
  category: Category
  side: 'left' | 'right'
  labelX: number
  labelY: number
  targetX: number
  targetY: number
}

const COMPONENTS: DiagramComponent[] = [
  { index: 1, text: 'Rotor Blades',       subtext: 'Rotor diameter ~150 m',              category: 'structural', side: 'right', labelX: LABEL_X, labelY: HUB_Y - 52,                       targetX: CX + BLADE_LEN * 0.7, targetY: HUB_Y - 52 },
  { index: 2, text: 'Nacelle',            subtext: 'Houses generator & drivetrain',      category: 'mechanical', side: 'right', labelX: LABEL_X, labelY: HUB_Y + 2,                        targetX: CX + 38,              targetY: HUB_Y + 2 },
  { index: 3, text: 'Tower',              subtext: '60–100 m above sea level',           category: 'structural', side: 'right', labelX: LABEL_X, labelY: (HUB_Y + WATERLINE) / 2,          targetX: CX + TOWER_W_BOT + 4, targetY: (HUB_Y + WATERLINE) / 2 },
  { index: 4, text: 'Transition Piece',   subtext: 'Connects tower to monopile',         category: 'safety',     side: 'right', labelX: LABEL_X, labelY: TP_Y + TP_H / 2 + 4,              targetX: CX + MP_R + 6,        targetY: TP_Y + TP_H / 2 + 4 },
  { index: 5, text: 'Monopile',           subtext: 'Large steel cylinder, up to 10 m ⌀', category: 'mechanical', side: 'right', labelX: LABEL_X, labelY: (WATERLINE + SEABED_Y) / 2 + 20,  targetX: CX + MP_R + 2,        targetY: (WATERLINE + SEABED_Y) / 2 + 20 },
  { index: 6, text: 'Scour Protection',   subtext: 'Rocks prevent seabed erosion',       category: 'safety',     side: 'right', labelX: LABEL_X, labelY: SEABED_Y + 10,                    targetX: CX + MP_R + 22,       targetY: SEABED_Y + 10 },
  { index: 7, text: 'Seabed',             subtext: 'Typical depth: 15–50 m',             category: 'mechanical', side: 'right', labelX: LABEL_X, labelY: SEABED_Y + 28,                    targetX: CX + MP_R + 40,       targetY: SEABED_Y + 28 },
  { index: 8, text: 'Pile Penetration',   subtext: 'Driven ~20–30 m into seabed',        category: 'safety',     side: 'right', labelX: LABEL_X, labelY: (SEABED_Y + PILE_BOT) / 2,        targetX: CX + MP_R + 2,        targetY: (SEABED_Y + PILE_BOT) / 2 },
]

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
  const midX = (c.targetX + lineStartX) / 2
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

        {/* connector: label → elbow → target, dashed to match the source
            diagram's leader-line convention */}
        <polyline
          points={`${lineStartX},${c.labelY - 3} ${midX},${c.labelY - 3} ${c.targetX},${c.targetY}`}
          fill="none" stroke={lineColor} strokeWidth={isActive ? 1.6 : 1}
          strokeDasharray={isActive ? undefined : '3 3'} strokeLinejoin="round" />
        <circle cx={c.targetX} cy={c.targetY} r={2.5} fill={lineColor} />

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
        {c.subtext && (
          <text className="rc-callout-subtext" x={textX} y={c.labelY + 11} textAnchor={isLeft ? 'end' : 'start'}
            fontSize={7.5} fontFamily="Montserrat, sans-serif" fill={RC.white30}>
            {c.subtext}
          </text>
        )}
      </g>
    </g>
  )
}

// ── Helper: depth scale ───────────────────────────────────────────────────────
const DEPTH_PX_PER_M = (SEABED_Y - WATERLINE) / 30  // ~30m water depth shown

function DepthScale() {
  const marks = [0, 10, 20, 30]
  return (
    <g>
      {/* vertical axis */}
      <line
        x1={70} y1={WATERLINE}
        x2={70} y2={SEABED_Y + 90}
        stroke="rgba(255,255,255,0.18)" strokeWidth={1}
      />
      {/* waterline label */}
      <text x={64} y={WATERLINE - 6} textAnchor="end"
        fontSize={8.5} fontFamily="Montserrat, sans-serif" fill={RC.blue}>
        0 m
      </text>
      {marks.slice(1).map((m) => {
        const y = WATERLINE + m * DEPTH_PX_PER_M
        return (
          <g key={m}>
            <line x1={66} y1={y} x2={74} y2={y} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
            <text x={62} y={y + 4} textAnchor="end"
              fontSize={8} fontFamily="Montserrat, sans-serif" fill={RC.white30}>
              {m} m
            </text>
          </g>
        )
      })}
      {/* pile penetration tick */}
      <line x1={66} y1={PILE_BOT} x2={74} y2={PILE_BOT}
        stroke="rgba(218,165,32,0.40)" strokeWidth={1} />
      <text x={62} y={PILE_BOT + 4} textAnchor="end"
        fontSize={8} fontFamily="Montserrat, sans-serif" fill="rgba(218,165,32,0.55)">
        ~55 m
      </text>
      {/* bracket label */}
      <text x={52} y={(WATERLINE + SEABED_Y) / 2 + 4} textAnchor="middle"
        fontSize={8} fontFamily="Montserrat, sans-serif" fill={RC.white30}
        transform={`rotate(-90,52,${(WATERLINE + SEABED_Y) / 2})`}>
        Water depth
      </text>
    </g>
  )
}

// ── Helper: wave pattern along sea surface ────────────────────────────────────
function SeaSurface() {
  // simple sine-like path
  const pts: string[] = []
  for (let x = 85; x <= W - 50; x += 4) {
    const y = WATERLINE + Math.sin((x - 85) * 0.07) * 2.5
    pts.push(`${x},${y}`)
  }
  return (
    <>
      {/* filled water body */}
      <rect
        x={85} y={WATERLINE}
        width={W - 135} height={SEABED_Y - WATERLINE}
        fill="url(#seaGrad)"
      />
      {/* wave line */}
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={RC.blue}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.6}
      />
      {/* "Sea level" dashed line */}
      <line
        x1={85} y1={WATERLINE}
        x2={TICK_X - 10} y2={WATERLINE}
        stroke={RC.blue} strokeWidth={0.8}
        strokeDasharray="6 4" opacity={0.35}
      />
    </>
  )
}

// ── Helper: scour protection stones ──────────────────────────────────────────
function ScourProtection() {
  const stones = [
    { dx: -46, dy: 5,  rx: 11, ry: 7  },
    { dx: -30, dy: 2,  rx: 9,  ry: 6  },
    { dx: -52, dy: 12, rx: 8,  ry: 5  },
    { dx: -38, dy: 14, rx: 12, ry: 6  },
    { dx: -22, dy: 10, rx: 8,  ry: 5  },
    { dx:  46, dy: 5,  rx: 11, ry: 7  },
    { dx:  30, dy: 2,  rx: 9,  ry: 6  },
    { dx:  52, dy: 12, rx: 8,  ry: 5  },
    { dx:  38, dy: 14, rx: 12, ry: 6  },
    { dx:  22, dy: 10, rx: 8,  ry: 5  },
    { dx: -14, dy: 4,  rx: 10, ry: 6  },
    { dx:  14, dy: 4,  rx: 10, ry: 6  },
    { dx:   0, dy: 2,  rx: 9,  ry: 5  },
  ]
  return (
    <g>
      {stones.map((s, i) => (
        <ellipse
          key={i}
          cx={CX + s.dx} cy={SEABED_Y + s.dy}
          rx={s.rx} ry={s.ry}
          fill={`rgba(${80 + i * 2},${72 + i},${50 + i},0.75)`}
          stroke="rgba(160,140,100,0.40)"
          strokeWidth={0.8}
        />
      ))}
    </g>
  )
}

// ── Main SVG ─────────────────────────────────────────────────────────────────
function InstallationSVG({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  // tapered tower points
  const towerPts = [
    `${CX - TOWER_W_TOP},${HUB_Y + 10}`,
    `${CX + TOWER_W_TOP},${HUB_Y + 10}`,
    `${CX + TOWER_W_BOT},${TP_Y}`,
    `${CX - TOWER_W_BOT},${TP_Y}`,
  ].join(' ')

  // blade angles: up (270°), lower-left (30°), lower-right (150°)
  const bladeAngles = [-90, 30, 150]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', maxHeight: 560, fontFamily: 'Montserrat, sans-serif' }}
      aria-label="Cross-section of a monopile fixed offshore wind turbine installation"
    >
      <defs>
        {/* sky gradient */}
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(8,18,38,0.0)" />
          <stop offset="100%" stopColor="rgba(15,40,90,0.25)" />
        </linearGradient>
        {/* sea gradient */}
        <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(15,60,120,0.55)" />
          <stop offset="100%" stopColor="rgba(6,25,65,0.80)" />
        </linearGradient>
        {/* seabed pattern */}
        <linearGradient id="seabedGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(115,92,55,0.85)" />
          <stop offset="100%" stopColor="rgba(80,65,40,0.95)" />
        </linearGradient>
        {/* pile buried section — slightly darker */}
        <linearGradient id="pileBuriedGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(100,115,130,0.65)" />
          <stop offset="50%"  stopColor="rgba(135,150,168,0.80)" />
          <stop offset="100%" stopColor="rgba(100,115,130,0.65)" />
        </linearGradient>
        {/* monopile gradient (above seabed) */}
        <linearGradient id="mpGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(120,135,155,0.70)" />
          <stop offset="40%"  stopColor="rgba(165,180,198,0.92)" />
          <stop offset="100%" stopColor="rgba(120,135,155,0.70)" />
        </linearGradient>
        {/* tower gradient */}
        <linearGradient id="towerGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="rgba(140,155,175,0.75)" />
          <stop offset="45%"  stopColor="rgba(180,195,215,0.95)" />
          <stop offset="100%" stopColor="rgba(140,155,175,0.75)" />
        </linearGradient>
      </defs>

      <BlueprintFrame w={W} h={H} />

      {/* ── Sky background ── */}
      <rect x={85} y={0} width={W - 135} height={WATERLINE} fill="url(#skyGrad)" />

      {/* ── Sea + waves ── */}
      <SeaSurface />

      {/* ── Seabed ── */}
      <rect
        x={85} y={SEABED_Y}
        width={W - 135} height={H - SEABED_Y}
        fill="url(#seabedGrad)"
      />
      {/* seabed surface line */}
      <line x1={85} y1={SEABED_Y} x2={TICK_X - 10} y2={SEABED_Y}
        stroke={RC.seabedStr} strokeWidth={1} opacity={0.5} />

      {/* ── Pile buried section (drawn first so seabed overlaps slightly) ── */}
      <rect
        x={CX - MP_R} y={SEABED_Y - 2}
        width={MP_R * 2} height={PILE_BOT - SEABED_Y + 4}
        fill="url(#pileBuriedGrad)"
        stroke="rgba(200,215,230,0.25)"
        strokeWidth={1}
        rx={2}
      />
      {/* hatching to indicate buried */}
      {Array.from({ length: 12 }).map((_, i) => {
        const y = SEABED_Y + 8 + i * 8
        return (
          <line key={i}
            x1={CX - MP_R + 4} y1={y}
            x2={CX + MP_R - 4} y2={y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        )
      })}
      {/* pile tip */}
      <path
        d={`M${CX - MP_R},${PILE_BOT} L${CX},${PILE_BOT + 14} L${CX + MP_R},${PILE_BOT} Z`}
        fill="rgba(100,115,130,0.60)"
        stroke="rgba(200,215,230,0.20)"
        strokeWidth={1}
      />

      {/* ── Seabed stones (scour protection) ── */}
      <ScourProtection />

      {/* ── Monopile above seabed (water column section) ── */}
      <rect
        x={CX - MP_R} y={TP_Y + TP_H}
        width={MP_R * 2} height={SEABED_Y - (TP_Y + TP_H) + 4}
        fill="url(#mpGrad)"
        stroke="rgba(200,215,230,0.35)"
        strokeWidth={1}
      />
      {/* highlight stripe */}
      <rect
        x={CX - 3} y={TP_Y + TP_H}
        width={6} height={SEABED_Y - (TP_Y + TP_H)}
        fill="rgba(255,255,255,0.10)"
        rx={2}
      />

      {/* ── Transition piece ── */}
      <rect
        x={CX - MP_R - 4} y={TP_Y}
        width={(MP_R + 4) * 2} height={TP_H}
        fill={RC.tpFill}
        stroke={RC.tpStr}
        strokeWidth={1.5}
        rx={3}
      />
      {/* TP highlight */}
      <rect
        x={CX - MP_R} y={TP_Y + 4}
        width={MP_R * 2 - 2} height={8}
        fill="rgba(255,220,80,0.20)"
        rx={2}
      />

      {/* ── Tower (tapered trapezoid) ── */}
      <polygon
        points={towerPts}
        fill="url(#towerGrad)"
        stroke={RC.steelStr}
        strokeWidth={1}
      />
      {/* tower centre highlight */}
      <line
        x1={CX} y1={HUB_Y + 12}
        x2={CX} y2={TP_Y - 2}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={3}
        strokeLinecap="round"
      />

      {/* ── Nacelle ── */}
      <rect
        x={CX - 36} y={HUB_Y - 10}
        width={72} height={22}
        rx={5}
        fill="rgba(145,160,180,0.90)"
        stroke={RC.steelStr}
        strokeWidth={1}
      />
      {/* nacelle highlight */}
      <rect
        x={CX - 28} y={HUB_Y - 6}
        width={56} height={8}
        rx={3}
        fill="rgba(255,255,255,0.15)"
      />

      {/* ── Hub ── */}
      <circle
        cx={CX} cy={HUB_Y}
        r={10}
        fill="rgba(130,188,0,0.85)"
        stroke={RC.green}
        strokeWidth={1.5}
      />

      {/* ── Rotor blades ── */}
      {bladeAngles.map((angleDeg, i) => {
        const rad = (angleDeg * Math.PI) / 180
        const bx = CX + Math.cos(rad) * BLADE_LEN
        const by = HUB_Y + Math.sin(rad) * BLADE_LEN
        // control point for slight curve
        const cx1 = CX + Math.cos(rad) * BLADE_LEN * 0.4 + Math.sin(rad) * 6
        const cy1 = HUB_Y + Math.sin(rad) * BLADE_LEN * 0.4 - Math.cos(rad) * 6
        return (
          <g key={i}>
            {/* blade body */}
            <path
              d={`M${CX},${HUB_Y} Q${cx1},${cy1} ${bx},${by}`}
              fill="none"
              stroke={RC.green}
              strokeWidth={5}
              strokeLinecap="round"
              opacity={0.90}
            />
            {/* blade tip highlight */}
            <circle cx={bx} cy={by} r={3} fill={RC.green} opacity={0.70} />
          </g>
        )
      })}

      {/* ── Depth scale ── */}
      <DepthScale />

      {/* ── Water depth bracket ── */}
      <line x1={82} y1={WATERLINE} x2={82} y2={SEABED_Y}
        stroke="rgba(74,158,191,0.30)" strokeWidth={1.5} />
      <line x1={79} y1={WATERLINE} x2={85} y2={WATERLINE}
        stroke="rgba(74,158,191,0.30)" strokeWidth={1.5} />
      <line x1={79} y1={SEABED_Y} x2={85} y2={SEABED_Y}
        stroke="rgba(74,158,191,0.30)" strokeWidth={1.5} />

      {/* ── Rotor diameter span annotation (static) ── */}
      <line x1={CX - BLADE_LEN} y1={HUB_Y - 22}
        x2={CX + BLADE_LEN} y2={HUB_Y - 22}
        stroke="rgba(130,188,0,0.25)" strokeWidth={1} />
      <line x1={CX - BLADE_LEN} y1={HUB_Y - 26}
        x2={CX - BLADE_LEN} y2={HUB_Y - 18}
        stroke="rgba(130,188,0,0.25)" strokeWidth={1} />
      <line x1={CX + BLADE_LEN} y1={HUB_Y - 26}
        x2={CX + BLADE_LEN} y2={HUB_Y - 18}
        stroke="rgba(130,188,0,0.25)" strokeWidth={1} />
      <text x={CX} y={HUB_Y - 27} textAnchor="middle" className="rc-callout-label"
        fontSize={8.5} fontFamily="Montserrat, sans-serif" fill="rgba(130,188,0,0.55)">
        Rotor diameter ~150 m
      </text>

      {/* ── Sea level (static reference line, not a numbered part) ── */}
      <polyline
        points={`${CX + MP_R + 6},${WATERLINE} ${(CX + MP_R + 6 + TICK_X) / 2},${WATERLINE} ${TICK_X},${WATERLINE}`}
        fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1} strokeDasharray="3 3" className="rc-callout-label" />
      <circle cx={CX + MP_R + 6} cy={WATERLINE} r={2.5} fill="rgba(255,255,255,0.25)" className="rc-callout-label" />
      <text x={LABEL_X} y={WATERLINE - 2} className="rc-callout-label"
        fontSize={10.5} fontFamily="Montserrat, sans-serif" fontWeight="600" fill={RC.blue}>
        Sea Level
      </text>
      <text x={LABEL_X} y={WATERLINE + 11} className="rc-callout-subtext"
        fontSize={8.5} fontFamily="Montserrat, sans-serif" fill={RC.white30}>
        Mean sea level
      </text>

      {/* ── Numbered, interactive callouts ── */}
      {COMPONENTS.map((c) => (
        <Callout
          key={c.index}
          c={c}
          active={active}
          onEnter={() => setActive(c.index)}
          onLeave={() => setActive(null)}
          onToggle={() => setActive(active === c.index ? null : c.index)}
        />
      ))}

      {/* ── Section title ── */}
      <text x={W / 2 + 30} y={H - 16} textAnchor="middle"
        fontSize={9} fontFamily="Montserrat, sans-serif" fill={RC.white30}>
        Monopile installation · cross-section (not to scale)
      </text>
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
            className="rc-legend-item flex items-center gap-2 min-w-[160px] rounded-md px-1.5 py-1 -mx-1.5"
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
export function FixedFoundationInstallationDiagram() {
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
            Fixed Offshore Wind — Installation Cross-Section
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
            Monopile foundation · from blade tip to pile penetration — tap a part below to highlight it
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.greenDim, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · 01–08
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-2 py-5 flex justify-center overflow-x-auto">
        <InstallationSVG active={active} setActive={setActive} />
      </div>

      {/* Legend / index */}
      <Legend active={active} setActive={setActive} />

      {/* Caption */}
      <figcaption
        className="px-6 py-3 text-xs"
        style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white30 }}
      >
        Cross-section of a typical monopile fixed offshore wind installation, showing the full depth profile from rotor to pile penetration
      </figcaption>
    </figure>
  )
}
