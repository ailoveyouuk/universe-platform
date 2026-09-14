'use client'

// ─────────────────────────────────────────────────────────────────────────────
// MooringSystemsDiagram — RC Diagram Design Language v1.2 (comparison-panel variant)
// Taut Angle vs Catenary Mooring — two-panel cross-section SVG showing both
// floating-wind mooring configurations side by side.
//
// Ported onto the standard RC card shell: BlueprintFrame, whole-panel
// interactivity (hover/tap/focus highlights one panel, dims the other),
// staggered entrance. The six-row "KEY DIFFERENCES" table used to be tiny
// hand-wrapped SVG text inside the canvas — the same mobile-legibility
// problem the other dense-prose comparison panels (Geothermal, Hydropower)
// hit — so it's moved to real HTML `.rc-detail-card`s below the diagram,
// synced to the same hover/tap highlight as the SVG panels. All original
// cross-section illustration geometry (water, seabed, platform, lines,
// anchors) is unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'

const RC = {
  green:     brand.green,
  greenDim:  rcRgba(brand.green, 0.15),
  greenMid:  rcRgba(brand.green, 0.42),
  blue:      brand.blue,
  blueDim:   rcRgba(brand.blue, 0.16),
  blueMid:   rcRgba(brand.blue, 0.45),
  amber:     brand.amber,
  bgDark:    '#0f172a',
  bgMid:     '#1e293b',
  bgPanel:   '#162032',
  text:      '#e2e8f0',
  textMuted: '#94a3b8',
  seabed:    '#2d4a2d',
  water:     '#1e4a6b',
  chain:     '#b0b8c8',
  white90:   'rgba(255,255,255,0.90)',
  white70:   'rgba(255,255,255,0.70)',
  white45:   'rgba(255,255,255,0.45)',
  white30:   'rgba(255,255,255,0.30)',
  white18:   'rgba(255,255,255,0.18)',
  white10:   'rgba(255,255,255,0.08)',
  cardBg:    'rgba(10,15,20,0.80)',
  cardBorder:'rgba(255,255,255,0.08)',
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
        <pattern id="rcGridMS" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowMS" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridMS)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowMS)" />
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

// ── Water panel ──────────────────────────────────────────────────────────────

function WaterPanel({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <>
      <defs>
        <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a4a6b" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0d2a3e" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="seabedGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3d5c2e" />
          <stop offset="100%" stopColor="#1a2a10" />
        </linearGradient>
      </defs>
      {/* Water body */}
      <rect x={x} y={y} width={w} height={h * 0.82} fill="url(#waterGrad)" />
      {/* Seabed */}
      <rect x={x} y={y + h * 0.82} width={w} height={h * 0.18} fill="url(#seabedGrad)" />
      {/* Water surface line */}
      <line x1={x} y1={y} x2={x + w} y2={y} stroke={RC.blue} strokeWidth={2} strokeOpacity={0.7} />
      {/* Seabed texture — pebbles */}
      {[0.1, 0.25, 0.4, 0.55, 0.7, 0.85].map((frac, i) => (
        <ellipse
          key={i}
          cx={x + w * frac}
          cy={y + h * 0.84}
          rx={w * 0.025}
          ry={h * 0.012}
          fill="#4a6a3a"
          opacity={0.7}
        />
      ))}
    </>
  )
}

// ── Floating buoy/platform ───────────────────────────────────────────────────

function FloatingPlatform({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      {/* Hull */}
      <rect x={cx - 22} y={cy - 10} width={44} height={18} rx={4} fill={RC.bgMid} stroke={RC.green} strokeWidth={1.5} />
      {/* Waterline */}
      <line x1={cx - 22} y1={cy + 4} x2={cx + 22} y2={cy + 4} stroke={RC.blue} strokeWidth={1} strokeOpacity={0.8} />
      {/* Mast stub */}
      <rect x={cx - 3} y={cy - 26} width={6} height={18} fill={RC.bgMid} stroke={RC.green} strokeWidth={1} />
      {/* Rotor disk (simplified) */}
      <ellipse cx={cx} cy={cy - 27} rx={12} ry={3} fill="none" stroke={RC.green} strokeWidth={1.5} />
    </g>
  )
}

// ── Seabed anchor ────────────────────────────────────────────────────────────

function SuctionAnchor({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <rect x={cx - 8} y={cy - 14} width={16} height={14} rx={2} fill={RC.bgMid} stroke={RC.amber} strokeWidth={1.5} />
      <line x1={cx} y1={cy - 14} x2={cx} y2={cy - 8} stroke={RC.amber} strokeWidth={1.5} />
    </g>
  )
}

function DriveAnchor({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <polygon
        points={`${cx - 7},${cy} ${cx + 7},${cy} ${cx},${cy - 18}`}
        fill={RC.bgMid}
        stroke={RC.amber}
        strokeWidth={1.5}
      />
    </g>
  )
}

// ── Panel 1: Taut Angle ──────────────────────────────────────────────────────

function TautAnglePanel({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const waterTop = y + 30
  const waterH = h - 30
  const platformCy = waterTop + 28
  const platformCx = x + w / 2
  const seabedY = waterTop + waterH * 0.82 + 6

  // Three taut lines radiating outward at ~45–55° angle
  const anchors = [
    { ax: x + w * 0.15, ay: seabedY - 8 },
    { ax: x + w / 2,    ay: seabedY - 8 },
    { ax: x + w * 0.85, ay: seabedY - 8 },
  ]
  const lineAttachY = platformCy + 8

  return (
    <g>
      <WaterPanel x={x} y={waterTop} w={w} h={waterH} />

      {/* Taut mooring lines — straight, angled */}
      {anchors.map((a, i) => (
        <line
          key={i}
          x1={platformCx}
          y1={lineAttachY}
          x2={a.ax}
          y2={a.ay}
          stroke={RC.chain}
          strokeWidth={2}
          strokeDasharray="5 3"
        />
      ))}

      {/* Anchors */}
      {anchors.map((a, i) => (
        <DriveAnchor key={i} cx={a.ax} cy={a.ay} />
      ))}

      {/* Platform */}
      <FloatingPlatform cx={platformCx} cy={platformCy} />

      {/* Angle annotation (left line) */}
      <path
        d={`M ${anchors[0].ax + 18} ${anchors[0].ay - 6} A 18 18 0 0 1 ${anchors[0].ax + 6} ${anchors[0].ay - 20}`}
        fill="none"
        stroke={RC.amber}
        strokeWidth={1}
        strokeDasharray="3 2"
      />
      <text className="rc-panel-label" x={anchors[0].ax + 22} y={anchors[0].ay - 12} fill={RC.amber} fontSize={9} fontFamily="sans-serif">
        30–60°
      </text>

      {/* Depth label */}
      <line x1={x + 10} y1={waterTop + 2} x2={x + 10} y2={seabedY - 2} stroke={RC.textMuted} strokeWidth={1} />
      <text className="rc-panel-label" x={x + 14} y={waterTop + waterH * 0.4} fill={RC.textMuted} fontSize={9} fontFamily="sans-serif" writingMode="tb">
        300–600m+
      </text>

      {/* Panel header */}
      <rect x={x} y={y} width={w} height={28} fill={RC.bgMid} />
      <text x={x + w / 2} y={y + 18} textAnchor="middle" fill={RC.text} fontSize={13} fontWeight="600" fontFamily="sans-serif">
        Taut Angle Mooring
      </text>
    </g>
  )
}

// ── Panel 2: Catenary ────────────────────────────────────────────────────────

function CatenaryPanel({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const waterTop = y + 30
  const waterH = h - 30
  const platformCy = waterTop + 28
  const platformCx = x + w / 2
  const seabedY = waterTop + waterH * 0.82 + 6

  // Catenary curve: cubic bezier from platform to seabed anchors
  // Left anchor
  const la = { ax: x + w * 0.12, ay: seabedY - 4 }
  // Right anchor
  const ra = { ax: x + w * 0.88, ay: seabedY - 4 }

  const lineAttachY = platformCy + 8

  // Bezier control points for catenary curve (sag toward seabed)
  const leftCurve = `M ${platformCx} ${lineAttachY} C ${platformCx - 20} ${seabedY - 20}, ${la.ax + 40} ${seabedY - 5}, ${la.ax} ${la.ay}`
  const rightCurve = `M ${platformCx} ${lineAttachY} C ${platformCx + 20} ${seabedY - 20}, ${ra.ax - 40} ${seabedY - 5}, ${ra.ax} ${ra.ay}`

  return (
    <g>
      <WaterPanel x={x} y={waterTop} w={w} h={waterH} />

      {/* Chain lying on seabed */}
      <line
        x1={la.ax}
        y1={la.ay + 4}
        x2={la.ax + 50}
        y2={la.ay + 4}
        stroke={RC.chain}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="4 3"
        opacity={0.5}
      />
      <line
        x1={ra.ax}
        y1={ra.ay + 4}
        x2={ra.ax - 50}
        y2={ra.ay + 4}
        stroke={RC.chain}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray="4 3"
        opacity={0.5}
      />

      {/* Catenary curve lines */}
      <path d={leftCurve} fill="none" stroke={RC.chain} strokeWidth={2.5} />
      <path d={rightCurve} fill="none" stroke={RC.chain} strokeWidth={2.5} />

      {/* Anchors */}
      <SuctionAnchor cx={la.ax} cy={la.ay} />
      <SuctionAnchor cx={ra.ax} cy={ra.ay} />

      {/* Platform */}
      <FloatingPlatform cx={platformCx} cy={platformCy} />

      {/* Horizontal seabed label */}
      <text
        className="rc-panel-label"
        x={x + w / 2}
        y={seabedY + 18}
        textAnchor="middle"
        fill={RC.textMuted}
        fontSize={8}
        fontFamily="sans-serif"
        fontStyle="italic"
      >
        horizontal at seabed — suction / drag anchors
      </text>

      {/* Depth label */}
      <line x1={x + w - 14} y1={waterTop + 2} x2={x + w - 14} y2={seabedY - 2} stroke={RC.textMuted} strokeWidth={1} />
      <text className="rc-panel-label" x={x + w - 22} y={waterTop + waterH * 0.4} fill={RC.textMuted} fontSize={9} fontFamily="sans-serif" writingMode="tb">
        50–400m
      </text>

      {/* Panel header */}
      <rect x={x} y={y} width={w} height={28} fill={RC.bgMid} />
      <text x={x + w / 2} y={y + 18} textAnchor="middle" fill={RC.text} fontSize={13} fontWeight="600" fontFamily="sans-serif">
        Catenary Mooring
      </text>
    </g>
  )
}

// ── Panel data — single source of truth for the SVG panels and the HTML detail cards ──

type PanelKey = 'taut' | 'catenary'

interface PanelInfo {
  key: PanelKey
  num: number
  label: string
  color: string
  dim: string
  mid: string
  Illustration: (props: { x: number; y: number; w: number; h: number }) => JSX.Element
  rows: { lbl: string; val: string }[]
}

const PANELS: PanelInfo[] = [
  {
    key: 'taut',
    num: 1,
    label: 'Taut Angle Mooring',
    color: RC.green,
    dim: RC.greenDim,
    mid: RC.greenMid,
    Illustration: TautAnglePanel,
    rows: [
      { lbl: 'Line angle',      val: 'Straight, 30–60° from vertical' },
      { lbl: 'Restoring force', val: 'Line elasticity + geometry' },
      { lbl: 'Footprint',       val: 'Smaller seabed footprint' },
      { lbl: 'Water depth',     val: 'Deep water (300 m+)' },
      { lbl: 'Anchors',         val: 'Driven / plate anchors (VLA)' },
      { lbl: 'Use case',        val: 'Newer FLOW concepts' },
    ],
  },
  {
    key: 'catenary',
    num: 2,
    label: 'Catenary Mooring',
    color: RC.blue,
    dim: RC.blueDim,
    mid: RC.blueMid,
    Illustration: CatenaryPanel,
    rows: [
      { lbl: 'Line angle',      val: 'Curved (sag), horizontal at seabed' },
      { lbl: 'Restoring force', val: 'Lifting chain weight off seabed' },
      { lbl: 'Footprint',       val: 'Large seabed footprint' },
      { lbl: 'Water depth',     val: 'Wide range (50–400 m)' },
      { lbl: 'Anchors',         val: 'Suction / drag / fluke anchors' },
      { lbl: 'Use case',        val: 'O&G-derived, most common today' },
    ],
  },
]

const W = 880
const PAD = 20
const GUTTER = 12
const PANEL_W = (W - PAD * 2 - GUTTER) / 2
const PANEL_H = 360
const SVG_H = PAD + PANEL_H + PAD

// ── Main SVG ──────────────────────────────────────────────────────────────────

function MooringSVG({ active, setActive }: { active: PanelKey | null; setActive: (k: PanelKey | null) => void }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${SVG_H}`}
      width="100%"
      style={{ display: 'block', maxWidth: W, minWidth: 320 }}
      aria-label="Taut angle vs catenary mooring configurations"
    >
      <rect width={W} height={SVG_H} fill={RC.bgDark} rx={8} />
      <BlueprintFrame w={W} h={SVG_H} />

      {/* Divider */}
      <line x1={PAD + PANEL_W + GUTTER / 2} y1={PAD} x2={PAD + PANEL_W + GUTTER / 2} y2={PAD + PANEL_H}
        stroke={RC.bgMid} strokeWidth={1} />

      {PANELS.map((p, i) => {
        const x = PAD + i * (PANEL_W + GUTTER)
        const isActive = active === p.key
        const isDimmed = active !== null && !isActive
        const Illustration = p.Illustration
        return (
          <g
            key={p.key}
            className="rc-panel-hit"
            style={{ opacity: isDimmed ? 0.32 : 1 }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${p.label}`}
            onMouseEnter={() => setActive(p.key)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(p.key)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === p.key ? null : p.key)}
          >
            <g className="rc-panel-enter" style={{ '--rc-delay': `${p.num * 0.10}s` } as React.CSSProperties}>
              {/* Highlight backdrop, brightens while active */}
              <rect x={x} y={PAD} width={PANEL_W} height={PANEL_H} fill={p.color} opacity={isActive ? 0.06 : 0} />

              <Illustration x={x} y={PAD} w={PANEL_W} h={PANEL_H} />
            </g>
          </g>
        )
      })}
    </svg>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export default function MooringSystemsDiagram() {
  const [active, setActive] = useState<PanelKey | null>(null)

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
            Taut Angle vs Catenary Mooring
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
            Two ways to hold a floating platform in place — tap a configuration below to highlight it
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
        <MooringSVG active={active} setActive={setActive} />
      </div>

      {/* Detail cards — key differences, always legible */}
      <div
        className="px-6 py-4 grid gap-3"
        style={{ borderTop: `1px solid ${RC.cardBorder}`, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
      >
        {PANELS.map((p) => {
          const isActive = active === p.key
          return (
            <div
              key={p.key}
              className="rc-detail-card rounded-lg p-3"
              style={{
                background: isActive ? rcRgba(p.color, 0.10) : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? rcRgba(p.color, 0.45) : RC.cardBorder}`,
              }}
              tabIndex={0}
              role="button"
              aria-label={`Highlight ${p.label}`}
              onMouseEnter={() => setActive(p.key)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(p.key)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active === p.key ? null : p.key)}
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
                {p.rows.map((row) => (
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

      {/* Legend */}
      <div
        className="px-6 py-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px]"
        style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}
      >
        <span className="flex items-center gap-1.5">
          <span style={{ display: 'inline-block', width: 8, height: 8, background: RC.chain, opacity: 0.8 }} />
          Mooring line / chain
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ display: 'inline-block', width: 8, height: 8, background: RC.amber, opacity: 0.8 }} />
          Anchor (driven)
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ display: 'inline-block', width: 8, height: 8, background: RC.bgMid, border: `1px solid ${RC.amber}` }} />
          Anchor (suction)
        </span>
      </div>

      {/* Caption */}
      <figcaption
        className="px-6 py-3 text-xs"
        style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white30 }}
      >
        Taut angle mooring uses straight, angled lines anchored deep for a smaller footprint; catenary mooring relies on the weight of a curved, sagging chain lying flat at the seabed.
      </figcaption>
    </figure>
  )
}
