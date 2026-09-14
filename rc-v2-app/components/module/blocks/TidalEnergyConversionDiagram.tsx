// ─────────────────────────────────────────────────────────────────────────────
// TidalEnergyConversionDiagram — RC Diagram Design Language v1.2 (comparison-panel variant)
//
// Tidal Energy Conversion Technologies — Cross-Section Diagram
//
// LEFT PANEL — TIDAL STREAM TURBINE
//   Horizontal-axis turbine (HATT) mounted on seabed gravity base.
//   Shows tidal current flow arrows, rotating blades, nacelle/hub,
//   monopole, and subsea cable to shore.
//   Key facts: 2–4 MW capacity; works in 25–50 m depth; bi-directional.
//
// RIGHT PANEL — TIDAL BARRAGE
//   Cross-section through a barrage across an estuary.
//   Shows high-tide side, barrage wall, embedded bulb turbines, sluice gate,
//   low-tide side, and electricity transmission tower.
//   Key facts: La Rance 240 MW (1966); Sihwa Lake 254 MW; 50+ year asset life.
//
// Shared ocean cross-section aesthetic, tidal arrows, BlueprintFrame corner
// brackets, staggered entrance, hover/tap/focus sibling-dimming, a synced
// HTML legend, and the mobile-legibility fix (inline SVG labels hidden under
// 767px; the legend carries the reading content there).
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'

// ── RC Design Tokens ─────────────────────────────────────────────────────────
const RC = {
  green:       brand.green,
  greenDim:    rcRgba(brand.green, 0.13),
  greenMid:    rcRgba(brand.green, 0.40),
  blue:        brand.blue,
  blueDim:     rcRgba(brand.blue, 0.13),
  blueMid:     rcRgba(brand.blue, 0.40),
  amber:       brand.amber,
  amberDim:    rcRgba(brand.amber, 0.13),
  amberMid:    rcRgba(brand.amber, 0.40),
  teal:        brand.cyan,
  tealDim:     rcRgba(brand.cyan, 0.13),
  tealMid:     rcRgba(brand.cyan, 0.40),
  orange:      brand.orange,
  orangeDim:   rcRgba(brand.orange, 0.13),
  orangeMid:   rcRgba(brand.orange, 0.40),
  white90:     'rgba(255,255,255,0.90)',
  white70:     'rgba(255,255,255,0.70)',
  white50:     'rgba(255,255,255,0.50)',
  white35:     'rgba(255,255,255,0.35)',
  white20:     'rgba(255,255,255,0.20)',
  white12:     'rgba(255,255,255,0.12)',
  white08:     'rgba(255,255,255,0.08)',
  cardBg:      'rgba(10,15,20,0.85)',
  cardBorder:  'rgba(255,255,255,0.08)',
  oceanDeep:   'rgba(8,28,60,0.85)',
  seabed:      'rgba(55,42,22,0.92)',
  seabedTop:   'rgba(85,65,38,0.80)',
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
        outline: 2px solid ${RC.teal}; outline-offset: 2px;
      }
      /* Below ~768px the diagram has shrunk enough that inline SVG name/fact
         text is no longer legible. Hide it and let the legend row (plain
         HTML, always full-size) carry the reading. */
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
        <pattern id="rcGridTE" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white08} />
        </pattern>
        <radialGradient id="rcGlowTE" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.cyan, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.cyan, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridTE)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowTE)" />
      {[
        { x: 10, y: 10, dx: 1, dy: 1 },
        { x: w - 10, y: 10, dx: -1, dy: 1 },
        { x: 10, y: h - 10, dx: 1, dy: -1 },
        { x: w - 10, y: h - 10, dx: -1, dy: -1 },
      ].map((c, i) => (
        <path key={i}
          d={`M${c.x} ${c.y + b * c.dy} L${c.x} ${c.y} L${c.x + b * c.dx} ${c.y}`}
          fill="none" stroke={RC.white20} strokeWidth={1.5} strokeLinecap="round" />
      ))}
    </>
  )
}

