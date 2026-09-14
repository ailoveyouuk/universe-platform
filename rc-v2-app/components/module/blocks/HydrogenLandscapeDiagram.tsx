// ─────────────────────────────────────────────────────────────────────────────
// HydrogenLandscapeDiagram — RC Diagram Design Language v1.2
//
// The Hydrogen Economy Landscape
// Shows the full value chain from production → storage/distribution → end uses
//
// THREE ZONES (left-to-right), plus a central H₂ hub node:
//
// ZONE 1 — PRODUCTION (left, 5 boxes, ids 1–5)
//   • Green: Renewable electricity → Electrolyser → Green H₂
//   • Blue:  Natural gas + ATR/SMR + CCS → Blue H₂
//   • Teal:  Methane pyrolysis → Turquoise H₂
//   • Grey:  Industrial by-product H₂ (refineries, chemicals)
//   • Amber: Imported H₂ (ammonia)
//
// ZONE 2 — STORAGE & DISTRIBUTION (centre, 5 boxes, ids 6–10)
//   • Compressed gas (350–700 bar)
//   • Liquid H₂ (–253°C cryogenic)
//   • Ammonia / LOHCs (chemical carriers for shipping)
//   • Pipeline blending (up to 20% H₂ in gas grid)
//
// ZONE 3 — END USES (right, 4 sector groups, ids 11–14)
//   • POWER — Re-electrification (fuel cells), backup power
//   • TRANSPORT — Heavy trucks, buses, trains, ships, aviation
//   • INDUSTRY — Steel, chemicals, fertilisers, refining, process heat
//   • BUILDINGS — Heating, hot water (via blended gas grid or fuel cells)
//
// This is a many-to-one-to-many mapping (like BiomassConversionPathwaysDiagram)
// but with a literal H₂ hub node sitting in the middle of zone 2: every
// production source flows into the hub, and every storage/distribution
// pathway flows out of it toward the end-use sectors. All 14 boxes are
// numbered sequentially 1–14 so a single `active` id can be looked up
// against any edge (production→hub, hub→storage, or storage→sector) that
// touches it. Highlighting a production source brightens its arrow into
// the hub; highlighting a storage pathway brightens its arrow from the hub
// and its arrows out to every sector; highlighting a sector brightens the
// arrows feeding it. The hub itself is a static (non-interactive) anchor.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'
// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:       brand.green,
  greenDim:    rcRgba(brand.green, 0.12),
  greenMid:    rcRgba(brand.green, 0.38),
  blue:        brand.blue,
  blueDim:     rcRgba(brand.blue, 0.12),
  blueMid:     rcRgba(brand.blue, 0.38),
  teal:        brand.cyan,
  tealDim:     rcRgba(brand.cyan, 0.12),
  tealMid:     rcRgba(brand.cyan, 0.38),
  orange:      brand.orange,
  orangeDim:   rcRgba(brand.orange, 0.12),
  orangeMid:   rcRgba(brand.orange, 0.38),
  amber:       brand.amber,
  amberDim:    rcRgba(brand.amber, 0.12),
  amberMid:    rcRgba(brand.amber, 0.38),
  grey:        '#78909C',
  greyDim:     'rgba(120,144,156,0.12)',
  greyMid:     'rgba(120,144,156,0.38)',
  white90:     'rgba(255,255,255,0.90)',
  white70:     'rgba(255,255,255,0.70)',
  white65:     'rgba(255,255,255,0.65)',
  white50:     'rgba(255,255,255,0.50)',
  white35:     'rgba(255,255,255,0.35)',
  white30:     'rgba(255,255,255,0.30)',
  white20:     'rgba(255,255,255,0.20)',
  white18:     'rgba(255,255,255,0.18)',
  white12:     'rgba(255,255,255,0.12)',
  white10:     'rgba(255,255,255,0.10)',
  white08:     'rgba(255,255,255,0.08)',
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
      .rc-legend-item { cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease; }
      .rc-legend-item:focus-visible, .rc-panel-hit:focus-visible {
        outline: 2px solid ${RC.green}; outline-offset: 2px;
      }
      /* Same mobile fix as the other RC Diagram v1.2 variants: below ~768px
         inline SVG label/sub text is no longer legible. Hide it and let the
         grouped legend (plain HTML, always full size) carry the reading;
         the numbered badge gets a size bump so each box still reads as
         "a numbered thing" on its own. */
      @media (max-width: 767px) {
        .rc-panel-label { display: none; }
        .rc-panel-chipgroup { transform-box: fill-box; transform-origin: center; transform: scale(1.35); }
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
        <pattern id="rcGridHL" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowHL" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.07)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridHL)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowHL)" />
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

const W   = 980
const H   = 590
const PAD = 16

// ── Zone geometry ─────────────────────────────────────────────────────────────
const ZONE_Y   = 52          // top of zone content
const ZONE_H   = 490         // zone height
const ZONE1_X  = PAD
const ZONE1_W  = 232
const ZONE2_X  = ZONE1_X + ZONE1_W + 18
const ZONE2_W  = 196
const ZONE3_X  = ZONE2_X + ZONE2_W + 18
const ZONE3_W  = W - ZONE3_X - PAD

// ── H₂ Hub node (static anchor, not an interactive/numbered box) ─────────────
const HUB_CX = ZONE2_X + ZONE2_W / 2
const HUB_CY = ZONE_Y + ZONE_H / 2 - 10
const HUB_R  = 32

// ── Utility ───────────────────────────────────────────────────────────────────
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (test.length > maxChars && current.length > 0) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

// ── Arrow helper — brightens when either connected id is active ─────────────
function Arrow({ x1, y1, x2, y2, col, dashed, active }: {
  x1: number; y1: number; x2: number; y2: number
  col: string; dashed?: boolean; active: boolean
}) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = 8
  const ax  = x2 - headLen * Math.cos(angle - 0.4)
  const ay  = y2 - headLen * Math.sin(angle - 0.4)
  const bx  = x2 - headLen * Math.cos(angle + 0.4)
  const by  = y2 - headLen * Math.sin(angle + 0.4)
  const color   = active ? RC.white90 : col
  const opacity = active ? 0.9 : 0.55
  return (
    <g style={{ transition: 'opacity 0.18s ease' }}>
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeWidth={active ? 2.4 : 1.8} strokeOpacity={opacity}
        strokeDasharray={dashed ? '5 4' : undefined} />
      <polygon points={`${x2},${y2} ${ax},${ay} ${bx},${by}`}
        fill={color} fillOpacity={opacity} />
    </g>
  )
}

