// ─────────────────────────────────────────────────────────────────────────────
// OffshoreFoundationTypesDiagram — RC Diagram Design Language v1.2
//
// Cross-section diagram showing all 5 offshore wind foundation types
// arranged left-to-right over a sloping seabed profile:
//
//   Monopile  │  Jacket  │  Tension Leg  │  Semi-Sub  │  Spar
//  (shallow)  │(transit.)│   Platform    │ submersible│ (deep)
//
// Fixed foundations on the left, floating technologies on the right.
// Shared turbine component labels annotate the rightmost (Spar) turbine
// and the leftmost (Monopile) foundation.
//
// Ported from the Nacelle Internal Components diagram's reference build:
// numbered category-coloured callouts, blueprint grid + corner brackets,
// a data-driven legend row, staggered entrance + hover/tap highlight, and
// the mobile fix (inline SVG labels hidden below md — the legend is the
// legible reading surface there; see DiagramStyles below).
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'

// ── RC Design Tokens ─────────────────────────────────────────────────────────
const RC = {
  green:      brand.green,
  greenDim:   rcRgba(brand.green, 0.15),
  greenMid:   rcRgba(brand.green, 0.55),
  amber:      brand.amber,
  amberDim:   rcRgba(brand.amber, 0.15),
  amberMid:   rcRgba(brand.amber, 0.55),
  white90:    'rgba(255,255,255,0.90)',
  white65:    'rgba(255,255,255,0.65)',
  white45:    'rgba(255,255,255,0.45)',
  white30:    'rgba(255,255,255,0.30)',
  white18:    'rgba(255,255,255,0.18)',
  white15:    'rgba(255,255,255,0.15)',
  white10:    'rgba(255,255,255,0.08)',
  white22:    'rgba(255,255,255,0.22)',
  cardBg:     'rgba(10,15,20,0.80)',
  cardBorder: 'rgba(255,255,255,0.08)',
}

// ── Category colour key (same four categories across every RC diagram) ───────
const CATEGORY_COLORS = {
  mechanical: '#94A3B8',
  electrical: '#4A9EBF',
  safety:     '#DAA520',
  structural: RC.green,
} as const

type Category = keyof typeof CATEGORY_COLORS

const CATEGORY_LABEL: Record<Category, string> = {
  mechanical: 'Mechanical',
  electrical: 'Electrical',
  safety:     'Safety',
  structural: 'Structural',
}

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
        <pattern id="rcGridOF" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowOF" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridOF)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowOF)" />
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
      <g className="rc-callout-enter" style={{ '--rc-delay': `${c.index * 0.06}s` } as React.CSSProperties}>
        <circle cx={chipX} cy={c.labelY - 6} r={18} fill="transparent" />

        <polyline
          points={`${lineStartX},${c.labelY - 3} ${elbowX},${c.labelY - 3} ${c.targetX},${c.targetY}`}
          fill="none" stroke={lineColor} strokeWidth={isActive ? 1.6 : 1} strokeLinejoin="round" />
        <circle cx={c.targetX} cy={c.targetY} r={isActive ? 5.5 : 4} fill="none" stroke={color} strokeWidth={isActive ? 1.6 : 1.2} opacity={0.95} />
        <circle cx={c.targetX} cy={c.targetY} r={1.5} fill={color} />

        <g className="rc-callout-chipgroup">
          <circle cx={chipX} cy={c.labelY - 6} r={chipR} fill={rcRgba(color, isActive ? 0.28 : 0.16)} stroke={color} strokeWidth={1.2} />
          <text x={chipX} y={c.labelY - 3} textAnchor="middle"
            fontSize={8} fontWeight="700" fontFamily="Montserrat, sans-serif" fill={color}>
            {String(c.index).padStart(2, '0')}
          </text>
        </g>

        <text className="rc-callout-label" x={textX} y={c.labelY} textAnchor={isLeft ? 'end' : 'start'}
          fontSize={9} fontWeight="600" fontFamily="Montserrat, sans-serif" fill={isActive ? RC.white90 : RC.white65}>
          {c.text}
        </text>
        {c.subtext && (
          <text className="rc-callout-subtext" x={textX} y={c.labelY + 10} textAnchor={isLeft ? 'end' : 'start'}
            fontSize={7.5} fontFamily="Montserrat, sans-serif" fill={RC.white45}>
            {c.subtext}
          </text>
        )}
      </g>
    </g>
  )
}

