// ─────────────────────────────────────────────────────────────────────────────
// GeothermalPlantTypesDiagram — RC Diagram Design Language v1.2 (comparison-panel variant)
//
// Three-panel diagram comparing geothermal power plant types:
//
//   1. Dry Steam Plants    — steam extracted directly from reservoir → turbine
//   2. Flash Steam Plants  — high-pressure hot water flashed to steam → turbine
//   3. Binary Cycle Plants — geo-water heats a secondary working fluid → turbine
//
// Ported onto the standard RC card shell: BlueprintFrame, numbered/interactive
// panels, staggered entrance, hover/tap highlight. Each plant type keeps its
// own accent colour (red/orange/blue) rather than the shared mechanical/
// electrical/safety/structural palette — these are alternative process types,
// not components of one system, so a per-type accent reads more clearly.
//
// The five characteristic rows (process/share/example/sites/emissions) used
// to be tiny hand-wrapped SVG text (7.5–8px in a 940-unit canvas) — the same
// mobile-legibility problem as the callout diagrams, just with much more
// text. Rather than crowd a legend chip with five rows of prose, they've
// moved to real HTML detail cards below the diagram: always legible at any
// viewport, no manual word-wrapping needed, and still synced to the same
// hover/tap highlight as the SVG panel.
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
  amberDim:    rcRgba(brand.amber, 0.13),
  amberMid:    rcRgba(brand.amber, 0.42),
  amberBright: rcRgba(brand.amber, 0.70),
  red:         brand.red,
  redDim:      rcRgba(brand.red, 0.12),
  redMid:      rcRgba(brand.red, 0.40),
  orange:      brand.orange,
  orangeDim:   rcRgba(brand.orange, 0.12),
  orangeMid:   rcRgba(brand.orange, 0.40),
  blue:        brand.blue,
  blueDim:     rcRgba(brand.blue, 0.13),
  blueMid:     rcRgba(brand.blue, 0.42),
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
        <pattern id="rcGridGT" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowGT" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.07)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridGT)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowGT)" />
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
const H    = 300
const PAD  = 18
const PANEL_W = (W - PAD * 2 - 20) / 3   // ~293px per panel
const PANEL_H = 260
const TOP_Y   = 20

// ─────────────────────────────────────────────────────────────────────────────
// Schematic: ground cross-section base (shared)
// ─────────────────────────────────────────────────────────────────────────────

