// ─────────────────────────────────────────────────────────────────────────────
// SolarPVCellDiagram — RC Diagram Design Language v1.2 (process-flow variant,
// card-grid adaptation)
//
// 12-step "How does a solar PV system work?" card grid, in two rows:
//   Row 1 — PHOTOVOLTAIC PHYSICS (green, steps 1–6)
//     1. Solar irradiance  2. Anti-reflection coat  3. Electron excitation
//     4. P-N junction      5. Electron collection   6. DC output
//   Row 2 — SYSTEM TO GRID (amber, steps 7–12)
//     7. PV module  8. String  9. Combiner box
//    10. Inverter  11. Transformer  12. Grid connection
//
// Ported from an earlier "Mauna Loa Design Language" pass (card shell + RC
// tokens only, no BlueprintFrame/interactivity/mobile fix) to v1.2 — same
// tokens, BlueprintFrame, staggered entrance, hover/tap dimming and
// mobile-legibility fix as OnshoreWindPrinciplesDiagram/GridIntegrationDiagram
// (the process-flow reference builds). All original card/icon geometry is
// unchanged; only the interactive/styling layer around it is new. The
// interactive unit is a whole step card (icon + label + detail + number
// badge). Because the 12 steps overflow a single row on phones, the inline
// SVG label/detail text is exactly the text this port hides below ~768px —
// the two-group HTML legend underneath (grouped by row) is what carries the
// reading on mobile.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'

// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:       brand.green,
  greenDim:    rcRgba(brand.green, 0.12),
  greenMid:    rcRgba(brand.green, 0.40),
  greenBright: rcRgba(brand.green, 0.70),
  amber:       brand.amber,
  amberDim:    rcRgba(brand.amber, 0.12),
  amberMid:    rcRgba(brand.amber, 0.40),
  amberBright: rcRgba(brand.amber, 0.70),
  white90:     'rgba(255,255,255,0.90)',
  white65:     'rgba(255,255,255,0.65)',
  white45:     'rgba(255,255,255,0.45)',
  white20:     'rgba(255,255,255,0.20)',
  white18:     'rgba(255,255,255,0.18)',
  white10:     'rgba(255,255,255,0.10)',
  white08:     'rgba(255,255,255,0.08)',
  cardBg:      'rgba(10,15,20,0.80)',
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
        <pattern id="rcGridSV" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowSV" cx="50%" cy="30%" r="65%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridSV)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowSV)" />
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
const H_GAP     = 14
const ROW_Y1    = 28
const ROW_Y2    = 218
const BADGE_R   = 11

const STEP_COLS = 6
const TOTAL_CARD_W = STEP_COLS * CARD_W + (STEP_COLS - 1) * H_GAP // 850
const LEFT_PAD  = (W - TOTAL_CARD_W) / 2 // 35

function cardX(col: number) {
  return LEFT_PAD + col * (CARD_W + H_GAP)
}

// ── Step Icons ────────────────────────────────────────────────────────────────

function IconSun() {
  return (
    <g stroke="currentColor" fill="none">
      <circle cx={0} cy={0} r={7} fill="currentColor" fillOpacity={0.25} strokeWidth={1.8}/>
      {[0,45,90,135,180,225,270,315].map(deg => {
        const r = (deg * Math.PI) / 180
        return (
          <line key={deg}
            x1={Math.cos(r)*9} y1={Math.sin(r)*9}
            x2={Math.cos(r)*13} y2={Math.sin(r)*13}
            strokeWidth={1.5} strokeLinecap="round"/>
        )
      })}
    </g>
  )
}

function IconCoating() {
  // Layered rectangle with angled reflection line
  return (
    <g stroke="currentColor" fill="none">
      <rect x={-12} y={-4} width={24} height={8} rx={2}
        fill="currentColor" fillOpacity={0.20} strokeWidth={1.8}/>
      {/* Reflection arrows */}
      <line x1={-6} y1={-10} x2={-6} y2={-5} strokeWidth={1.5} strokeLinecap="round"/>
      <polygon points="-6,-5 -9,-9 -3,-9" fill="currentColor"/>
      <line x1={4} y1={-10} x2={4} y2={-5} strokeWidth={1.5} strokeLinecap="round"/>
      <polygon points="4,-5 1,-9 7,-9" fill="currentColor"/>
    </g>
  )
}