// ── Numbered badge, overlapping the top-right corner of a box ────────────────
function IndexBadge({ x, y, w, id, color, active }: {
  x: number; y: number; w: number; id: number; color: string; active: boolean
}) {
  const cx = x + w - 14
  const cy = y + 12
  return (
    <g className="rc-panel-chipgroup">
      <circle cx={cx} cy={cy} r={9}
        fill={rcRgba(color, active ? 0.32 : 0.16)}
        stroke={color} strokeWidth={1.2} />
      <text x={cx} y={cy + 3.2}
        textAnchor="middle" fontSize={8} fontWeight="700"
        fontFamily="Montserrat, sans-serif" fill={color}>
        {id}
      </text>
    </g>
  )
}

// ── Interactive box wrapper — hover/focus/click sets `active`, siblings
//    dim to 0.32; each box's own entrance is staggered by delayIndex. ───────
function InteractiveBox({
  id, active, setActive, delayIndex, children,
}: {
  id: number; active: number | null; setActive: (n: number | null) => void
  delayIndex: number; children: React.ReactNode
}) {
  const isActive = active === id
  const isDimmed = active !== null && !isActive
  return (
    <g
      className="rc-panel-hit"
      style={{ opacity: isDimmed ? 0.32 : 1 }}
      tabIndex={0}
      role="button"
      aria-label={`Highlight item ${id}`}
      onMouseEnter={() => setActive(id)}
      onMouseLeave={() => setActive(null)}
      onFocus={() => setActive(id)}
      onBlur={() => setActive(null)}
      onClick={() => setActive(active === id ? null : id)}
    >
      <g className="rc-panel-enter" style={{ '--rc-delay': `${delayIndex * 0.035}s` } as React.CSSProperties}>
        {children}
      </g>
    </g>
  )
}

// ── Production source card ────────────────────────────────────────────────────
function SourceCard({ x, y, w, h, label, sublabel, col, dim, mid }: {
  x: number; y: number; w: number; h: number
  label: string; sublabel: string
  col: string; dim: string; mid: string
}) {
  const lines = wrapText(sublabel, 26)
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6}
        fill={dim} stroke={mid} strokeWidth={1} />
      <text className="rc-panel-label" x={x + 10} y={y + 14}
        fontSize={9} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={col} fillOpacity={0.90}>
        {label}
      </text>
      {lines.map((ln, li) => (
        <text key={li} className="rc-panel-label" x={x + 10} y={y + 27 + li * 11}
          fontSize={7.5} fontFamily="Inter, system-ui, sans-serif"
          fill={RC.white70}>
          {ln}
        </text>
      ))}
    </g>
  )
}