function GroundLayers({ cx, baseY, depth, c }: { cx: number; baseY: number; depth: number; c: string }) {
  const layerColors = [
    'rgba(55,70,55,0.60)',
    'rgba(80,60,40,0.65)',
    'rgba(110,50,30,0.70)',
  ]
  const layerH = depth / 3
  return (
    <g>
      {layerColors.map((col, i) => (
        <rect key={i}
          x={cx - 105} y={baseY + i * layerH}
          width={210} height={layerH}
          fill={col} stroke={RC.white12} strokeWidth={0.5}
        />
      ))}
      <text className="rc-panel-label" x={cx + 88} y={baseY + depth / 2}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={7.5} fontFamily="Inter, system-ui, sans-serif"
        fill={c} fillOpacity={0.60}
        transform={`rotate(90, ${cx + 88}, ${baseY + depth / 2})`}>
        INCREASING HEAT ▶
      </text>
      <line x1={cx - 110} y1={baseY} x2={cx + 110} y2={baseY}
        stroke={RC.white20} strokeWidth={1.5} />
      <text className="rc-panel-label" x={cx - 80} y={baseY - 6}
        fontSize={8} fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}>
        GROUND LEVEL
      </text>
    </g>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Plant schematic 1: Dry Steam
// ─────────────────────────────────────────────────────────────────────────────

function DrySteamSchematic({ cx, baseY }: { cx: number; baseY: number }) {
  const tubX = cx - 8
  return (
    <g>
      <GroundLayers cx={cx} baseY={baseY} depth={100} c={RC.red} />

      <rect x={tubX} y={baseY - 20} width={16} height={120} rx={2}
        fill={RC.redDim} stroke={RC.red} strokeWidth={1.2} strokeOpacity={0.60} />
      <text className="rc-panel-label" x={tubX - 18} y={baseY + 60} fontSize={7.5}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}
        transform={`rotate(-90, ${tubX - 18}, ${baseY + 60})`}>
        Production Well
      </text>

      {[-14, 0, 14].map((dx, i) => (
        <text key={i} className="rc-panel-label" x={cx + dx} y={baseY - 30 - i * 8}
          textAnchor="middle" fontSize={10}
          fontFamily="Inter, system-ui, sans-serif" fill={RC.red} fillOpacity={0.50}>
          〜
        </text>
      ))}

      <path d={`M ${cx + 8} ${baseY - 20} L ${cx + 42} ${baseY - 20} L ${cx + 42} ${baseY - 68}`}
        fill="none" stroke={RC.red} strokeWidth={3} strokeOpacity={0.55} />

      <rect x={cx + 26} y={baseY - 90} width={36} height={26} rx={5}
        fill={RC.redDim} stroke={RC.red} strokeWidth={1.3} />
      <text className="rc-panel-label" x={cx + 44} y={baseY - 77} textAnchor="middle" dominantBaseline="middle"
        fontSize={9} fontFamily="Inter, system-ui, sans-serif" fill={RC.red}>⚙</text>

      <rect x={cx + 64} y={baseY - 90} width={32} height={26} rx={5}
        fill={RC.redDim} stroke={RC.red} strokeWidth={1} strokeOpacity={0.60} />
      <text className="rc-panel-label" x={cx + 80} y={baseY - 77} textAnchor="middle" dominantBaseline="middle"
        fontSize={7.5} fontFamily="Inter, system-ui, sans-serif" fill={RC.white50}>GEN</text>

      <rect x={cx + 26} y={baseY - 50} width={36} height={20} rx={4}
        fill="rgba(74,158,191,0.12)" stroke={RC.blue} strokeWidth={1} strokeOpacity={0.50} />
      <text className="rc-panel-label" x={cx + 44} y={baseY - 40} textAnchor="middle" dominantBaseline="middle"
        fontSize={7.5} fontFamily="Inter, system-ui, sans-serif" fill={RC.blue} fillOpacity={0.80}>Condenser</text>

      <rect x={cx + 50} y={baseY - 20} width={12} height={80} rx={2}
        fill={RC.blueDim} stroke={RC.blue} strokeWidth={1} strokeOpacity={0.50} strokeDasharray="4 2" />
      <text className="rc-panel-label" x={cx + 76} y={baseY + 30} fontSize={7.5}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}
        transform={`rotate(-90, ${cx + 76}, ${baseY + 30})`}>
        Injection Well
      </text>

      <line x1={cx + 96} y1={baseY - 77} x2={cx + 108} y2={baseY - 77}
        stroke={RC.green} strokeWidth={2} strokeOpacity={0.70} />
      <text className="rc-panel-label" x={cx + 110} y={baseY - 77} fontSize={9}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.green}>⚡</text>

      <text className="rc-panel-label" x={cx + 20} y={baseY - 22} fontSize={7}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.red} fillOpacity={0.80}>Steam ▶</text>
    </g>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Plant schematic 2: Flash Steam
// ─────────────────────────────────────────────────────────────────────────────

