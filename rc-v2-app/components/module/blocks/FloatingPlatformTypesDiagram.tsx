// ─────────────────────────────────────────────────────────────────────────────
// FloatingPlatformTypesDiagram — RC Diagram Design Language v1.2 (comparison-panel variant)
//
// Three-panel cross-section diagram comparing the three main floating offshore
// wind platform concepts:
//
//   SEMI-SUBMERSIBLE  — three large float cans and steel braces, catenary mooring
//   SPAR BUOY         — deep-draft vertical cylinder, catenary mooring (>100 m)
//   TENSION LEG PLATFORM (TLP) — pontoons and columns, vertical tensioned tendons
//
// Ported onto the standard RC card shell (same as NacelleInternalDiagram /
// FixedFoundationTypesDiagram): BlueprintFrame, numbered/interactive panels,
// staggered entrance, hover/tap highlight, and the mobile fix (per-panel
// name/spec text hidden below 768px — the legend row carries it there).
// Panel illustrations (SemiSubPanel/SparPanel/TlpPanel/Turbine) are unchanged.
//
// Source: DNV, BVG Associates, Crown Estate — Floating Offshore Wind Report 2024
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'

// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:      brand.green,
  greenDim:   rcRgba(brand.green, 0.15),
  greenMid:   rcRgba(brand.green, 0.40),
  amber:      brand.amber,
  amberDim:   rcRgba(brand.amber, 0.15),
  blue:       brand.blue,
  blueDim:    rcRgba(brand.blue, 0.18),
  teal:       brand.teal,
  white90:    'rgba(255,255,255,0.90)',
  white70:    'rgba(255,255,255,0.70)',
  white50:    'rgba(255,255,255,0.50)',
  white35:    'rgba(255,255,255,0.35)',
  white20:    'rgba(255,255,255,0.20)',
  white12:    'rgba(255,255,255,0.12)',
  white08:    'rgba(255,255,255,0.08)',
  white10:    'rgba(255,255,255,0.08)',
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
        <pattern id="rcGridFP" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowFP" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridFP)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowFP)" />
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

const W    = 960
const H    = 520
const PAD  = 16
const PW   = (W - PAD * 4) / 3   // panel width ≈ 299
const PH   = H - PAD * 2          // panel height

const WATER_Y = 160  // waterline within each panel
const SEA_Y   = PH - 40 // seabed within each panel

// ── Turbine helper ────────────────────────────────────────────────────────────
function Turbine({ cx, topY, col }: { cx: number; topY: number; col: string }) {
  const baseY = topY + 60
  const hubY  = topY + 12
  return (
    <g>
      {/* Tower */}
      <line x1={cx} y1={baseY} x2={cx} y2={hubY + 4}
        stroke={col} strokeWidth={5} strokeLinecap="round" />
      {/* Hub */}
      <circle cx={cx} cy={hubY} r={5} fill={col} />
      {/* Three blades */}
      {[0, 120, 240].map((deg, i) => {
        const rad = (deg - 90) * Math.PI / 180
        const bx  = cx + Math.cos(rad) * 30
        const by  = hubY + Math.sin(rad) * 30
        return (
          <line key={i} x1={cx} y1={hubY} x2={bx} y2={by}
            stroke={col} strokeWidth={3} strokeLinecap="round" />
        )
      })}
    </g>
  )
}

