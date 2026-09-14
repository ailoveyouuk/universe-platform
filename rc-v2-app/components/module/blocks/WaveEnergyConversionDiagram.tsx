// ─────────────────────────────────────────────────────────────────────────────
// WaveEnergyConversionDiagram — RC Diagram Design Language v1.2 (comparison-panel variant)
//
// Three-panel comparison of wave energy converter (WEC) device types, all set
// in a shared ocean cross-section (waterline + seabed), same shape as
// FixedFoundationTypesDiagram — the reference build for "N variants of the
// same kind of thing side by side":
//
//   1. Point Absorber       — heaving buoy + tethered linear PTO + seabed anchor
//   2. Oscillating Water Column — shoreline chamber, trapped air drives a
//                              Wells turbine above the waterline
//   3. Attenuator           — long articulated hull, flexing joints drive
//                              hydraulic PTOs between segments
//
// Ported onto the standard RC card shell: BlueprintFrame, numbered/interactive
// panels, staggered entrance, hover/tap highlight with sibling-dimming. The
// section-header + descriptor-badge SVG text (originally 7.5–10px against a
// 980-unit canvas) is the same mobile-legibility problem as the other
// comparison-panel diagrams — hidden under 767px via .rc-panel-label, with
// the HTML legend row (plain text, always full-size) carrying the device
// name + principle on small screens instead.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'

// ── RC Design Tokens ──────────────────────────────────────────────────────────
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
  white90:     'rgba(255,255,255,0.90)',
  white70:     'rgba(255,255,255,0.70)',
  white50:     'rgba(255,255,255,0.50)',
  white35:     'rgba(255,255,255,0.35)',
  white20:     'rgba(255,255,255,0.20)',
  white12:     'rgba(255,255,255,0.12)',
  white10:     'rgba(255,255,255,0.08)',
  white08:     'rgba(255,255,255,0.08)',
  cardBg:      'rgba(10,15,20,0.85)',
  cardBorder:  'rgba(255,255,255,0.08)',
  oceanSurf:   'rgba(30,80,140,0.55)',
  oceanDeep:   'rgba(8,30,65,0.85)',
  seabed:      'rgba(60,45,25,0.90)',
  seabedTop:   'rgba(90,70,40,0.80)',
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
      /* Same mobile fix as the other comparison-panel diagrams: below ~768px
         the diagram has shrunk enough that the inline SVG section-header /
         principle-badge text is no longer legible. Hide it and let the
         legend row (plain HTML, always full-size) carry the reading; the
         numbered chip gets a size bump so each panel still reads as "a
         numbered thing" on its own. */
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
        <pattern id="rcGridWE" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowWE" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.blue, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.blue, 0)} />
        </radialGradient>
        <linearGradient id="rcOceanWE" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(20,60,120,0.60)" />
          <stop offset="100%" stopColor="rgba(5,15,40,0.90)" />
        </linearGradient>
        <linearGradient id="rcSkyWE" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(10,15,25,1.0)" />
          <stop offset="100%" stopColor="rgba(12,35,70,0.70)" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridWE)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowWE)" />
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

// Horizon & seabed lines
const SEA_Y      = 155   // mean water level
const SEABED_Y   = 460   // seabed top

// Column x-centres
const COL_W    = (W - PAD * 2) / 3
const COL1_CX  = PAD + COL_W * 0.5
const COL2_CX  = PAD + COL_W * 1.5
const COL3_CX  = PAD + COL_W * 2.5

// Wave path helper — sinusoidal
function wavePath(startX: number, endX: number, y: number, amp: number, freq: number, phase: number): string {
  const pts: string[] = []
  const steps = 120
  for (let i = 0; i <= steps; i++) {
    const x = startX + (endX - startX) * (i / steps)
    const wy = y + amp * Math.sin((x / freq) * Math.PI * 2 + phase)
    pts.push(i === 0 ? `M ${x.toFixed(1)} ${wy.toFixed(1)}` : `L ${x.toFixed(1)} ${wy.toFixed(1)}`)
  }
  return pts.join(' ')
}

