// ─────────────────────────────────────────────────────────────────────────────
// LiquefiedCO2CarrierDiagram — RC Diagram Design Language v1.2 (comparison-panel variant)
//
// Three-column comparison of liquefied CO₂ ship carrier pressure vessel types:
//
//   ELEVATED PRESSURE  (34–45 bar / 0–10 °C)
//     Full class approval (GASA) — not yet in commercial operation
//     Vertical pipe formation · Tank wall thickness reduced under IGC code
//     Suitable for elevated-pressure CO₂ cargoes
//
//   MEDIUM PRESSURE  (15–18 bar / −25 to −30 °C)
//     Type C cylindrical tanks · Full class approval · In operation
//     Increased shell thickness for higher pressure rating
//     Adapted from existing LPG/LNG carrier technology
//
//   LOW PRESSURE  (6–10 bar / −45 to −55 °C)
//     Type C cylindrical bi-lobe pressure tanks · Not yet in operation
//     Reduced shell thickness · Requires onshore liquefaction plant
//     Largest cargo volumes possible per vessel
//
// Based on Clarksons Research / CCSA CO₂ Transport Webinar (2024)
//
// Ported onto the standard RC card shell: BlueprintFrame, whole-panel
// interactivity (hover/tap/focus highlights one column, dims the others),
// staggered entrance, badge pill. The tank-type description and five feature
// bullets used to be tiny hand-wrapped SVG text (9.5–10px) — the same
// mobile-legibility problem as the other dense-prose comparison panels
// (Geothermal, Hydropower) — so they've moved to real HTML `.rc-detail-card`s
// below the diagram, synced to the same hover/tap highlight as the SVG
// columns. All original ship/tank illustration geometry is unchanged; the
// local gradient ids (amber/green/blue fills, sea, hull) were suffixed `LC`
// to avoid colliding with the same generic ids used elsewhere in the module.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'
// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:       brand.green,
  greenDim:    rcRgba(brand.green, 0.13),
  greenMid:    rcRgba(brand.green, 0.38),
  greenBright: rcRgba(brand.green, 0.70),
  amber:       brand.amber,
  amberDim:    rcRgba(brand.amber, 0.12),
  amberMid:    rcRgba(brand.amber, 0.40),
  blue:        brand.blue,
  blueDim:     rcRgba(brand.blue, 0.12),
  blueMid:     rcRgba(brand.blue, 0.40),
  teal:        brand.teal,
  tealDim:     rcRgba(brand.teal, 0.14),
  white90:     'rgba(255,255,255,0.90)',
  white70:     'rgba(255,255,255,0.70)',
  white50:     'rgba(255,255,255,0.50)',
  white35:     'rgba(255,255,255,0.35)',
  white20:     'rgba(255,255,255,0.20)',
  white18:     'rgba(255,255,255,0.18)',
  white12:     'rgba(255,255,255,0.12)',
  white10:     'rgba(255,255,255,0.08)',
  white08:     'rgba(255,255,255,0.08)',
  cardBg:      'rgba(10,15,20,0.85)',
  cardBorder:  'rgba(255,255,255,0.08)',
}

const W   = 940
const H   = 300
const PAD = 20

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
      /* Same mobile fix as the other comparison-panel diagrams: below ~768px
         the inline SVG panel headers/annotations shrink past legibility.
         Hide them and let the HTML detail cards below carry the reading. */
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
        <pattern id="rcGridLC" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowLC" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.07)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridLC)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowLC)" />
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