// ── Storage card ──────────────────────────────────────────────────────────────
function StorageCard({ x, y, w, h, label, detail, col, dim, mid }: {
  x: number; y: number; w: number; h: number
  label: string; detail: string
  col: string; dim: string; mid: string
}) {
  const lines = wrapText(detail, 22)
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6}
        fill={dim} stroke={mid} strokeWidth={1} />
      <text className="rc-panel-label" x={x + w / 2} y={y + 14}
        textAnchor="middle" fontSize={9} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={col} fillOpacity={0.90}>
        {label}
      </text>
      {lines.map((ln, li) => (
        <text key={li} className="rc-panel-label" x={x + w / 2} y={y + 27 + li * 10}
          textAnchor="middle" fontSize={7} fontFamily="Inter, system-ui, sans-serif"
          fill={RC.white70}>
          {ln}
        </text>
      ))}
    </g>
  )
}

// ── End-use sector ────────────────────────────────────────────────────────────
function SectorGroup({ x, y, w, h, label, icon, col, dim, mid, items }: {
  x: number; y: number; w: number; h: number
  label: string; icon: string
  col: string; dim: string; mid: string
  items: string[]
}) {
  return (
    <g>
      {/* Sector panel */}
      <rect x={x} y={y} width={w} height={h} rx={8}
        fill={dim} stroke={mid} strokeWidth={1.3} />
      {/* Header bar */}
      <rect x={x} y={y} width={w} height={26} rx={8}
        fill={mid} />
      <rect x={x} y={y + 18} width={w} height={8} fill={mid} />
      {/* Icon + label */}
      <text x={x + 12} y={y + 16}
        dominantBaseline="middle" fontSize={13}
        fontFamily="Inter, system-ui, sans-serif">
        {icon}
      </text>
      <text className="rc-panel-label" x={x + 32} y={y + 16}
        dominantBaseline="middle" fontSize={10} fontWeight="800" letterSpacing="0.06em"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white90}>
        {label}
      </text>
      {/* Items */}
      {items.map((item, ii) => (
        <g key={ii}>
          <circle cx={x + 12} cy={y + 38 + ii * 18} r={3}
            fill={col} fillOpacity={0.60} />
          <text className="rc-panel-label" x={x + 22} y={y + 38 + ii * 18}
            dominantBaseline="middle" fontSize={8.5}
            fontFamily="Inter, system-ui, sans-serif" fill={RC.white70}>
            {item}
          </text>
        </g>
      ))}
    </g>
  )
}

// ── Single source of truth for every box, numbered 1–14 across all
//    three zones so one `active` id can be matched against any edge. ────────
// Zone 1 — production sources: ids 1–5
const sourcesData = [
  {
    id: 1,
    label:    'Green H₂ — Electrolysis',
    sublabel: 'Renewable electricity → PEM or alkaline electrolyser → H₂ + O₂',
    col: RC.green, dim: RC.greenDim, mid: RC.greenMid, y: ZONE_Y + 14,
  },
  {
    id: 2,
    label:    'Blue H₂ — Gas + CCS',
    sublabel: 'Natural gas SMR/ATR + carbon capture (85–95% CO₂ removed)',
    col: RC.blue, dim: RC.blueDim, mid: RC.blueMid, y: ZONE_Y + 122,
  },
  {
    id: 3,
    label:    'Turquoise H₂ — Pyrolysis',
    sublabel: 'Methane pyrolysis → H₂ + solid carbon (no CO₂ emitted)',
    col: RC.teal, dim: RC.tealDim, mid: RC.tealMid, y: ZONE_Y + 228,
  },
  {
    id: 4,
    label:    'Grey H₂ — By-product',
    sublabel: 'Refinery & chemical plant by-product; coal gasification',
    col: RC.grey, dim: RC.greyDim, mid: RC.greyMid, y: ZONE_Y + 334,
  },
  {
    id: 5,
    label:    'Imported H₂ (Ammonia)',
    sublabel: 'Green/blue H₂ converted to NH₃ for shipping; cracked at destination',
    col: RC.amber, dim: RC.amberDim, mid: RC.amberMid, y: ZONE_Y + 426,
  },
]