// Arrow helper
function Arrow({ x1, y1, x2, y2, col, dashed, sw = 1.5 }: {
  x1: number; y1: number; x2: number; y2: number
  col: string; dashed?: boolean; sw?: number
}) {
  const angle   = Math.atan2(y2 - y1, x2 - x1)
  const headLen = 7
  const ax  = x2 - headLen * Math.cos(angle - 0.38)
  const ay  = y2 - headLen * Math.sin(angle - 0.38)
  const bx  = x2 - headLen * Math.cos(angle + 0.38)
  const by  = y2 - headLen * Math.sin(angle + 0.38)
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={col} strokeWidth={sw} strokeOpacity={0.70}
        strokeDasharray={dashed ? '5 3' : undefined} />
      <polygon points={`${x2},${y2} ${ax},${ay} ${bx},${by}`}
        fill={col} fillOpacity={0.70} />
    </g>
  )
}

// ── Point Absorber (Column 1) ─────────────────────────────────────────────────
function PointAbsorber({ cx, seaY, bedY }: { cx: number; seaY: number; bedY: number }) {
  const buoyR   = 20
  const buoyY   = seaY - 4      // sits at waterline
  const ptoBoxW = 24
  const ptoBoxH = 30
  const ptoY    = seaY + 50     // PTO box below surface
  const anchorY = bedY - 12     // seabed anchor

  return (
    <g>
      {/* Tether — buoy to PTO box */}
      <line x1={cx} y1={buoyY + buoyR} x2={cx} y2={ptoY - ptoBoxH / 2}
        stroke={RC.white35} strokeWidth={1.5} strokeDasharray="3 2" />
      {/* Tether — PTO to anchor */}
      <line x1={cx} y1={ptoY + ptoBoxH / 2} x2={cx} y2={anchorY}
        stroke={RC.white35} strokeWidth={1.5} />
      {/* Anchor block */}
      <rect x={cx - 14} y={anchorY} width={28} height={12} rx={3}
        fill={RC.amberDim} stroke={RC.amber} strokeWidth={1.2} />
      <text x={cx} y={anchorY + 6}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={7} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.amber}>
        ANCHOR
      </text>
      {/* PTO box */}
      <rect x={cx - ptoBoxW / 2} y={ptoY - ptoBoxH / 2} width={ptoBoxW} height={ptoBoxH} rx={4}
        fill={RC.greenDim} stroke={RC.green} strokeWidth={1.4} />
      <text x={cx} y={ptoY - 5}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={6.5} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.green}>
        PTO
      </text>
      <text x={cx} y={ptoY + 7}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={6} fontFamily="Inter, system-ui, sans-serif" fill={RC.white50}>
        Linear
      </text>
      {/* Buoy body */}
      <ellipse cx={cx} cy={buoyY} rx={buoyR} ry={buoyR * 0.60}
        fill={RC.green} fillOpacity={0.85} stroke={RC.green} strokeWidth={1.5} />
      {/* Buoy dome highlight */}
      <ellipse cx={cx - 5} cy={buoyY - 5} rx={8} ry={5}
        fill="rgba(255,255,255,0.15)" />
      {/* Buoy label */}
      <text x={cx + buoyR + 6} y={buoyY}
        dominantBaseline="middle"
        fontSize={8} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.green}>
        BUOY
      </text>
      {/* Motion arrows — heave */}
      <Arrow x1={cx - buoyR - 20} y1={buoyY - 14} x2={cx - buoyR - 20} y2={buoyY - 28} col={RC.green} sw={1.8} />
      <Arrow x1={cx - buoyR - 20} y1={buoyY + 14} x2={cx - buoyR - 20} y2={buoyY + 28} col={RC.green} sw={1.8} />
      {/* Grid cable to shore (right) */}
      <Arrow x1={ptoY - ptoBoxH / 2 + 8} y1={ptoY + 6} x2={cx + ptoBoxW / 2 + 40} y2={ptoY + 6}
        col={RC.amber} dashed />
    </g>
  )
}

