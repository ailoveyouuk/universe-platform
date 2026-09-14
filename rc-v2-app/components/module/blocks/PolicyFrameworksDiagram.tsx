// ─────────────────────────────────────────────────────────────────────────────
// PolicyFrameworksDiagram — RC Diagram Design Language v1.2 (comparison-panel variant)
//
// Policy Frameworks for Renewable Energy Workforce Development
// Three pillars side by side, each a self-contained interactive panel:
//   PILLAR 1 — National Skills Strategies (green)
//   PILLAR 2 — Green Job Creation Initiatives (amber)
//   PILLAR 3 — International Collaboration (blue)
// Each pillar contains three sub-item cards with title + description.
// Bottom strip summarises the Seven Priorities framework.
//
// Ported from the earlier "Mauna Loa Design Language" pass (card shell + RC
// tokens only) onto the standard v1.2 comparison-panel treatment:
// BlueprintFrame, staggered entrance, whole-pillar hover/tap highlight with
// sibling dimming. Each pillar's nine lines of sub-item prose used to be
// hand-set 8.5px SVG text — illegible once the diagram shrinks to fit a
// phone screen. As with GeothermalPlantTypesDiagram / HydropowerTypesDiagram /
// OffshoreVsOnshoreComparisonDiagram, that text now also lives in real HTML
// `.rc-detail-card`s below the diagram (always legible at any viewport),
// while the SVG keeps the pillar shell and sub-card layout as a glanceable
// summary. All original illustration geometry is unchanged.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'

// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:      brand.green,
  greenDim:   rcRgba(brand.green, 0.13),
  blue:       brand.blue,
  blueDim:    rcRgba(brand.blue, 0.13),
  amber:      brand.amber,
  amberDim:   rcRgba(brand.amber, 0.13),
  white90:    'rgba(255,255,255,0.90)',
  white70:    'rgba(255,255,255,0.70)',
  white65:    'rgba(255,255,255,0.65)',
  white50:    'rgba(255,255,255,0.50)',
  white45:    'rgba(255,255,255,0.45)',
  white35:    'rgba(255,255,255,0.35)',
  white20:    'rgba(255,255,255,0.20)',
  white12:    'rgba(255,255,255,0.12)',
  white10:    'rgba(255,255,255,0.10)',
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
         the diagram has shrunk enough that the inline SVG sub-card prose is
         no longer legible. Hide it and let the HTML detail cards (always
         full-size) carry the reading. */
      @media (max-width: 767px) {
        .rc-panel-prose { display: none; }
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
        <pattern id="rcGridPF" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowPF" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.07)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridPF)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowPF)" />
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

// ── Canvas constants (unchanged geometry) ──────────────────────────────────────
const W    = 980
const H    = 462
const PAD  = 20
const COLW = 300
const GAP  = 20

// Column left-edges
const COL1 = PAD                         //  20
const COL2 = PAD + COLW + GAP            // 340
const COL3 = PAD + (COLW + GAP) * 2     // 660

// Vertical rhythm
const BANNER_Y  = 10
const BANNER_H  = 34
const PILLAR_Y  = BANNER_Y + BANNER_H + 8    //  52
const PILLAR_H  = 40
const SUB_H     = 82
const SUB_GAP   = 8
const SUB1_Y    = PILLAR_Y + PILLAR_H + 10  // 102
const SUB2_Y    = SUB1_Y + SUB_H + SUB_GAP  // 192
const SUB3_Y    = SUB2_Y + SUB_H + SUB_GAP  // 282
const BOTTOM_Y  = SUB3_Y + SUB_H + 12       // 376
const BOTTOM_H  = 52

// ── Single source of truth for every pillar ────────────────────────────────────
interface SubItem {
  num: string
  title: string
  lines: string[]
}

interface PillarData {
  key: 'skills' | 'jobs' | 'international'
  index: number
  label: string
  col: string
  dim: string
  bgFill: string
  items: SubItem[]
}

const PILLARS: PillarData[] = [
  {
    key: 'skills', index: 1,
    label: '① NATIONAL SKILLS STRATEGIES',
    col: RC.green, dim: RC.greenDim, bgFill: 'rgba(130,188,0,0.07)',
    items: [
      {
        num: '1', title: 'Skills Mapping & Forecasting',
        lines: [
          'National assessments of current & projected',
          'workforce needs across all renewable sectors.',
          'Identifies gaps before they become crises.',
        ],
      },
      {
        num: '2', title: 'Accredited Qualifications',
        lines: [
          'National frameworks for RE certifications,',
          'vocational qualifications, and professional',
          'development pathways recognised by employers.',
        ],
      },
      {
        num: '3', title: 'Dedicated Training Centres',
        lines: [
          'Specialist centres for offshore wind, solar,',
          'and hydrogen workforce development —',
          'e.g. ORE Catapult, NSTA, National Grid ESO.',
        ],
      },
    ],
  },
  {
    key: 'jobs', index: 2,
    label: '② GREEN JOB CREATION INITIATIVES',
    col: RC.amber, dim: RC.amberDim, bgFill: 'rgba(218,165,32,0.07)',
    items: [
      {
        num: 'A', title: 'EU Green Deal',
        lines: [
          '€1 trillion investment plan targeting clean',
          'energy jobs across EU member states. Includes',
          'the Just Transition Fund for coal regions.',
        ],
      },
      {
        num: 'B', title: 'US Inflation Reduction Act',
        lines: [
          '$369bn in clean energy incentives driving',
          'rapid US renewables workforce expansion —',
          'projected hundreds of thousands of new jobs.',
        ],
      },
      {
        num: 'C', title: 'UK Net Zero Strategy',
        lines: [
          'Targets 480,000 green jobs by 2030. Includes',
          'offshore wind, hydrogen, and heat pump',
          'workforce commitments backed by investment.',
        ],
      },
    ],
  },
  {
    key: 'international', index: 3,
    label: '③ INTERNATIONAL COLLABORATION',
    col: RC.blue, dim: RC.blueDim, bgFill: 'rgba(74,158,191,0.07)',
    items: [
      {
        num: 'I', title: 'IRENA Training Programme',
        lines: [
          'Global workshops & online courses targeting',
          'policymakers, engineers, and technicians',
          'from developing and advanced economies.',
        ],
      },
      {
        num: 'II', title: 'Just Energy Transition Partnerships',
        lines: [
          'International support for fossil-fuel economies',
          '(South Africa, Indonesia) retraining coal &',
          'oil workers for renewable energy roles.',
        ],
      },
      {
        num: 'III', title: 'SEforALL Knowledge Transfer',
        lines: [
          'Technology & knowledge transfer from advanced',
          'markets to underserved regions — building',
          'global capacity for the energy transition.',
        ],
      },
    ],
  },
]

const COL_X: Record<PillarData['key'], number> = {
  skills: COL1,
  jobs: COL2,
  international: COL3,
}

// ── Helper: Pillar header strip ───────────────────────────────────────────────
function PillarHeader({
  x, y, w, h, label, col, dim,
}: {
  x: number; y: number; w: number; h: number
  label: string; col: string; dim: string
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8}
        fill={dim} stroke={col} strokeWidth={1.5} strokeOpacity={0.70} />
      <text
        x={x + w / 2} y={y + h / 2}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={10.5} fontWeight="800" letterSpacing="0.05em"
        fontFamily="Inter, system-ui, sans-serif" fill={col}
      >
        {label}
      </text>
    </g>
  )
}

// ── Helper: Sub-item card ─────────────────────────────────────────────────────
function SubCard({
  x, y, w, h, num, title, lines, col, bgFill,
}: {
  x: number; y: number; w: number; h: number
  num: string; title: string; lines: string[]
  col: string; bgFill: string
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6}
        fill={bgFill} stroke={col} strokeWidth={1} strokeOpacity={0.42} />
      {/* Number badge */}
      <rect x={x + 8} y={y + 8} width={18} height={18} rx={4}
        fill={col} fillOpacity={0.22} stroke={col} strokeWidth={0.8} strokeOpacity={0.50} />
      <text
        x={x + 17} y={y + 17}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={8.5} fontWeight="800"
        fontFamily="Inter, system-ui, sans-serif" fill={col}
      >
        {num}
      </text>
      {/* Title */}
      <text
        x={x + 32} y={y + 17}
        dominantBaseline="middle"
        fontSize={10} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={col}
      >
        {title}
      </text>
      {/* Description lines — hidden on mobile, detail cards carry it there */}
      {lines.map((line, i) => (
        <text
          key={i}
          className="rc-panel-prose"
          x={x + 10} y={y + 36 + i * 14}
          fontSize={8.5}
          fontFamily="Inter, system-ui, sans-serif" fill={RC.white70}
        >
          {line}
        </text>
      ))}
    </g>
  )
}

