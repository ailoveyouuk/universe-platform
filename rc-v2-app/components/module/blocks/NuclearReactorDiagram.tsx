// ─────────────────────────────────────────────────────────────────────────────
// NuclearReactorDiagram — RC Diagram Design Language v1.2 (process-flow variant)
//
// Five-stage flow schematic: how a Pressurised Water Reactor (PWR) generates
// electricity.
//
//  [Reactor Core] → [Steam Generator] → [Steam Turbine] → [Generator] → [Grid]
//
// Annotated loops below the flow:
//   ← PRIMARY COOLANT LOOP → (stages 1–2)
//   ← SECONDARY STEAM LOOP → (stages 2–3)
//   ELECTRICAL OUTPUT        (stages 4–5)
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
  white30:    'rgba(255,255,255,0.30)',
  white15:    'rgba(255,255,255,0.15)',
  white08:    'rgba(255,255,255,0.08)',
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
        <pattern id="rcGridNR" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white08} />
        </pattern>
        <radialGradient id="rcGlowNR" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridNR)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowNR)" />
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
const H        = 310
const ICON_Y   = 88     // vertical centre of all icons
const BASE_Y   = 128    // ground line
const LABEL_Y  = 168    // main stage label y
const DETAIL_Y = 184    // detail line y
const LOOP_Y   = 234    // loop bracket label y

// Five stage x-centres
const STAGES = [82, 255, 460, 665, 838]

// ── Stage icons ───────────────────────────────────────────────────────────────

// Stage 1: Reactor Core (PWR pressure vessel + fuel rods + control rods)
function ReactorCoreIcon({ cx, cy }: { cx: number; cy: number }) {
  const top   = cy - 34
  const vTop  = top + 20   // vessel top (below dome)
  const bot   = BASE_Y
  const vW    = 54
  return (
    <g>
      {/* Containment dome arc */}
      <path
        d={`M ${cx - vW / 2},${vTop} A ${vW / 2},${vW / 2 - 2} 0 0,1 ${cx + vW / 2},${vTop}`}
        fill={RC.greenDim} stroke={RC.green} strokeWidth={1.4} opacity={0.6}
      />
      {/* Reactor pressure vessel body */}
      <rect x={cx - vW / 2} y={vTop} width={vW} height={bot - vTop} rx={3}
        fill={RC.greenDim} stroke={RC.green} strokeWidth={1.6}/>
      {/* Fuel rod assemblies */}
      {[-15, 0, 15].map((dx, i) => (
        <g key={i}>
          <rect x={cx + dx - 3} y={vTop + 12} width={6} height={bot - vTop - 22} rx={2}
            fill={RC.greenMid} opacity={0.75}/>
        </g>
      ))}
      {/* Control rods descending from top */}
      {[-15, 0, 15].map((dx, i) => (
        <line key={i}
          x1={cx + dx} y1={vTop - 2} x2={cx + dx} y2={vTop + 14}
          stroke={RC.white45} strokeWidth={2} strokeLinecap="round"/>
      ))}
      {/* Fission label */}
      <text x={cx} y={bot - 4} textAnchor="middle" fontSize={6.5} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill={RC.green} opacity={0.7}>
        U-235 Fission
      </text>
      <line x1={cx - 42} y1={BASE_Y} x2={cx + 42} y2={BASE_Y}
        stroke={RC.white15} strokeWidth={1}/>
    </g>
  )
}

// Stage 2: Steam Generator (shell-and-tube heat exchanger)
function SteamGeneratorIcon({ cx, cy }: { cx: number; cy: number }) {
  const top = cy - 30
  const bot = BASE_Y
  const vW  = 52
  return (
    <g>
      {/* Outer shell */}
      <rect x={cx - vW / 2} y={top} width={vW} height={bot - top} rx={4}
        fill={RC.greenDim} stroke={RC.green} strokeWidth={1.6}/>
      {/* Tube sheet divider */}
      <line x1={cx - vW / 2 + 4} y1={top + 32} x2={cx + vW / 2 - 4} y2={top + 32}
        stroke={RC.green} strokeWidth={1} opacity={0.35}/>
      {/* U-tubes (primary coolant) */}
      {[-12, 0, 12].map((dx, i) => (
        <path key={i}
          d={`M ${cx + dx},${top + 8} L ${cx + dx},${top + 28} A 6,5 0 0,0 ${cx + dx + (i === 0 ? 12 : -12)},${top + 28}`}
          fill="none" stroke={RC.greenBright} strokeWidth={1.4}
          strokeLinecap="round" opacity={0.55}/>
      ))}
      {/* Secondary water rising (steam) */}
      {[-10, 0, 10].map((dx, i) => (
        <line key={i}
          x1={cx + dx} y1={top + 38} x2={cx + dx} y2={top + 50}
          stroke={RC.amber} strokeWidth={1.2} strokeLinecap="round"
          strokeDasharray="2 2" opacity={0.45}/>
      ))}
      <text x={cx} y={bot - 4} textAnchor="middle" fontSize={6.5} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill={RC.green} opacity={0.7}>
        Heat Exchange
      </text>
      <line x1={cx - 40} y1={BASE_Y} x2={cx + 40} y2={BASE_Y}
        stroke={RC.white15} strokeWidth={1}/>
    </g>
  )
}