function FlashSteamSchematic({ cx, baseY }: { cx: number; baseY: number }) {
  const tubX = cx - 12
  return (
    <g>
      <GroundLayers cx={cx} baseY={baseY} depth={100} c={RC.orange} />

      <rect x={tubX} y={baseY - 20} width={16} height={120} rx={2}
        fill={RC.orangeDim} stroke={RC.orange} strokeWidth={1.2} strokeOpacity={0.60} />
      <text className="rc-panel-label" x={tubX - 18} y={baseY + 60} fontSize={7.5}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}
        transform={`rotate(-90, ${tubX - 18}, ${baseY + 60})`}>
        Hot Water Well
      </text>

      <path d={`M ${cx + 4} ${baseY - 20} L ${cx + 30} ${baseY - 20}`}
        fill="none" stroke={RC.orange} strokeWidth={3} strokeOpacity={0.55} />

      <rect x={cx + 30} y={baseY - 52} width={24} height={50} rx={8}
        fill={RC.orangeDim} stroke={RC.orange} strokeWidth={1.5} />
      <text className="rc-panel-label" x={cx + 42} y={baseY - 40} textAnchor="middle" dominantBaseline="middle"
        fontSize={7} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.orange}>FLASH</text>
      <text className="rc-panel-label" x={cx + 42} y={baseY - 28} textAnchor="middle" dominantBaseline="middle"
        fontSize={7} fontFamily="Inter, system-ui, sans-serif" fill={RC.orange}>SEP.</text>
      <line x1={cx + 42} y1={baseY - 52} x2={cx + 42} y2={baseY - 78}
        stroke={RC.orange} strokeWidth={2.5} strokeOpacity={0.55} />
      <line x1={cx + 42} y1={baseY - 2} x2={cx + 42} y2={baseY + 20}
        stroke={RC.blue} strokeWidth={2.5} strokeOpacity={0.40} />

      <path d={`M ${cx + 54} ${baseY - 78} L ${cx + 68} ${baseY - 78}`}
        fill="none" stroke={RC.orange} strokeWidth={2.5} strokeOpacity={0.55} />

      <rect x={cx + 68} y={baseY - 92} width={30} height={28} rx={5}
        fill={RC.orangeDim} stroke={RC.orange} strokeWidth={1.3} />
      <text className="rc-panel-label" x={cx + 83} y={baseY - 78} textAnchor="middle" dominantBaseline="middle"
        fontSize={9} fontFamily="Inter, system-ui, sans-serif" fill={RC.orange}>⚙</text>

      <rect x={cx + 68} y={baseY - 60} width={30} height={18} rx={4}
        fill={RC.blueDim} stroke={RC.blue} strokeWidth={1} strokeOpacity={0.50} />
      <text className="rc-panel-label" x={cx + 83} y={baseY - 51} textAnchor="middle" dominantBaseline="middle"
        fontSize={7} fontFamily="Inter, system-ui, sans-serif" fill={RC.blue} fillOpacity={0.80}>Condenser</text>

      <rect x={cx + 75} y={baseY - 32} width={12} height={80} rx={2}
        fill={RC.blueDim} stroke={RC.blue} strokeWidth={1} strokeOpacity={0.50} strokeDasharray="4 2" />

      <line x1={cx + 98} y1={baseY - 78} x2={cx + 108} y2={baseY - 78}
        stroke={RC.green} strokeWidth={2} strokeOpacity={0.70} />
      <text className="rc-panel-label" x={cx + 110} y={baseY - 78} fontSize={9}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.green}>⚡</text>

      <text className="rc-panel-label" x={cx + 16} y={baseY - 22} fontSize={7}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.orange} fillOpacity={0.80}>Hot H₂O ▶</text>
      <text className="rc-panel-label" x={cx + 24} y={baseY - 84} fontSize={7}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.orange} fillOpacity={0.80}>Steam ▶</text>
    </g>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Plant schematic 3: Binary Cycle
// ─────────────────────────────────────────────────────────────────────────────

