// ─────────────────────────────────────────────────────────────────────────────
// EnergySystemDiagram — RC Diagram Design Language v1.2 (process-flow variant)
//
// Three selectable single-flow schematics for the "From This → To This"
// SM3 infographics — a top row of source stages, an optional pass/fail
// indicator, a single connecting arrow, and a bottom row of destination
// stages:
//
//  problem:      [Fossil Fuels · Solar · Wind] → (intermittent, no storage) → [Grid]
//  solution:     [Solar · Wind · Storage · Baseload] → (reliable 24/7) → [Grid]
//  distribution: [Grid] → [Homes · Schools · Businesses · Industry]
//
// Ported from an earlier "Mauna Loa Design Language" pass (card shell + RC
// tokens only) to v1.2 — same tokens, BlueprintFrame, staggered entrance,
// hover/tap/focus dimming and mobile-legibility fix as GridIntegrationDiagram
// (the process-flow reference build). The interactive unit is a whole stage
// (icon + label + numbered badge), matching the reference; the single arrow
// connecting the two rows brightens whenever any stage is active, since it
// represents the flow as a whole rather than one stage-to-stage hop.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'
// ── RC Design Tokens ─────────────────────────────────────────────────────────
const RC = {
  green:      brand.green,
  greenDim:   rcRgba(brand.green, 0.15),
  amber:      brand.amber,
  amberDim:   rcRgba(brand.amber, 0.15),
  warning:    '#E8823A',
  warningDim: 'rgba(232,130,58,0.15)',
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
      /* Same mobile fix as the other RC Diagram variants: below ~768px the
         diagram has shrunk enough that inline SVG label/indicator text is
         no longer legible. Hide it and let the legend row (plain HTML,
         always full size) carry the reading; the step badge gets a size
         bump so each stage still reads as "a numbered thing". */
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
        <pattern id="rcGridES" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowES" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridES)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowES)" />
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

// ── Icon primitives — each draws itself centred on (cx, cy) at a fixed scale ──

function IconWrap({
  cx, cy, scale, children,
}: { cx: number; cy: number; scale: number; children: React.ReactNode }) {
  return (
    <g transform={`translate(${cx}, ${cy}) scale(${scale}) translate(-24, -24)`}>
      {children}
    </g>
  )
}

function IconFactory({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <IconWrap cx={cx} cy={cy} scale={0.75}>
      <rect x="6" y="22" width="36" height="22" rx="1" fill={color} opacity="0.9"/>
      <rect x="10" y="12" width="6" height="12" rx="1" fill={color} opacity="0.9"/>
      <rect x="20" y="8"  width="6" height="16" rx="1" fill={color} opacity="0.9"/>
      <rect x="32" y="14" width="6" height="10" rx="1" fill={color} opacity="0.9"/>
      <path d="M13 10 Q15 6 13 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <path d="M23 6  Q25 2 23 -1" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <rect x="10" y="28" width="8" height="6" rx="1" fill="rgba(0,0,0,0.35)"/>
      <rect x="22" y="28" width="8" height="6" rx="1" fill="rgba(0,0,0,0.35)"/>
      <rect x="34" y="28" width="6" height="6" rx="1" fill="rgba(0,0,0,0.35)"/>
    </IconWrap>
  )
}

function IconSolar({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <IconWrap cx={cx} cy={cy} scale={0.75}>
      <rect x="4" y="12" width="40" height="24" rx="2" fill={color} opacity="0.85"/>
      <line x1="4"  y1="20" x2="44" y2="20" stroke="rgba(0,0,0,0.25)" strokeWidth="1"/>
      <line x1="4"  y1="28" x2="44" y2="28" stroke="rgba(0,0,0,0.25)" strokeWidth="1"/>
      <line x1="17" y1="12" x2="17" y2="36" stroke="rgba(0,0,0,0.25)" strokeWidth="1"/>
      <line x1="31" y1="12" x2="31" y2="36" stroke="rgba(0,0,0,0.25)" strokeWidth="1"/>
      <rect x="6" y="14" width="8" height="4" rx="1" fill="rgba(255,255,255,0.25)"/>
      <line x1="24" y1="36" x2="24" y2="44" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="16" y1="44" x2="32" y2="44" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </IconWrap>
  )
}

function IconWind({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <IconWrap cx={cx} cy={cy} scale={0.75}>
      <circle cx="24" cy="20" r="3.5" fill={color}/>
      <path d="M24 20 L22 6 Q24 3 26 6 Z"  fill={color} opacity="0.9"/>
      <path d="M24 20 L11 28 Q9 25 12 23 Z"  fill={color} opacity="0.9"/>
      <path d="M24 20 L37 28 Q40 25 38 22 Z" fill={color} opacity="0.9"/>
      <line x1="24" y1="23" x2="24" y2="46" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="18" y1="45" x2="30" y2="45" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </IconWrap>
  )
}

function IconBattery({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <IconWrap cx={cx} cy={cy} scale={0.75}>
      <rect x="18" y="8" width="12" height="5" rx="2" fill={color} opacity="0.7"/>
      <rect x="6" y="13" width="36" height="22" rx="3" fill={color} opacity="0.9"/>
      <rect x="9"  y="16" width="24" height="16" rx="2" fill="rgba(0,0,0,0.30)"/>
      <path d="M26 18 L22 26 L25 26 L22 34 L28 24 L25 24 Z" fill="rgba(255,255,255,0.85)"/>
    </IconWrap>
  )
}

function IconWarning({ cx, cy }: { cx: number; cy: number }) {
  return (
    <IconWrap cx={cx} cy={cy} scale={0.8333}>
      <path d="M24 6 L44 40 H4 Z" fill={RC.warning} opacity="0.92"/>
      <rect x="22" y="18" width="4" height="12" rx="2" fill="white"/>
      <circle cx="24" cy="34" r="2.5" fill="white"/>
    </IconWrap>
  )
}

function IconCheckmark({ cx, cy }: { cx: number; cy: number }) {
  return (
    <IconWrap cx={cx} cy={cy} scale={0.8333}>
      <circle cx="24" cy="24" r="20" fill={RC.green} opacity="0.92"/>
      <path d="M14 24 L21 31 L34 17" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    </IconWrap>
  )
}

function IconPylon({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <IconWrap cx={cx} cy={cy} scale={0.9167}>
      <path d="M24 4 L32 42 H16 Z" fill={color} opacity="0.25"/>
      <line x1="24" y1="4" x2="24" y2="44" stroke={color} strokeWidth="2" opacity="0.9"/>
      <line x1="8"  y1="16" x2="40" y2="16" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="12" y1="26" x2="36" y2="26" stroke={color} strokeWidth="2"   strokeLinecap="round"/>
      <line x1="24" y1="4"  x2="8"  y2="16" stroke={color} strokeWidth="1.5" opacity="0.7"/>
      <line x1="24" y1="4"  x2="40" y2="16" stroke={color} strokeWidth="1.5" opacity="0.7"/>
      <line x1="8"  y1="16" x2="16" y2="26" stroke={color} strokeWidth="1.5" opacity="0.7"/>
      <line x1="40" y1="16" x2="32" y2="26" stroke={color} strokeWidth="1.5" opacity="0.7"/>
      <path d="M4 14 Q24 22 44 14" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6" strokeDasharray="2 2"/>
      <path d="M6 18 Q24 26 42 18" stroke={color} strokeWidth="1.2" fill="none" opacity="0.6" strokeDasharray="2 2"/>
      <line x1="16" y1="44" x2="32" y2="44" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </IconWrap>
  )
}

function IconHouse({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <IconWrap cx={cx} cy={cy} scale={0.6667}>
      <polygon points="4,22 24,6 44,22" fill={color} opacity="0.85"/>
      <rect x="8" y="22" width="32" height="20" rx="1" fill={color} opacity="0.9"/>
      <rect x="18" y="30" width="12" height="12" rx="1" fill="rgba(0,0,0,0.3)"/>
    </IconWrap>
  )
}

function IconSchool({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <IconWrap cx={cx} cy={cy} scale={0.6667}>
      <rect x="4" y="18" width="40" height="24" rx="1" fill={color} opacity="0.9"/>
      <polygon points="4,18 24,6 44,18" fill={color} opacity="0.85"/>
      <line x1="24" y1="6" x2="24" y2="0" stroke={color} strokeWidth="1.5"/>
      <polygon points="24,0 32,3 24,6" fill={color} opacity="0.8"/>
      <rect x="8"  y="24" width="8" height="6" rx="1" fill="rgba(0,0,0,0.3)"/>
      <rect x="20" y="24" width="8" height="6" rx="1" fill="rgba(0,0,0,0.3)"/>
      <rect x="32" y="24" width="8" height="6" rx="1" fill="rgba(0,0,0,0.3)"/>
    </IconWrap>
  )
}

function IconOffice({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <IconWrap cx={cx} cy={cy} scale={0.6667}>
      <rect x="10" y="4" width="28" height="40" rx="2" fill={color} opacity="0.9"/>
      {[8, 16, 24, 32].map((y) => (
        [14, 22, 30].map((x) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="5" height="5" rx="1" fill="rgba(0,0,0,0.3)"/>
        ))
      ))}
    </IconWrap>
  )
}

