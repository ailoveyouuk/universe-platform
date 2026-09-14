// ─────────────────────────────────────────────────────────────────────────────
// CarbonPriceTableDiagram — RC Diagram Design Language v1.2 (comparison-panel,
// dense `.rc-detail-card` variant)
//
// Comparative infographic of global carbon pricing schemes, split into:
//
//   COMPLIANCE MARKETS (regulated, mandatory):
//     EU ETS · UK ETS · California Cap-and-Trade · RGGI · Australia Safeguard
//     New Zealand ETS · South Korea ETS · China National ETS
//
//   VOLUNTARY MARKETS (project-based offsets):
//     Nature-Based Solutions · Aviation (CORSIA) · Tech-Based Removals
//
// Ported onto the standard RC card shell: BlueprintFrame, whole-scheme
// interactivity (hover/tap/focus highlights one row or voluntary panel,
// dims every other scheme across both sections), staggered entrance. Each
// scheme's descriptive note/description used to be tiny hand-wrapped/
// truncated SVG text (9–10px in a 940-unit canvas) — the same
// mobile-legibility problem as the other dense-prose comparison diagrams
// (Geothermal, Hydropower, Mooring) — so the full, untruncated text has
// moved to real HTML `.rc-detail-card`s below the diagram: always legible
// at any viewport, synced to the same hover/tap highlight as the SVG rows
// and panels. All original table/bar-chart and voluntary-panel illustration
// geometry is unchanged; only the styling/interactivity/mobile layer is new.
// ─────────────────────────────────────────────────────────────────────────────

'use client'

import { useState } from 'react'
import { brand, rcRgba } from '@rc/theme'
// ── RC Design Tokens ──────────────────────────────────────────────────────────
const RC = {
  green:       brand.green,
  greenDim:    rcRgba(brand.green, 0.14),
  greenMid:    rcRgba(brand.green, 0.38),
  amber:       brand.amber,
  amberDim:    rcRgba(brand.amber, 0.12),
  amberMid:    rcRgba(brand.amber, 0.38),
  blue:        brand.blue,
  blueDim:     rcRgba(brand.blue, 0.13),
  blueMid:     rcRgba(brand.blue, 0.40),
  teal:        brand.teal,
  tealDim:     rcRgba(brand.teal, 0.14),
  purple:      '#9B59B6',
  purpleDim:   'rgba(155,89,182,0.14)',
  white90:     'rgba(255,255,255,0.90)',
  white70:     'rgba(255,255,255,0.70)',
  white50:     'rgba(255,255,255,0.50)',
  white35:     'rgba(255,255,255,0.35)',
  white20:     'rgba(255,255,255,0.20)',
  white12:     'rgba(255,255,255,0.12)',
  white08:     'rgba(255,255,255,0.08)',
  white10:     'rgba(255,255,255,0.08)',
  white18:     'rgba(255,255,255,0.18)',
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
      .rc-detail-card { cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease; }
      .rc-detail-card:focus-visible, .rc-panel-hit:focus-visible {
        outline: 2px solid ${RC.green}; outline-offset: 2px;
      }
      /* Same mobile fix as the other comparison-panel diagrams: below ~768px
         the inline SVG notes/descriptions shrink past legibility. Hide them
         and let the HTML detail cards below carry the reading. */
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
        <pattern id="rcGridCP" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill={RC.white10} />
        </pattern>
        <radialGradient id="rcGlowCP" cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor={rcRgba(brand.green, 0.07)} />
          <stop offset="100%" stopColor={rcRgba(brand.green, 0)} />
        </radialGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGridCP)" />
      <rect x={0} y={0} width={w} height={h} fill="url(#rcGlowCP)" />
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

// ── Canvas dimensions ─────────────────────────────────────────────────────────
const W   = 940
const H   = 580
const PAD = 20

