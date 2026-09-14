'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'
// ─────────────────────────────────────────────────────────────────────────────
// SubseaCableTypesDiagram — RC Diagram Design Language v1.2 (comparison-panel variant)
// Array Cable vs Export Cable cross-sections — two-panel SVG showing internal
// construction, plus an HTML detail-card grid carrying the key characteristics
// (voltage / purpose / length / movement / armour) legibly on mobile.
//
// Comparison-panel shape: whole panel is the interactive unit (2 variants,
// not 4 — see FixedFoundationTypesDiagram for the reference build). Detail
// cards used instead of a bare legend row because the per-type characteristics
// here are prose-dense (5 attribute rows each), same call as Geothermal/
// Hydropower/MooringSystems. All cross-section illustration geometry
// (Ring/ConductorBundle/ArrayCableXS/ExportCableXS/AnnotArrow) preserved
// exactly — only the styling/interactivity/mobile layer is added.
// ─────────────────────────────────────────────────────────────────────────────

const RC = {
  green:      brand.green,
  greenDim:   rcRgba(brand.green, 0.15),
  blue:       brand.blue,
  blueDim:    rcRgba(brand.blue, 0.20),
  amber:      brand.amber,
  bgDark:     '#0f172a',
  bgMid:      '#1e293b',
  bgPanel:    '#162032',
  text:       '#e2e8f0',
  textMuted:  '#94a3b8',
  white90:    'rgba(255,255,255,0.90)',
  white70:    'rgba(255,255,255,0.70)',
  white45:    'rgba(255,255,255,0.45)',
  white30:    'rgba(255,255,255,0.30)',
  white18:    'rgba(255,255,255,0.18)',
  white10:    'rgba(255,255,255,0.08)',
  cardBg:     'rgba(10,15,20,0.80)',
  cardBorder: 'rgba(255,255,255,0.08)',
}

// ── Cable layer colours ───────────────────────────────────────────────────────
const CL = {
  outerSheath:    '#3a3a4a',
  armouring:      '#8899aa',
  bedding:        '#4a3a2a',
  insulation:     '#8B4513',
  semicon:        '#2a2a2a',
  conductor:      '#c87533',
  filler:         '#2a3040',
  opticalTube:    '#e8e830',
  jelly:          '#2a3520',
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
      /* Same mobile fix as the rest of the family: below ~768px the diagram
         has shrunk enough that inline SVG spec/annotation/footnote text is
         no longer legible. Hide it and let the detail cards (plain HTML,
         always full-size) carry the reading; panel titles stay put since
         they're short single labels, not paragraphs. */
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
        <pattern id="rcGridSC" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowSC" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridSC)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowSC)" />
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

// ── Cross-section ring helper ────────────────────────────────────────────────

interface RingProps {
  cx: number
  cy: number
  r: number
  fill: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
}

function Ring({ cx, cy, r, fill, stroke, strokeWidth = 1, opacity = 1 }: RingProps) {
  return <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} />
}

// ── Individual conductor (one of 3 phases) ───────────────────────────────────

function ConductorBundle({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  // Semicon outer
  return (
    <g>
      <Ring cx={cx} cy={cy} r={r} fill={CL.insulation} />
      <Ring cx={cx} cy={cy} r={r * 0.6} fill={CL.semicon} />
      <Ring cx={cx} cy={cy} r={r * 0.5} fill={CL.conductor} />
      {/* Stranded conductor hint */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => (
        <circle
          key={i}
          cx={cx + (r * 0.3) * Math.cos((deg * Math.PI) / 180)}
          cy={cy + (r * 0.3) * Math.sin((deg * Math.PI) / 180)}
          r={r * 0.08}
          fill="#d4833a"
          opacity={0.6}
        />
      ))}
    </g>
  )
}

// ── Array Cable cross-section (66kV, 3-core, dynamic) ────────────────────────