// Stage 3: Steam Turbine
function TurbineIcon({ cx, cy }: { cx: number; cy: number }) {
  const icY = cy - 8
  return (
    <g>
      {/* Turbine casing */}
      <ellipse cx={cx} cy={icY} rx={28} ry={22}
        fill={RC.amberDim} stroke={RC.amber} strokeWidth={1.6}/>
      {/* 8 turbine blades */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180
        return (
          <line key={deg}
            x1={cx + Math.cos(rad) * 6}  y1={icY + Math.sin(rad) * 6}
            x2={cx + Math.cos(rad) * 20} y2={icY + Math.sin(rad) * 20}
            stroke={RC.amber} strokeWidth={2} strokeLinecap="round" opacity={0.75}/>
        )
      })}
      {/* Hub */}
      <circle cx={cx} cy={icY} r={5.5} fill={RC.amberMid} stroke={RC.amber} strokeWidth={1.4}/>
      {/* Steam inlet arrow (left) */}
      <line x1={cx - 36} y1={icY} x2={cx - 28} y2={icY}
        stroke={RC.amber} strokeWidth={1.8} strokeLinecap="round" opacity={0.5}/>
      <polygon
        points={`${cx - 28},${icY} ${cx - 35},${icY - 3.5} ${cx - 35},${icY + 3.5}`}
        fill={RC.amber} opacity={0.5}/>
      {/* Drive shaft (right) */}
      <line x1={cx + 28} y1={icY} x2={cx + 38} y2={icY}
        stroke={RC.amber} strokeWidth={3} strokeLinecap="round" opacity={0.6}/>
      <line x1={cx - 42} y1={BASE_Y} x2={cx + 42} y2={BASE_Y}
        stroke={RC.white15} strokeWidth={1}/>
    </g>
  )
}

// Stage 4: Generator
function GeneratorIcon({ cx, cy }: { cx: number; cy: number }) {
  const top = cy - 26
  const bot = BASE_Y
  const vW  = 52
  const mid = top + (bot - top) / 2
  return (
    <g>
      <rect x={cx - vW / 2} y={top} width={vW} height={bot - top} rx={4}
        fill={RC.amberDim} stroke={RC.amber} strokeWidth={1.8}/>
      {/* G symbol */}
      <text x={cx} y={mid - 2} textAnchor="middle" fontSize={20} fontWeight="900"
        fontFamily="Montserrat, sans-serif" fill={RC.amber} opacity={0.85}>
        G
      </text>
      {/* AC wave */}
      <path
        d={`M ${cx - 14},${mid + 13} C ${cx - 10},${mid + 7} ${cx - 4},${mid + 19} ${cx},${mid + 13} C ${cx + 4},${mid + 7} ${cx + 10},${mid + 19} ${cx + 14},${mid + 13}`}
        fill="none" stroke={RC.amber} strokeWidth={1.4} opacity={0.55}/>
      {/* Drive shaft (left) */}
      <line x1={cx - vW / 2 - 10} y1={mid - 8} x2={cx - vW / 2} y2={mid - 8}
        stroke={RC.amber} strokeWidth={3} strokeLinecap="round" opacity={0.5}/>
      <line x1={cx - 42} y1={BASE_Y} x2={cx + 42} y2={BASE_Y}
        stroke={RC.white15} strokeWidth={1}/>
    </g>
  )
}

