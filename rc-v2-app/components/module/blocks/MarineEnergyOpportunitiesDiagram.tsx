// ─────────────────────────────────────────────────────────────────────────────
// MarineEnergyOpportunitiesDiagram — RC Diagram Design Language v1.2
// (comparison-panel variant, dense .rc-detail-card sub-pattern — see
// HydropowerTypesDiagram for the reference build)
//
// Three-Pillar Infographic — Marine Energy Opportunities
//
// Replaces Infographics/SOCIAL OPPOR_2.webp in SM13 Section 4b.
//
// THREE PILLARS (left-to-right), each with 5 sub-items (icon + label + detail):
//
// ① SOCIAL OPPORTUNITIES (RC Green)
// ② ECONOMIC OPPORTUNITIES (Blue)
// ③ ENVIRONMENTAL OPPORTUNITIES (Teal)
//
// Ported onto the standard RC card shell: BlueprintFrame, numbered/interactive
// pillar panels, staggered entrance, hover/tap sibling-dimming. Each pillar
// used to carry all 5 items' icon/label/detail as hand-wrapped SVG text down
// to 7.8px — the same mobile-legibility problem as the callout and other
// comparison-panel diagrams, just multiplied by 15 text items. The item
// label/detail text is now hidden below 768px and mirrored in full-size HTML
// detail cards under the diagram, synced to the same hover/tap highlight as
// the SVG pillars.
// ────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'

// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:      brand.green,
  greenDim:   rcRgba(brand.green, 0.12),
  greenMid:   rcRgba(brand.green, 0.35),
  blue:       brand.blue,
  blueDim:    rcRgba(brand.blue, 0.12),
  blueMid:    rcRgba(brand.blue, 0.35),
  teal:       brand.cyan,
  tealDim:    rcRgba(brand.cyan, 0.12),
  tealMid:    rcRgba(brand.cyan, 0.35),
  amber:      brand.amber,
  white90:    'rgba(255,255,255,0.90)',
  white70:    'rgba(255,255,255,0.70)',
  white50:    'rgba(255,255,255,0.50)',
  white35:    'rgba(255,255,255,0.35)',
  white20:    'rgba(255,255,255,0.20)',
  white18:    'rgba(255,255,255,0.18)',
  white12:    'rgba(255,255,255,0.12)',
  white10:    'rgba(255,255,255,0.08)',
  white08:    'rgba(255,255,255,0.08)',
  cardBg:     'rgba(10,15,20,0.85)',
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
      .rc-detail-card { cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease; }
      .rc-detail-card:focus-visible, .rc-panel-hit:focus-visible {
        outline: 2px solid ${RC.green}; outline-offset: 2px;
      }
      /* Same mobile fix as the other comparison-panel diagrams: below ~768px
         the diagram has shrunk enough that the 15 item labels/details
         (7.8–9px in a 980-unit canvas) are no longer legible. Hide them and
         let the HTML detail cards below — plain HTML, always full-size —
         carry the reading; the pillar header and item icons stay so each
         pillar still reads as a shape with an identity. */
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
        <pattern id="rcGridMR" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowMR" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.blue, 0.08)} />
          <stop offset="100%" stopColor={rcRgba(brand.blue, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridMR)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowMR)" />
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

const W     = 980
const PAD   = 18
const TOP_Y = 20
const COL_H = 390

// Column geometry — 3 equal pillars
const COL_W   = (W - PAD * 2 - 32) / 3   // gap of 16 between each
const COL_GAP = 16
const COL1_X  = PAD
const COL2_X  = COL1_X + COL_W + COL_GAP
const COL3_X  = COL2_X + COL_W + COL_GAP
const H       = TOP_Y * 2 + COL_H

// ── Pillar data ────────────────────────────────────────────────────────────────
interface PillarItem {
  icon: string
  label: string
  detail: string
}

interface PillarData {
  num: string
  index: number
  label: string
  icon: string
  color: string
  dim: string
  mid: string
  items: PillarItem[]
}

const socialItems: PillarItem[] = [
  {
    icon: '🏝️',
    label: 'Island Energy Independence',
    detail: 'Reduce diesel dependency in remote|and island communities.',
  },
  {
    icon: '🛠️',
    label: 'Skills & Local Employment',
    detail: 'Engineers, technicians, scientists|in coastal communities.',
  },
  {
    icon: '🏗️',
    label: 'Infrastructure Catalysts',
    detail: 'Upgraded ports, roads, and|communications for regions.',
  },
  {
    icon: '🤝',
    label: 'Community Ownership',
    detail: 'Co-owned projects build trust and|share benefits equitably.',
  },
  {
    icon: '🌐',
    label: 'SDG Alignment',
    detail: 'Supports SDG 7, 8, 11, 13|and 14 simultaneously.',
  },
]

