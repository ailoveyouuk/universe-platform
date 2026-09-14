// ─────────────────────────────────────────────────────────────────────────────
// OnshoreWindPrinciplesDiagram — RC Diagram Design Language v1.2 (process-flow
// variant, card-grid adaptation)
//
// 12-step "How does an onshore wind farm work?" card grid, in two rows:
//   Row 1 — TURBINE OPERATION (green, steps 1–6)
//     1. Wind turns blades  2. Hub  3. Low-speed shaft  4. Gearbox ×100
//     5. High-speed shaft   6. Generator
//   Row 2 — ELECTRICAL CONVERSION & DISTRIBUTION (amber, steps 7–12)
//     7. Converter DC→AC   8. Transformer 20–66 kV  9. Medium voltage cables
//    10. Evacuation line   11. Distribution network  12. Substation +32 kV
//
// Ported from an earlier "Mauna Loa Design Language" pass (card shell + RC
// tokens only, no BlueprintFrame/interactivity/mobile fix) to v1.2 — same
// tokens, BlueprintFrame, staggered entrance, hover/tap dimming and
// mobile-legibility fix as GridIntegrationDiagram (the process-flow
// reference build). All original card/icon geometry is unchanged; only the
// interactive/styling layer around it is new. The interactive unit is a
// whole step card (icon + label + detail + number badge), matching the
// per-stage interactivity of the reference. Because the 12 steps overflow a
// single row on phones, the inline SVG label/detail text is exactly the
// text this port hides below ~768px — the two-group HTML legend underneath
// (grouped by row, same pattern as BiomassConversionPathwaysDiagram) is what
// carries the reading on mobile.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'
// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:      brand.green,
  greenDim:   rcRgba(brand.green, 0.12),
  greenMid:   rcRgba(brand.green, 0.40),
  greenBright:rcRgba(brand.green, 0.70),
  amber:      brand.amber,
  amberDim:   rcRgba(brand.amber, 0.12),
  amberMid:   rcRgba(brand.amber, 0.40),
  amberBright:rcRgba(brand.amber, 0.70),
  white90:    'rgba(255,255,255,0.90)',
  white65:    'rgba(255,255,255,0.65)',
  white45:    'rgba(255,255,255,0.45)',
  white20:    'rgba(255,255,255,0.20)',
  white18:    'rgba(255,255,255,0.18)',
  white10:    'rgba(255,255,255,0.10)',
  white08:    'rgba(255,255,255,0.08)',
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
      /* Same mobile fix as the other RC Diagram variants: below ~768px this
         12-card grid has shrunk enough that inline SVG label/detail text is
         no longer legible. Hide it and let the legend row (plain HTML,
         always full size) carry the reading; the step badge gets a size
         bump so each card still reads as "a numbered thing". */
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
        <pattern id="rcGridOWP" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowOWP" cx="50%" cy="30%" r="65%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridOWP)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowOWP)" />
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
const W         = 920
const H         = 380

const CARD_W    = 130
const CARD_H    = 120
const CARD_RX   = 7
const H_GAP     = 14    // horizontal gap between cards
const ROW_Y1    = 28    // top of row 1 cards
const ROW_Y2    = 218   // top of row 2 cards
const BADGE_R   = 11    // step-number badge radius

// 6 cards per row, evenly distributed
const STEP_COLS = 6
const TOTAL_CARD_W = STEP_COLS * CARD_W + (STEP_COLS - 1) * H_GAP  // 130*6 + 14*5 = 850
const LEFT_PAD  = (W - TOTAL_CARD_W) / 2  // 35

function cardX(col: number) {
  return LEFT_PAD + col * (CARD_W + H_GAP)
}

// ── Step icon mini-drawings (centered at 0,0, drawn in ~30×30 area) ──────────
// Each returns SVG elements; caller applies transform="translate(cx,cy)"

function IconWind() {
  return (
    <g>
      <path d="M -12,-4 C -7,-10 4,-2 12,-6" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round"/>
      <path d="M -12,1 C -6,-4 5,6 12,2"    stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round"/>
      <path d="M -9,7 C -4,3 4,12 10,8"     stroke="currentColor" fill="none" strokeWidth={1.6} strokeLinecap="round"/>
    </g>
  )
}