const W   = 980
const H   = 560
const PAD = 18

// Panel split
const SPLIT_X  = W / 2
const L_MID    = SPLIT_X / 2           // centre of left panel
const R_MID    = SPLIT_X + SPLIT_X / 2 // centre of right panel

// Vertical geometry
const WATER_Y  = 150    // mean water level
const SEABED_Y = 440    // seabed

// Arrow helper
function Arrow({ x1, y1, x2, y2, col, dashed, sw = 1.5 }: {
  x1: number; y1: number; x2: number; y2: number
  col: string; dashed?: boolean; sw?: number
}) {
  const angle   = Math.atan2(y2 - y1, x2 - x1)
  const headLen = 8
  const ax = x2 - headLen * Math.cos(angle - 0.38)
  const ay = y2 - headLen * Math.sin(angle - 0.38)
  const bx = x2 - headLen * Math.cos(angle + 0.38)
  const by = y2 - headLen * Math.sin(angle + 0.38)
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={col} strokeWidth={sw} strokeOpacity={0.75}
        strokeDasharray={dashed ? '5 3' : undefined} />
      <polygon points={`${x2},${y2} ${ax},${ay} ${bx},${by}`}
        fill={col} fillOpacity={0.75} />
    </g>
  )
}

// Label badge
function Badge({ cx, cy, text, col, bgCol, w = 140 }: {
  cx: number; cy: number; text: string; col: string; bgCol: string; w?: number
}) {
  return (
    <g className="rc-panel-label">
      <rect x={cx - w / 2} y={cy - 10} width={w} height={20} rx={5}
        fill={bgCol} stroke={col} strokeWidth={1} strokeOpacity={0.70} />
      <text x={cx} y={cy + 1}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={8.5} fontWeight="700" fontFamily="Inter, system-ui, sans-serif"
        fill={col}>
        {text}
      </text>
    </g>
  )
}

// Info line
function InfoLine({ x, y, label, value, col }: {
  x: number; y: number; label: string; value: string; col: string
}) {
  return (
    <g className="rc-panel-label">
      <circle cx={x + 5} cy={y} r={3} fill={col} fillOpacity={0.70} />
      <text x={x + 14} y={y}
        dominantBaseline="middle" fontSize={8}
        fontFamily="Inter, system-ui, sans-serif">
        <tspan fontWeight="700" fill={col}>{label}: </tspan>
        <tspan fill={RC.white70}>{value}</tspan>
      </text>
    </g>
  )
}