const economicItems: PillarItem[] = [
  {
    icon: '💼',
    label: 'Local Job Creation',
    detail: 'Diverse, skilled roles in coastal|areas with few alternatives.',
  },
  {
    icon: '🔗',
    label: 'Supply Chain Development',
    detail: 'Marine construction, logistics,|vessel ops, consultancy.',
  },
  {
    icon: '🏭',
    label: 'Industrial Diversification',
    detail: 'Repurpose oil & gas skills,|yards, and infrastructure.',
  },
  {
    icon: '📦',
    label: 'Export Potential',
    detail: 'Technology & expertise leaders|(UK, Canada, S. Korea) export.',
  },
  {
    icon: '🛡️',
    label: 'Energy Security',
    detail: 'Locally generated, predictable|power — no fuel imports.',
  },
]

const environmentalItems: PillarItem[] = [
  {
    icon: '🌿',
    label: 'Zero Operational Emissions',
    detail: 'No CO₂ during operation;|favourable lifecycle carbon.',
  },
  {
    icon: '📅',
    label: 'Predictability Advantage',
    detail: 'Tidal cycles forecast decades|ahead — grid stability value.',
  },
  {
    icon: '📐',
    label: 'Small Spatial Footprint',
    detail: 'Avoids land-use conflicts;|coexists with conservation zones.',
  },
  {
    icon: '🐠',
    label: 'Artificial Reef Effect',
    detail: 'Foundations attract marine life;|increase local biodiversity.',
  },
  {
    icon: '💧',
    label: 'Water Security Co-Benefits',
    detail: 'Couple with desalination for|low-carbon fresh water supply.',
  },
]

const pillars: PillarData[] = [
  { num: '①', index: 1, label: 'SOCIAL OPPORTUNITIES', icon: '🏘️', color: RC.green, dim: RC.greenDim, mid: RC.greenMid, items: socialItems },
  { num: '②', index: 2, label: 'ECONOMIC OPPORTUNITIES', icon: '💰', color: RC.blue, dim: RC.blueDim, mid: RC.blueMid, items: economicItems },
  { num: '③', index: 3, label: 'ENVIRONMENTAL OPPORTUNITIES', icon: '🌊', color: RC.teal, dim: RC.tealDim, mid: RC.tealMid, items: environmentalItems },
]

