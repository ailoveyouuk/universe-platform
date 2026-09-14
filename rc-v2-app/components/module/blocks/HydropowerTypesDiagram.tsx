// ─────────────────────────────────────────────────────────────────────────────
// HydropowerTypesDiagram — RC Diagram Design Language v1.2 (comparison-panel variant)
//
// Four-panel comparison diagram of hydropower plant types:
//   1. Conventional Reservoir Dam — large dam, controlled release
//   2. Run-of-River — diversion weir, no large reservoir
//   3. Pumped-Storage — dual reservoir, reversible turbine
//   4. Micro-Hydro — small-scale run-of-river, community scale
//
// Ported onto the standard RC card shell: BlueprintFrame, numbered/interactive
// panels, staggered entrance, hover/tap highlight. As with
// GeothermalPlantTypesDiagram, the per-panel characteristics (scale/storage/
// output/ecology/note) used to be hand-wrapped SVG text at 7.5–8.5px in a
// 940-unit canvas — the same mobile-legibility problem as the callout
// diagrams, just with more text. They've moved to real HTML detail cards
// below the diagram instead, synced to the same hover/tap highlight as the
// SVG panel.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'

// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:       brand.green,
  greenDim:    rcRgba(brand.green, 0.12),
  greenMid:    rcRgba(brand.green, 0.38),
  amber:       brand.amber,
  amberDim:    rcRgba(brand.amber, 0.12),
  amberMid:    rcRgba(brand.amber, 0.40),
  blue:        brand.blue,
  blueDim:     rcRgba(brand.blue, 0.13),
  blueMid:     rcRgba(brand.blue, 0.42),
  cyan:        '#29B6D8',
  cyanDim:     'rgba(41,182,216,0.12)',
  cyanMid:     'rgba(41,182,216,0.40)',
  white90:     'rgba(255,255,255,0.90)',
  white70:     'rgba(255,255,255,0.70)',
  white50:     'rgba(255,255,255,0.50)',
  white35:     'rgba(255,255,255,0.35)',
  white20:     'rgba(255,255,255,0.20)',
  white12:     'rgba(255,255,255,0.12)',
  white08:     'rgba(255,255,255,0.08)',
  white10:     'rgba(255,255,255,0.08)',
  white18:     'rgba(255,255,255,0.18)',
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
      .rc-detail-card { cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease; }
      .rc-detail-card:focus-visible, .rc-panel-hit:focus-visible {
        outline: 2px solid ${RC.green}; outline-offset: 2px;
      }
      /* Same mobile fix as the callout-line diagrams: below ~768px the
         diagram has shrunk enough that inline SVG label text is no longer
         legible. Hide it — the HTML detail cards below carry the same
         reading content at full size regardless of viewport. */
      @media (max-width: 767px) {
        .rc-panel-label { display: none; }
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
        <pattern id="rcGridHP" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowHP" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.blue, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.blue, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridHP)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowHP)" />
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

const W    = 940
const H    = 290
const PAD  = 18
const COLS = 4
const COL_W = (W - PAD * 2 - (COLS - 1) * 10) / COLS   // ~218px
const COL_H = 250   // panel height
const TOP_Y = 20

// ─────────────────────────────────────────────────────────────────────────────
// Panel data — single source of truth for the SVG panels and the HTML detail cards
// ─────────────────────────────────────────────────────────────────────────────

interface PanelData {
  num:    number
  label:  string
  icon:   string
  color:  string
  dim:    string
  mid:    string
  scale:  string
  storage:string
  output: string
  eco:    string
  note:   string
}

const panels: PanelData[] = [
  {
    num:     1,
    label:   'Conventional\nReservoir Dam',
    icon:    '🏗️',
    color:   RC.blue,
    dim:     RC.blueDim,
    mid:     RC.blueMid,
    scale:   'Large  (100 MW – 22+ GW)',
    storage: 'Weeks–months of energy',
    output:  'Dispatchable baseload',
    eco:     'High impact — flooding, displacement',
    note:    'Three Gorges Dam (China): 22,500 MW — the world\'s largest power station',
  },
  {
    num:     2,
    label:   'Run-of-River',
    icon:    '🌊',
    color:   RC.cyan,
    dim:     RC.cyanDim,
    mid:     RC.cyanMid,
    scale:   'Small–large (1–2,000 MW)',
    storage: 'Minimal — follows river flow',
    output:  'Variable, river-dependent',
    eco:     'Low impact — no large reservoir',
    note:    'Best suited to rivers with reliable year-round flow in mountainous terrain',
  },
  {
    num:     3,
    label:   'Pumped-Storage\nHydropower',
    icon:    '🔋',
    color:   RC.green,
    dim:     RC.greenDim,
    mid:     RC.greenMid,
    scale:   'Large (100 MW – 3+ GW)',
    storage: '>90% of global grid storage',
    output:  'On-demand — charges & discharges',
    eco:     'Moderate — two reservoirs required',
    note:    '~180 GW installed globally; critical for balancing variable renewables',
  },
  {
    num:     4,
    label:   'Micro-Hydro\n(<100 kW)',
    icon:    '🏘️',
    color:   RC.amber,
    dim:     RC.amberDim,
    mid:     RC.amberMid,
    scale:   'Very small (1–100 kW)',
    storage: 'None — run-of-river only',
    output:  'Continuous low-level power',
    eco:     'Minimal — small footprint',
    note:    'Electrifies remote mountain communities; pico-hydro serves single households',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Schematic SVG illustrations for each type
// ─────────────────────────────────────────────────────────────────────────────

function ReservoirDamSchematic({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <polygon points={`${cx - 90},${cy + 40} ${cx - 30},${cy - 60} ${cx + 10},${cy + 40}`}
        fill="rgba(50,70,90,0.70)" stroke={RC.white12} strokeWidth={1} />
      <polygon points={`${cx + 10},${cy + 40} ${cx + 50},${cy - 40} ${cx + 90},${cy + 40}`}
        fill="rgba(50,70,90,0.70)" stroke={RC.white12} strokeWidth={1} />
      <rect x={cx - 88} y={cy - 10} width={98} height={50} rx={0}
        fill={RC.blueDim} stroke={RC.blue} strokeWidth={1} strokeOpacity={0.40} />
      <polygon points={`${cx + 10},${cy - 28} ${cx + 22},${cy + 40} ${cx + 10},${cy + 40}`}
        fill="rgba(80,100,120,0.85)" stroke={RC.white20} strokeWidth={1} />
      <line x1={cx - 10} y1={cy + 12} x2={cx + 10} y2={cy + 12}
        stroke={RC.blue} strokeWidth={3} strokeOpacity={0.60} />
      <rect x={cx + 22} y={cy + 18} width={26} height={22} rx={3}
        fill={RC.blueDim} stroke={RC.blue} strokeWidth={1.2} />
      <text x={cx + 35} y={cy + 30} textAnchor="middle" dominantBaseline="middle"
        fontSize={8} fontFamily="Inter, system-ui, sans-serif" fill={RC.blue}>⚙</text>
      <rect x={cx + 48} y={cy + 28} width={32} height={12} rx={2}
        fill={RC.cyanDim} stroke={RC.cyan} strokeWidth={0.8} strokeOpacity={0.50} />
      <text className="rc-panel-label" x={cx - 40} y={cy - 16} textAnchor="middle" fontSize={7.5}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.blue} fillOpacity={0.80}>Reservoir</text>
      <text className="rc-panel-label" x={cx + 16} y={cy - 32} textAnchor="middle" fontSize={7.5}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white50}>Dam wall</text>
    </g>
  )
}

function RunOfRiverSchematic({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <path d={`M ${cx - 90} ${cy + 20} Q ${cx} ${cy - 10} ${cx + 90} ${cy + 30}`}
        fill="none" stroke={RC.white20} strokeWidth={2} />
      <path d={`M ${cx - 90} ${cy + 30} Q ${cx} ${cy} ${cx + 90} ${cy + 40}`}
        fill={RC.cyanDim} stroke={RC.cyan} strokeWidth={1.5} strokeOpacity={0.50} />
      <rect x={cx - 10} y={cy - 8} width={16} height={38} rx={3}
        fill="rgba(80,100,120,0.80)" stroke={RC.white20} strokeWidth={1} />
      <path d={`M ${cx + 6} ${cy + 8} L ${cx + 40} ${cy + 4}`}
        fill="none" stroke={RC.cyan} strokeWidth={4} strokeOpacity={0.40} />
      <line x1={cx + 40} y1={cy + 4} x2={cx + 52} y2={cy + 22}
        stroke={RC.cyan} strokeWidth={4} strokeOpacity={0.40} />
      <rect x={cx + 52} y={cy + 18} width={24} height={20} rx={3}
        fill={RC.cyanDim} stroke={RC.cyan} strokeWidth={1.2} />
      <text x={cx + 64} y={cy + 29} textAnchor="middle" dominantBaseline="middle"
        fontSize={8} fontFamily="Inter, system-ui, sans-serif" fill={RC.cyan}>⚙</text>
      <text className="rc-panel-label" x={cx - 55} y={cy + 2} textAnchor="middle" fontSize={7.5}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white50}>River</text>
      <text className="rc-panel-label" x={cx} y={cy - 16} textAnchor="middle" fontSize={7.5}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white50}>Weir</text>
    </g>
  )
}