function IconIndustry({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <IconWrap cx={cx} cy={cy} scale={0.6667}>
      <rect x="4" y="24" width="40" height="20" rx="1" fill={color} opacity="0.9"/>
      <path d="M4 24 L12 14 L20 24 L28 14 L36 24 L44 24" fill={color} opacity="0.8"/>
      <rect x="36" y="10" width="5" height="16" rx="1" fill={color} opacity="0.9"/>
    </IconWrap>
  )
}

// ── Flow arrow — single vertical connector between the two stage rows ────────
function FlowArrowDown({ x, y1, y2, color, active }: { x: number; y1: number; y2: number; color: string; active: boolean }) {
  const gap = 4
  const headH = 12
  const strokeColor = active ? RC.white90 : color
  const opacity = active ? 0.9 : 0.55
  return (
    <g style={{ transition: 'opacity 0.18s ease' }}>
      <line x1={x} y1={y1 + gap} x2={x} y2={y2 - gap - headH}
        stroke={strokeColor} strokeWidth={active ? 5 : 4} strokeLinecap="round" opacity={opacity}/>
      <polygon
        points={`${x - 10},${y2 - gap - headH} ${x + 10},${y2 - gap - headH} ${x},${y2 - gap}`}
        fill={strokeColor} opacity={opacity}
      />
    </g>
  )
}