// ── Semi-submersible panel ────────────────────────────────────────────────────
function SemiSubPanel({ x, y }: { x: number; y: number }) {
  const midX   = x + PW / 2
  const waterY = y + WATER_Y
  const seabedY = y + SEA_Y

  // Three columns
  const cols = [midX - 70, midX, midX + 70]
  const colTop   = waterY - 30
  const colBot   = waterY + 60
  const colW     = 22

  // Braces (diagonals connecting columns)
  const braceY   = waterY + 20

  return (
    <g>
      {/* Sea fill */}
      <rect x={x} y={waterY} width={PW} height={seabedY - waterY}
        fill="rgba(74,158,191,0.10)" />
      <rect x={x} y={seabedY} width={PW} height={PH - SEA_Y}
        fill="rgba(130,130,100,0.18)" />

      {/* Waterline */}
      <line x1={x} y1={waterY} x2={x + PW} y2={waterY}
        stroke={RC.blue} strokeWidth={1.5} strokeDasharray="6 3" opacity={0.6} />

      {/* Braces between columns */}
      <line x1={cols[0] + colW/2} y1={braceY} x2={cols[1] - colW/2} y2={braceY}
        stroke={RC.green} strokeWidth={6} strokeLinecap="round" />
      <line x1={cols[1] + colW/2} y1={braceY} x2={cols[2] - colW/2} y2={braceY}
        stroke={RC.green} strokeWidth={6} strokeLinecap="round" />
      <line x1={cols[0] + colW/2} y1={braceY + 20} x2={cols[2] - colW/2} y2={braceY + 20}
        stroke={RC.green} strokeWidth={4} strokeLinecap="round" strokeDasharray="8 4" />

      {/* Three float columns */}
      {cols.map((cx, i) => (
        <rect key={i}
          x={cx - colW/2} y={colTop}
          width={colW} height={colBot - colTop}
          fill={RC.greenDim} stroke={RC.green} strokeWidth={2} rx={4}
        />
      ))}

      {/* Tower support platform on central column */}
      <rect x={midX - 14} y={colTop - 8} width={28} height={10}
        fill={RC.green} rx={3} opacity={0.8} />

      {/* Turbine */}
      <Turbine cx={midX} topY={y + 60} col={RC.white90} />

      {/* Catenary mooring lines */}
      {[
        [cols[0], cols[0] - 55, seabedY - 10],
        [cols[2], cols[2] + 55, seabedY - 10],
      ].map(([fx, ax, ay], i) => (
        <path key={i}
          d={`M${fx},${colBot} Q${(fx + ax)/2},${ay + 30} ${ax},${ay}`}
          fill="none" stroke={RC.amber} strokeWidth={1.5} strokeDasharray="5 3"
          opacity={0.75}
        />
      ))}

      {/* Seabed anchors */}
      {[cols[0] - 55, cols[2] + 55].map((ax, i) => (
        <g key={i}>
          <rect x={ax - 8} y={seabedY - 14} width={16} height={10}
            fill={RC.amber} rx={2} opacity={0.8} />
        </g>
      ))}
    </g>
  )
}

// ── SPAR panel ────────────────────────────────────────────────────────────────
function SparPanel({ x, y }: { x: number; y: number }) {
  const midX    = x + PW / 2
  const waterY  = y + WATER_Y
  const seabedY = y + SEA_Y

  const cyl = {
    x: midX - 12,
    topY: waterY - 24,
    w: 24,
    h: seabedY - waterY - 60,
  }

  return (
    <g>
      {/* Sea fill */}
      <rect x={x} y={waterY} width={PW} height={seabedY - waterY}
        fill="rgba(74,158,191,0.10)" />
      <rect x={x} y={seabedY} width={PW} height={PH - SEA_Y}
        fill="rgba(130,130,100,0.18)" />

      {/* Waterline */}
      <line x1={x} y1={waterY} x2={x + PW} y2={waterY}
        stroke={RC.blue} strokeWidth={1.5} strokeDasharray="6 3" opacity={0.6} />

      {/* SPAR cylinder */}
      <rect x={cyl.x} y={cyl.topY} width={cyl.w} height={cyl.h}
        fill={RC.greenDim} stroke={RC.green} strokeWidth={2} rx={cyl.w/2}
      />

      {/* Ballast bulge at bottom */}
      <ellipse cx={midX} cy={cyl.topY + cyl.h} rx={cyl.w} ry={14}
        fill={RC.greenDim} stroke={RC.green} strokeWidth={2} />

      {/* Tower */}
      <rect x={midX - 5} y={y + 90} width={10} height={cyl.topY - (y + 90)}
        fill={RC.greenMid || 'rgba(130,188,0,0.40)'} stroke={RC.green} strokeWidth={1.5} rx={3} />

      {/* Turbine */}
      <Turbine cx={midX} topY={y + 55} col={RC.white90} />

      {/* Catenary mooring lines */}
      {[
        [midX - 12, midX - 85, seabedY - 12],
        [midX + 12, midX + 85, seabedY - 12],
      ].map(([fx, ax, ay], i) => (
        <path key={i}
          d={`M${fx},${cyl.topY + cyl.h - 40} Q${(fx + ax)/2},${ay + 25} ${ax},${ay}`}
          fill="none" stroke={RC.amber} strokeWidth={1.5} strokeDasharray="5 3"
          opacity={0.75}
        />
      ))}

      {/* Seabed anchors */}
      {[midX - 85, midX + 85].map((ax, i) => (
        <rect key={i} x={ax - 8} y={seabedY - 14} width={16} height={10}
          fill={RC.amber} rx={2} opacity={0.8} />
      ))}
    </g>
  )
}