// ── Compliance market data (approximate 2024 averages, USD/tCO2) ──────────────
// Source: ICAP Status Report 2024 + World Bank State & Trends of Carbon Pricing 2024
const compliance = [
  { market: 'EU ETS',                   region: 'Europe',     price: 65,  currency: '~€65',  note: 'Largest compliance market; covers power + heavy industry' },
  { market: 'New Zealand ETS',           region: 'Pacific',    price: 37,  currency: '~NZ$55', note: 'Covers forestry, energy, industry, agriculture (from 2025)' },
  { market: 'UK ETS',                   region: 'Europe',     price: 35,  currency: '~£35',  note: 'Launched post-Brexit 2021; covers power + heavy industry' },
  { market: 'California C&T',           region: 'N. America', price: 31,  currency: '~$31',  note: 'Links with Québec; covers ~85% of state GHG emissions' },
  { market: 'RGGI (US Northeast)',       region: 'N. America', price: 18,  currency: '~$18',  note: '11-state power sector scheme; longest-running US ETS' },
  { market: 'Australia Safeguard',       region: 'Pacific',    price: 28,  currency: '~A$33', note: 'Covers ~215 large industrial facilities (2023 reforms)' },
  { market: 'South Korea ETS',          region: 'Asia',       price: 8,   currency: '~$8',   note: 'Third-largest ETS globally by covered emissions' },
  { market: 'China National ETS',       region: 'Asia',       price: 9,   currency: '~¥65',  note: 'World\'s largest by coverage; power sector only (Phase 1)' },
]

// Max price for bar scaling (use EU ETS as anchor)
const MAX_PRICE = 80

// ── Voluntary market data ─────────────────────────────────────────────────────
const voluntary = [
  {
    label: 'Nature-Based Solutions',
    range: '$3 – $30',
    desc: 'Forestry, wetland, soil carbon credits. High variance; quality varies significantly by project.',
    color: RC.green,
    dim:   RC.greenDim,
  },
  {
    label: 'Aviation Offsets (CORSIA)',
    range: '$2 – $15',
    desc: 'ICAO scheme offsetting aviation emissions growth above 2019 baseline. Eligibility criteria tightening.',
    color: RC.blue,
    dim:   RC.blueDim,
  },
  {
    label: 'Tech-Based Removals',
    range: '$100 – $600+',
    desc: 'Direct air capture, biochar, enhanced weathering. High permanence; high cost — rapidly falling.',
    color: RC.amber,
    dim:   RC.amberDim,
  },
]

// ── Row geometry ──────────────────────────────────────────────────────────────
const TABLE_X     = PAD
const TABLE_W     = W - PAD * 2
const HEADER_H    = 56
const SECTION_H   = 24
const ROW_H       = 46
const BAR_MAX_W   = 260
const LABEL_W     = 180
const REGION_W    = 80
const PRICE_W     = 68
const BAR_X       = TABLE_X + LABEL_W + REGION_W + PRICE_W + 12

// Compliance section starts after header
const COMP_Y      = PAD + HEADER_H + 8
const COMP_ROWS_H = compliance.length * ROW_H + SECTION_H
const VOL_Y       = COMP_Y + COMP_ROWS_H + 16

interface Props {
  title?:   string
  caption?: string
}