// ── Oscillating Water Column (Column 2) ───────────────────────────────────────
function OWC({ cx, seaY, bedY }: { cx: number; seaY: number; bedY: number }) {
  const chamberW = 70
  const chamberH = 110
  const chamberX = cx - chamberW / 2
  const chamberTop = seaY - chamberH      // top of chamber wall (above waterline)
  const openingY   = seaY + 30            // sea opening bottom
  const turbineY   = chamberTop + 16      // Wells turbine
  const turbineR   = 16

  return (
    <g>
      {/* Foundation into seabed */}
      <rect x={chamberX + 8} y={bedY - 18} width={chamberW - 16} height={18} rx={2}
        fill={RC.amberDim} stroke={RC.amber} strokeWidth={1} strokeOpacity={0.50} />

      {/* Chamber walls */}
      {/* Left wall */}
      <rect x={chamberX} y={chamberTop} width={10} height={chamberH + 30} rx={3}
        fill={RC.blueDim} stroke={RC.blue} strokeWidth={1.4} />
      {/* Right wall */}
      <rect x={chamberX + chamberW - 10} y={chamberTop} width={10} height={chamberH + 30} rx={3}
        fill={RC.blueDim} stroke={RC.blue} strokeWidth={1.4} />
      {/* Top cap with turbine hole */}
      <rect x={chamberX} y={chamberTop} width={chamberW} height={12} rx={3}
        fill={RC.blueDim} stroke={RC.blue} strokeWidth={1.4} />
      {/* Water column inside chamber */}
      <rect x={chamberX + 10} y={seaY - 20} width={chamberW - 20} height={50} rx={2}
        fill="rgba(30,100,180,0.25)" />
      {/* Water level marker inside */}
      <line x1={chamberX + 10} y1={seaY - 20} x2={chamberX + chamberW - 10} y2={seaY - 20}
        stroke={RC.blue} strokeWidth={1} strokeDasharray="3 2" strokeOpacity={0.60} />

      {/* Air compression arrows */}
      <Arrow x1={cx} y1={seaY - 32} x2={cx} y2={chamberTop + 28}
        col={RC.white50} dashed sw={1.2} />

      {/* Wells Turbine */}
      <circle cx={cx} cy={turbineY} r={turbineR}
        fill={RC.blueDim} stroke={RC.blue} strokeWidth={1.8} />
      {/* Turbine blades */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180
        const bx  = cx + Math.cos(rad) * (turbineR - 4)
        const by  = turbineY + Math.sin(rad) * (turbineR - 4)
        return (
          <line key={i} x1={cx} y1={turbineY} x2={bx} y2={by}
            stroke={RC.blue} strokeWidth={2.5} strokeLinecap="round" />
        )
      })}
      <circle cx={cx} cy={turbineY} r={4}
        fill={RC.blue} fillOpacity={0.80} />

      {/* Generator box above turbine */}
      <rect x={cx - 20} y={chamberTop - 30} width={40} height={22} rx={4}
        fill={RC.greenDim} stroke={RC.green} strokeWidth={1.2} />
      <text x={cx} y={chamberTop - 19}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={7.5} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.green}>
        GENERATOR
      </text>
      <Arrow x1={cx} y1={chamberTop + 2} x2={cx} y2={chamberTop - 8}
        col={RC.green} sw={1.5} />

      {/* Labels */}
      <text x={chamberX - 6} y={seaY - 60}
        textAnchor="end" fontSize={8}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white50}>
        Air column
      </text>
      <text x={cx} y={openingY + 14}
        textAnchor="middle" fontSize={7.5}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white50}>
        Open to sea
      </text>

      {/* Air flow label */}
      <text x={cx + turbineR + 6} y={turbineY}
        dominantBaseline="middle" fontSize={7.5} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.blue}>
        Wells turbine
      </text>
    </g>
  )
}