// ── One pillar (header + 3 sub-cards), the interactive unit ────────────────────
function Pillar({
  pillar, isActive, isDimmed, setActive,
}: {
  pillar: PillarData
  isActive: boolean
  isDimmed: boolean
  setActive: (k: PillarData['key'] | null) => void
}) {
  const x = COL_X[pillar.key]
  const subY = [SUB1_Y, SUB2_Y, SUB3_Y]
  return (
    <g
      className="rc-panel-hit"
      style={{ opacity: isDimmed ? 0.32 : 1 }}
      tabIndex={0}
      role="button"
      aria-label={`Highlight ${pillar.label.replace(/^[①②③]\s*/, '')}`}
      onMouseEnter={() => setActive(pillar.key)}
      onMouseLeave={() => setActive(null)}
      onFocus={() => setActive(pillar.key)}
      onBlur={() => setActive(null)}
      onClick={() => setActive(isActive ? null : pillar.key)}
    >
      <g className="rc-panel-enter" style={{ '--rc-delay': `${pillar.index * 0.08}s` } as React.CSSProperties}>
        {/* Active highlight wash spanning the whole column */}
        <rect x={x} y={PILLAR_Y} width={COLW} height={BOTTOM_Y - PILLAR_Y - 6} rx={8}
          fill={pillar.col} opacity={isActive ? 0.05 : 0} />

        <PillarHeader
          x={x} y={PILLAR_Y} w={COLW} h={PILLAR_H}
          label={pillar.label} col={pillar.col} dim={pillar.dim}
        />

        {pillar.items.map((item, i) => (
          <SubCard
            key={item.num}
            x={x} y={subY[i]} w={COLW} h={SUB_H}
            num={item.num} title={item.title} lines={item.lines}
            col={pillar.col} bgFill={pillar.bgFill}
          />
        ))}
      </g>
    </g>
  )
}

// ── Main SVG ──────────────────────────────────────────────────────────────────
function PolicySVG({
  active, setActive, title,
}: {
  active: PillarData['key'] | null
  setActive: (k: PillarData['key'] | null) => void
  title: string
}) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: W, display: 'block', margin: '0 auto' }}
      aria-label={title}
    >
      <BlueprintFrame w={W} h={H} />

      {/* ── Background card ──────────────────────────────────────────── */}
      <rect width={W} height={H} rx={14}
        fill={RC.cardBg} stroke={RC.cardBorder} strokeWidth={1} />

      {/* ── Top banner ───────────────────────────────────────────────── */}
      <rect x={PAD} y={BANNER_Y} width={W - PAD * 2} height={BANNER_H} rx={8}
        fill={RC.white08} stroke={RC.white20} strokeWidth={1} />
      <text
        x={W / 2} y={BANNER_Y + BANNER_H / 2}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={10.5} fontWeight="800" letterSpacing="0.07em"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white70}
      >
        POLICY FRAMEWORKS FOR RENEWABLE ENERGY WORKFORCE DEVELOPMENT
      </text>

      {/* ── Column dividers ───────────────────────────────────────────── */}
      <line
        x1={COL2 - GAP / 2} y1={PILLAR_Y}
        x2={COL2 - GAP / 2} y2={BOTTOM_Y - 6}
        stroke={RC.white08} strokeWidth={1}
      />
      <line
        x1={COL3 - GAP / 2} y1={PILLAR_Y}
        x2={COL3 - GAP / 2} y2={BOTTOM_Y - 6}
        stroke={RC.white08} strokeWidth={1}
      />

      {/* ── Three pillars — each a whole interactive panel ─────────────── */}
      {PILLARS.map((pillar) => (
        <Pillar
          key={pillar.key}
          pillar={pillar}
          isActive={active === pillar.key}
          isDimmed={active !== null && active !== pillar.key}
          setActive={setActive}
        />
      ))}

      {/* ── Bottom strip — Seven Priorities ──────────────────────────── */}
      <rect x={PAD} y={BOTTOM_Y} width={W - PAD * 2} height={BOTTOM_H} rx={8}
        fill={RC.white08} stroke={RC.cardBorder} strokeWidth={1} />
      <text
        x={W / 2} y={BOTTOM_Y + 17}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={9} fontWeight="700"
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white70}
      >
        Seven Priorities: Map needs · Develop pathways · Engage youth · Support just transition · Attract diverse talent · Invest in international co-operation · Embed lifelong learning
      </text>
      <text
        x={W / 2} y={BOTTOM_Y + 35}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={8.5}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white50}
      >
        Effective implementation requires coordinated action by governments, industry, and educational institutions.
      </text>

      {/* Source note */}
      <text
        x={W / 2} y={H - 7}
        textAnchor="middle" fontSize={7}
        fontFamily="Inter, system-ui, sans-serif" fill={RC.white35}
      >
        Source: IRENA World Energy Transitions Outlook 2023; European Commission Green Deal; US IRA 2022; UK Net Zero Strategy 2023
      </text>
    </svg>
  )
}