// ── TLP panel ─────────────────────────────────────────────────────────────────
function TlpPanel({ x, y }: { x: number; y: number }) {
  const midX    = x + PW / 2
  const waterY  = y + WATER_Y
  const seabedY = y + SEA_Y

  // Pontoon
  const pontY  = waterY - 10
  const pontH  = 22
  const pontW  = 110

  // Columns
  const col1X  = midX - 32
  const col2X  = midX + 32
  const colTop = pontY - 40
  const colH   = 40
  const colW   = 18

  // Tendons (vertical tensioned lines to seabed)
  const tendonY1 = pontY + pontH

  return (
    <g>
      {/* Sea fill */}
      <rect x={x} y={waterY} width={PW} height={seabedY - waterY}
        fill="rgba(74,158,191,0.10)" />
      <rect x={x} y={seabedY} width={PW} height={PH - SEA_Y}
        fill="rgba(130,130,100,0.18)" />

      {/* Waterline */}
      <line x1={x} y1={waterY} x2={x + PW} y2={waterY}
        stroke={RC.blue} strokeWidth={1.5} strokeDasharray="6 3" opacity={0.6} />

      {/* Pontoon hull */}
      <rect x={midX - pontW/2} y={pontY} width={pontW} height={pontH}
        fill={RC.greenDim} stroke={RC.green} strokeWidth={2} rx={5} />

      {/* Columns on pontoon */}
      <rect x={col1X - colW/2} y={colTop} width={colW} height={colH}
        fill={RC.greenDim} stroke={RC.green} strokeWidth={2} rx={3} />
      <rect x={col2X - colW/2} y={colTop} width={colW} height={colH}
        fill={RC.greenDim} stroke={RC.green} strokeWidth={2} rx={3} />

      {/* Cross-brace between columns */}
      <line x1={col1X} y1={colTop + 20} x2={col2X} y2={colTop + 20}
        stroke={RC.green} strokeWidth={3} strokeLinecap="round" />

      {/* Tower */}
      <rect x={midX - 4} y={y + 90} width={8} height={colTop - (y + 90)}
        fill={RC.greenMid || 'rgba(130,188,0,0.40)'} stroke={RC.green} strokeWidth={1.5} rx={2} />

      {/* Turbine */}
      <Turbine cx={midX} topY={y + 55} col={RC.white90} />

      {/* Tensioned tendons — vertical, taut */}
      {[col1X - 6, col1X + 6, col2X - 6, col2X + 6].map((tx, i) => (
        <line key={i}
          x1={tx} y1={tendonY1}
          x2={tx} y2={seabedY - 6}
          stroke={RC.amber} strokeWidth={2}
          opacity={0.85}
        />
      ))}

      {/* Seabed anchor plates */}
      {[col1X, col2X].map((cx2, i) => (
        <rect key={i} x={cx2 - 14} y={seabedY - 8} width={28} height={8}
          fill={RC.amber} rx={2} opacity={0.85} />
      ))}
    </g>
  )
}

// ── Single source of truth for every panel ────────────────────────────────────
interface PanelData {
  index: number
  name: string
  sub: string
  depth: string
  Illustration: ({ x, y }: { x: number; y: number }) => JSX.Element
}

const PANELS: PanelData[] = [
  { index: 1, name: 'Semi-Submersible',  sub: '3 columns · catenary mooring',   depth: '60 m+',  Illustration: SemiSubPanel },
  { index: 2, name: 'SPAR Buoy',         sub: 'deep cylinder · ballasted',      depth: '100 m+', Illustration: SparPanel },
  { index: 3, name: 'Tension Leg (TLP)', sub: 'pontoon hull · vertical tendons',depth: '70 m+',  Illustration: TlpPanel },
]

// ── Component ─────────────────────────────────────────────────────────────────
interface FloatingPlatformTypesDiagramProps {
  title?:   string
  caption?: string
}