function PumpedStorageSchematic({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <polygon points={`${cx - 70},${cy + 20} ${cx - 10},${cy - 55} ${cx + 30},${cy + 20}`}
        fill="rgba(50,70,90,0.70)" stroke={RC.white12} strokeWidth={1} />
      <rect x={cx - 42} y={cy - 38} width={52} height={18} rx={3}
        fill={RC.greenDim} stroke={RC.green} strokeWidth={1.2} strokeOpacity={0.60} />
      <line x1={cx + 8} y1={cy - 20} x2={cx + 24} y2={cy + 6}
        stroke={RC.green} strokeWidth={4} strokeOpacity={0.45} />
      <rect x={cx + 22} y={cy + 2} width={30} height={26} rx={4}
        fill={RC.greenDim} stroke={RC.green} strokeWidth={1.3} />
      <text x={cx + 37} y={cy + 16} textAnchor="middle" dominantBaseline="middle"
        fontSize={9} fontFamily="Inter, system-ui, sans-serif" fill={RC.green}>⚙</text>
      <rect x={cx + 52} y={cy + 16} width={38} height={14} rx={3}
        fill={RC.blueDim} stroke={RC.blue} strokeWidth={1.2} strokeOpacity={0.60} />
      <text className="rc-panel-label" x={cx - 16} y={cy - 44} textAnchor="middle" fontSize={7.5}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.green} fillOpacity={0.80}>Upper</text>
      <text className="rc-panel-label" x={cx + 71} y={cy + 12} textAnchor="middle" fontSize={7.5}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.blue} fillOpacity={0.80}>Lower</text>
      <text x={cx + 37} y={cy - 8} textAnchor="middle" fontSize={9}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.green} fillOpacity={0.70}>↕</text>
    </g>
  )
}