function BinaryCycleSchematic({ cx, baseY }: { cx: number; baseY: number }) {
  const tubX = cx - 50
  return (
    <g>
      <GroundLayers cx={cx} baseY={baseY} depth={100} c={RC.blue} />

      <rect x={tubX} y={baseY - 20} width={14} height={100} rx={2}
        fill={RC.blueDim} stroke={RC.blue} strokeWidth={1.2} strokeOpacity={0.55} />
      <text className="rc-panel-label" x={tubX - 16} y={baseY + 45} fontSize={7.5}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}
        transform={`rotate(-90, ${tubX - 16}, ${baseY + 45})`}>
        Warm Water Well
      </text>

      <path d={`M ${tubX + 14} ${baseY - 14} L ${cx - 14} ${baseY - 14}`}
        fill="none" stroke={RC.blue} strokeWidth={3} strokeOpacity={0.50} />

      <rect x={cx - 14} y={baseY - 60} width={28} height={62} rx={6}
        fill={RC.blueDim} stroke={RC.blue} strokeWidth={1.5} />
      <text className="rc-panel-label" x={cx} y={baseY - 38} textAnchor="middle" dominantBaseline="middle"
        fontSize={7} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.blue}>HEAT</text>
      <text className="rc-panel-label" x={cx} y={baseY - 26} textAnchor="middle" dominantBaseline="middle"
        fontSize={7} fontFamily="Inter, system-ui, sans-serif" fill={RC.blue}>EXCH.</text>
      <text className="rc-panel-label" x={cx} y={baseY - 14} textAnchor="middle" dominantBaseline="middle"
        fontSize={9} fontFamily="Inter, system-ui, sans-serif" fill={RC.amber} fillOpacity={0.70}>↕</text>

      <line x1={cx - 14} y1={baseY - 4} x2={tubX + 14} y2={baseY - 4}
        stroke={RC.blue} strokeWidth={2} strokeOpacity={0.40} strokeDasharray="4 2" />

      <path d={`M ${cx + 14} ${baseY - 50} L ${cx + 36} ${baseY - 50}`}
        fill="none" stroke={RC.amber} strokeWidth={2.5} strokeOpacity={0.60} />

      <rect x={cx + 36} y={baseY - 64} width={30} height={28} rx={5}
        fill={RC.amberDim} stroke={RC.amber} strokeWidth={1.3} />
      <text className="rc-panel-label" x={cx + 51} y={baseY - 50} textAnchor="middle" dominantBaseline="middle"
        fontSize={9} fontFamily="Inter, system-ui, sans-serif" fill={RC.amber}>⚙</text>

      <rect x={cx + 36} y={baseY - 32} width={30} height={18} rx={4}
        fill="rgba(130,188,0,0.10)" stroke={RC.green} strokeWidth={1} strokeOpacity={0.50} />
      <text className="rc-panel-label" x={cx + 51} y={baseY - 23} textAnchor="middle" dominantBaseline="middle"
        fontSize={7} fontFamily="Inter, system-ui, sans-serif" fill={RC.green} fillOpacity={0.80}>Condenser</text>

      <path d={`M ${cx + 36} ${baseY - 14} L ${cx + 14} ${baseY - 14} L ${cx + 14} ${baseY - 50}`}
        fill="none" stroke={RC.amber} strokeWidth={1.5} strokeOpacity={0.50} strokeDasharray="4 2" />

      <rect x={cx + 60} y={baseY - 20} width={12} height={80} rx={2}
        fill={RC.blueDim} stroke={RC.blue} strokeWidth={1} strokeOpacity={0.45} strokeDasharray="4 2" />
      <text className="rc-panel-label" x={cx + 84} y={baseY + 30} fontSize={7.5}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}
        transform={`rotate(-90, ${cx + 84}, ${baseY + 30})`}>
        Injection Well
      </text>

      <line x1={cx + 66} y1={baseY - 50} x2={cx + 78} y2={baseY - 50}
        stroke={RC.green} strokeWidth={2} strokeOpacity={0.70} />
      <text className="rc-panel-label" x={cx + 80} y={baseY - 50} fontSize={9}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.green}>⚡</text>

      <text className="rc-panel-label" x={cx + 20} y={baseY - 54} fontSize={7}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.amber} fillOpacity={0.80}>Vapour ▶</text>
      <text className="rc-panel-label" x={cx - 60} y={baseY - 6} fontSize={7}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.blue} fillOpacity={0.70}>Geo-water ▶</text>
    </g>
  )
}

const schematics = [DrySteamSchematic, FlashSteamSchematic, BinaryCycleSchematic]

// ─────────────────────────────────────────────────────────────────────────────
// Panel data — single source of truth for the SVG panels and the HTML detail cards
// ─────────────────────────────────────────────────────────────────────────────