// ── Tidal Stream Turbine (left panel) ─────────────────────────────────────────
function TidalStreamTurbine() {
  const cx       = L_MID
  const baseY    = SEABED_Y - 8
  const poleH    = 160
  const poleTopY = baseY - poleH
  const hubY     = poleTopY
  const hubR     = 14
  const bladeLen = 52

  // Blade angles (3 blades, slightly swept)
  const bladeAngles = [90, 210, 330]

  return (
    <g>
      {/* Tidal current arrows */}
      {[WATER_Y + 30, WATER_Y + 80, WATER_Y + 130].map((y, i) => (
        <Arrow key={i}
          x1={PAD + 20} y1={y}
          x2={cx - 100} y2={y}
          col={RC.teal} sw={i === 1 ? 2.5 : 1.6} />
      ))}
      <text className="rc-panel-label" x={PAD + 40} y={WATER_Y + 85}
        dominantBaseline="middle" fontSize={8.5} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.teal}>
        TIDAL CURRENT →
      </text>

      {/* Gravity base */}
      <rect x={cx - 40} y={baseY} width={80} height={22} rx={4}
        fill="rgba(70,60,40,0.80)" stroke={RC.amberDim} strokeWidth={1.5} />
      <text className="rc-panel-label" x={cx} y={baseY + 11}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={7.5} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.amber}>
        GRAVITY BASE
      </text>

      {/* Tower pole */}
      <rect x={cx - 7} y={poleTopY} width={14} height={poleH} rx={3}
        fill={RC.white12} stroke={RC.white35} strokeWidth={1.2} />

      {/* Nacelle */}
      <rect x={cx - 22} y={hubY - 12} width={44} height={24} rx={6}
        fill={RC.blueDim} stroke={RC.blue} strokeWidth={1.8} />
      <text className="rc-panel-label" x={cx + 26} y={hubY}
        dominantBaseline="middle" fontSize={8} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.blue}>
        Nacelle
      </text>

      {/* Rotor blades */}
      {bladeAngles.map((deg, i) => {
        const rad  = (deg * Math.PI) / 180
        const tipX = cx + bladeLen * Math.cos(rad)
        const tipY = hubY + bladeLen * Math.sin(rad)
        // Blade as a tapered path
        const perpRad = rad + Math.PI / 2
        const baseW   = 5
        const b1x = cx + baseW * Math.cos(perpRad)
        const b1y = hubY + baseW * Math.sin(perpRad)
        const b2x = cx - baseW * Math.cos(perpRad)
        const b2y = hubY - baseW * Math.sin(perpRad)
        return (
          <polygon key={i}
            points={`${b1x.toFixed(1)},${b1y.toFixed(1)} ${tipX.toFixed(1)},${tipY.toFixed(1)} ${b2x.toFixed(1)},${b2y.toFixed(1)}`}
            fill={RC.blue} fillOpacity={0.70}
            stroke={RC.blue} strokeWidth={0.8} />
        )
      })}

      {/* Hub centre */}
      <circle cx={cx} cy={hubY} r={10}
        fill={RC.blue} fillOpacity={0.85} stroke="rgba(255,255,255,0.20)" strokeWidth={1} />
      <circle cx={cx} cy={hubY} r={4}
        fill="rgba(255,255,255,0.25)" />

      {/* Rotation arrows around hub */}
      <path d={`M ${cx + 16} ${hubY - 8} A 18 18 0 0 1 ${cx + 8} ${hubY + 16}`}
        fill="none" stroke={RC.green} strokeWidth={1.8} strokeOpacity={0.70} />

      {/* Subsea cable */}
      <Arrow x1={cx - 4} y1={baseY + 10} x2={PAD + 20} y2={baseY + 10}
        col={RC.amber} dashed sw={1.5} />
      <text className="rc-panel-label" x={PAD + 60} y={baseY + 24}
        fontSize={7.5} fontFamily="Inter, system-ui, sans-serif" fill={RC.amber}>
        Subsea cable → Grid
      </text>

      {/* Key facts box */}
      <rect className="rc-panel-label" x={cx + 80} y={WATER_Y + 20} width={140} height={100} rx={8}
        fill={RC.white08} stroke={RC.cardBorder} strokeWidth={1} />
      <text className="rc-panel-label" x={cx + 150} y={WATER_Y + 34}
        textAnchor="middle" fontSize={9} fontWeight="800"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.teal}>
        KEY FACTS
      </text>
      <InfoLine x={cx + 88} y={WATER_Y + 50} label="Capacity" value="2–4 MW per turbine" col={RC.teal} />
      <InfoLine x={cx + 88} y={WATER_Y + 65} label="Depth" value="25–50 m typically" col={RC.teal} />
      <InfoLine x={cx + 88} y={WATER_Y + 80} label="Flow" value="Bi-directional" col={RC.teal} />
      <InfoLine x={cx + 88} y={WATER_Y + 95} label="Example" value="Orbital Marine O2" col={RC.teal} />
      <InfoLine x={cx + 88} y={WATER_Y + 110} label="Array" value="MeyGen, Pentland Firth" col={RC.teal} />
    </g>
  )
}