// Zone 2 — storage/distribution pathways: ids 6–10
const storageData = [
  {
    id: 6,
    label: 'Compressed Gas',
    detail: '350–700 bar. Most common today. Used in FCEVs and industrial supply.',
    col: RC.blue, dim: RC.blueDim, mid: RC.blueMid, y: ZONE_Y + 14,
  },
  {
    id: 7,
    label: 'Liquid H₂',
    detail: '−253°C cryogenic. High energy density. Costly to liquefy.',
    col: RC.teal, dim: RC.tealDim, mid: RC.tealMid, y: ZONE_Y + 118,
  },
  {
    id: 8,
    label: 'Ammonia (NH₃)',
    detail: 'Chemical carrier. Uses existing shipping infrastructure. Reconverted at destination.',
    col: RC.amber, dim: RC.amberDim, mid: RC.amberMid, y: ZONE_Y + 222,
  },
  {
    id: 9,
    label: 'LOHCs',
    detail: 'Liquid organic hydrogen carriers. Safe liquid at ambient conditions. Emerging.',
    col: RC.orange, dim: RC.orangeDim, mid: RC.orangeMid, y: ZONE_Y + 322,
  },
  {
    id: 10,
    label: 'Pipeline Blending',
    detail: 'Up to 20% H₂ blended into natural gas grid. Leverages existing infrastructure.',
    col: RC.green, dim: RC.greenDim, mid: RC.greenMid, y: ZONE_Y + 422,
  },
]

// Zone 3 — end-use sectors: ids 11–14
const sectorH = 108
const sectorsData = [
  {
    id: 11, label: 'POWER',     icon: '⚡',
    col: RC.green,  dim: RC.greenDim,  mid: RC.greenMid,
    y: ZONE_Y + 8,
    items: ['Re-electrification (fuel cells)', 'Backup & peak power generation', 'Long-duration energy storage'],
  },
  {
    id: 12, label: 'TRANSPORT', icon: '🚛',
    col: RC.blue,   dim: RC.blueDim,   mid: RC.blueMid,
    y: ZONE_Y + 8 + sectorH + 12,
    items: ['Heavy-duty trucks & buses', 'Hydrogen trains (rail)', 'Shipping & maritime', 'Aviation (SAF / NH₃)'],
  },
  {
    id: 13, label: 'INDUSTRY',  icon: '🏭',
    col: RC.orange, dim: RC.orangeDim, mid: RC.orangeMid,
    y: ZONE_Y + 8 + (sectorH + 12) * 2,
    items: ['Green steel (H₂-DRI)', 'Chemicals & fertilisers', 'High-temp process heat', 'Oil refining (decarbonised)'],
  },
  {
    id: 14, label: 'BUILDINGS', icon: '🏠',
    col: RC.amber,  dim: RC.amberDim,  mid: RC.amberMid,
    y: ZONE_Y + 8 + (sectorH + 12) * 3,
    items: ['Heating via blended gas grid', 'Fuel cell CHP systems', 'Hot water generation'],
  },
]

const TOTAL_ITEMS = sourcesData.length + storageData.length + sectorsData.length // 14