function IconElectron() {
  // Atom with orbiting electron
  return (
    <g stroke="currentColor" fill="none">
      <circle cx={0} cy={0} r={4} fill="currentColor" fillOpacity={0.20} strokeWidth={1.8}/>
      {/* Orbit ellipse */}
      <ellipse cx={0} cy={0} rx={12} ry={5} strokeWidth={1.4} transform="rotate(-30)"/>
      {/* Electron dot */}
      <circle cx={10} cy={-3} r={2.5} fill="currentColor" strokeWidth={0}/>
      {/* Flash / dislodge arrows */}
      <line x1={6} y1={-9} x2={9} y2={-4} strokeWidth={1.5} strokeLinecap="round"/>
      <polygon points="9,-4 5,-5 7,-1" fill="currentColor"/>
    </g>
  )
}

function IconPNJunction() {
  // Two stacked layers with an arrow crossing the boundary
  return (
    <g stroke="currentColor" fill="none">
      {/* N-type layer */}
      <rect x={-12} y={-10} width={24} height={9} rx={2}
        fill="currentColor" fillOpacity={0.25} strokeWidth={1.6}/>
      <text x={0} y={-4} textAnchor="middle" fontSize={6.5} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill="currentColor" stroke="none">N-type</text>
      {/* P-type layer */}
      <rect x={-12} y={1} width={24} height={9} rx={2}
        fill="currentColor" fillOpacity={0.12} strokeWidth={1.6}/>
      <text x={0} y={7} textAnchor="middle" fontSize={6.5} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill="currentColor" stroke="none">P-type</text>
      {/* Electric field arrow */}
      <line x1={14} y1={-8} x2={14} y2={8} strokeWidth={1.6} strokeLinecap="round"/>
      <polygon points="14,8 11,3 17,3" fill="currentColor"/>
    </g>
  )
}

function IconContacts() {
  // Two horizontal bars (top and bottom contacts)
  return (
    <g stroke="currentColor" fill="none">
      {/* Top contact fingers */}
      {[-6, 0, 6].map(x => (
        <line key={x} x1={x} y1={-10} x2={x} y2={-5}
          strokeWidth={2} strokeLinecap="round"/>
      ))}
      <line x1={-12} y1={-10} x2={12} y2={-10} strokeWidth={2} strokeLinecap="round"/>
      {/* Bottom contact plate */}
      <rect x={-12} y={4} width={24} height={5} rx={1}
        fill="currentColor" fillOpacity={0.30} strokeWidth={1.8}/>
      {/* Current flow arrow */}
      <line x1={0} y1={-4} x2={0} y2={3} strokeWidth={1.5} strokeDasharray="2 2" strokeLinecap="round"/>
    </g>
  )
}

function IconDCOutput() {
  // DC symbol: straight line + arrow
  return (
    <g stroke="currentColor" fill="none">
      <rect x={-11} y={-8} width={22} height={16} rx={3}
        fill="currentColor" fillOpacity={0.15} strokeWidth={1.8}/>
      {/* DC flat line */}
      <line x1={-7} y1={-2} x2={7} y2={-2} strokeWidth={1.8} strokeLinecap="round"/>
      {/* dots for DC */}
      {[-5, 0, 5].map(x => (
        <circle key={x} cx={x} cy={3} r={1.2} fill="currentColor"/>
      ))}
      <text x={0} y={14} textAnchor="middle" fontSize={7} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill="currentColor" stroke="none">DC</text>
    </g>
  )
}

function IconModule() {
  // Small grid of solar cells
  return (
    <g stroke="currentColor" fill="none" strokeWidth={1.4}>
      {[[-11,-10],[-4,-10],[3,-10],
        [-11,-3], [-4,-3], [3,-3],
        [-11, 4], [-4, 4], [3, 4]].map(([x,y],i) => (
        <rect key={i} x={x} y={y} width={6} height={6} rx={0.5}
          fill="currentColor" fillOpacity={0.18}/>
      ))}
    </g>
  )
}

function IconString() {
  // Chain of rectangles connected by lines
  return (
    <g stroke="currentColor" fill="none">
      {[[-13,-2],[-4,-2],[5,-2]].map(([x,y],i) => (
        <g key={i}>
          <rect x={x} y={y} width={7} height={4} rx={1}
            fill="currentColor" fillOpacity={0.20} strokeWidth={1.4}/>
          {i < 2 && (
            <line x1={x+7} y1={y+2} x2={x+9} y2={y+2}
              strokeWidth={1.4} strokeLinecap="round"/>
          )}
        </g>
      ))}
      <text x={0} y={12} textAnchor="middle" fontSize={6.5} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill="currentColor" stroke="none">Series</text>
    </g>
  )
}

function IconCombinerBox() {
  // Multiple lines converging into a box
  return (
    <g stroke="currentColor" fill="none">
      {[-6,0,6].map(y => (
        <line key={y} x1={-13} y1={y} x2={-5} y2={0}
          strokeWidth={1.3} strokeLinecap="round"/>
      ))}
      <rect x={-5} y={-7} width={14} height={14} rx={2}
        fill="currentColor" fillOpacity={0.20} strokeWidth={1.8}/>
      <line x1={9} y1={0} x2={14} y2={0} strokeWidth={1.8} strokeLinecap="round"/>
    </g>
  )
}