function MicroHydroSchematic({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <path d={`M ${cx - 80} ${cy - 30} L ${cx - 20} ${cy + 10} L ${cx + 80} ${cy + 30}`}
        fill="none" stroke={RC.white12} strokeWidth={1.5} />
      <path d={`M ${cx - 80} ${cy - 22} L ${cx - 20} ${cy + 18} L ${cx + 80} ${cy + 38}`}
        fill="none" stroke={RC.amber} strokeWidth={2} strokeOpacity={0.40} strokeDasharray="4 2" />
      <circle cx={cx} cy={cy + 14} r={16}
        fill={RC.amberDim} stroke={RC.amber} strokeWidth={1.5} strokeOpacity={0.70} />
      <text x={cx} y={cy + 15} textAnchor="middle" dominantBaseline="middle"
        fontSize={12} fontFamily="Inter, system-ui, sans-serif" fill={RC.amber}>⚙</text>
      <line x1={cx - 44} y1={cy + 2} x2={cx - 16} y2={cy + 14}
        stroke={RC.amber} strokeWidth={3} strokeOpacity={0.50} />
      <line x1={cx + 16} y1={cy + 14} x2={cx + 52} y2={cy + 14}
        stroke={RC.amber} strokeWidth={2} strokeOpacity={0.60} strokeDasharray="4 2" />
      <polygon points={`${cx + 52},${cy + 6} ${cx + 62},${cy - 4} ${cx + 72},${cy + 6}`}
        fill="rgba(218,165,32,0.20)" stroke={RC.amber} strokeWidth={1} strokeOpacity={0.60} />
      <rect x={cx + 54} y={cy + 6} width={16} height={16} rx={2}
        fill="rgba(218,165,32,0.12)" stroke={RC.amber} strokeWidth={1} strokeOpacity={0.50} />
      <text className="rc-panel-label" x={cx - 30} y={cy - 10} textAnchor="middle" fontSize={7.5}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white50}>Stream</text>
      <text className="rc-panel-label" x={cx + 62} y={cy + 30} textAnchor="middle" fontSize={7.5}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.amber} fillOpacity={0.80}>Village</text>
    </g>
  )
}