// ── Carrier type data ─────────────────────────────────────────────────────────
const carriers = [
  {
    num:          1,
    label:        'Elevated Pressure',
    pressure:     '34–45 bar',
    temperature:  '0°C to −10°C',
    status:       'Approved — not yet in service',
    statusColor:  RC.amber,
    statusDim:    RC.amberDim,
    color:        RC.amber,
    dim:          RC.amberDim,
    mid:          RC.amberMid,
    gradId:       'gradAmberLC',
    tankType:     'Vertical pipe formation',
    tankDesc:     'Tank wall thickness reduced under IGC code (thinner than Type-C tanks) — elevated temperature enables this.',
    features: [
      'Closest to existing LPG tanker designs',
      'No liquefaction plant required at terminal',
      'Simplest handling — near-ambient temperature',
      'Tank walls thinner than Type-C equivalents',
      'GASA full class approval received',
    ],
    hullNote: 'Near-ambient temperature cargo — no specialist cold handling',
  },
  {
    num:          2,
    label:        'Medium Pressure',
    pressure:     '15–18 bar',
    temperature:  '−25°C to −30°C',
    status:       'Approved — in commercial operation',
    statusColor:  RC.green,
    statusDim:    RC.greenDim,
    color:        RC.green,
    dim:          RC.greenDim,
    mid:          RC.greenMid,
    gradId:       'gradGreenLC',
    tankType:     'Type C cylindrical tanks',
    tankDesc:     'Increased shell thickness for greater pressure rating. Adapted from established LPG carrier technology.',
    features: [
      'Most mature technology — commercially proven',
      'Type C class approval held',
      'Cylindrical pressure vessels — well-understood',
      'Suitable for existing port infrastructure',
      'Medium-temperature logistics chain required',
    ],
    hullNote:  'Commercially proven — multiple vessels already in service',
  },
  {
    num:          3,
    label:        'Low Pressure',
    pressure:     '6–10 bar',
    temperature:  '−45°C to −55°C',
    status:       'Approved — not yet in service',
    statusColor:  RC.blue,
    statusDim:    RC.blueDim,
    color:        RC.blue,
    dim:          RC.blueDim,
    mid:          RC.blueMid,
    gradId:       'gradBlueLC',
    tankType:     'Type C cylindrical bi-lobe tanks',
    tankDesc:     'Reduced shell thickness vs medium pressure. Requires onshore liquefaction facility. Higher cargo volume per vessel.',
    features: [
      'Largest cargo volume per vessel',
      'Reduced shell thickness (lower pressure)',
      'Requires dedicated liquefaction terminal',
      'Deep cold chain adds complexity',
      'Type C bi-lobe pressure vessel design',
    ],
    hullNote: 'Requires onshore liquefaction — highest volume potential',
  },
]

// ── Column geometry ───────────────────────────────────────────────────────────
const COL_W     = (W - PAD * 2 - 16) / 3
const COL_GAP   = 8
const HEADER_H  = 40
const COL_Y     = PAD + HEADER_H + 10

interface Props {
  title?:   string
  caption?: string
}