// ── Single source of truth for every stage ────────────────────────────────────
interface StageData {
  index:      number
  labelLines: string[]
  color:      string
  Icon:       (p: { cx: number; cy: number; color: string }) => JSX.Element
}

interface VariantData {
  eyebrow:      string
  accent:       string
  accentDim:    string
  topStages:    StageData[]
  indicator?:   { type: 'warning' | 'check'; text: string }
  bottomStages: StageData[]
  callout:      string
}

const VARIANTS: Record<'problem' | 'solution' | 'distribution', VariantData> = {
  problem: {
    eyebrow: 'The Challenge — Variable Supply',
    accent: RC.warning,
    accentDim: RC.warningDim,
    topStages: [
      { index: 1, labelLines: ['Fossil', 'Fuels'], color: RC.warning, Icon: IconFactory },
      { index: 2, labelLines: ['Solar', 'PV'],     color: RC.amber,   Icon: IconSolar },
      { index: 3, labelLines: ['Wind', 'Power'],   color: RC.amber,   Icon: IconWind },
    ],
    indicator: { type: 'warning', text: 'Intermittent supply — no storage' },
    bottomStages: [
      { index: 4, labelLines: ['Electricity', 'Grid'], color: RC.warning, Icon: IconPylon },
    ],
    callout: 'When wind drops and sun sets, dispatchable backup is required — historically met by fossil fuels.',
  },
  solution: {
    eyebrow: 'The Solution — Integrated Clean Energy',
    accent: RC.green,
    accentDim: RC.greenDim,
    topStages: [
      { index: 1, labelLines: ['Solar', 'PV'],       color: RC.green, Icon: IconSolar },
      { index: 2, labelLines: ['Wind', 'Power'],     color: RC.green, Icon: IconWind },
      { index: 3, labelLines: ['Grid', 'Storage'],   color: RC.green, Icon: IconBattery },
      { index: 4, labelLines: ['Clean', 'Baseload'], color: RC.amber, Icon: IconFactory },
    ],
    indicator: { type: 'check', text: 'Storage + smart dispatch = reliable supply' },
    bottomStages: [
      { index: 5, labelLines: ['Smart', 'Grid'], color: RC.green, Icon: IconPylon },
    ],
    callout: 'Battery storage, hydro, and demand flexibility allow renewables to deliver reliable 24/7 power.',
  },
  distribution: {
    eyebrow: 'Energy for Everyone',
    accent: RC.amber,
    accentDim: RC.amberDim,
    topStages: [
      { index: 1, labelLines: ['Electricity', 'Grid'], color: RC.amber, Icon: IconPylon },
    ],
    bottomStages: [
      { index: 2, labelLines: ['Homes'],       color: RC.amber, Icon: IconHouse },
      { index: 3, labelLines: ['Schools'],     color: RC.amber, Icon: IconSchool },
      { index: 4, labelLines: ['Businesses'],  color: RC.amber, Icon: IconOffice },
      { index: 5, labelLines: ['Industry'],    color: RC.amber, Icon: IconIndustry },
    ],
    callout: 'A modernised grid delivers affordable, clean electricity to every home, school, business, and factory.',
  },
}