// ── Attenuator (Column 3) ─────────────────────────────────────────────────────
function Attenuator({ cx, seaY, bedY }: { cx: number; seaY: number; bedY: number }) {
  const segW   = 50
  const segH   = 22
  const segGap = 8
  const numSegs = 3
  const totalW = numSegs * segW + (numSegs - 1) * segGap
  const startX = cx - totalW / 2

  const segments = Array.from({ length: numSegs }, (_, i) => ({
    x: startX + i * (segW + segGap),
    y: seaY - segH / 2 - 4 + (i % 2 === 0 ? -6 : 6),   // alternating vertical position to show flexing
  }))

  const junctions = segments.slice(1).map((seg, i) => ({
    x: segments[i].x + segW,
    y: (segments[i].y + seg.y) / 2,
  }))

  // Mooring line to seabed
  const anchorX = cx
  const anchorY = bedY - 12

  return (
    <g>
      {/* Mooring tether */}
      <line x1={anchorX} y1={segments[1].y + segH / 2} x2={anchorX} y2={anchorY}
        stroke={RC.white35} strokeWidth={1.5} strokeDasharray="4 3" />
      {/* Seabed anchor */}
      <rect x={anchorX - 14} y={anchorY} width={28} height={12} rx={3}
        fill={RC.amberDim} stroke={RC.amber} strokeWidth={1.2} />
      <text x={anchorX} y={anchorY + 6}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={7} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.amber}>
        ANCHOR
      </text>

      {/* Segments */}
      {segments.map((seg, i) => (
        <g key={i}>
          <rect x={seg.x} y={seg.y} width={segW} height={segH} rx={5}
            fill={RC.tealDim} stroke={RC.teal} strokeWidth={1.8} />
          <text x={seg.x + segW / 2} y={seg.y + segH / 2}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={7.5} fontWeight="700"
            fontFamily="Inter, system-ui, sans-serif" fill={RC.teal}>
            SEG {i + 1}
          </text>
        </g>
      ))}

      {/* PTO joints at segment junctions */}
      {junctions.map((jt, i) => (
        <g key={i}>
          {/* Connecting line between segments */}
          <line x1={segments[i].x + segW} y1={segments[i].y + segH / 2}
            x2={segments[i + 1].x} y2={segments[i + 1].y + segH / 2}
            stroke={RC.teal} strokeWidth={1.5} strokeOpacity={0.50} />
          {/* PTO joint circle */}
          <circle cx={jt.x} cy={jt.y} r={9}
            fill={RC.greenDim} stroke={RC.green} strokeWidth={1.5} />
          <text x={jt.x} y={jt.y}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={5.5} fontWeight="800"
            fontFamily="Inter, system-ui, sans-serif" fill={RC.green}>
            PTO
          </text>
        </g>
      ))}

      {/* Direction arrow — wave direction */}
      <Arrow x1={startX - 28} y1={seaY - 18} x2={startX - 8} y2={seaY - 18}
        col={RC.teal} sw={1.8} />
      <text x={startX - 36} y={seaY - 18}
        textAnchor="end" dominantBaseline="middle"
        fontSize={7} fontFamily="Inter, system-ui, sans-serif" fill={RC.teal}>
        Wave
      </text>

      {/* Grid cable */}
      <Arrow x1={segments[numSegs - 1].x + segW + 6} y1={seaY + 10}
        x2={segments[numSegs - 1].x + segW + 50} y2={seaY + 10}
        col={RC.amber} dashed />
      <text x={segments[numSegs - 1].x + segW + 28} y={seaY + 24}
        textAnchor="middle" fontSize={7}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.amber}>
        Grid
      </text>
    </g>
  )
}

// ── Single source of truth for every panel ────────────────────────────────────
interface PanelData {
  index: number
  name: string
  principle: string
  desc: string
  color: string
  dim: string
  mid: string
  Illustration: ({ cx, seaY, bedY }: { cx: number; seaY: number; bedY: number }) => JSX.Element
}