const panels = [
  {
    num:   1,
    label: 'Dry Steam Plants',
    icon:  '💨',
    color: RC.red,
    dim:   RC.redDim,
    mid:   RC.redMid,
    temp:  '>235°C steam',
    process: 'Steam extracted directly from reservoir → drives turbine → condensed & returned',
    share:   '~10% of global geothermal',
    example: 'The Geysers, California — the world\'s largest geothermal complex at 900+ MW',
    sites:   'Limited: requires dry steam reservoirs (rare)',
    co2:     'Near-zero operational emissions',
  },
  {
    num:   2,
    label: 'Flash Steam Plants',
    icon:  '⚡',
    color: RC.orange,
    dim:   RC.orangeDim,
    mid:   RC.orangeMid,
    temp:  '>180°C hot water',
    process: 'High-pressure hot water → pressure drop → flashes to steam → drives turbine',
    share:   '~60% of global geothermal — most common type',
    example: 'Larderello, Italy (operational since 1904); Hellisheiði, Iceland',
    sites:   'Volcanic regions, tectonically active zones',
    co2:     'Very low — minor H₂S and steam emissions',
  },
  {
    num:   3,
    label: 'Binary Cycle Plants',
    icon:  '🔄',
    color: RC.blue,
    dim:   RC.blueDim,
    mid:   RC.blueMid,
    temp:  '70–180°C (lower temp)',
    process: 'Geo-water heats secondary working fluid via heat exchanger → vapour drives turbine → fluid recirculated',
    share:   '~30% of global geothermal capacity',
    example: 'Chena Hot Springs, Alaska; used across Kenya\'s Olkaria fields',
    sites:   'Much wider applicability — enables EGS (deep geothermal) globally',
    co2:     'Zero direct emissions — fully closed loop',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function GeothermalPlantTypesDiagram({
  title   = 'Types of Geothermal Power Plant',
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
            How each type harnesses the Earth's heat — tap a plant type below to see details
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.greenDim, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · 01–03
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
            const colX    = PAD + i * (PANEL_W + 10)
            const Sch     = schematics[i]
            const schBaseY = TOP_Y + 148   // ground surface y within panel
            const isActive = active === p.num
            const isDimmed = active !== null && !isActive

            return (
              <g
                key={p.num}
                className="rc-panel-hit"
                style={{ opacity: isDimmed ? 0.32 : 1 }}
                tabIndex={0}
                role="button"
                aria-label={`Highlight ${p.label}`}
                onMouseEnter={() => setActive(p.num)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(p.num)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(active === p.num ? null : p.num)}
              >
                <g className="rc-panel-enter" style={{ '--rc-delay': `${p.num * 0.10}s` } as React.CSSProperties}>
                  {/* Panel background */}
                  <rect x={colX} y={TOP_Y} width={PANEL_W} height={PANEL_H} rx={10}
                    fill={p.dim} stroke={isActive ? p.color : p.mid} strokeWidth={isActive ? 1.8 : 1.2} />

                  {/* Number badge + icon */}
                  <circle cx={colX + 20} cy={TOP_Y + 20} r={13}
                    fill={p.color} fillOpacity={isActive ? 0.32 : 0.20} stroke={p.color} strokeOpacity={0.60} strokeWidth={1} />
                  <text x={colX + 20} y={TOP_Y + 21}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={13} fontWeight="700"
                    fontFamily="Inter, system-ui, sans-serif" fill={p.color}>
                    {p.num}
                  </text>
                  <text x={colX + PANEL_W - 22} y={TOP_Y + 21}
                    textAnchor="middle" dominantBaseline="middle" fontSize={18}>
                    {p.icon}
                  </text>

                  {/* Panel title */}
                  <text className="rc-panel-label" x={colX + PANEL_W / 2} y={TOP_Y + 43}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={12} fontWeight="700"
                    fontFamily="Inter, system-ui, sans-serif" fill={p.color}>
                    {p.label}
                  </text>

                  {/* Temperature badge */}
                  <rect x={colX + PANEL_W / 2 - 58} y={TOP_Y + 52} width={116} height={18} rx={5}
                    fill="rgba(0,0,0,0.30)" stroke={p.mid} strokeWidth={0.8} strokeOpacity={0.50} />
                  <text className="rc-panel-label" x={colX + PANEL_W / 2} y={TOP_Y + 61}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={9} fontFamily="Inter, system-ui, sans-serif" fill={RC.white50}>
                    Resource temperature: {p.temp}
                  </text>

                  {/* Schematic illustration area */}
                  <rect x={colX + 6} y={TOP_Y + 74} width={PANEL_W - 12} height={170} rx={8}
                    fill="rgba(0,0,0,0.28)" stroke={p.mid} strokeWidth={0.7} strokeOpacity={0.35} />
                  <Sch cx={colX + PANEL_W / 2 - 14} baseY={schBaseY} />
                </g>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Detail cards — the five characteristics per plant type, always legible */}
      <div
        className="px-6 py-4 grid gap-3"
        style={{ borderTop: `1px solid ${RC.cardBorder}`, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
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
              aria-label={`Highlight ${p.label}`}
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
                  {p.label}
                </span>
              </div>
              <dl className="text-[11px] leading-snug space-y-1.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                {[
                  { lbl: 'Resource temp', val: p.temp },
                  { lbl: 'Process',   val: p.process },
                  { lbl: 'Global share', val: p.share },
                  { lbl: 'Example site', val: p.example },
                  { lbl: 'Suitable locations', val: p.sites },
                  { lbl: 'Emissions', val: p.co2 },
                ].map((row) => (
                  <div key={row.lbl}>
                    <dt className="uppercase tracking-wide text-[9px] font-bold" style={{ color: p.color, opacity: 0.85 }}>{row.lbl}</dt>
                    <dd className="mt-0.5" style={{ color: RC.white70 }}>{row.val}</dd>
                  </div>
                ))}
              </dl>
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
      }}>Source: IRENA Renewable Power Generation Costs 2023; IEA Geothermal Power Technology Report 2022</p>
    </figure>
  )
}