// ── Stage x-positions — evenly spread n items across the canvas width ────────
function stageXs(n: number, w: number): number[] {
  if (n === 1) return [w / 2]
  const margin = w * 0.14
  const usable = w - margin * 2
  return Array.from({ length: n }, (_, i) => margin + (usable * i) / (n - 1))
}

// ── One interactive stage: ring + icon + label + numbered badge ──────────────
function StageNode({
  stage, cx, iconY, labelY, chipY, active, setActive,
}: {
  stage: StageData
  cx: number
  iconY: number
  labelY: number
  chipY: number
  active: number | null
  setActive: (n: number | null) => void
}) {
  const isActive = active === stage.index
  const isDimmed = active !== null && !isActive
  const Icon = stage.Icon
  return (
    <g
      className="rc-panel-hit"
      style={{ opacity: isDimmed ? 0.32 : 1 }}
      tabIndex={0}
      role="button"
      aria-label={`Highlight ${stage.labelLines.join(' ')}`}
      onMouseEnter={() => setActive(stage.index)}
      onMouseLeave={() => setActive(null)}
      onFocus={() => setActive(stage.index)}
      onBlur={() => setActive(null)}
      onClick={() => setActive(active === stage.index ? null : stage.index)}
    >
      <g className="rc-panel-enter" style={{ '--rc-delay': `${stage.index * 0.08}s` } as React.CSSProperties}>
        <circle cx={cx} cy={iconY} r={34}
          fill="rgba(255,255,255,0.05)"
          stroke={rcRgba(stage.color, 0.45)}
          strokeWidth={1.5}/>
        <Icon cx={cx} cy={iconY} color={stage.color}/>

        {stage.labelLines.map((line, li) => (
          <text key={li} className="rc-panel-label" x={cx} y={labelY + li * 12}
            textAnchor="middle" fontSize={9.5} fontWeight="700"
            fontFamily="Montserrat, sans-serif" fill={isActive ? RC.white90 : stage.color}>
            {line}
          </text>
        ))}

        <g className="rc-panel-chipgroup">
          <circle cx={cx} cy={chipY} r={10}
            fill={rcRgba(stage.color, isActive ? 0.32 : 0.16)}
            stroke={stage.color} strokeWidth={1.2}/>
          <text x={cx} y={chipY + 3.5}
            textAnchor="middle" fontSize={8.5} fontWeight="700"
            fontFamily="Montserrat, sans-serif" fill={stage.color}>
            {stage.index}
          </text>
        </g>
      </g>
    </g>
  )
}