export function CarbonPriceTableDiagram({
  title   = 'Global Carbon Pricing — Compliance & Voluntary Markets',
  caption,
}: Props) {
  const [active, setActive] = useState<string | null>(null)

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
            Mandatory compliance schemes vs project-based voluntary offsets — tap a scheme below to highlight it
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
          style={{ display: 'block', maxWidth: W, minWidth: 320, margin: '0 auto' }}
          aria-label="Global carbon market prices — compliance and voluntary"
        >
          <defs>
            {/* Bar gradient: RC green */}
            <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor={RC.green} stopOpacity={0.85} />
              <stop offset="100%" stopColor={RC.green} stopOpacity={0.55} />
            </linearGradient>
            {/* Amber gradient for voluntary tech */}
            <linearGradient id="barAmber" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor={RC.amber} stopOpacity={0.85} />
              <stop offset="100%" stopColor={RC.amber} stopOpacity={0.55} />
            </linearGradient>
            {/* Blue gradient for voluntary aviation */}
            <linearGradient id="barBlue" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor={RC.blue} stopOpacity={0.85} />
              <stop offset="100%" stopColor={RC.blue} stopOpacity={0.55} />
            </linearGradient>
          </defs>

          {/* ── Background ─────────────────────────────────────────────────────── */}
          <rect width={W} height={H} fill={RC.cardBg} rx={12} />
          <BlueprintFrame w={W} h={H} />

          {/* ── Header ─────────────────────────────────────────────────────────── */}
          <rect
            x={TABLE_X} y={PAD}
            width={TABLE_W} height={HEADER_H}
            fill={RC.greenDim}
            rx={8}
            stroke={RC.greenMid}
            strokeWidth={1}
          />
          <text
            x={TABLE_X + 18} y={PAD + 20}
            fill={RC.green}
            fontSize={13}
            fontWeight={700}
            fontFamily="Inter, sans-serif"
            letterSpacing={1.2}
          >
            GLOBAL CARBON PRICING — COMPLIANCE &amp; VOLUNTARY MARKETS (2024)
          </text>
          {/* Column headers */}
          <text x={TABLE_X + 10}           y={PAD + 44} fill={RC.white50} fontSize={10} fontFamily="Inter, sans-serif" fontWeight={600}>SCHEME</text>
          <text x={TABLE_X + LABEL_W + 8}  y={PAD + 44} fill={RC.white50} fontSize={10} fontFamily="Inter, sans-serif" fontWeight={600}>REGION</text>
          <text x={TABLE_X + LABEL_W + REGION_W + 8} y={PAD + 44} fill={RC.white50} fontSize={10} fontFamily="Inter, sans-serif" fontWeight={600}>≈ PRICE</text>
          <text x={BAR_X}                   y={PAD + 44} fill={RC.white50} fontSize={10} fontFamily="Inter, sans-serif" fontWeight={600}>RELATIVE PRICE (USD/tCO₂)</text>
          {/* Price axis ticks */}
          {[0, 20, 40, 60, 80].map(v => {
            const x = BAR_X + (v / MAX_PRICE) * BAR_MAX_W
            return (
              <g key={v}>
                <line x1={x} y1={COMP_Y - 4} x2={x} y2={COMP_Y + COMP_ROWS_H - 4}
                      stroke={RC.white08} strokeWidth={1} />
                <text x={x} y={COMP_Y - 6} fill={RC.white35} fontSize={9}
                      textAnchor="middle" fontFamily="Inter, sans-serif">
                  ${v}
                </text>
              </g>
            )
          })}

          {/* ── COMPLIANCE MARKETS section header ─────────────────────────────── */}
          <rect
            x={TABLE_X} y={COMP_Y}
            width={TABLE_W} height={SECTION_H}
            fill={RC.white08} rx={4}
          />
          <text
            x={TABLE_X + 10} y={COMP_Y + 16}
            fill={RC.white70}
            fontSize={10.5}
            fontWeight={700}
            fontFamily="Inter, sans-serif"
            letterSpacing={0.8}
          >
            COMPLIANCE MARKETS — Mandatory, government-regulated schemes
          </text>

          {/* ── Compliance rows ────────────────────────────────────────────────── */}
          {compliance.map((m, i) => {
            const rowY  = COMP_Y + SECTION_H + i * ROW_H
            const barW  = (m.price / MAX_PRICE) * BAR_MAX_W
            const isEven = i % 2 === 0
            const isActive = active === m.market
            const isDimmed = active !== null && !isActive
            return (
              <g
                key={m.market}
                className="rc-panel-hit"
                style={{ opacity: isDimmed ? 0.32 : 1 }}
                tabIndex={0}
                role="button"
                aria-label={`Highlight ${m.market}`}
                onMouseEnter={() => setActive(m.market)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(m.market)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(active === m.market ? null : m.market)}
              >
                <g className="rc-panel-enter" style={{ '--rc-delay': `${i * 0.06}s` } as React.CSSProperties}>
                  {/* Row bg */}
                  <rect
                    x={TABLE_X} y={rowY}
                    width={TABLE_W} height={ROW_H}
                    fill={isActive ? RC.greenDim : (isEven ? 'rgba(255,255,255,0.025)' : 'transparent')}
                  />
                  {/* Market name */}
                  <text
                    x={TABLE_X + 10} y={rowY + ROW_H / 2 - 4}
                    fill={RC.white90}
                    fontSize={12}
                    fontWeight={600}
                    fontFamily="Inter, sans-serif"
                    dominantBaseline="middle"
                  >
                    {m.market}
                  </text>
                  {/* Note */}
                  <text
                    className="rc-panel-label"
                    x={TABLE_X + 10} y={rowY + ROW_H / 2 + 10}
                    fill={RC.white35}
                    fontSize={9.5}
                    fontFamily="Inter, sans-serif"
                  >
                    {m.note.length > 52 ? m.note.slice(0, 52) + '…' : m.note}
                  </text>
                  {/* Region badge */}
                  <rect
                    x={TABLE_X + LABEL_W + 4} y={rowY + ROW_H / 2 - 9}
                    width={REGION_W - 8} height={18}
                    fill={RC.white08} rx={4}
                  />
                  <text
                    x={TABLE_X + LABEL_W + REGION_W / 2} y={rowY + ROW_H / 2}
                    fill={RC.white70}
                    fontSize={9.5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontFamily="Inter, sans-serif"
                  >
                    {m.region}
                  </text>
                  {/* Price label */}
                  <text
                    x={TABLE_X + LABEL_W + REGION_W + PRICE_W / 2 + 4}
                    y={rowY + ROW_H / 2}
                    fill={RC.green}
                    fontSize={12}
                    fontWeight={700}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontFamily="Inter, sans-serif"
                  >
                    {m.currency}
                  </text>
                  {/* Bar */}
                  <rect
                    x={BAR_X} y={rowY + ROW_H / 2 - 7}
                    width={barW} height={14}
                    fill="url(#barGrad)"
                    rx={3}
                  />
                </g>
              </g>
            )
          })}

          {/* Row dividers */}
          {compliance.map((_, i) => {
            const rowY = COMP_Y + SECTION_H + i * ROW_H
            return (
              <line
                key={i}
                x1={TABLE_X} y1={rowY + ROW_H}
                x2={TABLE_X + TABLE_W} y2={rowY + ROW_H}
                stroke={RC.white08} strokeWidth={0.5}
              />
            )
          })}

          {/* ── VOLUNTARY MARKETS section ──────────────────────────────────────── */}
          <rect
            x={TABLE_X} y={VOL_Y}
            width={TABLE_W} height={SECTION_H}
            fill={RC.white08} rx={4}
          />
          <text
            x={TABLE_X + 10} y={VOL_Y + 16}
            fill={RC.white70}
            fontSize={10.5}
            fontWeight={700}
            fontFamily="Inter, sans-serif"
            letterSpacing={0.8}
          >
            VOLUNTARY MARKETS — Project-based offsets (wide price range by quality &amp; permanence)
          </text>

          {voluntary.map((v, i) => {
            const colW  = (TABLE_W - 2) / 3
            const colX  = TABLE_X + 1 + i * colW
            const cardY = VOL_Y + SECTION_H + 6
            const cardH = H - cardY - PAD - 28
            const gradId = i === 2 ? 'barAmber' : i === 1 ? 'barBlue' : 'barGrad'
            const isActive = active === v.label
            const isDimmed = active !== null && !isActive
            return (
              <g
                key={v.label}
                className="rc-panel-hit"
                style={{ opacity: isDimmed ? 0.32 : 1 }}
                tabIndex={0}
                role="button"
                aria-label={`Highlight ${v.label}`}
                onMouseEnter={() => setActive(v.label)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(v.label)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(active === v.label ? null : v.label)}
              >
                <g className="rc-panel-enter" style={{ '--rc-delay': `${(compliance.length + i) * 0.06}s` } as React.CSSProperties}>
                  <rect
                    x={colX + 3} y={cardY}
                    width={colW - 6} height={cardH}
                    fill={v.dim} rx={8}
                    stroke={v.color}
                    strokeOpacity={isActive ? 0.75 : 0.3}
                    strokeWidth={isActive ? 1.6 : 1}
                  />
                  {/* Colour accent bar */}
                  <rect x={colX + 3} y={cardY} width={colW - 6} height={4}
                        fill={`url(#${gradId})`} rx={3} />
                  {/* Label */}
                  <text
                    x={colX + colW / 2} y={cardY + 24}
                    fill={v.color}
                    fontSize={12}
                    fontWeight={700}
                    textAnchor="middle"
                    fontFamily="Inter, sans-serif"
                  >
                    {v.label}
                  </text>
                  {/* Price range */}
                  <text
                    x={colX + colW / 2} y={cardY + 44}
                    fill={RC.white90}
                    fontSize={14}
                    fontWeight={800}
                    textAnchor="middle"
                    fontFamily="Inter, sans-serif"
                  >
                    {v.range}
                  </text>
                  <text
                    x={colX + colW / 2} y={cardY + 58}
                    fill={RC.white35}
                    fontSize={9}
                    textAnchor="middle"
                    fontFamily="Inter, sans-serif"
                  >
                    per tCO₂
                  </text>
                  {/* Description — word-wrap manually */}
                  {splitText(v.desc, 32).map((line, li) => (
                    <text
                      key={li}
                      className="rc-panel-label"
                      x={colX + colW / 2}
                      y={cardY + 76 + li * 14}
                      fill={RC.white50}
                      fontSize={10}
                      textAnchor="middle"
                      fontFamily="Inter, sans-serif"
                    >
                      {line}
                    </text>
                  ))}
                </g>
              </g>
            )
          })}

          {/* ── Source footer ──────────────────────────────────────────────────── */}
          <text
            x={TABLE_X + 4} y={H - 8}
            fill={RC.white35}
            fontSize={9}
            fontFamily="Inter, sans-serif"
          >
            Sources: ICAP Status Report 2024 · World Bank State &amp; Trends of Carbon Pricing 2024 · IEA
          </text>
          <text
            x={TABLE_X + TABLE_W} y={H - 8}
            fill={RC.white20}
            fontSize={9}
            textAnchor="end"
            fontFamily="Inter, sans-serif"
          >
            Prices are approximate 2024 averages in USD unless otherwise noted. Compliance prices fluctuate daily.
          </text>
        </svg>
      </div>

      {/* Detail cards — full scheme notes, always legible */}
      <div className="px-6 pt-4" style={{ borderTop: `1px solid ${RC.cardBorder}` }}>
        <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: RC.white35, fontFamily: "'Montserrat', sans-serif" }}>
          Compliance Markets
        </p>
        <div
          className="grid gap-3 mb-5"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
        >
          {compliance.map((m) => {
            const isActive = active === m.market
            return (
              <div
                key={m.market}
                className="rc-detail-card rounded-lg p-3"
                style={{
                  background: isActive ? RC.greenDim : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? RC.greenMid : RC.cardBorder}`,
                }}
                tabIndex={0}
                role="button"
                aria-label={`Highlight ${m.market}`}
                onMouseEnter={() => setActive(m.market)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(m.market)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(active === m.market ? null : m.market)}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white70, fontFamily: "'Montserrat', sans-serif" }}>
                    {m.market}
                  </span>
                  <span
                    className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: RC.white08, color: RC.green, fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {m.currency}
                  </span>
                </div>
                <dl className="text-[11px] leading-snug space-y-1.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  <div>
                    <dt className="uppercase tracking-wide text-[9px] font-bold" style={{ color: RC.green, opacity: 0.85 }}>Region</dt>
                    <dd className="mt-0.5" style={{ color: RC.white70 }}>{m.region}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-[9px] font-bold" style={{ color: RC.green, opacity: 0.85 }}>Note</dt>
                    <dd className="mt-0.5" style={{ color: RC.white70 }}>{m.note}</dd>
                  </div>
                </dl>
              </div>
            )
          })}
        </div>

        <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: RC.white35, fontFamily: "'Montserrat', sans-serif" }}>
          Voluntary Markets
        </p>
        <div
          className="grid gap-3 pb-2"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
        >
          {voluntary.map((v) => {
            const isActive = active === v.label
            return (
              <div
                key={v.label}
                className="rc-detail-card rounded-lg p-3"
                style={{
                  background: isActive ? rcRgba(v.color, 0.10) : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? rcRgba(v.color, 0.45) : RC.cardBorder}`,
                }}
                tabIndex={0}
                role="button"
                aria-label={`Highlight ${v.label}`}
                onMouseEnter={() => setActive(v.label)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(v.label)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(active === v.label ? null : v.label)}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold" style={{ color: isActive ? RC.white90 : RC.white70, fontFamily: "'Montserrat', sans-serif" }}>
                    {v.label}
                  </span>
                  <span
                    className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: rcRgba(v.color, 0.16), color: v.color, fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {v.range}
                  </span>
                </div>
                <dl className="text-[11px] leading-snug space-y-1.5" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  <div>
                    <dt className="uppercase tracking-wide text-[9px] font-bold" style={{ color: v.color, opacity: 0.85 }}>Description</dt>
                    <dd className="mt-0.5" style={{ color: RC.white70 }}>{v.desc}</dd>
                  </div>
                </dl>
              </div>
            )
          })}
        </div>
      </div>

      {caption && (
        <figcaption
          className="px-6 py-3 text-xs"
          style={{ borderTop: `1px solid ${RC.cardBorder}`, color: RC.white50, fontStyle: 'italic', fontFamily: "'Montserrat', sans-serif" }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

// ── Utility: naive word-wrap for SVG text ─────────────────────────────────────
function splitText(text: string, maxChars: number): string[] {
  const words  = text.split(' ')
  const lines: string[] = []
  let   cur    = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxChars) {
      cur = (cur + ' ' + w).trim()
    } else {
      if (cur) lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)
  return lines
}