// ── Layout constants ──────────────────────────────────────────────────────────
const W         = 920   // SVG canvas width
const H         = 500   // SVG canvas height
const SURF_Y    = 258   // sea surface y
const HUB_Y     = 88    // turbine hub y (above surface, same for all)
const BLADE_LEN = 65    // turbine blade length (px)
const SLOT_W    = W / 5
const CX        = [0, 1, 2, 3, 4].map((i) => Math.round(SLOT_W * i + SLOT_W / 2))

// Seabed depth (y) at each column centre — shallow (Monopile) → deep (Spar)
const SEABED: Record<number, number> = {
  [CX[0]]: 328,
  [CX[1]]: 360,
  [CX[2]]: 445,
  [CX[3]]: 458,
  [CX[4]]: 468,
}

// ── Single source of truth for every labelled component ──────────────────────
// Left side points at the Monopile (CX[0]); right side points at the Spar
// turbine (CX[4]) — the same two structures the original callouts annotated.
const COMPONENTS: DiagramComponent[] = [
  { index: 1, text: 'Transition Piece',    subtext: undefined,           category: 'structural', side: 'left',  labelX: 12,     labelY: SURF_Y - 5,  targetX: CX[0] - 10, targetY: SURF_Y - 8 },
  { index: 2, text: 'Foundation',          subtext: 'Monopile',          category: 'structural', side: 'left',  labelX: 12,     labelY: SURF_Y + 40, targetX: CX[0] - 7,  targetY: SURF_Y + 38 },
  { index: 3, text: 'Blades',              subtext: undefined,           category: 'mechanical', side: 'right', labelX: W - 10, labelY: HUB_Y - BLADE_LEN + 8, targetX: CX[4] + 4,  targetY: HUB_Y - BLADE_LEN + 2 },
  { index: 4, text: 'Nacelle',             subtext: undefined,           category: 'mechanical', side: 'right', labelX: W - 10, labelY: HUB_Y + 2,   targetX: CX[4] + 26, targetY: HUB_Y },
  { index: 5, text: 'Tower',               subtext: undefined,           category: 'structural', side: 'right', labelX: W - 10, labelY: HUB_Y + 64,  targetX: CX[4] + 7,  targetY: HUB_Y + 62 },
  { index: 6, text: 'Platform',            subtext: 'Spar',              category: 'structural', side: 'right', labelX: W - 10, labelY: SURF_Y - 5,  targetX: CX[4] + 20, targetY: SURF_Y - 6 },
  { index: 7, text: 'Hull',                subtext: 'Ballasted spar',    category: 'structural', side: 'right', labelX: W - 10, labelY: SURF_Y + 80, targetX: CX[4] + 9,  targetY: SURF_Y + 75 },
]

function seabedPath() {
  return [
    `M 0 ${SEABED[CX[0]] - 6}`,
    `L ${CX[0] + 80} ${SEABED[CX[0]]}`,
    `L ${CX[1] - 20} ${SEABED[CX[1]] - 10}`,
    `L ${CX[1] + 80} ${SEABED[CX[1]]}`,
    `L ${CX[2] - 20} ${SEABED[CX[2]] - 30}`,
    `L ${CX[2] + 80} ${SEABED[CX[2]]}`,
    `L ${CX[3] - 10} ${SEABED[CX[3]] - 4}`,
    `L ${CX[3] + 80} ${SEABED[CX[3]]}`,
    `L ${W} ${SEABED[CX[4]] + 5}`,
    `L ${W} ${H}`,
    `L 0 ${H} Z`,
  ].join(' ')
}