// ── Full diagram SVG ──────────────────────────────────────────────────────────
function HydrogenLandscapeSVG({ title, active, setActive }: {
  title: string; active: number | null; setActive: (n: number | null) => void
}) {
  const srcCardW = ZONE1_W - 16
  const stCardW  = ZONE2_W - 8
  const secW     = ZONE3_W - 8

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      style={{ maxWidth: W, minWidth: 360, display: 'block', margin: '0 auto' }}
      aria-label={title}
    >
      {/* Card background */}
      <rect width={W} height={H} rx={14}
        fill={RC.cardBg} stroke={RC.cardBorder} strokeWidth={1} />

      <BlueprintFrame w={W} h={H} />

      {/* Header band */}
      <rect x={PAD} y={10} width={W - PAD * 2} height={28} rx={7}
        fill={RC.white08} stroke={RC.cardBorder} strokeWidth={1} />
      <text x={W / 2} y={24}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={10} fontWeight="700" letterSpacing="0.09em"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}>
        FROM PRODUCTION THROUGH STORAGE AND DISTRIBUTION TO END-USE APPLICATIONS
      </text>

      {/* ── Zone banners ──────────────────────────────────────────── */}
      {[
        { x: ZONE1_X, w: ZONE1_W, label: '① PRODUCTION',      col: RC.green  },
        { x: ZONE2_X, w: ZONE2_W, label: '② STORAGE & DISTRIBUTION', col: RC.teal   },
        { x: ZONE3_X, w: ZONE3_W, label: '③ END USES',         col: RC.blue   },
      ].map((z, i) => (
        <g key={i}>
          <rect x={z.x} y={ZONE_Y} width={z.w} height={18} rx={5}
            fill={z.col} fillOpacity={0.18} />
          <text x={z.x + z.w / 2} y={ZONE_Y + 9}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={9} fontWeight="800" letterSpacing="0.08em"
            fontFamily="Inter, system-ui, sans-serif" fill={z.col} fillOpacity={0.90}>
            {z.label}
          </text>
        </g>
      ))}

      {/* ── Flow arrows: Zone 1 → H₂ Hub ─────────────────────── */}
      {sourcesData.map((s) => {
        const srcRightX = ZONE1_X + 8 + srcCardW
        const srcMidY   = s.y + 48
        const hubLeftX  = HUB_CX - HUB_R - 2
        return (
          <Arrow key={`fh-${s.id}`}
            x1={srcRightX} y1={srcMidY}
            x2={hubLeftX}  y2={srcMidY}
            col={s.col} dashed={s.col === RC.grey}
            active={active === s.id} />
        )
      })}

      {/* ── Flow arrows: H₂ Hub → Storage cards ─────────────── */}
      {storageData.map((s) => {
        const stLeftX   = ZONE2_X + 4
        const stMidY    = s.y + 45
        const hubRightX = HUB_CX + HUB_R + 2
        return (
          <Arrow key={`hs-${s.id}`}
            x1={hubRightX} y1={stMidY}
            x2={stLeftX}   y2={stMidY}
            col={s.col} active={active === s.id} />
        )
      })}

      {/* ── Flow arrows: Storage → End Uses (every storage box fans out
           to every sector, so an active storage id brightens all four,
           and an active sector id brightens all five feeding it) ────── */}
      {storageData.flatMap((s) =>
        sectorsData.map((sec) => {
          const stRightX = ZONE2_X + 4 + stCardW
          const secMidY  = sec.y + sectorH / 2
          const isActive = active === s.id || active === sec.id
          return (
            <Arrow key={`so-${s.id}-${sec.id}`}
              x1={stRightX}  y1={active === s.id ? s.y + 45 : secMidY}
              x2={ZONE3_X + 4} y2={secMidY}
              col={sec.col} active={isActive} />
          )
        })
      )}

      {/* ── H₂ Hub node ───────────────────────────────────────────── */}
      <circle cx={HUB_CX} cy={HUB_CY} r={HUB_R}
        fill="rgba(130,188,0,0.15)" stroke={RC.green} strokeWidth={2} />
      <circle cx={HUB_CX} cy={HUB_CY} r={HUB_R - 6}
        fill="rgba(130,188,0,0.08)" stroke={RC.green} strokeWidth={0.8} strokeDasharray="3 3" />
      <text x={HUB_CX} y={HUB_CY - 6}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={18} fontFamily="Inter, system-ui, sans-serif">
        H₂
      </text>
      <text x={HUB_CX} y={HUB_CY + 12}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={7.5} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.green} fillOpacity={0.70}>
        HUB
      </text>

      {/* ── Zone 1: Production source cards — ids 1–5 ────────────── */}
      {sourcesData.map((s) => (
        <InteractiveBox key={`s-${s.id}`} id={s.id} active={active} setActive={setActive} delayIndex={s.id}>
          <SourceCard
            x={ZONE1_X + 8} y={s.y} w={srcCardW} h={96}
            label={s.label} sublabel={s.sublabel}
            col={s.col} dim={s.dim} mid={s.mid} />
          <IndexBadge x={ZONE1_X + 8} y={s.y} w={srcCardW} id={s.id} color={s.col} active={active === s.id} />
        </InteractiveBox>
      ))}

      {/* ── Zone 2: storage cards — ids 6–10 ─────────────────────── */}
      {storageData.map((s) => (
        <InteractiveBox key={`st-${s.id}`} id={s.id} active={active} setActive={setActive} delayIndex={s.id}>
          <StorageCard
            x={ZONE2_X + 4} y={s.y} w={stCardW} h={90}
            label={s.label} detail={s.detail}
            col={s.col} dim={s.dim} mid={s.mid} />
          <IndexBadge x={ZONE2_X + 4} y={s.y} w={stCardW} id={s.id} color={s.col} active={active === s.id} />
        </InteractiveBox>
      ))}

      {/* ── Zone 3: End-use sectors — ids 11–14 ──────────────────── */}
      {sectorsData.map((s) => (
        <InteractiveBox key={`se-${s.id}`} id={s.id} active={active} setActive={setActive} delayIndex={s.id}>
          <SectorGroup
            x={ZONE3_X + 4} y={s.y} w={secW} h={sectorH}
            label={s.label} icon={s.icon}
            col={s.col} dim={s.dim} mid={s.mid}
            items={s.items} />
          <IndexBadge x={ZONE3_X + 4} y={s.y} w={secW} id={s.id} color={s.col} active={active === s.id} />
        </InteractiveBox>
      ))}

      {/* Zone divider lines */}
      <line x1={ZONE2_X - 9} y1={ZONE_Y} x2={ZONE2_X - 9} y2={H - 20}
        stroke={RC.white12} strokeWidth={1} />
      <line x1={ZONE3_X - 9} y1={ZONE_Y} x2={ZONE3_X - 9} y2={H - 20}
        stroke={RC.white12} strokeWidth={1} />

      {/* Source note */}
      <text x={W / 2} y={H - 8}
        textAnchor="middle" fontSize={7.5}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}>
        Source: IEA Global Hydrogen Review 2023; IRENA World Energy Transitions Outlook 2023; Hydrogen Council Hydrogen Insights 2024
      </text>
    </svg>
  )
}