// Stage 5: National Grid (twin pylons with power lines)
function GridOutputIcon({ cx, cy }: { cx: number; cy: number }) {
  const p1      = cx - 24
  const p2      = cx + 24
  const pylonTop = cy - 32
  return (
    <g>
      {[p1, p2].map((px, i) => (
        <g key={i}>
          <line x1={px} y1={pylonTop} x2={px} y2={BASE_Y}
            stroke={RC.white45} strokeWidth={1.5}/>
          <line x1={px - 10} y1={pylonTop + 6}  x2={px + 10} y2={pylonTop + 6}
            stroke={RC.white45} strokeWidth={1.5}/>
          <line x1={px - 7}  y1={pylonTop + 15} x2={px + 7}  y2={pylonTop + 15}
            stroke={RC.white45} strokeWidth={1.5}/>
          <line x1={px - 5} y1={BASE_Y - 10} x2={px} y2={pylonTop + 20}
            stroke={RC.white30} strokeWidth={1}/>
          <line x1={px + 5} y1={BASE_Y - 10} x2={px} y2={pylonTop + 20}
            stroke={RC.white30} strokeWidth={1}/>
        </g>
      ))}
      {/* Three sagging power lines */}
      {[-4, 0, 4].map((dy, i) => (
        <path key={i}
          d={`M ${p1 - 10},${pylonTop + 6 + dy} Q ${cx},${pylonTop + 22 + Math.abs(dy)} ${p2 + 10},${pylonTop + 6 + dy}`}
          stroke="rgba(255,210,60,0.55)" fill="none" strokeWidth={0.9}/>
      ))}
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
  { index: 1, label: 'Reactor Core',    detail1: 'Nuclear fission heats',      detail2: 'primary coolant to ~315°C',   color: RC.green,   Icon: ReactorCoreIcon },
  { index: 2, label: 'Steam Generator', detail1: 'Primary loop transfers heat', detail2: 'to secondary water',          color: RC.green,   Icon: SteamGeneratorIcon },
  { index: 3, label: 'Steam Turbine',   detail1: 'High-pressure steam',        detail2: 'spins turbine at high speed', color: RC.amber,   Icon: TurbineIcon },
  { index: 4, label: 'Generator',       detail1: 'Rotating shaft drives',      detail2: 'electromagnetic generator',   color: RC.amber,   Icon: GeneratorIcon },
  { index: 5, label: 'National Grid',   detail1: 'Step-up transformer',        detail2: 'and HV transmission',         color: RC.white45, Icon: GridOutputIcon },
]

// ── Flow arrow between two stage x-centres ────────────────────────────────────
function FlowArrow({ x1, x2, y, active }: { x1: number; x2: number; y: number; active: boolean }) {
  const tip = x2 - 6
  const color = active ? RC.white90 : RC.green
  const opacity = active ? 0.9 : 0.55
  return (
    <g style={{ transition: 'opacity 0.18s ease' }}>
      <line x1={x1 + 6} y1={y} x2={tip - 8} y2={y}
        stroke={color} strokeWidth={active ? 2 : 1.4} strokeLinecap="round" opacity={opacity}/>
      <polygon
        points={`${tip},${y} ${tip - 8},${y - 4} ${tip - 8},${y + 4}`}
        fill={color} opacity={opacity}/>
    </g>
  )
}

// ── Loop annotation bracket ────────────────────────────────────────────────────
function LoopBracket({
  x1, x2, y, label, color, dimColor,
}: {
  x1: number; x2: number; y: number
  label: string; color: string; dimColor: string
}) {
  const midX = (x1 + x2) / 2
  const H2 = 20
  return (
    <g>
      <rect x={x1} y={y} width={x2 - x1} height={H2} rx={4} fill={dimColor}/>
      {/* Bracket ticks */}
      <line x1={x1 + 2} y1={y} x2={x1 + 2} y2={y + H2} stroke={color} strokeWidth={1} opacity={0.4}/>
      <line x1={x2 - 2} y1={y} x2={x2 - 2} y2={y + H2} stroke={color} strokeWidth={1} opacity={0.4}/>
      <text x={midX} y={y + 13}
        textAnchor="middle" fontSize={7} fontWeight="800" letterSpacing="1.2"
        fontFamily="Montserrat, sans-serif" fill={color}>
        {label}
      </text>
    </g>
  )
}

// ── Full diagram SVG ──────────────────────────────────────────────────────────
function ReactorFlowSVG({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  const arrowY = ICON_Y + 4

  // Icon gap offsets (approximate half-widths for arrow endpoints)
  const offsets = [42, 28, 38, 28, 44]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: W, minWidth: 360 }}
      aria-label="PWR nuclear reactor operation — five-stage flow diagram"
    >
      <BlueprintFrame w={W} h={H} />

      {/* Flow arrows — brighten when either connected stage is active */}
      <FlowArrow x1={STAGES[0] + offsets[0]} x2={STAGES[1] - offsets[1]} y={arrowY} active={active === 1 || active === 2}/>
      <FlowArrow x1={STAGES[1] + offsets[1]} x2={STAGES[2] - offsets[2]} y={arrowY} active={active === 2 || active === 3}/>
      <FlowArrow x1={STAGES[2] + offsets[2]} x2={STAGES[3] - offsets[3]} y={arrowY} active={active === 3 || active === 4}/>
      <FlowArrow x1={STAGES[3] + offsets[3]} x2={STAGES[4] - offsets[4]} y={arrowY} active={active === 4 || active === 5}/>

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

      {/* Loop annotation brackets — sit on top of the blueprint frame, unchanged */}
      <LoopBracket
        x1={STAGES[0] - 40} x2={STAGES[1] + 40}
        y={LOOP_Y} label="PRIMARY COOLANT LOOP"
        color={RC.green} dimColor={RC.greenDim}
      />
      <LoopBracket
        x1={STAGES[1] + 44} x2={STAGES[2] + 40}
        y={LOOP_Y} label="SECONDARY STEAM LOOP"
        color={RC.amber} dimColor={RC.amberDim}
      />
      <LoopBracket
        x1={STAGES[2] + 44} x2={STAGES[4] + 44}
        y={LOOP_Y} label="ELECTRICAL OUTPUT"
        color={RC.white65} dimColor={RC.white08}
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

export interface NuclearReactorDiagramProps {
  title:    string
  caption?: string
}

export function NuclearReactorDiagram({ title, caption }: NuclearReactorDiagramProps) {
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
        <ReactorFlowSVG active={active} setActive={setActive} />
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