function ArrayCableXS({ cx, cy, radius }: { cx: number; cy: number; radius: number }) {
  const R = radius
  const bundleR = R * 0.22

  // Three phase conductors arranged in triangle
  const angle = [270, 30, 150] // degrees
  const bundleCentres = angle.map((a) => ({
    x: cx + (R * 0.45) * Math.cos((a * Math.PI) / 180),
    y: cy + (R * 0.45) * Math.sin((a * Math.PI) / 180),
  }))

  // Fibre optic (between conductors)
  const foAngle = [90, 210, 330]
  const foCentres = foAngle.map((a) => ({
    x: cx + (R * 0.42) * Math.cos((a * Math.PI) / 180),
    y: cy + (R * 0.42) * Math.sin((a * Math.PI) / 180),
  }))

  return (
    <g>
      {/* Outer sheath */}
      <Ring cx={cx} cy={cy} r={R} fill={CL.outerSheath} stroke="#555" strokeWidth={1} />
      {/* Inner sheath */}
      <Ring cx={cx} cy={cy} r={R * 0.95} fill={CL.armouring} />
      {/* Bedding */}
      <Ring cx={cx} cy={cy} r={R * 0.85} fill={CL.bedding} />
      {/* Inner sheath */}
      <Ring cx={cx} cy={cy} r={R * 0.78} fill={CL.filler} />

      {/* Filler */}
      <Ring cx={cx} cy={cy} r={R * 0.76} fill={CL.filler} />

      {/* Phase conductors */}
      {bundleCentres.map((bc, i) => (
        <ConductorBundle key={i} cx={bc.x} cy={bc.y} r={bundleR} />
      ))}

      {/* Fibre optic tubes */}
      {foCentres.map((fc, i) => (
        <g key={i}>
          <circle cx={fc.x} cy={fc.y} r={R * 0.04} fill={CL.jelly} />
          <circle cx={fc.x} cy={fc.y} r={R * 0.025} fill={CL.opticalTube} />
        </g>
      ))}

      {/* Armour wire layer hints */}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i * 360) / 24
        const rx = cx + R * 0.91 * Math.cos((a * Math.PI) / 180)
        const ry = cy + R * 0.91 * Math.sin((a * Math.PI) / 180)
        return <circle key={i} cx={rx} cy={ry} r={R * 0.025} fill={CL.armouring} opacity={0.7} />
      })}
    </g>
  )
}

// ── Export Cable cross-section (132–400kV, 3-core, static/HVAC or HVDC) ─────

function ExportCableXS({ cx, cy, radius }: { cx: number; cy: number; radius: number }) {
  const R = radius
  const bundleR = R * 0.22

  // Larger cable — same 3-core arrangement but bigger insulation
  const angle = [270, 30, 150]
  const bundleCentres = angle.map((a) => ({
    x: cx + (R * 0.45) * Math.cos((a * Math.PI) / 180),
    y: cy + (R * 0.45) * Math.sin((a * Math.PI) / 180),
  }))

  const foAngle = [90, 210, 330]
  const foCentres = foAngle.map((a) => ({
    x: cx + (R * 0.42) * Math.cos((a * Math.PI) / 180),
    y: cy + (R * 0.42) * Math.sin((a * Math.PI) / 180),
  }))

  return (
    <g>
      {/* Double outer sheath */}
      <Ring cx={cx} cy={cy} r={R} fill={CL.outerSheath} stroke="#555" strokeWidth={1} />
      {/* Double armour layer */}
      <Ring cx={cx} cy={cy} r={R * 0.96} fill={CL.armouring} />
      {/* Second armour layer */}
      <Ring cx={cx} cy={cy} r={R * 0.88} fill="#6a7a8a" />
      {/* Serving */}
      <Ring cx={cx} cy={cy} r={R * 0.82} fill={CL.bedding} />
      {/* Core screen */}
      <Ring cx={cx} cy={cy} r={R * 0.78} fill={CL.filler} />

      {/* Phase conductors — larger insulation = higher voltage */}
      {bundleCentres.map((bc, i) => (
        <ConductorBundle key={i} cx={bc.x} cy={bc.y} r={bundleR} />
      ))}

      {/* Fibre optic */}
      {foCentres.map((fc, i) => (
        <g key={i}>
          <circle cx={fc.x} cy={fc.y} r={R * 0.04} fill={CL.jelly} />
          <circle cx={fc.x} cy={fc.y} r={R * 0.025} fill={CL.opticalTube} />
        </g>
      ))}

      {/* Double armour wires */}
      {Array.from({ length: 32 }, (_, i) => {
        const a = (i * 360) / 32
        const rx = cx + R * 0.92 * Math.cos((a * Math.PI) / 180)
        const ry = cy + R * 0.92 * Math.sin((a * Math.PI) / 180)
        return <circle key={i} cx={rx} cy={ry} r={R * 0.022} fill={CL.armouring} opacity={0.65} />
      })}
      {/* Second layer */}
      {Array.from({ length: 28 }, (_, i) => {
        const a = (i * 360) / 28 + 6.5
        const rx = cx + R * 0.84 * Math.cos((a * Math.PI) / 180)
        const ry = cy + R * 0.84 * Math.sin((a * Math.PI) / 180)
        return <circle key={i} cx={rx} cy={ry} r={R * 0.020} fill="#707a84" opacity={0.6} />
      })}
    </g>
  )
}

