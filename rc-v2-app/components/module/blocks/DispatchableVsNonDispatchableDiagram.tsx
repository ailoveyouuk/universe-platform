// ─────────────────────────────────────────────────────────────────────────────
// DispatchableVsNonDispatchableDiagram — RC Diagram Design Language v1.2
// (comparison-panel variant)
//
// Side-by-side comparison of dispatchable vs non-dispatchable power sources:
//
//   LEFT (green)  DISPATCHABLE    — flat/stable output SVG line
//                                   Coal/Gas, Nuclear, Hydro, Battery, DSR
//
//   RIGHT (amber) NON-DISPATCHABLE — variable/wavy output SVG line
//                                   Solar PV, Onshore Wind, Offshore Wind,
//                                   Run-of-River Hydro
//
//   BOTTOM        GRID BALANCING SOLUTIONS
//                 Geographic Dispersion | Grid Interconnections |
//                 Forecasting | Hybrid Systems | Storage
//
// Ported from the earlier "Mauna Loa Design Language" pass (card shell + RC
// tokens only) onto the standard v1.2 comparison-panel treatment:
// BlueprintFrame, staggered entrance, whole-panel hover/tap highlight with
// sibling dimming. Unlike the single-canvas comparison diagrams (e.g.
// FixedFoundationTypesDiagram), each side here already carried its output
// profile as its own small standalone SVG plus an HTML example list — that
// illustration geometry is preserved exactly. The BlueprintFrame is added as
// a shared decorative backdrop behind both panels, and the small in-chart
// axis/caption text (the only text that shrinks with the diagram) gets the
// family's mobile-hide treatment — the always-HTML example lists already
// carry the reading at any viewport, same role the legend/detail-card plays
// in the other comparison-panel diagrams.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'
// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:      brand.green,
  greenDim:   rcRgba(brand.green, 0.12),
  greenMid:   rcRgba(brand.green, 0.45),
  amber:      brand.amber,
  amberDim:   rcRgba(brand.amber, 0.12),
  amberMid:   rcRgba(brand.amber, 0.45),
  blue:       brand.blue,
  blueDim:    rcRgba(brand.blue, 0.15),
  white90:    'rgba(255,255,255,0.90)',
  white70:    'rgba(255,255,255,0.70)',
  white50:    'rgba(255,255,255,0.50)',
  white30:    'rgba(255,255,255,0.30)',
  white18:    'rgba(255,255,255,0.18)',
  white15:    'rgba(255,255,255,0.15)',
  white10:    'rgba(255,255,255,0.10)',
  white08:    'rgba(255,255,255,0.08)',
  cardBg:     'rgba(10,15,20,0.85)',
  panelBg:    'rgba(255,255,255,0.04)',
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
      .rc-panel-hit { cursor: pointer; transition: opacity 0.18s ease, transform 0.18s ease; }
      .rc-panel-hit:focus-visible {
        outline: 2px solid ${RC.green}; outline-offset: 2px;
      }
      /* Same mobile fix as the other comparison-panel diagrams: below
         ~768px the chart SVGs have shrunk enough that their inline axis
         and caption text is no longer legible. Hide it there — the HTML
         "Examples" list below each chart already carries the reading at
         any viewport. */
      @media (max-width: 767px) {
        .rc-chart-label { display: none; }
      }
    `}</style>
  )
}

// ── Blueprint frame: grid + corner brackets ───────────────────────────────────
// Shared decorative backdrop behind both panels (each side keeps its own
// unchanged chart SVG on top of this). The panels here are an HTML flex
// row of variable/responsive height rather than one fixed-viewBox canvas,
// so — unlike the single-canvas comparison diagrams — the dot-grid/glow
// texture is drawn with CSS (exact pixel dot size at any height, no
// stretch distortion) and only the four corner brackets use a small,
// fixed-aspect SVG (ids rcGridDN / rcGlowDN reserved for this file, kept
// free of collisions with any other *Diagram.tsx).
function BlueprintFrame() {
  const bracket = (corner: React.CSSProperties) => (
    <svg width={22} height={22} viewBox="0 0 22 22" aria-hidden
      style={{ position: 'absolute', ...corner }}>
      <path d="M1 15 L1 1 L15 1" fill="none" stroke={RC.white18} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  )
  return (
    <div
      aria-hidden
      style={{
        position:     'absolute',
        inset:        0,
        pointerEvents:'none',
        overflow:     'hidden',
        borderRadius: 12,
      }}
    >
      <div
        id="rcGridDN"
        style={{
          position:        'absolute',
          inset:           0,
          backgroundImage: `radial-gradient(circle at 1px 1px, ${RC.white10} 1px, transparent 1.4px)`,
          backgroundSize:  '22px 22px',
        }}
      />
      <div
        id="rcGlowDN"
        style={{
          position:  'absolute',
          inset:     0,
          background:`radial-gradient(60% 70% at 50% 30%, ${rcRgba(brand.green, 0.07)}, ${rcRgba(brand.green, 0)})`,
        }}
      />
      {bracket({ top: -6, left: -6 })}
      {bracket({ top: -6, right: -6, transform: 'scaleX(-1)' })}
      {bracket({ bottom: -6, left: -6, transform: 'scaleY(-1)' })}
      {bracket({ bottom: -6, right: -6, transform: 'scale(-1,-1)' })}
    </div>
  )
}

// ── Source data ───────────────────────────────────────────────────────────────
const DISPATCHABLE_SOURCES = [
  'Coal & Gas Plants',
  'Nuclear Power',
  'Hydro Reservoirs',
  'Battery Storage',
  'Demand Response',
]

const NON_DISPATCHABLE_SOURCES = [
  'Solar PV',
  'Onshore Wind',
  'Offshore Wind',
  'Run-of-River Hydro',
]

const SOLUTIONS = [
  { label: 'Geographic\nDispersion',   icon: '🌍' },
  { label: 'Grid\nInterconnections',  icon: '⚡' },
  { label: 'Forecasting',             icon: '📡' },
  { label: 'Hybrid\nSystems',         icon: '🔀' },
  { label: 'Storage',                 icon: '🔋' },
]

// ── Flat line path (dispatchable — steady output) ─────────────────────────────
function FlatOutputLine() {
  // Flat line at y=35 with a slight upward ramp at the start
  const path = 'M 10,60 L 30,35 L 190,35 L 210,35'
  return (
    <svg viewBox="0 0 220 80" width="100%" style={{ maxHeight: 80 }} aria-hidden>
      <defs>
        <linearGradient id="flat-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={RC.green} stopOpacity={0.25} />
          <stop offset="100%" stopColor={RC.green} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      {/* Fill area under line */}
      <path
        d="M 10,60 L 30,35 L 210,35 L 210,72 L 10,72 Z"
        fill="url(#flat-fill)"
      />
      {/* The flat line */}
      <path
        d={path}
        stroke={RC.green}
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Y-axis */}
      <line x1={10} y1={10} x2={10} y2={72} stroke={RC.white15} strokeWidth={1} />
      {/* X-axis */}
      <line x1={10} y1={72} x2={215} y2={72} stroke={RC.white15} strokeWidth={1} />
      {/* Arrow head on x-axis */}
      <polygon points="215,69 222,72 215,75" fill={RC.white15} />
      {/* Y-axis label */}
      <text className="rc-chart-label" x={6} y={40} textAnchor="end" fontSize={7} fill={RC.white50} fontFamily="Montserrat, sans-serif">Output</text>
      {/* X-axis label */}
      <text className="rc-chart-label" x={218} y={75} fontSize={7} fill={RC.white50} fontFamily="Montserrat, sans-serif">Time</text>
      {/* "Controllable Output" label */}
      <text className="rc-chart-label" x={115} y={28} textAnchor="middle" fontSize={8} fontWeight="700" fill={RC.green} fontFamily="Montserrat, sans-serif" letterSpacing="0.5">
        Controllable Output
      </text>
    </svg>
  )
}

// ── Variable/wavy line path (non-dispatchable — weather-dependent) ────────────
function VariableOutputLine() {
  // Wavy line simulating solar/wind variability
  const path = 'M 10,55 C 25,55 28,20 45,25 C 62,30 65,55 80,50 C 95,45 100,15 118,22 C 136,29 138,60 155,52 C 172,44 175,30 190,35 L 210,38'
  return (
    <svg viewBox="0 0 220 80" width="100%" style={{ maxHeight: 80 }} aria-hidden>
      <defs>
        <linearGradient id="wave-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={RC.amber} stopOpacity={0.22} />
          <stop offset="100%" stopColor={RC.amber} stopOpacity={0.0} />
        </linearGradient>
        <clipPath id="wave-clip">
          <rect x={10} y={0} width={200} height={72} />
        </clipPath>
      </defs>
      {/* Fill area — approximate by closing path to baseline */}
      <path
        d="M 10,55 C 25,55 28,20 45,25 C 62,30 65,55 80,50 C 95,45 100,15 118,22 C 136,29 138,60 155,52 C 172,44 175,30 190,35 L 210,38 L 210,72 L 10,72 Z"
        fill="url(#wave-fill)"
        clipPath="url(#wave-clip)"
      />
      {/* Wavy line */}
      <path
        d={path}
        stroke={RC.amber}
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Y-axis */}
      <line x1={10} y1={10} x2={10} y2={72} stroke={RC.white15} strokeWidth={1} />
      {/* X-axis */}
      <line x1={10} y1={72} x2={215} y2={72} stroke={RC.white15} strokeWidth={1} />
      {/* Arrow head */}
      <polygon points="215,69 222,72 215,75" fill={RC.white15} />
      {/* Y-axis label */}
      <text className="rc-chart-label" x={6} y={40} textAnchor="end" fontSize={7} fill={RC.white50} fontFamily="Montserrat, sans-serif">Output</text>
      {/* X-axis label */}
      <text className="rc-chart-label" x={218} y={75} fontSize={7} fill={RC.white50} fontFamily="Montserrat, sans-serif">Time</text>
      {/* "Variable Output" label */}
      <text className="rc-chart-label" x={115} y={13} textAnchor="middle" fontSize={8} fontWeight="700" fill={RC.amber} fontFamily="Montserrat, sans-serif" letterSpacing="0.5">
        Variable Output
      </text>
    </svg>
  )
}

// ── Source pill list ──────────────────────────────────────────────────────────
function SourceList({ sources, color }: { sources: string[]; color: string }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {sources.map((src) => (
        <li
          key={src}
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            8,
            padding:        '5px 10px',
            borderRadius:   6,
            background:     color === RC.green ? RC.greenDim : RC.amberDim,
            border:         `1px solid ${color === RC.green ? 'rgba(130,188,0,0.2)' : 'rgba(218,165,32,0.2)'}`,
            fontSize:       13,
            fontFamily:     "'Montserrat', sans-serif",
            color:          RC.white70,
          }}
        >
          <span
            style={{
              width:        7,
              height:       7,
              borderRadius: '50%',
              background:   color,
              flexShrink:   0,
            }}
          />
          {src}
        </li>
      ))}
    </ul>
  )
}

// ── Panel (left or right) ─────────────────────────────────────────────────────
function Panel({
  index,
  side,
  color,
  dimColor,
  label,
  badge,
  sources,
  chart,
  isActive,
  isDimmed,
  setActive,
}: {
  index:    number
  side:     'left' | 'right'
  color:    string
  dimColor: string
  label:    string
  badge:    string
  sources:  string[]
  chart:    React.ReactNode
  isActive: boolean
  isDimmed: boolean
  setActive: (side: 'left' | 'right' | null) => void
}) {
  return (
    <div
      className="rc-panel-hit rc-panel-enter"
      style={{
        '--rc-delay':   `${index * 0.1}s`,
        flex:           1,
        minWidth:       0,
        background:     RC.panelBg,
        border:         `1px solid ${isActive ? color : (color === RC.green ? 'rgba(130,188,0,0.18)' : 'rgba(218,165,32,0.18)')}`,
        borderRadius:   12,
        overflow:       'hidden',
        display:        'flex',
        flexDirection:  'column',
        opacity:        isDimmed ? 0.45 : 1,
      } as React.CSSProperties}
      tabIndex={0}
      role="button"
      aria-label={`Highlight ${label}`}
      onMouseEnter={() => setActive(side)}
      onMouseLeave={() => setActive(null)}
      onFocus={() => setActive(side)}
      onBlur={() => setActive(null)}
      onClick={() => setActive(isActive ? null : side)}
    >
      {/* Panel header */}
      <div
        style={{
          padding:      '12px 16px',
          borderBottom: `1px solid ${RC.white08}`,
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'space-between',
          gap:          8,
          background:   dimColor,
        }}
      >
        <span
          style={{
            fontSize:    14,
            fontWeight:  800,
            fontFamily:  "'Montserrat', sans-serif",
            letterSpacing: '0.08em',
            color,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize:    10,
            fontWeight:  700,
            fontFamily:  "'Montserrat', sans-serif",
            letterSpacing: '0.06em',
            color,
            background:  `${color}20`,
            border:      `1px solid ${color}40`,
            borderRadius: 20,
            padding:     '2px 8px',
            whiteSpace:  'nowrap',
          }}
        >
          {badge}
        </span>
      </div>

      {/* Output chart */}
      <div style={{ padding: '14px 16px 8px' }}>
        {chart}
      </div>

      {/* Source list */}
      <div style={{ padding: '4px 16px 16px', flex: 1 }}>
        <p
          style={{
            fontSize:    10,
            fontWeight:  700,
            letterSpacing: '0.08em',
            fontFamily:  "'Montserrat', sans-serif",
            color:       RC.white30,
            marginBottom: 8,
            textTransform: 'uppercase',
          }}
        >
          Examples
        </p>
        <SourceList sources={sources} color={color} />
      </div>
    </div>
  )
}

// ── Solutions bar ─────────────────────────────────────────────────────────────
function SolutionsBar() {
  return (
    <div
      style={{
        marginTop:    20,
        borderRadius: 12,
        border:       `1px solid ${RC.blueDim}`,
        background:   'rgba(74,158,191,0.06)',
        padding:      '14px 20px',
      }}
    >
      <p
        style={{
          fontSize:     10,
          fontWeight:   800,
          letterSpacing:'0.1em',
          fontFamily:   "'Montserrat', sans-serif",
          color:        RC.blue,
          textAlign:    'center',
          marginBottom: 14,
          textTransform:'uppercase',
        }}
      >
        Grid Balancing Solutions
      </p>
      <div
        style={{
          display:        'flex',
          flexWrap:       'wrap',
          gap:            10,
          justifyContent: 'center',
        }}
      >
        {SOLUTIONS.map((s) => (
          <div
            key={s.label}
            style={{
              display:       'flex',
              flexDirection: 'column',
              alignItems:    'center',
              gap:           4,
              padding:       '8px 14px',
              borderRadius:  8,
              background:    RC.blueDim,
              border:        `1px solid rgba(74,158,191,0.2)`,
              minWidth:      90,
              flex:          '1 1 90px',
              maxWidth:      150,
            }}
          >
            <span style={{ fontSize: 18 }}>{s.icon}</span>
            <span
              style={{
                fontSize:   11,
                fontWeight: 600,
                fontFamily: "'Montserrat', sans-serif",
                color:      RC.white70,
                textAlign:  'center',
                lineHeight: 1.3,
                whiteSpace: 'pre-line',
              }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export function DispatchableVsNonDispatchableDiagram() {
  const [active, setActive] = useState<'left' | 'right' | null>(null)

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
        <div>
          <h3
            className="font-heading font-bold text-base leading-snug"
            style={{ color: RC.white90, fontFamily: "'Montserrat', sans-serif" }}
          >
            Dispatchable vs Non-Dispatchable Power Generation
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white50, fontFamily: "'Montserrat', sans-serif" }}>
            Tap a panel below to highlight dispatchable or non-dispatchable output
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
      <div style={{ padding: '20px 24px 24px' }}>
        {/* Two-panel row, with a shared BlueprintFrame backdrop */}
        <div style={{ position: 'relative' }}>
          <BlueprintFrame />
          <div style={{ position: 'relative', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Panel
              index={1}
              side="left"
              color={RC.green}
              dimColor={RC.greenDim}
              label="DISPATCHABLE"
              badge="Controllable"
              sources={DISPATCHABLE_SOURCES}
              chart={<FlatOutputLine />}
              isActive={active === 'left'}
              isDimmed={active !== null && active !== 'left'}
              setActive={setActive}
            />
            <Panel
              index={2}
              side="right"
              color={RC.amber}
              dimColor={RC.amberDim}
              label="NON-DISPATCHABLE"
              badge="Weather-Dependent"
              sources={NON_DISPATCHABLE_SOURCES}
              chart={<VariableOutputLine />}
              isActive={active === 'right'}
              isDimmed={active !== null && active !== 'right'}
              setActive={setActive}
            />
          </div>
        </div>

        {/* Solutions bar */}
        <SolutionsBar />
      </div>

      {/* Caption */}
      <figcaption
        className="px-6 py-3 text-xs"
        style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white30 }}
      >
        Dispatchable vs Non-Dispatchable power generation — output profiles and grid flexibility characteristics
      </figcaption>
    </figure>
  )
}