// ── Shared turbine (tower / blades / nacelle / hub), rendered above every foundation ──
function Turbine({ cx }: { cx: number }) {
  return (
    <g>
      {/* Tower */}
      <path
        d={`M${cx - 6} ${HUB_Y + 10}
            L${cx - 4} ${SURF_Y - 2}
            L${cx + 4} ${SURF_Y - 2}
            L${cx + 6} ${HUB_Y + 10} Z`}
        fill="rgba(160,175,190,0.65)"
        stroke="rgba(200,215,230,0.50)" strokeWidth={1}
      />
      {/* Nacelle */}
      <rect x={cx - 2} y={HUB_Y - 6} width={26} height={11} rx={2}
        fill="rgba(140,155,170,0.80)" stroke="rgba(200,215,230,0.55)" strokeWidth={1} />
      {/* Blades */}
      {[0, 120, 240].map((deg) => (
        <path
          key={deg}
          d={`M${cx} ${HUB_Y}
              L${cx - 3} ${HUB_Y - BLADE_LEN}
              Q${cx} ${HUB_Y - BLADE_LEN - 7} ${cx + 3} ${HUB_Y - BLADE_LEN} Z`}
          fill={RC.green}
          opacity={0.85}
          transform={`rotate(${deg}, ${cx}, ${HUB_Y})`}
        />
      ))}
      {/* Hub */}
      <circle cx={cx} cy={HUB_Y} r={5} fill="rgba(150,165,180,0.90)"
        stroke="rgba(200,215,230,0.60)" strokeWidth={1} />
    </g>
  )
}

// ── Foundation 1: Monopile ─────────────────────────────────────────────────────
function Monopile({ cx }: { cx: number }) {
  const sb = SEABED[cx]
  return (
    <g>
      {/* Transition piece (above waterline, wider collar) */}
      <rect x={cx - 10} y={SURF_Y - 14} width={20} height={22} rx={2}
        fill={RC.greenMid} stroke={RC.green} strokeWidth={1.2} />
      {/* Monopile shaft (above waterline portion — same width as transition piece minus collar) */}
      <rect x={cx - 7} y={SURF_Y + 8} width={14} height={sb - SURF_Y - 8} rx={2}
        fill="rgba(130,188,0,0.40)" stroke={RC.green} strokeWidth={1} />
      {/* Seabed penetration indicator */}
      <rect x={cx - 9} y={sb - 8} width={18} height={10} rx={2}
        fill="rgba(130,188,0,0.20)" stroke="rgba(130,188,0,0.35)" strokeWidth={1} />
    </g>
  )
}