function IconInverter() {
  // Box with AC wave
  return (
    <g stroke="currentColor" fill="none">
      <rect x={-11} y={-9} width={22} height={18} rx={3}
        fill="currentColor" fillOpacity={0.15} strokeWidth={1.8}/>
      {/* DC line */}
      <line x1={-7} y1={-3} x2={7} y2={-3} strokeWidth={1.6}/>
      {/* AC wave */}
      <path d="M -7,4 C -4,0 4,8 7,4" strokeWidth={1.6}/>
    </g>
  )
}

function IconTransformer() {
  return (
    <g stroke="currentColor" fill="none">
      <rect x={-11} y={-9} width={22} height={20} rx={3}
        fill="currentColor" fillOpacity={0.15} strokeWidth={1.8}/>
      <line x1={0} y1={6} x2={0} y2={-4} strokeWidth={2} strokeLinecap="round"/>
      <polygon points="0,-7 -4,-2 4,-2" fill="currentColor"/>
      <text x={0} y={18} textAnchor="middle" fontSize={6.5} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill="currentColor" stroke="none">Step-up</text>
    </g>
  )
}

function IconGrid() {
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
        fontFamily="Montserrat, sans-serif" fill="currentColor" stroke="none">230V AC</text>
    </g>
  )
}

// ── Step data ─────────────────────────────────────────────────────────────────

interface Step {
  n:      number
  label:  string
  detail: string
  row:    1 | 2
  Icon:   () => JSX.Element
}

const STEPS: Step[] = [
  // Row 1 — PHOTOVOLTAIC PHYSICS
  { n: 1, label: 'Solar irradiance',   detail: '~1,000 W/m² peak',         row: 1, Icon: IconSun },
  { n: 2, label: 'Anti-reflection',    detail: 'Maximises absorption',     row: 1, Icon: IconCoating },
  { n: 3, label: 'Electron excitation',detail: 'Photons knock e⁻ loose',   row: 1, Icon: IconElectron },
  { n: 4, label: 'P-N junction',       detail: 'Built-in electric field',  row: 1, Icon: IconPNJunction },
  { n: 5, label: 'Metal contacts',     detail: 'Collect DC current',       row: 1, Icon: IconContacts },
  { n: 6, label: 'DC output',          detail: '~0.5 V per cell',          row: 1, Icon: IconDCOutput },
  // Row 2 — SYSTEM TO GRID
  { n: 7,  label: 'PV module',         detail: '60–96 cells, 300–600 W',   row: 2, Icon: IconModule },
  { n: 8,  label: 'String',            detail: '10–20 modules in series',  row: 2, Icon: IconString },
  { n: 9,  label: 'Combiner box',      detail: 'Strings in parallel',      row: 2, Icon: IconCombinerBox },
  { n: 10, label: 'Inverter',          detail: 'DC → AC, MPPT',            row: 2, Icon: IconInverter },
  { n: 11, label: 'Transformer',       detail: 'Steps up for export',      row: 2, Icon: IconTransformer },
  { n: 12, label: 'Grid connection',   detail: '230 V / 50 Hz AC',         row: 2, Icon: IconGrid },
]

// ── Row label bracket ─────────────────────────────────────────────────────────
function RowBracket({ y, label, color, dimColor }: {
  y: number; label: string; color: string; dimColor: string
}) {
  const x0   = LEFT_PAD - 4
  const x1   = LEFT_PAD + TOTAL_CARD_W + 4
  const midX = (x0 + x1) / 2
  return (
    <g>
      <rect x={x0} y={y} width={x1 - x0} height={22} rx={4} fill={dimColor}/>
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
  step:      Step
  col:       number
  rowY:      number
  color:     string
  dimColor:  string
  active:    number | null
  setActive: (n: number | null) => void
}) {
  const cx      = cardX(col) + CARD_W / 2
  const LABEL_H = 22
  const cardTop = rowY + LABEL_H + 6
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
        <rect x={cardX(col)} y={cardTop} width={CARD_W} height={CARD_H} rx={CARD_RX}
          fill={dimColor} stroke={isActive ? color : `${color}40`} strokeWidth={isActive ? 1.6 : 1}/>

        <g className="rc-panel-chipgroup">
          <circle cx={cx} cy={cardTop - BADGE_R + 2} r={BADGE_R}
            fill={color} fillOpacity={isActive ? 1 : 0.85}/>
          <text x={cx} y={cardTop - BADGE_R + 6.5}
            textAnchor="middle" fontSize={9} fontWeight="800"
            fontFamily="Montserrat, sans-serif" fill="rgba(0,0,0,0.75)">
            {step.n}
          </text>
        </g>

        <g transform={`translate(${cx},${iconCY})`} color={isActive ? RC.white90 : color}>
          <Icon />
        </g>

        <line x1={cardX(col) + 12} y1={labelY - 8}
              x2={cardX(col) + CARD_W - 12} y2={labelY - 8}
          stroke={`${color}25`} strokeWidth={1}/>

        <text className="rc-panel-label" x={cx} y={labelY}
          textAnchor="middle" fontSize={7.8} fontWeight="700"
          fontFamily="Montserrat, sans-serif" fill={isActive ? RC.white90 : 'rgba(255,255,255,0.85)'}>
          {step.label}
        </text>
        <text className="rc-panel-label" x={cx} y={detailY}
          textAnchor="middle" fontSize={6.8}
          fontFamily="Montserrat, sans-serif" fill="rgba(255,255,255,0.40)">
          {step.detail}
        </text>
      </g>
    </g>
  )
}