// Pillar SVG panel
function Pillar({
  x, w, h, pillar, isActive, isDimmed, onEnter, onLeave, onClick,
}: {
  x: number; w: number; h: number
  pillar: PillarData
  isActive: boolean
  isDimmed: boolean
  onEnter: () => void
  onLeave: () => void
  onClick: () => void
}) {
  const headerH = 72
  const { label, icon, num, color, dim, mid, items } = pillar

  return (
    <g
      className="rc-panel-hit"
      style={{ opacity: isDimmed ? 0.32 : 1 }}
      tabIndex={0}
      role="button"
      aria-label={`Highlight ${label}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onClick}
    >
      <g className="rc-panel-enter" style={{ '--rc-delay': `${pillar.index * 0.10}s` } as React.CSSProperties}>
        {/* Pillar body */}
        <rect x={x} y={TOP_Y} width={w} height={h} rx={10}
          fill={dim} stroke={isActive ? color : mid} strokeWidth={isActive ? 1.8 : 1.3} strokeOpacity={isActive ? 0.85 : 0.55} />

        {/* Header band */}
        <rect x={x} y={TOP_Y} width={w} height={headerH} rx={10} fill={mid} />
        <rect x={x} y={TOP_Y + headerH - 10} width={w} height={10} fill={mid} />

        {/* Number badge */}
        <circle cx={x + 24} cy={TOP_Y + 22} r={14}
          fill={rcRgba(color, isActive ? 0.32 : 0.15)} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
        <text x={x + 24} y={TOP_Y + 22}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={12} fontWeight="800"
          fontFamily="Inter, system-ui, sans-serif" fill={RC.white90}>
          {num}
        </text>

        {/* Icon */}
        <text x={x + w - 26} y={TOP_Y + 22}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={22} fontFamily="Inter, system-ui, sans-serif">
          {icon}
        </text>

        {/* Pillar label — always visible, mirrors the detail-card header on mobile */}
        <text x={x + w / 2} y={TOP_Y + 48}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={10} fontWeight="800" letterSpacing="0.07em"
          fontFamily="Inter, system-ui, sans-serif" fill={RC.white90}>
          {label}
        </text>

        {/* Items */}
        {items.map((item, i) => {
          const itemY = TOP_Y + headerH + 10 + i * 60
          return (
            <g key={i}>
              {i > 0 && (
                <line x1={x + 12} y1={itemY - 4} x2={x + w - 12} y2={itemY - 4}
                  stroke={color} strokeWidth={0.5} strokeOpacity={0.20} />
              )}
              <text x={x + 14} y={itemY + 12}
                fontSize={16} fontFamily="Inter, system-ui, sans-serif">
                {item.icon}
              </text>
              <text className="rc-panel-label" x={x + 34} y={itemY + 12}
                dominantBaseline="middle"
                fontSize={9} fontWeight="700"
                fontFamily="Inter, system-ui, sans-serif" fill={color}>
                {item.label}
              </text>
              {item.detail.split('|').map((line, li) => (
                <text key={li} className="rc-panel-label" x={x + 34} y={itemY + 28 + li * 12}
                  fontSize={7.8} fontFamily="Inter, system-ui, sans-serif"
                  fill={RC.white50}>
                  {line.trim()}
                </text>
              ))}
            </g>
          )
        })}
      </g>
    </g>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function MarineEnergyOpportunitiesDiagram({
  title   = 'Marine Energy Opportunities',
  caption,
}: {
  title?: string
  caption?: string
}) {
  const [active, setActive] = useState<number | null>(null)

  const hubCY = TOP_Y + COL_H / 2

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
            Three dimensions of opportunity — social, economic, environmental — tap a pillar to highlight it
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
        <svg
          viewBox={`0 0 ${W} ${H}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', maxWidth: W, display: 'block', margin: '0 auto' }}
          aria-label={title}
        >
          <BlueprintFrame w={W} h={H} />

          {/* Connection lines pillar → pillar (decorative, behind pillars) */}
          <line x1={COL1_X + COL_W} y1={hubCY} x2={COL2_X} y2={hubCY}
            stroke={RC.white12} strokeWidth={1} />
          <line x1={COL2_X + COL_W} y1={hubCY} x2={COL3_X} y2={hubCY}
            stroke={RC.white12} strokeWidth={1} />

          {/* ── Three Pillars ─────────────────────────────────────────────────── */}
          {pillars.map((p, i) => {
            const colX = [COL1_X, COL2_X, COL3_X][i]
            const isActive = active === p.index
            const isDimmed = active !== null && !isActive
            return (
              <Pillar
                key={p.index}
                x={colX} w={COL_W} h={COL_H}
                pillar={p}
                isActive={isActive}
                isDimmed={isDimmed}
                onEnter={() => setActive(p.index)}
                onLeave={() => setActive(null)}
                onClick={() => setActive(active === p.index ? null : p.index)}
              />
            )
          })}
        </svg>
      </div>

      {/* Detail cards — full item list per pillar, always legible */}
      <div
        className="px-6 py-4 grid gap-3"
        style={{ borderTop: `1px solid ${RC.cardBorder}`, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
      >
        {pillars.map((p) => {
          const isActive = active === p.index
          return (
            <div
              key={p.index}
              className="rc-detail-card rounded-lg p-3"
              style={{
                background: isActive ? rcRgba(p.color, 0.10) : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? rcRgba(p.color, 0.45) : RC.cardBorder}`,
              }}
              tabIndex={0}
              role="button"
              aria-label={`Highlight ${p.label}`}
              onMouseEnter={() => setActive(p.index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(p.index)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active === p.index ? null : p.index)}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: rcRgba(p.color, isActive ? 0.28 : 0.16), border: `1px solid ${p.color}`, color: p.color, fontFamily: "'Montserrat', sans-serif" }}
                >
                  {String(p.index).padStart(2, '0')}
                </span>
                <span className="text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white70, fontFamily: "'Montserrat', sans-serif" }}>
                  {p.icon} {p.label}
                </span>
              </div>
              <dl className="text-[11px] leading-snug space-y-1.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                {p.items.map((item) => (
                  <div key={item.label} className="flex items-start gap-1.5">
                    <span className="flex-shrink-0" style={{ fontSize: 12 }}>{item.icon}</span>
                    <div>
                      <dt className="text-[10px] font-bold" style={{ color: p.color, opacity: 0.90 }}>{item.label}</dt>
                      <dd className="mt-0.5" style={{ color: RC.white70 }}>{item.detail.split('|').join(' ')}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          )
        })}
      </div>

      {/* Bottom summary */}
      <div className="px-6 py-3 text-center" style={{ borderTop: `1px solid ${RC.cardBorder}` }}>
        <p className="text-[10px]" style={{ color: RC.white70, fontFamily: "'Montserrat', sans-serif" }}>
          When designed &amp; delivered inclusively, marine energy projects contribute to multiple UN SDGs:
        </p>
        <p className="text-[10px] mt-1" style={{ color: RC.white50, fontFamily: "'Montserrat', sans-serif" }}>
          SDG 7 (Clean Energy) · SDG 8 (Decent Work) · SDG 13 (Climate Action) · SDG 14 (Life Below Water)
        </p>
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
      }}>Source: Ocean Energy Europe; IEA Ocean Energy Technology Brief 2020; UN SDG Framework</p>
    </figure>
  )
}