// ── Foundation 2: Jacket ──────────────────────────────────────────────────────
function Jacket({ cx }: { cx: number }) {
  const sb = SEABED[cx]
  const topSpread = 10   // half-width at top (transition piece)
  const botSpread = 28   // half-width at bottom (feet)
  const depth     = sb - SURF_Y + 8

  // Leg x positions (linear taper)
  function legX(side: -1 | 1, y: number) {
    const frac = (y - SURF_Y) / depth
    return cx + side * (topSpread + (botSpread - topSpread) * frac)
  }

  const braceYs = [SURF_Y + 18, SURF_Y + (depth * 0.40), SURF_Y + (depth * 0.72), sb - 4]

  return (
    <g>
      {/* Transition piece */}
      <rect x={cx - 10} y={SURF_Y - 14} width={20} height={18} rx={2}
        fill={RC.greenMid} stroke={RC.green} strokeWidth={1.2} />
      {/* Left leg */}
      <path
        d={`M${legX(-1, SURF_Y)} ${SURF_Y + 4} L${legX(-1, sb)} ${sb}`}
        stroke={RC.green} strokeWidth={3} strokeLinecap="round"
      />
      {/* Right leg */}
      <path
        d={`M${legX(1, SURF_Y)} ${SURF_Y + 4} L${legX(1, sb)} ${sb}`}
        stroke={RC.green} strokeWidth={3} strokeLinecap="round"
      />
      {/* Horizontal braces */}
      {braceYs.map((y, i) => (
        <line key={i} x1={legX(-1, y)} y1={y} x2={legX(1, y)} y2={y}
          stroke={RC.green} strokeWidth={i === 0 || i === braceYs.length - 1 ? 2.5 : 1.8}
          opacity={0.85} />
      ))}
      {/* Diagonal cross-braces between brace pairs */}
      {braceYs.slice(0, -1).map((y1, i) => {
        const y2 = braceYs[i + 1]
        return (
          <g key={i}>
            <line x1={legX(-1, y1)} y1={y1} x2={legX(1, y2)} y2={y2}
              stroke={RC.green} strokeWidth={1.2} opacity={0.55} />
            <line x1={legX(1, y1)} y1={y1} x2={legX(-1, y2)} y2={y2}
              stroke={RC.green} strokeWidth={1.2} opacity={0.55} />
          </g>
        )
      })}
      {/* Pile feet */}
      {([-1, 1] as const).map((side) => (
        <circle key={side} cx={legX(side, sb)} cy={sb} r={4}
          fill={RC.green} opacity={0.70} />
      ))}
    </g>
  )
}

// ── Foundation 3: Tension Leg Platform ────────────────────────────────────────
function TensionLeg({ cx }: { cx: number }) {
  const sb       = SEABED[cx]
  const platTop  = SURF_Y - 18
  const platBot  = SURF_Y + 10
  const platW    = 52
  const legOffX  = 20    // distance of TL from centre
  const legTopY  = platBot
  const legBotY  = sb - 4

  return (
    <g>
      {/* Pontoons (submerged horizontal floats on each side) */}
      <rect x={cx - platW / 2 - 4} y={platBot - 4} width={16} height={14} rx={5}
        fill={RC.amberMid} stroke={RC.amber} strokeWidth={1.2} />
      <rect x={cx + platW / 2 - 12} y={platBot - 4} width={16} height={14} rx={5}
        fill={RC.amberMid} stroke={RC.amber} strokeWidth={1.2} />
      {/* Main platform deck */}
      <rect x={cx - platW / 2} y={platTop} width={platW} height={platBot - platTop} rx={4}
        fill={RC.amberDim} stroke={RC.amber} strokeWidth={1.5} />
      {/* Central column up through deck */}
      <rect x={cx - 6} y={SURF_Y} width={12} height={platBot - SURF_Y + 6} rx={2}
        fill={RC.amberMid} stroke={RC.amber} strokeWidth={1} opacity={0.6} />
      {/* Tension legs — straight vertical (taut) */}
      {([-legOffX, legOffX] as const).map((dx) => (
        <g key={dx}>
          <line x1={cx + dx} y1={legTopY} x2={cx + dx} y2={legBotY}
            stroke={RC.amber} strokeWidth={2} strokeDasharray="none" opacity={0.80} />
          {/* Anchor at seabed */}
          <rect x={cx + dx - 5} y={legBotY} width={10} height={6} rx={2}
            fill={RC.amber} opacity={0.60} />
        </g>
      ))}
    </g>
  )
}