const PANELS: PanelData[] = [
  {
    index: 1, name: 'Point Absorber', principle: 'Heave motion → PTO → Grid',
    desc: 'Floating buoy, small footprint, drives a linear/hydraulic PTO',
    color: RC.green, dim: RC.greenDim, mid: RC.greenMid, Illustration: PointAbsorber,
  },
  {
    index: 2, name: 'Oscillating Water Column', principle: 'Air compression → Wells turbine',
    desc: 'Shoreline/breakwater chamber, trapped air spins a Wells turbine',
    color: RC.blue, dim: RC.blueDim, mid: RC.blueMid, Illustration: OWC,
  },
  {
    index: 3, name: 'Attenuator', principle: 'Segment flexing → Hydraulic PTO',
    desc: 'Long articulated hull aligned with waves, flexing drives hydraulic PTOs',
    color: RC.teal, dim: RC.tealDim, mid: RC.tealMid, Illustration: Attenuator,
  },
]

// ── Main SVG ────────────────────────────────────────────────────────────────
function WaveSVG({ title, active, setActive }: { title: string; active: number | null; setActive: (n: number | null) => void }) {
  const waveAmp  = 18
  const waveFreq = 145
  const wave1 = wavePath(0, W, SEA_Y, waveAmp, waveFreq, 0)
  const wave2 = wavePath(0, W, SEA_Y, waveAmp * 0.6, waveFreq * 1.4, 1.2)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: W, display: 'block', margin: '0 auto' }}
      aria-label={title}
    >
      <BlueprintFrame w={W} h={H} />

      {/* Ocean background — below waterline */}
      <clipPath id="rcOceanClipWE">
        <rect x={0} y={SEA_Y} width={W} height={H - SEA_Y} />
      </clipPath>
      <rect x={0} y={SEA_Y} width={W} height={H - SEA_Y}
        fill={RC.oceanDeep} clipPath="url(#rcOceanClipWE)" />
      <rect x={0} y={SEA_Y} width={W} height={H - SEA_Y}
        fill="url(#rcOceanWE)" />

      {/* Sky gradient above waterline */}
      <rect x={0} y={0} width={W} height={SEA_Y}
        fill="url(#rcSkyWE)" />

      {/* Seabed */}
      <rect x={0} y={SEABED_Y} width={W} height={H - SEABED_Y}
        fill={RC.seabed} />
      <line x1={0} y1={SEABED_Y} x2={W} y2={SEABED_Y}
        stroke={RC.seabedTop} strokeWidth={3} />
      <text x={W / 2} y={SEABED_Y + 14}
        textAnchor="middle" fontSize={8} letterSpacing="0.10em"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}>
        SEABED
      </text>

      {/* Wave paths */}
      <path d={wave1} fill="none" stroke={RC.blue} strokeWidth={2.5} strokeOpacity={0.60} />
      <path d={wave2} fill="none" stroke="rgba(74,158,191,0.25)" strokeWidth={1.5} />

      {/* Water surface label */}
      <text x={W - PAD} y={SEA_Y - 8}
        textAnchor="end" fontSize={8} letterSpacing="0.08em"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}>
        MEAN WATER LEVEL
      </text>
      <line x1={PAD} y1={SEA_Y} x2={W - PAD} y2={SEA_Y}
        stroke={RC.white20} strokeWidth={0.8} strokeDasharray="6 4" />

      {/* Column dividers */}
      <line x1={PAD + COL_W} y1={30} x2={PAD + COL_W} y2={H - 30}
        stroke={RC.white08} strokeWidth={1} />
      <line x1={PAD + COL_W * 2} y1={30} x2={PAD + COL_W * 2} y2={H - 30}
        stroke={RC.white08} strokeWidth={1} />

      {/* ── Panels, one interactive group per device type ── */}
      {PANELS.map((p) => {
        const cx = [COL1_CX, COL2_CX, COL3_CX][p.index - 1]
        const isActive = active === p.index
        const isDimmed = active !== null && !isActive
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
              {/* Column highlight backdrop, brightens while active */}
              <rect x={cx - COL_W / 2 + 4} y={20} width={COL_W - 8} height={H - 40}
                fill={p.color} opacity={isActive ? 0.06 : 0} />

              {/* Section header */}
              <g className="rc-panel-label">
                <rect x={cx - (COL_W - 20) / 2} y={10} width={COL_W - 20} height={24} rx={6}
                  fill={p.dim} stroke={p.color} strokeWidth={1} strokeOpacity={0.55} />
                <text x={cx} y={22}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={10} fontWeight="800" letterSpacing="0.06em"
                  fontFamily="Inter, system-ui, sans-serif" fill={p.color}>
                  {String(p.index).padStart(2, '0')} · {p.name.toUpperCase()}
                </text>
              </g>

              {/* Numbered chip — always visible, scales up on mobile */}
              <g className="rc-panel-chipgroup">
                <circle cx={cx - (COL_W - 20) / 2 + 12} cy={22} r={9}
                  fill={rcRgba(p.color, isActive ? 0.30 : 0.18)} stroke={p.color} strokeWidth={1.2} />
                <text x={cx - (COL_W - 20) / 2 + 12} y={22.5}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={8} fontWeight="700"
                  fontFamily="Inter, system-ui, sans-serif" fill={p.color}>
                  {p.index}
                </text>
              </g>

              {/* Device schematic */}
              <Illustration cx={cx} seaY={SEA_Y} bedY={SEABED_Y} />

              {/* Principle badge */}
              <g className="rc-panel-label">
                {(() => {
                  const pw = p.principle.length * 5.6 + 16
                  const y  = H - 70
                  return (
                    <>
                      <rect x={cx - pw / 2} y={y - 10} width={pw} height={20} rx={5}
                        fill={p.dim} stroke={p.color} strokeWidth={1} strokeOpacity={0.70} />
                      <text x={cx} y={y + 1}
                        textAnchor="middle" dominantBaseline="middle"
                        fontSize={9} fontWeight="700" letterSpacing="0.05em"
                        fontFamily="Inter, system-ui, sans-serif" fill={p.color}>
                        {p.principle}
                      </text>
                    </>
                  )
                })()}
              </g>
            </g>
          </g>
        )
      })}

      {/* ── Key fact strip ────────────────────────────────────────────────── */}
      <rect x={PAD} y={H - 48} width={W - PAD * 2} height={32} rx={6}
        fill={RC.white08} stroke={RC.cardBorder} strokeWidth={1} />
      <text x={W / 2} y={H - 36}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={8.5} fontFamily="Inter, system-ui, sans-serif" fill={RC.white70}>
        All three technologies convert the kinetic &amp; potential energy of ocean surface waves into electricity via a Power Take-Off (PTO) system.
      </text>
      <text x={W / 2} y={H - 22}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={8} fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}>
        No single design has dominated — device choice depends on wave climate, water depth, and site conditions.
      </text>

      {/* Source note */}
      <text x={W / 2} y={H - 6}
        textAnchor="middle" fontSize={7}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}>
        Source: IEA Ocean Energy Technology Brief 2020; Ocean Energy Europe; EMEC Device Overview
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
              background: isActive ? rcRgba(p.color, 0.10) : 'transparent',
              border: `1px solid ${isActive ? rcRgba(p.color, 0.35) : 'transparent'}`,
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
              style={{ background: rcRgba(p.color, isActive ? 0.28 : 0.16), border: `1px solid ${p.color}`, color: p.color, fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              {String(p.index).padStart(2, '0')}
            </span>
            <span>
              <span className="block text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white70, fontFamily: 'Inter, system-ui, sans-serif' }}>
                {p.name}
              </span>
              <span className="block text-[11px] mt-0.5" style={{ color: p.color, fontFamily: 'Inter, system-ui, sans-serif' }}>
                {p.principle}
              </span>
              <span className="block text-[11px] mt-0.5" style={{ color: RC.white50, fontFamily: 'Inter, system-ui, sans-serif' }}>
                {p.desc}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function WaveEnergyConversionDiagram({
  title   = 'Wave Energy Conversion Technologies',
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
            Three ways to convert ocean waves into electricity — tap a device below to highlight it
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.blueDim, color: RC.blue, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · 01–03
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <WaveSVG title={title} active={active} setActive={setActive} />
      </div>

      {/* Legend / index */}
      <Legend active={active} setActive={setActive} />

      {/* Caption */}
      {caption && (
        <figcaption
          className="px-6 py-3 text-xs"
          style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white50 }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