const schematics = [ReservoirDamSchematic, RunOfRiverSchematic, PumpedStorageSchematic, MicroHydroSchematic]

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function HydropowerTypesDiagram({
  title   = 'Types of Hydropower Plant',
  caption,
}: {
  title?: string
  caption?: string
}) {
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
            {title}
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white35, fontFamily: "'Montserrat', sans-serif" }}>
            Key characteristics compared — tap a plant type below to see details
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.blueDim, color: RC.blue, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · 01–04
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', maxWidth: W, display: 'block', margin: '0 auto' }}
          aria-label={title}
        >
          <BlueprintFrame w={W} h={H} />

          {panels.map((p, i) => {
            const colX = PAD + i * (COL_W + 10)
            const Schematic = schematics[i]
            const isActive = active === p.num
            const isDimmed = active !== null && !isActive

            return (
              <g
                key={p.num}
                className="rc-panel-hit"
                style={{ opacity: isDimmed ? 0.32 : 1 }}
                tabIndex={0}
                role="button"
                aria-label={`Highlight ${p.label.replace('\n', ' ')}`}
                onMouseEnter={() => setActive(p.num)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(p.num)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(active === p.num ? null : p.num)}
              >
                <g className="rc-panel-enter" style={{ '--rc-delay': `${p.num * 0.10}s` } as React.CSSProperties}>
                  {/* Panel background */}
                  <rect x={colX} y={TOP_Y} width={COL_W} height={COL_H} rx={10}
                    fill={p.dim} stroke={isActive ? p.color : p.mid} strokeWidth={isActive ? 1.8 : 1.2} />

                  {/* Number badge */}
                  <circle cx={colX + 20} cy={TOP_Y + 20} r={13}
                    fill={p.color} fillOpacity={isActive ? 0.32 : 0.20} stroke={p.color} strokeOpacity={0.60} strokeWidth={1} />
                  <text x={colX + 20} y={TOP_Y + 21}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={13} fontWeight="700"
                    fontFamily="Inter, system-ui, sans-serif" fill={p.color}>
                    {p.num}
                  </text>

                  {/* Icon */}
                  <text x={colX + COL_W - 22} y={TOP_Y + 21}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={18}>
                    {p.icon}
                  </text>

                  {/* Panel title (multi-line via tspan) */}
                  <text
                    className="rc-panel-label"
                    x={colX + COL_W / 2} y={TOP_Y + 44}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={11} fontWeight="700"
                    fontFamily="Inter, system-ui, sans-serif" fill={p.color}>
                    {p.label.split('\n').map((line, li) => (
                      <tspan key={li} x={colX + COL_W / 2} dy={li === 0 ? 0 : 14}>{line}</tspan>
                    ))}
                  </text>

                  {/* Schematic illustration area */}
                  <rect x={colX + 6} y={TOP_Y + 80} width={COL_W - 12} height={130} rx={8}
                    fill="rgba(0,0,0,0.30)" stroke={p.mid} strokeWidth={0.8} strokeOpacity={0.40} />
                  <Schematic cx={colX + COL_W / 2} cy={TOP_Y + 152} />
                </g>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Detail cards — scale/storage/output/ecology + a notable example, always legible */}
      <div
        className="px-6 py-4 grid gap-3"
        style={{ borderTop: `1px solid ${RC.cardBorder}`, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}
      >
        {panels.map((p) => {
          const isActive = active === p.num
          return (
            <div
              key={p.num}
              className="rc-detail-card rounded-lg p-3"
              style={{
                background: isActive ? rcRgba(p.color, 0.10) : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? rcRgba(p.color, 0.45) : RC.cardBorder}`,
              }}
              tabIndex={0}
              role="button"
              aria-label={`Highlight ${p.label.replace('\n', ' ')}`}
              onMouseEnter={() => setActive(p.num)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(p.num)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active === p.num ? null : p.num)}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: rcRgba(p.color, isActive ? 0.28 : 0.16), border: `1px solid ${p.color}`, color: p.color, fontFamily: "'Montserrat', sans-serif" }}
                >
                  {String(p.num).padStart(2, '0')}
                </span>
                <span className="text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white70, fontFamily: "'Montserrat', sans-serif" }}>
                  {p.label.replace('\n', ' ')}
                </span>
              </div>
              <dl className="text-[11px] leading-snug space-y-1.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                {[
                  { lbl: 'Scale',   val: p.scale },
                  { lbl: 'Storage', val: p.storage },
                  { lbl: 'Output',  val: p.output },
                  { lbl: 'Ecology', val: p.eco },
                ].map((row) => (
                  <div key={row.lbl}>
                    <dt className="uppercase tracking-wide text-[9px] font-bold" style={{ color: p.color, opacity: 0.85 }}>{row.lbl}</dt>
                    <dd className="mt-0.5" style={{ color: RC.white70 }}>{row.val}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-[10px] italic" style={{ color: RC.white35 }}>{p.note}</p>
            </div>
          )
        })}
      </div>

      {/* Caption */}
      {caption && (
        <figcaption
          className="px-6 py-3 text-xs"
          style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white50 }}
        >
          {caption}
        </figcaption>
      )}
      <p style={{
        color:      RC.white35,
        fontSize:   10,
        margin:     0,
        padding:    '10px 24px',
        textAlign:  'center',
        fontFamily: 'Inter, system-ui, sans-serif',
        borderTop:  `1px solid ${RC.cardBorder}`,
      }}>Source: IHA Hydropower Status Report 2024; IEA Hydropower Special Market Report 2021</p>
    </figure>
  )
}