function IconHub() {
  // Hub = central circle with 3 short arms
  return (
    <g stroke="currentColor" fill="none">
      <circle cx={0} cy={0} r={5} fill="currentColor" fillOpacity={0.25} strokeWidth={1.8}/>
      {[0, 120, 240].map(deg => {
        const r = (deg * Math.PI) / 180
        return (
          <line key={deg}
            x1={Math.sin(r) * 5} y1={-Math.cos(r) * 5}
            x2={Math.sin(r) * 13} y2={-Math.cos(r) * 13}
            strokeWidth={2} strokeLinecap="round"/>
        )
      })}
    </g>
  )
}

function IconShaftSlow() {
  // Horizontal shaft with rotation arrows
  return (
    <g stroke="currentColor" fill="none" strokeLinecap="round">
      <line x1={-13} y1={0} x2={13} y2={0} strokeWidth={3}/>
      <path d="M 8,-8 A 9,9 0 0,1 8,8" strokeWidth={1.6} fill="none"/>
      <polygon points="8,8 4,5 11,5" fill="currentColor"/>
    </g>
  )
}

function IconGearbox() {
  // Two meshing circles (gear symbol)
  return (
    <g stroke="currentColor" fill="none" strokeWidth={1.8}>
      <circle cx={-5} cy={0} r={7} fill="currentColor" fillOpacity={0.15}/>
      <circle cx={ 6} cy={0} r={5} fill="currentColor" fillOpacity={0.15}/>
      {/* Gear teeth on left wheel */}
      {[0,60,120,180,240,300].map(deg => {
        const r = (deg * Math.PI) / 180
        const ix = -5 + Math.cos(r) * 7
        const iy = Math.sin(r) * 7
        return <line key={deg} x1={ix} y1={iy} x2={-5 + Math.cos(r)*10} y2={Math.sin(r)*10} strokeWidth={2} strokeLinecap="round"/>
      })}
      {/* ×100 label */}
      <text x={1} y={16} textAnchor="middle" fontSize={7} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill="currentColor" stroke="none">×100</text>
    </g>
  )
}

function IconShaftFast() {
  // Horizontal shaft with faster rotation (double arrow)
  return (
    <g stroke="currentColor" fill="none" strokeLinecap="round">
      <line x1={-13} y1={0} x2={13} y2={0} strokeWidth={3}/>
      <path d="M 5,-9 A 10,10 0 0,1 5,9" strokeWidth={1.6}/>
      <polygon points="5,9 1,6 8,6" fill="currentColor"/>
      <path d="M -1,-9 A 10,10 0 0,1 -1,9" strokeWidth={1.6}/>
      <polygon points="-1,9 -5,6 2,6" fill="currentColor"/>
    </g>
  )
}

function IconGenerator() {
  // Simple generator coil symbol
  return (
    <g stroke="currentColor" fill="none">
      <rect x={-11} y={-8} width={22} height={16} rx={3}
        fill="currentColor" fillOpacity={0.15} strokeWidth={1.8}/>
      <text x={0} y={4} textAnchor="middle" fontSize={8} fontWeight="800"
        fontFamily="Montserrat, sans-serif" fill="currentColor" stroke="none">G</text>
      <line x1={-11} y1={0} x2={-16} y2={0} strokeWidth={1.8} strokeLinecap="round"/>
      <line x1={ 11} y1={0} x2={ 16} y2={0} strokeWidth={1.8} strokeLinecap="round"/>
    </g>
  )
}

function IconConverter() {
  // AC/DC converter arrows
  return (
    <g stroke="currentColor" fill="none" strokeLinecap="round">
      <rect x={-11} y={-9} width={22} height={18} rx={3}
        fill="currentColor" fillOpacity={0.15} strokeWidth={1.8}/>
      {/* DC (flat line) at top */}
      <line x1={-7} y1={-3} x2={7} y2={-3} strokeWidth={1.6}/>
      {/* AC (wave) at bottom */}
      <path d="M -7,4 C -4,0 4,8 7,4" strokeWidth={1.6}/>
    </g>
  )
}