export function LiquefiedCO2CarrierDiagram({ title, caption }: Props) {
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
            {title || 'Liquefied CO₂ Carrier Designs'}
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white50, fontFamily: "'Montserrat', sans-serif" }}>
            Three pressure regimes for maritime CO₂ transport — tap a design below to see details
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.greenDim, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
        >
          RC Diagram · Comparison
        </span>
      </div>

      {/* Diagram body */}
      <div className="px-4 py-5 flex justify-center overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ display: 'block', maxWidth: W, minWidth: 320 }}
          aria-label="Liquefied CO2 carrier designs — elevated, medium, and low pressure vessel types"
        >
          <defs>
            <linearGradient id="gradAmberLC" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={RC.amber} stopOpacity={0.85} />
              <stop offset="100%" stopColor={RC.amber} stopOpacity={0.30} />
            </linearGradient>
            <linearGradient id="gradGreenLC" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={RC.green} stopOpacity={0.85} />
              <stop offset="100%" stopColor={RC.green} stopOpacity={0.30} />
            </linearGradient>
            <linearGradient id="gradBlueLC" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={RC.blue} stopOpacity={0.85} />
              <stop offset="100%" stopColor={RC.blue} stopOpacity={0.30} />
            </linearGradient>
            <linearGradient id="seaGradLC" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="rgba(30,60,100,0.55)" />
              <stop offset="100%" stopColor="rgba(10,20,40,0.30)" />
            </linearGradient>
            <linearGradient id="hullGradLC" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="rgba(80,100,120,0.90)" />
              <stop offset="100%" stopColor="rgba(40,55,70,0.95)" />
            </linearGradient>
          </defs>

          {/* ── Background ──────────────────────────────────────────────────── */}
          <rect width={W} height={H} fill={RC.cardBg} rx={12} />
          <BlueprintFrame w={W} h={H} />

          {/* ── Page header ─────────────────────────────────────────────────── */}
          <rect x={PAD} y={PAD} width={W - PAD * 2} height={HEADER_H}
                fill="rgba(255,255,255,0.04)" rx={8} />
          <text
            x={PAD + 16} y={PAD + 17}
            fill={RC.white90} fontSize={13} fontWeight={700}
            fontFamily="Inter, sans-serif" letterSpacing={0.5}
          >
            LIQUEFIED CO₂ CARRIER DESIGNS
          </text>
          <text
            className="rc-panel-label"
            x={PAD + 16} y={PAD + 32}
            fill={RC.white50} fontSize={10}
            fontFamily="Inter, sans-serif"
          >
            Three pressure regimes — different tank design, temperature control, and port infrastructure
          </text>

          {/* ── Carrier columns ─────────────────────────────────────────────── */}
          {carriers.map((c, i) => {
            const cx = PAD + i * (COL_W + COL_GAP)
            const cardH = H - COL_Y - PAD
            const shipY = COL_Y + 10
            const shipH = 108
            const infoY = shipY + shipH + 10
            const isActive = active === c.num
            const isDimmed = active !== null && !isActive

            return (
              <g
                key={c.label}
                className="rc-panel-hit"
                style={{ opacity: isDimmed ? 0.32 : 1 }}
                tabIndex={0}
                role="button"
                aria-label={`Highlight ${c.label}`}
                onMouseEnter={() => setActive(c.num)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(c.num)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(active === c.num ? null : c.num)}
              >
                <g className="rc-panel-enter" style={{ '--rc-delay': `${c.num * 0.10}s` } as React.CSSProperties}>
                  {/* Card background */}
                  <rect
                    x={cx} y={COL_Y}
                    width={COL_W} height={cardH}
                    fill={c.dim} rx={10}
                    stroke={isActive ? c.color : c.color} strokeOpacity={isActive ? 0.65 : 0.30}
                    strokeWidth={isActive ? 1.8 : 1}
                  />

                  {/* Top colour stripe */}
                  <rect x={cx} y={COL_Y} width={COL_W} height={5}
                        fill={`url(#${c.gradId})`} rx={5} />

                  {/* ── Ship illustration ──────────────────────────────────── */}
                  <ShipIllustration cx={cx} shipY={shipY} shipH={shipH} colW={COL_W} carrier={c} index={i} />

                  {/* ── Label & pressure ────────────────────────────────────── */}
                  <text
                    x={cx + COL_W / 2} y={infoY}
                    fill={c.color} fontSize={13} fontWeight={700}
                    textAnchor="middle" fontFamily="Inter, sans-serif"
                  >
                    {c.label}
                  </text>

                  {/* Pressure badge */}
                  <rect
                    x={cx + COL_W / 2 - 58} y={infoY + 6}
                    width={116} height={20}
                    fill={c.mid} rx={10} opacity={0.55}
                  />
                  <text
                    className="rc-panel-label"
                    x={cx + COL_W / 2} y={infoY + 20}
                    fill={RC.white90} fontSize={11} fontWeight={700}
                    textAnchor="middle" fontFamily="Inter, sans-serif"
                  >
                    {c.pressure}
                  </text>

                  {/* Temperature */}
                  <text
                    className="rc-panel-label"
                    x={cx + COL_W / 2} y={infoY + 38}
                    fill={RC.white70} fontSize={11}
                    textAnchor="middle" fontFamily="Inter, sans-serif"
                  >
                    {c.temperature}
                  </text>

                  {/* Status badge */}
                  <rect
                    x={cx + 8} y={infoY + 46}
                    width={COL_W - 16} height={20}
                    fill={c.statusDim} rx={5}
                    stroke={c.statusColor} strokeOpacity={0.4} strokeWidth={0.8}
                  />
                  <text
                    className="rc-panel-label"
                    x={cx + COL_W / 2} y={infoY + 60}
                    fill={c.statusColor} fontSize={9.5} fontWeight={600}
                    textAnchor="middle" fontFamily="Inter, sans-serif"
                  >
                    {c.status}
                  </text>
                </g>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Detail cards — tank type, description and features, always legible */}
      <div
        className="px-6 py-4 grid gap-3"
        style={{ borderTop: `1px solid ${RC.cardBorder}`, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
      >
        {carriers.map((c) => {
          const isActive = active === c.num
          return (
            <div
              key={c.label}
              className="rc-detail-card rounded-lg p-3"
              style={{
                background: isActive ? rcRgba(c.color, 0.10) : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? rcRgba(c.color, 0.45) : RC.cardBorder}`,
              }}
              tabIndex={0}
              role="button"
              aria-label={`Highlight ${c.label}`}
              onMouseEnter={() => setActive(c.num)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(c.num)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active === c.num ? null : c.num)}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: rcRgba(c.color, isActive ? 0.28 : 0.16), border: `1px solid ${c.color}`, color: c.color, fontFamily: "'Montserrat', sans-serif" }}
                >
                  {String(c.num).padStart(2, '0')}
                </span>
                <span className="text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white70, fontFamily: "'Montserrat', sans-serif" }}>
                  {c.label}
                </span>
              </div>
              <dl className="text-[11px] leading-snug space-y-1.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                <div>
                  <dt className="uppercase tracking-wide text-[9px] font-bold" style={{ color: c.color, opacity: 0.85 }}>Tank type</dt>
                  <dd className="mt-0.5" style={{ color: RC.white70 }}>{c.tankType} — {c.tankDesc}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide text-[9px] font-bold" style={{ color: c.color, opacity: 0.85 }}>Key points</dt>
                  <dd className="mt-0.5" style={{ color: RC.white70 }}>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {c.features.map((f, fi) => <li key={fi}>{f}</li>)}
                    </ul>
                  </dd>
                </div>
              </dl>
            </div>
          )
        })}
      </div>

      {/* Caption */}
      {caption && (
        <figcaption
          className="px-6 py-3 text-xs"
          style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white50, fontStyle: 'italic' }}
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
        fontFamily: 'Inter, sans-serif',
        borderTop:  `1px solid ${RC.cardBorder}`,
      }}>
        Source: Clarksons Research / CCSA CO₂ Transport Webinar, 2024 · Global CCS Institute
      </p>
    </figure>
  )
}

// ── Ship illustration sub-component ──────────────────────────────────────────
// Draws a simplified side-profile of a CO2 carrier with pressure vessels on deck
interface ShipProps {
  cx:     number
  shipY:  number
  shipH:  number
  colW:   number
  carrier: typeof carriers[0]
  index:  number
}

function ShipIllustration({ cx, shipY, shipH, colW, carrier, index }: ShipProps) {
  const mx   = cx + colW / 2
  const sw   = colW - 20  // ship width
  const sx   = cx + 10    // ship left x
  const hullY = shipY + shipH * 0.45
  const hullH = shipH * 0.30

  // Hull polygon (simplified trapezoid with bow)
  // Points: bow(left-tapering), waterline flat, stern flat
  const hullPoints = [
    `${sx + sw * 0.06},${hullY}`,              // deck-port
    `${sx + sw * 0.98},${hullY}`,              // deck-starboard
    `${sx + sw * 0.98},${hullY + hullH * 0.8}`, // stern-waterline
    `${sx + sw * 0.04},${hullY + hullH * 0.9}`, // bow-waterline (slightly lower)
  ].join(' ')

  // Superstructure (bridge)
  const bridgeW = sw * 0.14
  const bridgeX = sx + sw * 0.78
  const bridgeY = hullY - shipH * 0.12
  const bridgeH = shipH * 0.15

  // Pressure vessel tanks on deck
  // Number of tanks varies by type
  const tankCounts = [4, 3, 2]
  const nTanks   = tankCounts[index]
  const tankR    = index === 2 ? 14 : 11   // Low pressure = larger tanks
  const tankY    = hullY - tankR - 2
  const tankSpacing = (sw * 0.65) / (nTanks + 1)
  const tankStartX  = sx + sw * 0.08

  // Water surface ripple
  const waterY = hullY + hullH * 0.85

  return (
    <g>
      {/* Sea background */}
      <rect
        x={sx - 2} y={waterY - 2}
        width={sw + 4} height={shipH * 0.20}
        fill="url(#seaGradLC)" rx={4} opacity={0.7}
      />
      {/* Wave lines */}
      {[0, 1, 2].map(wi => (
        <path
          key={wi}
          d={`M ${sx + wi * sw * 0.32} ${waterY + wi * 3}
              Q ${sx + sw * 0.10 + wi * sw * 0.32} ${waterY - 3 + wi * 3}
                ${sx + sw * 0.20 + wi * sw * 0.32} ${waterY + wi * 3}`}
          fill="none"
          stroke="rgba(100,160,220,0.35)"
          strokeWidth={1.2}
        />
      ))}

      {/* Hull */}
      <polygon points={hullPoints} fill="url(#hullGradLC)" />
      <line
        x1={sx + sw * 0.06} y1={hullY}
        x2={sx + sw * 0.98} y2={hullY}
        stroke={carrier.color} strokeOpacity={0.60} strokeWidth={1.5}
      />

      {/* Bow taper */}
      <polygon
        points={[
          `${sx},${hullY + hullH * 0.65}`,
          `${sx + sw * 0.06},${hullY}`,
          `${sx + sw * 0.04},${hullY + hullH * 0.9}`,
        ].join(' ')}
        fill="rgba(50,65,80,0.95)"
      />

      {/* Bridge superstructure */}
      <rect
        x={bridgeX} y={bridgeY}
        width={bridgeW} height={bridgeH}
        fill="rgba(70,90,110,0.95)"
        stroke={RC.white20} strokeWidth={0.6}
        rx={2}
      />
      {/* Bridge windows */}
      {[0, 1, 2].map(wi => (
        <rect
          key={wi}
          x={bridgeX + 4 + wi * 9} y={bridgeY + 4}
          width={6} height={5}
          fill={RC.white20} rx={1}
        />
      ))}
      {/* Funnel */}
      <rect
        x={bridgeX + bridgeW * 0.3} y={bridgeY - shipH * 0.09}
        width={bridgeW * 0.35} height={shipH * 0.09}
        fill="rgba(60,75,90,0.95)"
        rx={2}
      />

      {/* Pressure vessel tanks */}
      {Array.from({ length: nTanks }).map((_, ti) => {
        const tx = tankStartX + (ti + 1) * tankSpacing
        // Low pressure: bi-lobe (two overlapping circles)
        if (index === 2) {
          return (
            <g key={ti}>
              <ellipse cx={tx - 5} cy={tankY} rx={tankR - 1} ry={tankR * 0.65}
                       fill={carrier.mid} opacity={0.85} />
              <ellipse cx={tx + 5} cy={tankY} rx={tankR - 1} ry={tankR * 0.65}
                       fill={carrier.mid} opacity={0.85}
                       stroke={carrier.color} strokeOpacity={0.50} strokeWidth={1} />
              {/* CO2 label */}
              <text className="rc-panel-label" x={tx} y={tankY + 4} fill={RC.white70} fontSize={7}
                    textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight={700}>
                CO₂
              </text>
            </g>
          )
        }
        // Elevated pressure: taller vertical tanks
        if (index === 0) {
          return (
            <g key={ti}>
              <rect
                x={tx - 8} y={tankY - tankR + 2}
                width={16} height={tankR * 1.6}
                fill={carrier.mid} opacity={0.85}
                rx={8}
                stroke={carrier.color} strokeOpacity={0.50} strokeWidth={1}
              />
              <text className="rc-panel-label" x={tx} y={tankY + 5} fill={RC.white70} fontSize={7}
                    textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight={700}>
                CO₂
              </text>
            </g>
          )
        }
        // Medium pressure: cylindrical (standard oval)
        return (
          <g key={ti}>
            <ellipse cx={tx} cy={tankY} rx={tankR * 1.2} ry={tankR * 0.70}
                     fill={carrier.mid} opacity={0.85}
                     stroke={carrier.color} strokeOpacity={0.50} strokeWidth={1} />
            <text className="rc-panel-label" x={tx} y={tankY + 4} fill={RC.white70} fontSize={7}
                  textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight={700}>
              CO₂
            </text>
          </g>
        )
      })}

      {/* Deck line connecting tanks */}
      <line
        x1={sx + sw * 0.06} y1={hullY}
        x2={bridgeX} y2={hullY}
        stroke={RC.white20} strokeWidth={0.8}
      />
    </g>
  )
}