// ── Annotation arrow ─────────────────────────────────────────────────────────

function AnnotArrow({
  x1, y1, x2, y2, label, color,
}: {
  x1: number; y1: number; x2: number; y2: number; label: string; color: string
}) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={1} strokeDasharray="3 2" />
      <circle cx={x1} cy={y1} r={2} fill={color} />
      <text className="rc-panel-label" x={x2 + 2} y={y2 + 4} fill={color} fontSize={9} fontFamily="sans-serif">{label}</text>
    </g>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

function CablePanel({
  x, y, w, h,
  title, voltage, length, dynamic, children,
  color, isActive, isDimmed, onEnter, onLeave, onToggle, delay,
}: {
  x: number; y: number; w: number; h: number
  title: string; voltage: string; length: string; dynamic: string
  children: React.ReactNode
  color: string
  isActive: boolean
  isDimmed: boolean
  onEnter: () => void
  onLeave: () => void
  onToggle: () => void
  delay: number
}) {
  const specs = [
    { k: 'Voltage', v: voltage },
    { k: 'Length', v: length },
    { k: 'Movement', v: dynamic },
  ]

  return (
    <g
      className="rc-panel-hit"
      style={{ opacity: isDimmed ? 0.32 : 1 }}
      tabIndex={0}
      role="button"
      aria-label={`Highlight ${title}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onToggle}
    >
      <g className="rc-panel-enter" style={{ '--rc-delay': `${delay}s` } as React.CSSProperties}>
        {/* Panel bg */}
        <rect x={x} y={y} width={w} height={h} rx={6} fill={RC.bgPanel} stroke={isActive ? color : RC.bgMid} strokeWidth={isActive ? 1.5 : 1} />

        {/* Title bar */}
        <rect x={x} y={y} width={w} height={32} rx={6} fill={RC.bgMid} />
        <rect x={x} y={y + 20} width={w} height={12} fill={RC.bgMid} />
        <text x={x + w / 2} y={y + 20} textAnchor="middle" fill={RC.text} fontSize={14} fontWeight="700" fontFamily="sans-serif">
          {title}
        </text>

        {/* XS illustration */}
        <g>{children}</g>

        {/* Spec rows */}
        {specs.map((s, i) => (
          <g key={i} transform={`translate(${x + w * 0.6}, ${y + 54 + i * 34})`}>
            <text className="rc-panel-label" x={0} y={0} fill={RC.textMuted} fontSize={9} fontFamily="sans-serif">{s.k}</text>
            <text className="rc-panel-label" x={0} y={14} fill={color} fontSize={11} fontWeight="600" fontFamily="sans-serif">{s.v}</text>
          </g>
        ))}

        {/* Divider */}
        <line x1={x + w * 0.57} y1={y + 36} x2={x + w * 0.57} y2={y + h - 60} stroke={RC.bgMid} strokeWidth={1} />
      </g>
    </g>
  )
}

// ── Annotations helper ───────────────────────────────────────────────────────

function ArrayAnnotations({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <AnnotArrow x1={cx} y1={cy - r * 0.45} x2={cx - r - 10} y2={cy - r * 0.6 - 20} label="Conductor (Cu/Al)" color={RC.amber} />
      <AnnotArrow x1={cx + r * 0.6} y1={cy - r * 0.2} x2={cx + r + 10} y2={cy - r * 0.5} label="XLPE Insulation" color={RC.textMuted} />
      <AnnotArrow x1={cx + r * 0.7} y1={cy + r * 0.5} x2={cx + r + 10} y2={cy + r * 0.6} label="Armour wires" color={RC.textMuted} />
      <AnnotArrow x1={cx + r * 0.1} y1={cy + r * 0.45} x2={cx - r - 10} y2={cy + r * 0.55} label="Fibre optic" color={RC.blue} />
    </g>
  )
}

function ExportAnnotations({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <AnnotArrow x1={cx} y1={cy - r * 0.45} x2={cx - r - 10} y2={cy - r * 0.6 - 20} label="Conductor (Cu)" color={RC.amber} />
      <AnnotArrow x1={cx + r * 0.65} y1={cy - r * 0.25} x2={cx + r + 10} y2={cy - r * 0.5} label="XLPE Insulation" color={RC.textMuted} />
      <AnnotArrow x1={cx + r * 0.75} y1={cy + r * 0.4} x2={cx + r + 10} y2={cy + r * 0.55} label="Double armour" color={RC.textMuted} />
      <AnnotArrow x1={cx} y1={cy + r * 0.45} x2={cx - r - 10} y2={cy + r * 0.58} label="Fibre optic" color={RC.blue} />
    </g>
  )
}

// ── Comparison data (single source of truth for detail cards) ──────────────

interface CableInfo {
  id: 'array' | 'export'
  title: string
  color: string
  voltage: string
  purpose: string
  length: string
  movement: string
  armour: string
}

const CABLES: CableInfo[] = [
  {
    id: 'array', title: 'Array Cable', color: RC.green,
    voltage: '33–66 kV', purpose: 'Turbine ↔ substation',
    length: '0.5–3 km segments', movement: 'Dynamic (flexing)', armour: 'Single layer',
  },
  {
    id: 'export', title: 'Export Cable', color: RC.blue,
    voltage: '132–400 kV', purpose: 'Substation → shore',
    length: '20–200 km', movement: 'Static (buried)', armour: 'Double layer',
  },
]

// ── Diagram body ──────────────────────────────────────────────────────────────

function CablesSVG({ active, setActive }: { active: CableInfo['id'] | null; setActive: (id: CableInfo['id'] | null) => void }) {
  const W = 880
  const H = 400
  const pad = 20
  const gutter = 14
  const panelW = (W - pad * 2 - gutter) / 2
  const panelH = 380

  const arrayCX = pad + panelW * 0.38
  const arrayCY = pad + panelH * 0.48
  const arrayR = Math.min(panelW * 0.28, panelH * 0.32)

  const exportCX = pad + panelW + gutter + panelW * 0.38
  const exportCY = pad + panelH * 0.48
  const exportR = arrayR * 1.12

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: W, minWidth: 320, display: 'block', background: RC.bgDark, borderRadius: 8 }}
      aria-label="Array cable vs export cable cross-sections"
    >
      <rect width={W} height={H} fill={RC.bgDark} rx={8} />
      <BlueprintFrame w={W} h={H} />

      {/* Array Cable Panel */}
      <CablePanel
        x={pad} y={pad} w={panelW} h={panelH}
        title="Array Cable"
        voltage="33–66 kV"
        length="0.5–3 km"
        dynamic="Dynamic"
        color={RC.green}
        isActive={active === 'array'}
        isDimmed={active !== null && active !== 'array'}
        onEnter={() => setActive('array')}
        onLeave={() => setActive(null)}
        onToggle={() => setActive(active === 'array' ? null : 'array')}
        delay={0.08}
      >
        <ArrayCableXS cx={arrayCX} cy={arrayCY} radius={arrayR} />
        <ArrayAnnotations cx={arrayCX} cy={arrayCY} r={arrayR} />
        <text className="rc-panel-label" x={arrayCX} y={pad + panelH - 22} textAnchor="middle" fill={RC.textMuted} fontSize={9} fontFamily="sans-serif" fontStyle="italic">
          flexes with platform motion
        </text>
      </CablePanel>

      {/* Export Cable Panel */}
      <CablePanel
        x={pad + panelW + gutter} y={pad} w={panelW} h={panelH}
        title="Export Cable"
        voltage="132–400 kV"
        length="20–200 km"
        dynamic="Static"
        color={RC.blue}
        isActive={active === 'export'}
        isDimmed={active !== null && active !== 'export'}
        onEnter={() => setActive('export')}
        onLeave={() => setActive(null)}
        onToggle={() => setActive(active === 'export' ? null : 'export')}
        delay={0.16}
      >
        <ExportCableXS cx={exportCX} cy={exportCY} radius={exportR} />
        <ExportAnnotations cx={exportCX} cy={exportCY} r={exportR} />
        <text className="rc-panel-label" x={exportCX} y={pad + panelH - 22} textAnchor="middle" fill={RC.textMuted} fontSize={9} fontFamily="sans-serif" fontStyle="italic">
          laid on / buried in seabed
        </text>
      </CablePanel>

      {/* Note */}
      <text x={W - pad} y={H - 8} textAnchor="end" fill={RC.textMuted} fontSize={8} fontFamily="sans-serif" fontStyle="italic">
        Cross-section diagrams schematic only — not to scale
      </text>
    </svg>
  )
}

// ── Detail cards — the key characteristics per cable type, always legible ───

function DetailCards({ active, setActive }: { active: CableInfo['id'] | null; setActive: (id: CableInfo['id'] | null) => void }) {
  return (
    <div
      className="px-6 py-4 grid gap-3"
      style={{ borderTop: `1px solid ${RC.cardBorder}`, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
    >
      {CABLES.map((c) => {
        const isActive = active === c.id
        return (
          <div
            key={c.id}
            className="rc-detail-card rounded-lg p-3"
            style={{
              background: isActive ? rcRgba(c.color, 0.10) : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isActive ? rcRgba(c.color, 0.45) : RC.cardBorder}`,
            }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${c.title}`}
            onMouseEnter={() => setActive(c.id)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(c.id)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(active === c.id ? null : c.id)}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
                style={{ background: c.color }}
              />
              <span className="text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white70, fontFamily: "'Montserrat', sans-serif" }}>
                {c.title}
              </span>
            </div>
            <dl className="text-[11px] leading-snug space-y-1.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {[
                { lbl: 'Voltage', val: c.voltage },
                { lbl: 'Purpose', val: c.purpose },
                { lbl: 'Length', val: c.length },
                { lbl: 'Movement', val: c.movement },
                { lbl: 'Armour', val: c.armour },
              ].map((row) => (
                <div key={row.lbl}>
                  <dt className="uppercase tracking-wide text-[9px] font-bold" style={{ color: c.color, opacity: 0.85 }}>{row.lbl}</dt>
                  <dd className="mt-0.5" style={{ color: RC.white70 }}>{row.val}</dd>
                </div>
              ))}
            </dl>
          </div>
        )
      })}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function SubseaCableTypesDiagram() {
  const [active, setActive] = useState<CableInfo['id'] | null>(null)

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
            Subsea Cable Types
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white45, fontFamily: "'Montserrat', sans-serif" }}>
            Array cable vs export cable — tap a cross-section to highlight it
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
        <CablesSVG active={active} setActive={setActive} />
      </div>

      {/* Detail cards */}
      <DetailCards active={active} setActive={setActive} />

      {/* Caption */}
      <figcaption
        className="px-6 py-3 text-xs"
        style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white30 }}
      >
        Internal construction and key characteristics of the two main subsea cable types used in offshore wind
      </figcaption>
    </figure>
  )
}