function IconTransformer() {
  // Box with up arrow (step-up transformer)
  return (
    <g stroke="currentColor" fill="none">
      <rect x={-11} y={-9} width={22} height={20} rx={3}
        fill="currentColor" fillOpacity={0.15} strokeWidth={1.8}/>
      <line x1={0} y1={6} x2={0} y2={-4} strokeWidth={2} strokeLinecap="round"/>
      <polygon points="0,-7 -4,-2 4,-2" fill="currentColor"/>
      <text x={0} y={18} textAnchor="middle" fontSize={6.5} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill="currentColor" stroke="none">20–66kV</text>
    </g>
  )
}

function IconCables() {
  // Three horizontal parallel lines (cables)
  return (
    <g stroke="currentColor" strokeLinecap="round">
      {[-6,0,6].map(dy => (
        <line key={dy} x1={-13} y1={dy} x2={13} y2={dy} strokeWidth={2}/>
      ))}
      {/* Underground hatch */}
      <line x1={-13} y1={10} x2={13} y2={10} strokeWidth={1} strokeDasharray="3 3" opacity={0.5}/>
    </g>
  )
}

function IconEvacuationLine() {
  // Transmission pylon silhouette
  return (
    <g stroke="currentColor" fill="none" strokeLinecap="round">
      <line x1={0} y1={-14} x2={0} y2={12} strokeWidth={2}/>
      <line x1={-10} y1={-8} x2={10} y2={-8} strokeWidth={1.8}/>
      <line x1={-7} y1={-2} x2={7} y2={-2} strokeWidth={1.8}/>
      {/* Diagonal braces */}
      <line x1={-5} y1={12} x2={0} y2={-2} strokeWidth={1}/>
      <line x1={ 5} y1={12} x2={0} y2={-2} strokeWidth={1}/>
      {/* Sagging wire */}
      <path d="M -10,-8 Q 0,-3 10,-8" strokeWidth={1.2} strokeDasharray="none"/>
    </g>
  )
}

function IconDistribution() {
  // House with radiating lines (distribution to homes)
  return (
    <g stroke="currentColor" fill="none">
      {/* House */}
      <rect x={-7} y={-1} width={14} height={10} rx={1}
        fill="currentColor" fillOpacity={0.15} strokeWidth={1.5}/>
      <polygon points="0,-11 -10,-1 10,-1"
        fill="currentColor" fillOpacity={0.25} strokeWidth={1.5}/>
      {/* Radiating lines */}
      {[-40,0,40].map(deg => {
        const r = (deg * Math.PI) / 180
        return (
          <line key={deg}
            x1={Math.sin(r) * 10} y1={-11 + Math.cos(r) * 0}
            x2={Math.sin(r) * 16} y2={-11 - Math.cos(r) * 6}
            strokeWidth={1.3}/>
        )
      })}
    </g>
  )
}

function IconSubstation() {
  // Grid substation box with grid symbol
  return (
    <g stroke="currentColor" fill="none">
      <rect x={-11} y={-9} width={22} height={20} rx={3}
        fill="currentColor" fillOpacity={0.15} strokeWidth={1.8}/>
      {/* Grid lines */}
      <line x1={-7} y1={-2} x2={7} y2={-2} strokeWidth={1.4}/>
      <line x1={-7} y1={ 4} x2={7} y2={ 4} strokeWidth={1.4}/>
      {[-7,-2,2,7].map(bx => (
        <line key={bx} x1={bx} y1={-5} x2={bx} y2={7} strokeWidth={1.4}/>
      ))}
      <text x={0} y={18} textAnchor="middle" fontSize={6.5} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill="currentColor" stroke="none">+32kV</text>
    </g>
  )
}

// ── Step data ─────────────────────────────────────────────────────────────────

interface Step {
  n:       number
  label:   string
  detail:  string
  row:     1 | 2
  Icon:    () => JSX.Element
}