// ── Foundation 4: Semi-submersible ────────────────────────────────────────────
function SemiSubmersible({ cx }: { cx: number }) {
  const sb       = SEABED[cx]
  const colTopY  = SURF_Y - 20
  const colBotY  = SURF_Y + 28
  const colH     = colBotY - colTopY
  const spread   = 34   // half-span between outer columns

  // Column positions: left, centre, right
  const cols = [cx - spread, cx, cx + spread]

  return (
    <g>
      {/* Connecting pontoons (lower braces) */}
      <line x1={cx - spread} y1={colBotY - 6} x2={cx + spread} y2={colBotY - 6}
        stroke={RC.amber} strokeWidth={3} strokeLinecap="round" opacity={0.60} />
      <line x1={cx - spread} y1={colTopY + 10} x2={cx + spread} y2={colTopY + 10}
        stroke={RC.amber} strokeWidth={2} strokeLinecap="round" opacity={0.50} />
      {/* Columns */}
      {cols.map((colX, i) => (
        <rect key={i}
          x={colX - 8} y={colTopY} width={16} height={colH} rx={4}
          fill={RC.amberDim} stroke={RC.amber} strokeWidth={1.5} />
      ))}
      {/* Platform deck */}
      <rect x={cx - spread - 6} y={colTopY - 10} width={(spread + 6) * 2} height={12} rx={3}
        fill="rgba(218,165,32,0.30)" stroke={RC.amber} strokeWidth={1.2} />
      {/* Catenary mooring lines */}
      {([-1, 1] as const).map((side) => {
        const lineX0 = cx + side * (spread + 4)
        const lineY0 = colBotY
        const anchorX = cx + side * 60
        const anchorY = sb - 4
        const midX = (lineX0 + anchorX) / 2 + side * 12
        const midY = (lineY0 + anchorY) / 2 + 28
        return (
          <g key={side}>
            <path
              d={`M${lineX0} ${lineY0} Q${midX} ${midY} ${anchorX} ${anchorY}`}
              stroke={RC.amber} strokeWidth={1.5} fill="none"
              strokeDasharray="4 3" opacity={0.65}
            />
            <circle cx={anchorX} cy={anchorY} r={3.5}
              fill={RC.amber} opacity={0.55} />
          </g>
        )
      })}
    </g>
  )
}

// ── Foundation 5: Spar ────────────────────────────────────────────────────────
function Spar({ cx }: { cx: number }) {
  const sb        = SEABED[cx]
  const platY     = SURF_Y - 14
  const hullTop   = SURF_Y + 8
  const hullBot   = sb - 28   // spar extends deep but not to seabed
  const hullW     = 18
  const moorY     = hullTop + (hullBot - hullTop) * 0.45  // mooring line attach point

  return (
    <g>
      {/* Platform / transition ring at waterline */}
      <rect x={cx - 20} y={platY} width={40} height={20} rx={4}
        fill="rgba(218,165,32,0.30)" stroke={RC.amber} strokeWidth={1.5} />
      {/* Spar hull — long cylinder extending deep */}
      <rect x={cx - hullW / 2} y={hullTop} width={hullW} height={hullBot - hullTop} rx={4}
        fill={RC.amberDim} stroke={RC.amber} strokeWidth={1.5} />
      {/* Ballast section (darker bottom) */}
      <rect x={cx - hullW / 2} y={hullBot - 28} width={hullW} height={30} rx={4}
        fill="rgba(218,165,32,0.35)" stroke={RC.amber} strokeWidth={1} />
      {/* Hull end cap */}
      <ellipse cx={cx} cy={hullBot} rx={hullW / 2} ry={4}
        fill={RC.amber} opacity={0.45} />
      {/* Catenary mooring lines — 2 sides */}
      {([-1, 1] as const).map((side) => {
        const lineX0  = cx + side * (hullW / 2)
        const lineY0  = moorY
        const anchorX = cx + side * 58
        const anchorY = sb - 4
        const ctrlX   = (lineX0 + anchorX) / 2 + side * 20
        const ctrlY   = (lineY0 + anchorY) / 2 + 20
        return (
          <g key={side}>
            <path
              d={`M${lineX0} ${lineY0} Q${ctrlX} ${ctrlY} ${anchorX} ${anchorY}`}
              stroke={RC.amber} strokeWidth={1.5} fill="none"
              strokeDasharray="4 3" opacity={0.65}
            />
            <circle cx={anchorX} cy={anchorY} r={3.5}
              fill={RC.amber} opacity={0.55} />
          </g>
        )
      })}
    </g>
  )
}