// ── Detail cards — full sub-item prose, always legible at any viewport ─────────
function DetailCards({
  active, setActive,
}: {
  active: PillarData['key'] | null
  setActive: (k: PillarData['key'] | null) => void
}) {
  return (
    <div
      className="px-6 py-4 grid gap-3"
      style={{ borderTop: `1px solid ${RC.cardBorder}`, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}
    >
      {PILLARS.map((pillar) => {
        const isActive = active === pillar.key
        return (
          <div
            key={pillar.key}
            className="rc-detail-card rounded-lg p-3"
            style={{
              background: isActive ? rcRgba(pillar.col, 0.10) : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isActive ? rcRgba(pillar.col, 0.45) : RC.cardBorder}`,
            }}
            tabIndex={0}
            role="button"
            aria-label={`Highlight ${pillar.label.replace(/^[①②③]\s*/, '')}`}
            onMouseEnter={() => setActive(pillar.key)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(pillar.key)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(isActive ? null : pillar.key)}
          >
            <span
              className="block text-xs font-bold tracking-wide mb-2.5"
              style={{ color: isActive ? RC.white90 : pillar.col, fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              {pillar.label}
            </span>

            <div className="space-y-2.5">
              {pillar.items.map((item) => (
                <div key={item.num} className="flex items-start gap-2.5">
                  <span
                    className="flex-shrink-0 w-5 h-5 mt-0.5 rounded flex items-center justify-center text-[9px] font-bold"
                    style={{ background: rcRgba(pillar.col, isActive ? 0.28 : 0.16), border: `1px solid ${pillar.col}`, color: pillar.col, fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    {item.num}
                  </span>
                  <span>
                    <span className="block text-[11px] font-semibold" style={{ color: RC.white65, fontFamily: 'Inter, system-ui, sans-serif' }}>
                      {item.title}
                    </span>
                    <span className="block text-[10.5px] leading-snug mt-0.5" style={{ color: RC.white45, fontFamily: 'Inter, system-ui, sans-serif' }}>
                      {item.lines.join(' ')}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function PolicyFrameworksDiagram({
  title   = 'Policy Frameworks for Renewable Energy Workforce Development',
  caption,
}: {
  title?: string
  caption?: string
}) {
  const [active, setActive] = useState<PillarData['key'] | null>(null)

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
            style={{ color: RC.white90, fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            {title}
          </h3>
          <p className="text-xs mt-1" style={{ color: RC.white45, fontFamily: 'Inter, system-ui, sans-serif' }}>
            Tap a pillar below to highlight its policy mechanisms
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: RC.greenDim, color: RC.green, fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          RC Diagram · Comparison
        </span>
      </div>

      {/* Diagram body */}
      <div className="w-full px-4 py-5 overflow-x-auto">
        <PolicySVG active={active} setActive={setActive} title={title} />
      </div>

      {/* Detail cards — full sub-item prose, always legible */}
      <DetailCards active={active} setActive={setActive} />

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