const STEPS: Step[] = [
  // Row 1 — TURBINE OPERATION
  { n: 1,  label: 'Wind',            detail: 'Turns the blades',       row: 1, Icon: IconWind },
  { n: 2,  label: 'Hub',             detail: 'Connects blade assembly', row: 1, Icon: IconHub },
  { n: 3,  label: 'Low-speed shaft', detail: '7–12 rpm',               row: 1, Icon: IconShaftSlow },
  { n: 4,  label: 'Gearbox',         detail: '×100 speed ratio',       row: 1, Icon: IconGearbox },
  { n: 5,  label: 'High-speed shaft',detail: '+1,500 rpm',             row: 1, Icon: IconShaftFast },
  { n: 6,  label: 'Generator',       detail: 'Mechanical → Electrical',row: 1, Icon: IconGenerator },
  // Row 2 — ELECTRICAL CONVERSION & DISTRIBUTION
  { n: 7,  label: 'Converter',       detail: 'DC → AC',                row: 2, Icon: IconConverter },
  { n: 8,  label: 'Transformer',     detail: '20–66 kV step-up',       row: 2, Icon: IconTransformer },
  { n: 9,  label: 'MV Cables',       detail: 'Medium voltage cables',  row: 2, Icon: IconCables },
  { n: 10, label: 'Evacuation line', detail: 'HV transmission',        row: 2, Icon: IconEvacuationLine },
  { n: 11, label: 'Distribution',    detail: 'Network to end-users',   row: 2, Icon: IconDistribution },
  { n: 12, label: 'Substation',      detail: '+32 kV grid connection', row: 2, Icon: IconSubstation },
]

// ── Row label + bracket ───────────────────────────────────────────────────────
function RowBracket({
  y, label, color, dimColor,
}: { y: number; label: string; color: string; dimColor: string }) {
  const x0   = LEFT_PAD - 4
  const x1   = LEFT_PAD + TOTAL_CARD_W + 4
  const midX = (x0 + x1) / 2
  const LABEL_H = 22
  return (
    <g>
      <rect x={x0} y={y} width={x1 - x0} height={LABEL_H} rx={4}
        fill={dimColor}/>
      <text x={midX} y={y + 15}
        textAnchor="middle" fontSize={8} fontWeight="800" letterSpacing="1.4"
        fontFamily="Montserrat, sans-serif" fill={color}>
        {label}
      </text>
    </g>
  )
}

// ── Step card ─────────────────────────────────────────────────────────────────
function StepCard({ step, col, rowY, color, dimColor, active, setActive }: {
  step:     Step
  col:      number
  rowY:     number
  color:    string
  dimColor: string
  active:   number | null
  setActive: (n: number | null) => void
}) {
  const cx = cardX(col) + CARD_W / 2
  const cy = rowY
  const LABEL_ROW_H = 22  // row label height
  const cardTop = cy + LABEL_ROW_H + 6
  const iconCY  = cardTop + 36
  const labelY  = cardTop + CARD_H - 38
  const detailY = cardTop + CARD_H - 22
  const { Icon } = step
  const isActive = active === step.n
  const isDimmed = active !== null && !isActive

  return (
    <g
      className="rc-panel-hit"
      style={{ opacity: isDimmed ? 0.32 : 1 }}
      tabIndex={0}
      role="button"
      aria-label={`Highlight step ${step.n}: ${step.label}`}
      onMouseEnter={() => setActive(step.n)}
      onMouseLeave={() => setActive(null)}
      onFocus={() => setActive(step.n)}
      onBlur={() => setActive(null)}
      onClick={() => setActive(active === step.n ? null : step.n)}
    >
      <g className="rc-panel-enter" style={{ '--rc-delay': `${step.n * 0.05}s` } as React.CSSProperties}>
        {/* Card background */}
        <rect x={cardX(col)} y={cardTop} width={CARD_W} height={CARD_H} rx={CARD_RX}
          fill={dimColor} stroke={isActive ? color : `${color}40`} strokeWidth={isActive ? 1.6 : 1}/>

        {/* Step number badge */}
        <g className="rc-panel-chipgroup">
          <circle cx={cx} cy={cardTop - BADGE_R + 2} r={BADGE_R}
            fill={color} fillOpacity={isActive ? 1 : 0.85}/>
          <text x={cx} y={cardTop - BADGE_R + 6.5}
            textAnchor="middle" fontSize={9} fontWeight="800"
            fontFamily="Montserrat, sans-serif" fill="rgba(0,0,0,0.75)">
            {step.n}
          </text>
        </g>

        {/* Icon */}
        <g transform={`translate(${cx},${iconCY})`} color={isActive ? RC.white90 : color}>
          <Icon />
        </g>

        {/* Divider */}
        <line x1={cardX(col) + 12} y1={labelY - 8} x2={cardX(col) + CARD_W - 12} y2={labelY - 8}
          stroke={`${color}25`} strokeWidth={1}/>

        {/* Label */}
        <text className="rc-panel-label" x={cx} y={labelY}
          textAnchor="middle" fontSize={7.8} fontWeight="700"
          fontFamily="Montserrat, sans-serif" fill={isActive ? RC.white90 : 'rgba(255,255,255,0.85)'}>
          {step.label}
        </text>

        {/* Detail */}
        <text className="rc-panel-label" x={cx} y={detailY}
          textAnchor="middle" fontSize={6.8}
          fontFamily="Montserrat, sans-serif" fill="rgba(255,255,255,0.40)">
          {step.detail}
        </text>
      </g>
    </g>
  )
}