// ── Tidal Barrage (right panel) ───────────────────────────────────────────────
function TidalBarrage() {
  const cx         = R_MID
  const barrageX   = cx - 18           // barrage centre-ish
  const barrageW   = 36
  const barrageTop = WATER_Y - 60      // barrage height above waterline
  const barrageBot = SEABED_Y - 8      // barrage foot
  const barrageH   = barrageBot - barrageTop

  const highTideY  = WATER_Y - 40      // left/basin high-tide level
  const lowTideY   = WATER_Y + 15      // right/sea low-tide level

  const turbineY   = (highTideY + SEABED_Y) / 2   // turbine embedded in barrage
  const turbineR   = 14

  return (
    <g>
      {/* High-tide basin water (left of barrage) */}
      <rect x={SPLIT_X + PAD} y={highTideY} width={barrageX - SPLIT_X - PAD} height={barrageBot - highTideY}
        fill="rgba(20,70,140,0.40)" />
      <line x1={SPLIT_X + PAD} y1={highTideY} x2={barrageX} y2={highTideY}
        stroke={RC.blue} strokeWidth={2} strokeOpacity={0.80} />

      {/* Low-tide sea (right of barrage) */}
      <rect x={barrageX + barrageW} y={lowTideY} width={W - PAD - barrageX - barrageW} height={barrageBot - lowTideY}
        fill="rgba(15,50,110,0.30)" />
      <line x1={barrageX + barrageW} y1={lowTideY} x2={W - PAD} y2={lowTideY}
        stroke={RC.blue} strokeWidth={1.5} strokeOpacity={0.60} />

      {/* Water level labels */}
      <text className="rc-panel-label" x={barrageX - 8} y={highTideY - 6}
        textAnchor="end" fontSize={8} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.blue}>
        HIGH TIDE
      </text>
      <text className="rc-panel-label" x={barrageX + barrageW + 8} y={lowTideY - 6}
        fontSize={8} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.blue} fillOpacity={0.70}>
        LOW TIDE
      </text>

      {/* Water flow through turbine arrow */}
      <Arrow x1={barrageX - 30} y1={turbineY} x2={barrageX - 4} y2={turbineY}
        col={RC.teal} sw={2} />
      <Arrow x1={barrageX + barrageW + 4} y1={turbineY} x2={barrageX + barrageW + 36} y2={turbineY}
        col={RC.teal} sw={2} />

      {/* Barrage body */}
      <rect x={barrageX} y={barrageTop} width={barrageW} height={barrageH} rx={4}
        fill="rgba(80,75,65,0.85)" stroke={RC.white35} strokeWidth={1.5} />

      {/* Turbine embedded in barrage */}
      <circle cx={barrageX + barrageW / 2} cy={turbineY} r={turbineR}
        fill={RC.greenDim} stroke={RC.green} strokeWidth={2} />
      {/* Turbine blades inside */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180
        return (
          <line key={i}
            x1={barrageX + barrageW / 2} y1={turbineY}
            x2={barrageX + barrageW / 2 + (turbineR - 3) * Math.cos(rad)}
            y2={turbineY + (turbineR - 3) * Math.sin(rad)}
            stroke={RC.green} strokeWidth={2.5} strokeLinecap="round" />
        )
      })}
      <circle cx={barrageX + barrageW / 2} cy={turbineY} r={4}
        fill={RC.green} fillOpacity={0.85} />

      {/* Sluice gate (upper part of barrage) */}
      <rect x={barrageX + 4} y={barrageTop + 20} width={barrageW - 8} height={30} rx={3}
        fill={RC.amberDim} stroke={RC.amber} strokeWidth={1} />
      <text className="rc-panel-label" x={barrageX + barrageW / 2} y={barrageTop + 35}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={6.5} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.amber}>
        SLUICE
      </text>
      <text className="rc-panel-label" x={barrageX + barrageW / 2} y={barrageTop + 45}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={6} fontFamily="Inter, system-ui, sans-serif" fill={RC.amber}>
        GATE
      </text>

      {/* Transmission tower above barrage (power export) */}
      <line x1={barrageX + barrageW / 2} y1={barrageTop - 4} x2={barrageX + barrageW / 2} y2={barrageTop - 44}
        stroke={RC.white35} strokeWidth={2} />
      <line x1={barrageX + barrageW / 2 - 18} y1={barrageTop - 30} x2={barrageX + barrageW / 2 + 18} y2={barrageTop - 30}
        stroke={RC.white35} strokeWidth={1.5} />
      <line x1={barrageX + barrageW / 2 - 10} y1={barrageTop - 44} x2={barrageX + barrageW / 2 + 10} y2={barrageTop - 44}
        stroke={RC.white35} strokeWidth={1.5} />
      {/* Transmission cables */}
      {[-14, 0, 14].map((dx, i) => (
        <path key={i}
          d={`M ${barrageX + barrageW / 2 + dx} ${barrageTop - 44} Q ${barrageX + barrageW / 2 + dx + 40} ${barrageTop - 30} ${barrageX + barrageW / 2 + dx + 90} ${barrageTop - 44}`}
          fill="none" stroke={RC.amber} strokeWidth={1} strokeOpacity={0.55} strokeDasharray="3 2" />
      ))}
      <text className="rc-panel-label" x={barrageX + barrageW / 2 + 100} y={barrageTop - 44}
        dominantBaseline="middle" fontSize={8} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.amber}>
        Grid →
      </text>

      {/* Turbine label */}
      <text className="rc-panel-label" x={barrageX - 8} y={turbineY + turbineR + 14}
        textAnchor="end" fontSize={7.5} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.green}>
        Bulb turbine
      </text>

      {/* Tide difference arrow */}
      <line x1={barrageX - 46} y1={highTideY} x2={barrageX - 46} y2={lowTideY}
        stroke={RC.white35} strokeWidth={1} strokeDasharray="2 2" />
      <Arrow x1={barrageX - 46} y1={highTideY + 2} x2={barrageX - 46} y2={highTideY + 22}
        col={RC.white50} sw={1.2} />
      <Arrow x1={barrageX - 46} y1={lowTideY - 2} x2={barrageX - 46} y2={lowTideY - 22}
        col={RC.white50} sw={1.2} />
      <text className="rc-panel-label" x={barrageX - 52} y={(highTideY + lowTideY) / 2}
        textAnchor="end" dominantBaseline="middle"
        fontSize={7.5} fontFamily="Inter, system-ui, sans-serif" fill={RC.white50}>
        Tidal range
      </text>

      {/* Key facts box */}
      <rect className="rc-panel-label" x={W - PAD - 170} y={WATER_Y + 20} width={158} height={120} rx={8}
        fill={RC.white08} stroke={RC.cardBorder} strokeWidth={1} />
      <text className="rc-panel-label" x={W - PAD - 91} y={WATER_Y + 34}
        textAnchor="middle" fontSize={9} fontWeight="800"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.green}>
        KEY FACTS
      </text>
      <InfoLine x={W - PAD - 162} y={WATER_Y + 50}  label="La Rance" value="240 MW (since 1966)"  col={RC.green} />
      <InfoLine x={W - PAD - 162} y={WATER_Y + 65}  label="Sihwa Lake" value="254 MW (2011)"        col={RC.green} />
      <InfoLine x={W - PAD - 162} y={WATER_Y + 80}  label="Asset life" value="50+ years"             col={RC.green} />
      <InfoLine x={W - PAD - 162} y={WATER_Y + 95}  label="Generation" value="Ebb &amp; flood tide"      col={RC.green} />
      <InfoLine x={W - PAD - 162} y={WATER_Y + 110} label="Lagoon" value="Alt. design (lower env.)" col={RC.green} />
      <InfoLine x={W - PAD - 162} y={WATER_Y + 125} label="CO₂" value="Zero operational emissions" col={RC.green} />
    </g>
  )
}