// ── Full SVG diagram ──────────────────────────────────────────────────────────
function FoundationTypesSVG({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  const fixedBracketLeft  = CX[0] - 60
  const fixedBracketRight = CX[1] + 64
  const floatBracketLeft  = CX[2] - 68
  const floatBracketRight = CX[4] + 52

  // Depth zone label positions (between seabed and canvas bottom)
  const shallowZoneCx    = (CX[0] + CX[1]) / 2
  const transitZoneCx    = CX[1] + 40
  const deepZoneCx       = (CX[2] + CX[4]) / 2

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: W, minWidth: 280 }}
      aria-label="Offshore wind foundation types cross-section diagram"
    >
      <BlueprintFrame w={W} h={H} />

      {/* ── Sky background ── */}
      <rect x={0} y={0} width={W} height={SURF_Y} fill="rgba(8,20,40,0.45)" />

      {/* ── Sea fill (surface to seabed) ── */}
      <rect x={0} y={SURF_Y} width={W} height={H - SURF_Y} fill="rgba(10,38,80,0.50)" />

      {/* ── Seabed fill ── */}
      <path d={seabedPath()} fill="rgba(80,62,38,0.70)" />

      {/* ── Seabed surface line (top of soil, visible) ── */}
      <path
        d={[
          `M 0 ${SEABED[CX[0]] - 6}`,
          `L ${CX[0] + 80} ${SEABED[CX[0]]}`,
          `L ${CX[1] - 20} ${SEABED[CX[1]] - 10}`,
          `L ${CX[1] + 80} ${SEABED[CX[1]]}`,
          `L ${CX[2] - 20} ${SEABED[CX[2]] - 30}`,
          `L ${CX[2] + 80} ${SEABED[CX[2]]}`,
          `L ${CX[3] - 10} ${SEABED[CX[3]] - 4}`,
          `L ${CX[3] + 80} ${SEABED[CX[3]]}`,
          `L ${W} ${SEABED[CX[4]] + 5}`,
        ].join(' ')}
        stroke="rgba(180,150,100,0.35)" strokeWidth={1.5} fill="none"
      />

      {/* ── Water surface line ── */}
      <line x1={0} y1={SURF_Y} x2={W} y2={SURF_Y}
        stroke="rgba(100,160,220,0.30)" strokeWidth={1} strokeDasharray="5 8" />

      {/* ══ FIXED FOUNDATION BRACKET ══ */}
      <rect x={fixedBracketLeft} y={6} width={fixedBracketRight - fixedBracketLeft} height={22}
        rx={5} fill={RC.greenDim} stroke={`${RC.green}40`} strokeWidth={1} />
      <text
        x={(fixedBracketLeft + fixedBracketRight) / 2} y={21}
        textAnchor="middle" fontSize={8} fontWeight="800" letterSpacing="1.2"
        fontFamily="Montserrat, sans-serif" fill={RC.green}>
        FIXED FOUNDATION
      </text>

      {/* ══ FLOATING TECHNOLOGY BRACKET ══ */}
      <rect x={floatBracketLeft} y={6} width={floatBracketRight - floatBracketLeft} height={22}
        rx={5} fill={RC.amberDim} stroke={`${RC.amber}40`} strokeWidth={1} />
      <text
        x={(floatBracketLeft + floatBracketRight) / 2} y={21}
        textAnchor="middle" fontSize={8} fontWeight="800" letterSpacing="1.2"
        fontFamily="Montserrat, sans-serif" fill={RC.amber}>
        FLOATING TECHNOLOGY
      </text>

      {/* ══ FOUNDATION STRUCTURES ══ */}
      <Monopile        cx={CX[0]} />
      <Jacket          cx={CX[1]} />
      <TensionLeg      cx={CX[2]} />
      <SemiSubmersible cx={CX[3]} />
      <Spar            cx={CX[4]} />

      {/* ══ TURBINES (above water, same for all) ══ */}
      {CX.map((cx) => <Turbine key={cx} cx={cx} />)}

      {/* ══ FOUNDATION TYPE COLUMN NAMES ══ */}
      {[
        { cx: CX[0], label: 'Monopile',    sub: '' },
        { cx: CX[1], label: 'Jacket',      sub: '' },
        { cx: CX[2], label: 'Tension Leg', sub: 'Platform' },
        { cx: CX[3], label: 'Semi-',       sub: 'submersible' },
        { cx: CX[4], label: 'Spar',        sub: '' },
      ].map(({ cx, label, sub }) => (
        <g key={cx}>
          <text x={cx} y={HUB_Y - BLADE_LEN - 20}
            textAnchor="middle" fontSize={9} fontWeight="700"
            fontFamily="Montserrat, sans-serif" fill={RC.white90}>
            {label}
          </text>
          {sub && (
            <text x={cx} y={HUB_Y - BLADE_LEN - 9}
              textAnchor="middle" fontSize={9} fontWeight="700"
              fontFamily="Montserrat, sans-serif" fill={RC.white90}>
              {sub}
            </text>
          )}
        </g>
      ))}

      {/* ══ WATER DEPTH ZONE LABELS (in seabed / lower area) ══ */}
      {/* Shallow Water */}
      <text x={shallowZoneCx} y={H - 18} textAnchor="middle"
        fontSize={8} fontWeight="700" fontFamily="Montserrat, sans-serif"
        fill="rgba(130,188,0,0.65)">
        SHALLOW WATER
      </text>
      <text x={shallowZoneCx} y={H - 8} textAnchor="middle"
        fontSize={7} fontFamily="Montserrat, sans-serif"
        fill="rgba(130,188,0,0.40)">
        0 – 30 m
      </text>
      {/* Transitional Water */}
      <text x={transitZoneCx} y={H - 18} textAnchor="middle"
        fontSize={8} fontWeight="700" fontFamily="Montserrat, sans-serif"
        fill="rgba(180,200,100,0.55)">
        TRANSITIONAL
      </text>
      <text x={transitZoneCx} y={H - 8} textAnchor="middle"
        fontSize={7} fontFamily="Montserrat, sans-serif"
        fill="rgba(180,200,100,0.35)">
        30 – 60 m
      </text>
      {/* Deep Water */}
      <text x={deepZoneCx} y={H - 18} textAnchor="middle"
        fontSize={8} fontWeight="700" fontFamily="Montserrat, sans-serif"
        fill="rgba(218,165,32,0.65)">
        DEEP WATER
      </text>
      <text x={deepZoneCx} y={H - 8} textAnchor="middle"
        fontSize={7} fontFamily="Montserrat, sans-serif"
        fill="rgba(218,165,32,0.40)">
        {`> 60 m`}
      </text>

      {/* ── Sea level label ── */}
      <text x={4} y={SURF_Y - 4} fontSize={7} fontStyle="italic"
        fill="rgba(100,160,220,0.45)" fontFamily="Montserrat, sans-serif">
        Sea level
      </text>

      {/* ── Vertical divider between fixed and floating sections ── */}
      <line
        x1={(CX[1] + CX[2]) / 2} y1={30}
        x2={(CX[1] + CX[2]) / 2} y2={SURF_Y - 2}
        stroke="rgba(255,255,255,0.10)" strokeWidth={1} strokeDasharray="3 5"
      />

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

// ── Public component ─────────────────────────────────────────────────────────

export interface OffshoreFoundationTypesDiagramProps {
  title: string
  caption?: string
}

export function OffshoreFoundationTypesDiagram({ title, caption }: OffshoreFoundationTypesDiagramProps) {
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
        <div className="flex-1">
          <h3
            className="font-heading font-bold text-base leading-snug"
            style={{ color: RC.white90, fontFamily: "'Montserrat', sans-serif" }}
          >
            {title}
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
            Tap a part below to highlight it
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.greenDim, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · 01–07
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <FoundationTypesSVG active={active} setActive={setActive} />
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