// ── Flow arrows between cards in a row ───────────────────────────────────────
function RowArrows({ rowY, color, rowStart, active }: {
  rowY: number; color: string; rowStart: number; active: number | null
}) {
  const LABEL_H  = 22
  const cardTop  = rowY + LABEL_H + 6
  const arrowY   = cardTop + CARD_H / 2
  return (
    <>
      {[0,1,2,3,4].map(col => {
        const x1 = cardX(col) + CARD_W + 2
        const x2 = cardX(col + 1) - 2
        const fromStep = rowStart + col
        const toStep   = rowStart + col + 1
        const isActive = active === fromStep || active === toStep
        return (
          <g key={col} style={{ transition: 'opacity 0.18s ease' }}>
            <line x1={x1} y1={arrowY} x2={x2 - 6} y2={arrowY}
              stroke={isActive ? RC.white90 : color} strokeWidth={isActive ? 1.8 : 1.2}
              strokeLinecap="round" opacity={isActive ? 0.9 : 0.45}/>
            <polygon
              points={`${x2},${arrowY} ${x2-6},${arrowY-3} ${x2-6},${arrowY+3}`}
              fill={isActive ? RC.white90 : color} opacity={isActive ? 0.9 : 0.45}
            />
          </g>
        )
      })}
    </>
  )
}