// ── Full diagram SVG for one variant ──────────────────────────────────────────
function EnergyFlowSVG({ v, active, setActive }: { v: VariantData; active: number | null; setActive: (n: number | null) => void }) {
  const W = 920
  const hasIndicator = !!v.indicator

  const TOP_Y       = 78
  const TOP_LABEL_Y = 132
  const TOP_CHIP_Y  = 150

  const IND_Y      = 194
  const IND_TEXT_Y = 218

  const ARROW_Y1 = hasIndicator ? 232 : 168
  const ARROW_Y2 = hasIndicator ? 272 : 226

  const BOT_Y       = hasIndicator ? 302 : 258
  const BOT_LABEL_Y = BOT_Y + 56
  const BOT_CHIP_Y  = BOT_LABEL_Y + 14
  const H           = BOT_CHIP_Y + 24

  const topXs = stageXs(v.topStages.length, W)
  const botXs = stageXs(v.bottomStages.length, W)
  const arrowActive = active !== null

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: W, minWidth: 360 }}
      aria-label={`${v.eyebrow} energy system diagram`}
    >
      <BlueprintFrame w={W} h={H} />

      {v.topStages.map((s, i) => (
        <StageNode key={s.index} stage={s} cx={topXs[i]}
          iconY={TOP_Y} labelY={TOP_LABEL_Y} chipY={TOP_CHIP_Y}
          active={active} setActive={setActive}/>
      ))}

      {hasIndicator && (
        <g className="rc-panel-enter" style={{ '--rc-delay': '0.3s' } as React.CSSProperties}>
          {v.indicator!.type === 'warning'
            ? <IconWarning cx={W / 2} cy={IND_Y}/>
            : <IconCheckmark cx={W / 2} cy={IND_Y}/>}
          <text className="rc-panel-label" x={W / 2} y={IND_TEXT_Y}
            textAnchor="middle" fontSize={9}
            fontFamily="Montserrat, sans-serif" fill={v.accent}>
            {v.indicator!.text}
          </text>
        </g>
      )}

      <FlowArrowDown x={W / 2} y1={ARROW_Y1} y2={ARROW_Y2} color={v.accent} active={arrowActive}/>

      {v.bottomStages.map((s, i) => (
        <StageNode key={s.index} stage={s} cx={botXs[i]}
          iconY={BOT_Y} labelY={BOT_LABEL_Y} chipY={BOT_CHIP_Y}
          active={active} setActive={setActive}/>
      ))}
    </svg>
  )
}

// ── Legend row ─────────────────────────────────────────────────────────────
function Legend({ stages, active, setActive }: { stages: StageData[]; active: number | null; setActive: (n: number | null) => void }) {
  return (
    <div
      className="px-6 py-4 flex flex-wrap gap-x-6 gap-y-3"
      style={{ borderTop: `1px solid ${RC.cardBorder}` }}
    >
      {stages.map((s) => {
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
            aria-label={`Highlight ${s.labelLines.join(' ')}`}
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
              {s.labelLines.join(' ')}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export interface EnergySystemDiagramProps {
  variant: 'problem' | 'solution' | 'distribution'
  title: string
  caption?: string
}

export function EnergySystemDiagram({ variant, title, caption }: EnergySystemDiagramProps) {
  const [active, setActive] = useState<number | null>(null)
  const v = VARIANTS[variant]
  const allStages = [...v.topStages, ...v.bottomStages]
  const lastIndex = allStages[allStages.length - 1].index

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
          style={{ background: v.accentDim, color: v.accent, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · 01–{String(lastIndex).padStart(2, '0')}
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex flex-col items-center gap-4 overflow-x-auto">
        <p className="text-xs uppercase tracking-widest font-bold" style={{ color: v.accent, fontFamily: "'Montserrat', sans-serif" }}>
          {v.eyebrow}
        </p>

        <EnergyFlowSVG v={v} active={active} setActive={setActive}/>

        <div
          className="rounded-lg px-4 py-2.5 text-xs text-center max-w-xs leading-relaxed"
          style={{ background: v.accentDim, border: `1px solid ${v.accent}40`, color: RC.white65 }}
        >
          {v.callout}
        </div>
      </div>

      {/* Legend / index */}
      <Legend stages={allStages} active={active} setActive={setActive}/>

      {/* Caption */}
      {caption && (
        <figcaption
          className="px-6 py-3 text-xs"
          style={{
            borderTop: `1px solid ${RC.cardBorder}`,
            color:     RC.white30,
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