// ── Single source of truth for every panel ────────────────────────────────────
interface PanelData {
  index: number
  name: string
  headline: string
  facts: string
  col: string
  colDim: string
  Illustration: () => JSX.Element
}

const PANELS: PanelData[] = [
  {
    index: 1,
    name: 'Tidal Stream Turbine',
    headline: 'Kinetic energy → Rotating blades → Generator',
    facts: '2–4 MW · 25–50 m depth · bi-directional flow',
    col: RC.teal,
    colDim: RC.tealDim,
    Illustration: TidalStreamTurbine,
  },
  {
    index: 2,
    name: 'Tidal Barrage',
    headline: 'Potential energy (tidal range) → Bulb turbines → Grid',
    facts: 'La Rance 240 MW · Sihwa Lake 254 MW · 50+ year asset life',
    col: RC.green,
    colDim: RC.greenDim,
    Illustration: TidalBarrage,
  },
]

// ── Main SVG ──────────────────────────────────────────────────────────────────
function TidalSVG({ title, active, setActive }: {
  title: string
  active: number | null
  setActive: (n: number | null) => void
}) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      style={{ maxWidth: W, minWidth: 320, display: 'block', margin: '0 auto' }}
      aria-label={title}
    >
      <defs>
        <linearGradient id="tidal-ocean-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(18,55,115,0.55)" />
          <stop offset="100%" stopColor="rgba(5,12,35,0.90)" />
        </linearGradient>
        <linearGradient id="tidal-sky-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(10,14,24,1.0)" />
          <stop offset="100%" stopColor="rgba(10,30,65,0.70)" />
        </linearGradient>
      </defs>

      {/* Card background */}
      <rect width={W} height={H} rx={14}
        fill={RC.cardBg} stroke={RC.cardBorder} strokeWidth={1} />

      <BlueprintFrame w={W} h={H} />

      {/* Sky */}
      <rect x={0} y={0} width={W} height={WATER_Y} fill="url(#tidal-sky-grad)" />

      {/* Ocean */}
      <rect x={0} y={WATER_Y} width={W} height={SEABED_Y - WATER_Y}
        fill="url(#tidal-ocean-grad)" />

      {/* Seabed */}
      <rect x={0} y={SEABED_Y} width={W} height={H - SEABED_Y}
        fill={RC.seabed} />
      <line x1={0} y1={SEABED_Y} x2={W} y2={SEABED_Y}
        stroke={RC.seabedTop} strokeWidth={3} />
      <text className="rc-panel-label" x={W / 2} y={SEABED_Y + 14}
        textAnchor="middle" fontSize={8} letterSpacing="0.10em"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}>
        SEABED
      </text>

      {/* Panel divider */}
      <line x1={SPLIT_X} y1={42} x2={SPLIT_X} y2={H - 48}
        stroke={RC.white12} strokeWidth={1.5} strokeDasharray="6 4" />

      {/* Water surface line */}
      <line x1={PAD} y1={WATER_Y} x2={W - PAD} y2={WATER_Y}
        stroke={RC.white20} strokeWidth={0.8} strokeDasharray="6 4" />
      <text className="rc-panel-label" x={W - PAD} y={WATER_Y - 6}
        textAnchor="end" fontSize={8} letterSpacing="0.06em"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}>
        MEAN WATER LEVEL
      </text>

      {/* Interactive panels: header + illustration + bottom badge */}
      {PANELS.map((p) => {
        const isLeft    = p.index === 1
        const headerX   = isLeft ? PAD : SPLIT_X + 8
        const headerW   = isLeft ? SPLIT_X - PAD - 8 : W - SPLIT_X - PAD - 8
        const headerMid = isLeft ? SPLIT_X / 2 : SPLIT_X + (W - SPLIT_X) / 2
        const isActive  = active === p.index
        const isDimmed  = active !== null && !isActive
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
            <g className="rc-panel-enter" style={{ '--rc-delay': `${p.index * 0.10}s` } as React.CSSProperties}>
              {/* Panel highlight backdrop, brightens while active */}
              <rect x={headerX} y={0} width={headerW} height={H}
                fill={p.col} opacity={isActive ? 0.05 : 0} />

              {/* Panel header */}
              <rect x={headerX} y={10} width={headerW} height={26} rx={6}
                fill={p.colDim} stroke={p.col} strokeWidth={1} strokeOpacity={0.55} />
              <text x={headerMid} y={23}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={10} fontWeight="800" letterSpacing="0.07em"
                fontFamily="Inter, system-ui, sans-serif" fill={p.col}>
                {p.index === 1 ? '① ' : '② '}{p.name.toUpperCase()}
              </text>

              <Illustration />

              {/* Bottom conversion-chain badge */}
              <Badge cx={isLeft ? L_MID : R_MID} cy={H - 55}
                text={p.headline} col={p.col} bgCol={p.colDim}
                w={isLeft ? 240 : 260} />
            </g>
          </g>
        )
      })}

      {/* Bottom info strip */}
      <rect x={PAD} y={H - 38} width={W - PAD * 2} height={26} rx={6}
        fill={RC.white08} stroke={RC.cardBorder} strokeWidth={1} />
      <text className="rc-panel-label" x={W / 2} y={H - 25}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={8.5} fontFamily="Inter, system-ui, sans-serif" fill={RC.white70}>
        Tidal energy is the most predictable of all renewable sources — tidal cycles can be forecast with near-perfect accuracy decades in advance.
      </text>

      {/* Source */}
      <text className="rc-panel-label" x={W / 2} y={H - 6}
        textAnchor="middle" fontSize={7}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}>
        Source: IEA Ocean Energy Technology Brief 2020; Ocean Energy Europe; EMEC Technical Review
      </text>
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
            className="rc-legend-item flex items-start gap-2.5 min-w-[220px] rounded-md px-1.5 py-1 -mx-1.5"
            style={{
              background: isActive ? rcRgba(p.col, 0.10) : 'transparent',
              border: `1px solid ${isActive ? rcRgba(p.col, 0.35) : 'transparent'}`,
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
              style={{ background: rcRgba(p.col, isActive ? 0.28 : 0.16), border: `1px solid ${p.col}`, color: p.col, fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              {String(p.index).padStart(2, '0')}
            </span>
            <span>
              <span className="block text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white70, fontFamily: 'Inter, system-ui, sans-serif' }}>
                {p.name}
              </span>
              <span className="block text-[11px]" style={{ color: p.col, fontFamily: 'Inter, system-ui, sans-serif' }}>
                {p.facts}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TidalEnergyConversionDiagram({
  title   = 'Tidal Energy Conversion Technologies',
  caption,
}: {
  title?: string
  caption?: string
}) {
  const [active, setActive] = useState<number | null>(null)

  return (
    <figure
      className="my-8 rounded-xl overflow-hidden w-full"
      style={{
        background:     RC.cardBg,
        border:         `1px solid ${RC.cardBorder}`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <DiagramStyles />

      <div className="pt-6 pb-3 text-center">
        <span style={{
          color: RC.white90,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: '0.01em',
        }}>
          {title}
        </span>
      </div>

      <div className="px-4 pb-5 w-full overflow-x-auto flex justify-center">
        <TidalSVG title={title} active={active} setActive={setActive} />
      </div>

      {/* Legend / index — carries the reading content on mobile */}
      <Legend active={active} setActive={setActive} />

      {caption && (
        <figcaption
          className="px-6 py-3 text-xs text-center"
          style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white50, fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