// ── Flow arrows ───────────────────────────────────────────────────────────────
function RowArrows({ rowY, color, rowStart, active }: {
  rowY: number; color: string; rowStart: number; active: number | null
}) {
  const cardTop = rowY + 22 + 6
  const arrowY  = cardTop + CARD_H / 2
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
              fill={isActive ? RC.white90 : color} opacity={isActive ? 0.9 : 0.45}/>
          </g>
        )
      })}
    </>
  )
}

// ── Full diagram SVG ──────────────────────────────────────────────────────────
function PVCellSVG({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  const row1Steps = STEPS.filter(s => s.row === 1)
  const row2Steps = STEPS.filter(s => s.row === 2)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: W, minWidth: 360 }}
      aria-label="How solar PV works: photovoltaic physics and system to grid"
    >
      <BlueprintFrame w={W} h={H} />

      <RowBracket y={ROW_Y1} label="PHOTOVOLTAIC PHYSICS" color={RC.green} dimColor={RC.greenDim}/>
      {row1Steps.map((step, col) => (
        <StepCard key={step.n} step={step} col={col} rowY={ROW_Y1}
          color={RC.green} dimColor={RC.greenDim} active={active} setActive={setActive}/>
      ))}
      <RowArrows rowY={ROW_Y1} color={RC.green} rowStart={1} active={active}/>

      <RowBracket y={ROW_Y2} label="SYSTEM TO GRID" color={RC.amber} dimColor={RC.amberDim}/>
      {row2Steps.map((step, col) => (
        <StepCard key={step.n} step={step} col={col} rowY={ROW_Y2}
          color={RC.amber} dimColor={RC.amberDim} active={active} setActive={setActive}/>
      ))}
      <RowArrows rowY={ROW_Y2} color={RC.amber} rowStart={7} active={active}/>

      {/* Connector arrow: Row 1 step 6 → Row 2 step 7 */}
      {(() => {
        const LABEL_H   = 22
        const row1Top   = ROW_Y1 + LABEL_H + 6
        const row2Top   = ROW_Y2 + LABEL_H + 6
        const fromX     = cardX(5) + CARD_W / 2
        const fromY     = row1Top + CARD_H + 2
        const toX       = cardX(0) + CARD_W / 2
        const toY       = row2Top - 2
        const isActive  = active === 6 || active === 7
        return (
          <g style={{ transition: 'opacity 0.18s ease' }} opacity={isActive ? 0.85 : 0.40}>
            <path
              d={`M ${fromX},${fromY} L ${fromX},${fromY+8} L ${toX},${fromY+8} L ${toX},${toY}`}
              stroke={isActive ? RC.white90 : RC.greenBright} fill="none" strokeWidth={1.4}
              strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round"/>
            <polygon
              points={`${toX},${toY} ${toX-4},${toY+6} ${toX+4},${toY+6}`}
              fill={isActive ? RC.white90 : RC.greenBright}/>
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
        heading="Photovoltaic Physics"
        color={RC.green}
        items={row1Steps}
        active={active} setActive={setActive}
      />
      <LegendGroup
        heading="System to Grid"
        color={RC.amber}
        items={row2Steps}
        active={active} setActive={setActive}
      />
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export interface SolarPVCellDiagramProps {
  title:    string
  caption?: string
}

export function SolarPVCellDiagram({ title, caption }: SolarPVCellDiagramProps) {
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
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <PVCellSVG active={active} setActive={setActive} />
      </div>

      <Legend active={active} setActive={setActive} />

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