// ── Legend, grouped into three zone-headed sections ────────────────────────
function LegendGroup({
  heading, color, items, active, setActive,
}: {
  heading: string; color: string
  items: { id: number; label: string }[]
  active: number | null; setActive: (n: number | null) => void
}) {
  return (
    <div className="flex-1 min-w-[220px]">
      <h4
        className="text-[10px] font-bold uppercase tracking-wider mb-2"
        style={{ color: rcRgba(color, 0.85), fontFamily: "'Montserrat', sans-serif", letterSpacing: '0.08em' }}
      >
        {heading}
      </h4>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {items.map((item) => {
          const isActive = active === item.id
          return (
            <div
              key={item.id}
              className="rc-legend-item flex items-start gap-2 min-w-[130px] rounded-md px-1.5 py-1 -mx-1.5"
              style={{
                background: isActive ? rcRgba(color, 0.10) : 'transparent',
                border: `1px solid ${isActive ? rcRgba(color, 0.35) : 'transparent'}`,
              }}
              tabIndex={0}
              role="button"
              aria-label={`Highlight ${item.label}`}
              onMouseEnter={() => setActive(item.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(item.id)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active === item.id ? null : item.id)}
            >
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
                style={{ background: rcRgba(color, isActive ? 0.28 : 0.16), border: `1px solid ${color}`, color, fontFamily: "'Montserrat', sans-serif" }}
              >
                {item.id}
              </span>
              <span className="block text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white65, fontFamily: "'Montserrat', sans-serif" }}>
                {item.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Legend({ active, setActive }: { active: number | null; setActive: (n: number | null) => void }) {
  return (
    <div
      className="px-6 py-4 flex flex-wrap gap-x-8 gap-y-5"
      style={{ borderTop: `1px solid ${RC.cardBorder}` }}
    >
      <LegendGroup
        heading="Production"
        color={RC.green}
        items={sourcesData.map((s) => ({ id: s.id, label: s.label }))}
        active={active} setActive={setActive}
      />
      <LegendGroup
        heading="Storage & Distribution"
        color={RC.teal}
        items={storageData.map((s) => ({ id: s.id, label: s.label }))}
        active={active} setActive={setActive}
      />
      <LegendGroup
        heading="End Uses"
        color={RC.blue}
        items={sectorsData.map((s) => ({ id: s.id, label: s.label }))}
        active={active} setActive={setActive}
      />
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────
export function HydrogenLandscapeDiagram({
  title   = 'The Hydrogen Economy Landscape',
  caption,
}: {
  title?: string
  caption?: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const badgeRange = `01–${String(TOTAL_ITEMS).padStart(2, '0')}`

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
          RC Diagram · {badgeRange}
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <HydrogenLandscapeSVG title={title} active={active} setActive={setActive} />
      </div>

      {/* Legend / index, grouped by zone */}
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