// ── Full diagram SVG ──────────────────────────────────────────────────────────
function PrinciplesSVG({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  const row1Steps = STEPS.filter(s => s.row === 1)
  const row2Steps = STEPS.filter(s => s.row === 2)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: W, minWidth: 360 }}
      aria-label="Onshore wind — how it works: 12-step principles diagram"
    >
      <BlueprintFrame w={W} h={H} />

      {/* Row 1 bracket label */}
      <RowBracket y={ROW_Y1} label="TURBINE OPERATION" color={RC.green} dimColor={RC.greenDim}/>

      {/* Row 1 cards */}
      {row1Steps.map((step, col) => (
        <StepCard
          key={step.n}
          step={step}
          col={col}
          rowY={ROW_Y1}
          color={RC.green}
          dimColor={RC.greenDim}
          active={active}
          setActive={setActive}
        />
      ))}

      {/* Row 1 arrows */}
      <RowArrows rowY={ROW_Y1} color={RC.green} rowStart={1} active={active}/>

      {/* Row 2 bracket label */}
      <RowBracket y={ROW_Y2} label="ELECTRICAL CONVERSION & DISTRIBUTION" color={RC.amber} dimColor={RC.amberDim}/>

      {/* Row 2 cards */}
      {row2Steps.map((step, col) => (
        <StepCard
          key={step.n}
          step={step}
          col={col}
          rowY={ROW_Y2}
          color={RC.amber}
          dimColor={RC.amberDim}
          active={active}
          setActive={setActive}
        />
      ))}

      {/* Row 2 arrows */}
      <RowArrows rowY={ROW_Y2} color={RC.amber} rowStart={7} active={active}/>

      {/* Connector arrow: Row 1 → Row 2 (step 6 → step 7) */}
      {(() => {
        const LABEL_H = 22
        const row1CardTop = ROW_Y1 + LABEL_H + 6
        const row2CardTop = ROW_Y2 + LABEL_H + 6
        const fromX = cardX(5) + CARD_W / 2
        const fromY = row1CardTop + CARD_H + 2
        const toX   = cardX(0) + CARD_W / 2
        const toY   = row2CardTop - 2
        const isActive = active === 6 || active === 7
        return (
          <g style={{ transition: 'opacity 0.18s ease' }} opacity={isActive ? 0.85 : 0.40}>
            <path
              d={`M ${fromX},${fromY} L ${fromX},${fromY + 8} L ${toX},${fromY + 8} L ${toX},${toY}`}
              stroke={isActive ? RC.white90 : RC.greenBright} fill="none" strokeWidth={1.4}
              strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round"
            />
            <polygon
              points={`${toX},${toY} ${toX-4},${toY+6} ${toX+4},${toY+6}`}
              fill={isActive ? RC.white90 : RC.greenBright}
            />
          </g>
        )
      })()}
    </svg>
  )
}

// ── Legend ─────────────────────────────────────────────────────────────────
function LegendGroup({
  heading, color, items, active, setActive,
}: {
  heading: string; color: string
  items: Step[]
  active: number | null; setActive: (n: number | null) => void
}) {
  return (
    <div className="flex-1 min-w-[260px]">
      <h4
        className="text-[10px] font-bold uppercase tracking-wider mb-2"
        style={{ color: rcRgba(color, 0.85), fontFamily: "'Montserrat', sans-serif", letterSpacing: '0.08em' }}
      >
        {heading}
      </h4>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {items.map((step) => {
          const isActive = active === step.n
          return (
            <div
              key={step.n}
              className="rc-legend-item flex items-start gap-2 min-w-[130px] rounded-md px-1.5 py-1 -mx-1.5"
              style={{
                background: isActive ? rcRgba(color, 0.10) : 'transparent',
                border: `1px solid ${isActive ? rcRgba(color, 0.35) : 'transparent'}`,
              }}
              tabIndex={0}
              role="button"
              aria-label={`Highlight step ${step.n}: ${step.label}`}
              onMouseEnter={() => setActive(step.n)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(step.n)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active === step.n ? null : step.n)}
            >
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
                style={{ background: rcRgba(color, isActive ? 0.28 : 0.16), border: `1px solid ${color}`, color, fontFamily: "'Montserrat', sans-serif" }}
              >
                {step.n}
              </span>
              <span>
                <span className="block text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white65, fontFamily: "'Montserrat', sans-serif" }}>
                  {step.label}
                </span>
                <span className="block text-[10px]" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
                  {step.detail}
                </span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Legend({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  const row1Steps = STEPS.filter(s => s.row === 1)
  const row2Steps = STEPS.filter(s => s.row === 2)
  return (
    <div
      className="px-6 py-4 flex flex-wrap gap-x-8 gap-y-5"
      style={{ borderTop: `1px solid ${RC.cardBorder}` }}
    >
      <LegendGroup
        heading="Turbine Operation"
        color={RC.green}
        items={row1Steps}
        active={active} setActive={setActive}
      />
      <LegendGroup
        heading="Electrical Conversion & Distribution"
        color={RC.amber}
        items={row2Steps}
        active={active} setActive={setActive}
      />
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export interface OnshoreWindPrinciplesDiagramProps {
  title:    string
  caption?: string
}

export function OnshoreWindPrinciplesDiagram({ title, caption }: OnshoreWindPrinciplesDiagramProps) {
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
          RC Diagram · 01–12
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <PrinciplesSVG active={active} setActive={setActive} />
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