export function FloatingPlatformTypesDiagram({ title, caption }: FloatingPlatformTypesDiagramProps) {
  const [active, setActive] = useState<number | null>(null)

  const panelXs = [
    PAD,
    PAD * 2 + PW,
    PAD * 3 + PW * 2,
  ]

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
            {title || 'Floating Offshore Wind Platform Types'}
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white35, fontFamily: "'Montserrat', sans-serif" }}>
            Tap a platform type below to highlight it
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
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, minWidth: 320 }}
          aria-label="Floating offshore wind platform types: semi-submersible, SPAR buoy, tension leg platform">
          <defs>
            <radialGradient id="fptBg" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#0d1a20" />
              <stop offset="100%" stopColor="#060a0e" />
            </radialGradient>
          </defs>

          <rect width={W} height={H} fill="url(#fptBg)" rx={8} />
          <BlueprintFrame w={W} h={H} />

          {PANELS.map((p) => {
            const px = panelXs[p.index - 1]
            const Illustration = p.Illustration
            const isActive = active === p.index
            const isDimmed = active !== null && !isActive
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
                  {/* Panel background */}
                  <rect x={px} y={PAD} width={PW} height={PH}
                    fill={isActive ? rcRgba(RC.green, 0.06) : RC.white08}
                    stroke={isActive ? RC.green : RC.white12}
                    strokeWidth={1} rx={8} />

                  <Illustration x={px} y={PAD} />

                  {/* Seabed texture */}
                  {[0, 8, 16, 24].map((dx, j) => (
                    <line key={j}
                      x1={px + 10 + dx * 12} y1={PAD + SEA_Y}
                      x2={px + 10 + dx * 12 + 8} y2={PAD + SEA_Y + 12}
                      stroke="rgba(200,180,100,0.25)" strokeWidth={1}
                    />
                  ))}

                  {/* waterline / seabed context labels — short, stay visible on mobile */}
                  <text x={px + 8} y={PAD + WATER_Y - 4} fill={RC.blue} fontSize={8}
                    fontFamily="Inter, sans-serif" opacity={0.65}>waterline</text>
                  <text x={px + 8} y={PAD + SEA_Y + 22} fill="rgba(200,180,100,0.45)" fontSize={8}
                    fontFamily="Inter, sans-serif">seabed</text>

                  {/* Numbered chip */}
                  <g className="rc-panel-chipgroup">
                    <circle cx={px + 22} cy={PAD + 20} r={9} fill={rcRgba(RC.green, isActive ? 0.28 : 0.16)} stroke={RC.green} strokeWidth={1.2} />
                    <text x={px + 22} y={PAD + 23} textAnchor="middle"
                      fontSize={8} fontWeight="700" fontFamily="Montserrat, sans-serif" fill={RC.green}>
                      {String(p.index).padStart(2, '0')}
                    </text>
                  </g>

                  {/* Panel name / spec — hidden on mobile, legend carries it there */}
                  <text className="rc-panel-label" x={px + PW / 2} y={PAD + 26}
                    textAnchor="middle" fill={isActive ? RC.white90 : RC.green}
                    fontSize={13} fontWeight={700} fontFamily="Inter, sans-serif">
                    {p.name}
                  </text>
                  <text className="rc-panel-label" x={px + PW / 2} y={PAD + 42}
                    textAnchor="middle" fill={RC.white35} fontSize={9} fontFamily="Inter, sans-serif">
                    {`${p.sub} · ${p.depth}`}
                  </text>
                </g>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend / index */}
      <div
        className="px-6 py-4 flex flex-wrap gap-x-6 gap-y-3"
        style={{ borderTop: `1px solid ${RC.cardBorder}` }}
      >
        {PANELS.map((p) => {
          const isActive = active === p.index
          return (
            <div
              key={p.index}
              className="rc-legend-item flex items-start gap-2.5 min-w-[200px] rounded-md px-1.5 py-1 -mx-1.5"
              style={{
                background: isActive ? rcRgba(RC.green, 0.10) : 'transparent',
                border: `1px solid ${isActive ? rcRgba(RC.green, 0.35) : 'transparent'}`,
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
                style={{ background: rcRgba(RC.green, isActive ? 0.28 : 0.16), border: `1px solid ${RC.green}`, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
              >
                {String(p.index).padStart(2, '0')}
              </span>
              <span>
                <span className="block text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white70, fontFamily: "'Montserrat', sans-serif" }}>
                  {p.name}
                </span>
                <span className="block text-[11px]" style={{ color: RC.blue, fontFamily: "'Montserrat', sans-serif" }}>
                  {`${p.sub} · ${p.depth}`}
                </span>
              </span>
            </div>
          )
        })}
        <div className="basis-full h-0" />
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1 text-[10px]" style={{ color: RC.white35, fontFamily: "'Montserrat', sans-serif" }}>
          <span>┄ Catenary mooring (dashed)</span>
          <span>— Tensioned tendon (solid)</span>
        </div>
      </div>

      {/* Caption */}
      {caption && (
        <figcaption
          className="px-6 py-3 text-xs"
          style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white35 }}
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
      }}>Source: DNV · BVG Associates · Crown Estate — Floating Offshore Wind Technology Report 2024</p>
    </figure>
  )
}
