// ─────────────────────────────────────────────────────────────────────────────
// Global Warming Potential (GWP) Visualisation Component
// Animated logarithmic bar chart — RC design system, IPCC AR6 data
// ─────────────────────────────────────────────────────────────────────────────

'use client'

interface GWPEntry {
  formula: string
  name: string
  gwpLabel: string
  gwpNote: string
  /** CSS width value (log-normalised, max = SF₆ at 100%) */
  barWidth: string
  barStyle: string
  symbolBg: string
  symbolColor: string
  source: string
  animDelay: string
}

const gwpData: GWPEntry[] = [
  {
    formula: 'CO₂',
    name: 'Carbon Dioxide',
    gwpLabel: '1',
    gwpNote: 'Baseline',
    barWidth: '4%',
    barStyle: '#82BC00',
    symbolBg: 'rgba(130,188,0,0.1)',
    symbolColor: '#82BC00',
    source: 'Fossil fuel combustion, deforestation — the baseline measure',
    animDelay: '0.10s',
  },
  {
    formula: 'CH₄',
    name: 'Methane',
    gwpLabel: '28–36',
    gwpNote: '×CO₂e',
    barWidth: '33%',
    barStyle: '#9BC400',
    symbolBg: 'rgba(155,196,0,0.1)',
    symbolColor: '#7BAD0A',
    source: 'Livestock, landfills, natural gas & coal extraction',
    animDelay: '0.20s',
  },
  {
    formula: 'N₂O',
    name: 'Nitrous Oxide',
    gwpLabel: '265–298',
    gwpNote: '×CO₂e',
    barWidth: '57%',
    barStyle: '#F5A623',
    symbolBg: 'rgba(245,166,35,0.1)',
    symbolColor: '#C88010',
    source: 'Synthetic fertilisers, industrial & agricultural activities',
    animDelay: '0.30s',
  },
  {
    formula: 'HFCs',
    name: 'Hydrofluorocarbons',
    gwpLabel: '140–11,700',
    gwpNote: '×CO₂e',
    barWidth: '93%',
    barStyle: 'linear-gradient(90deg, #E8693A, #C0392B)',
    symbolBg: 'rgba(232,105,58,0.1)',
    symbolColor: '#C85030',
    source: 'Refrigeration, air conditioning, fire suppression systems',
    animDelay: '0.40s',
  },
  {
    formula: 'PFCs',
    name: 'Perfluorocarbons',
    gwpLabel: '6,500–9,200',
    gwpNote: '×CO₂e',
    barWidth: '91%',
    barStyle: '#D4472F',
    symbolBg: 'rgba(212,71,47,0.1)',
    symbolColor: '#B83020',
    source: 'Aluminium production, semiconductor electronics manufacturing',
    animDelay: '0.50s',
  },
  {
    formula: 'SF₆',
    name: 'Sulphur Hexafluoride',
    gwpLabel: '23,900',
    gwpNote: '×CO₂e',
    barWidth: '100%',
    barStyle: '#C0392B',
    symbolBg: 'rgba(192,57,43,0.1)',
    symbolColor: '#A02818',
    source: 'Electrical switchgear, semiconductor manufacturing — most potent GHG',
    animDelay: '0.60s',
  },
]

export function GWPCards() {
  return (
    <figure className="mb-10">

      {/* Animation keyframes */}
      <style>{`
        @keyframes gwp-grow {
          from { width: 0; }
          to   { width: var(--gwp-target); }
        }
        .gwp-bar {
          width: 0;
          animation: gwp-grow 1s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .gwp-row {
          transition: background 0.2s ease;
        }
        .gwp-row:hover {
          background: #f8f9fa;
        }
      `}</style>

      {/* Card */}
      <div className="border border-rc-border rounded-lg overflow-hidden bg-white">

        {/* Header */}
        <div
          className="flex items-center justify-between px-7 py-5 border-b border-rc-border flex-wrap gap-3"
          style={{ backgroundColor: '#F8F9FA' }}
        >
          <div>
            <p className="font-heading font-bold text-rc-dark uppercase tracking-widest text-xs">
              100-Year Global Warming Potential
            </p>
            <p className="text-xs text-rc-grey mt-1">
              Relative impact vs. CO₂ baseline &middot; Logarithmic scale &middot; IPCC AR6
            </p>
          </div>
          <span
            className="text-xs font-heading font-bold uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap"
            style={{ background: 'rgba(130,188,0,0.1)', color: '#82BC00' }}
          >
            GWP₁₀₀
          </span>
        </div>

        {/* Gas Rows */}
        <div className="divide-y divide-rc-border">
          {gwpData.map((gas) => (
            <div
              key={gas.formula}
              className="gwp-row flex items-center gap-5 px-7 py-5"
            >
              {/* Symbol badge */}
              <div
                className="flex-shrink-0 w-12 h-12 rounded-md flex items-center justify-center font-heading font-extrabold text-sm leading-tight text-center"
                style={{ background: gas.symbolBg, color: gas.symbolColor }}
              >
                {gas.formula}
              </div>

              {/* Name + bar + source */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-rc-dark mb-2">{gas.name}</p>

                {/* Bar track */}
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: '#E5E7EB' }}
                >
                  <div
                    className="gwp-bar h-full rounded-full"
                    style={
                      {
                        '--gwp-target': gas.barWidth,
                        background: gas.barStyle,
                        animationDelay: gas.animDelay,
                      } as React.CSSProperties
                    }
                  />
                </div>

                <p className="text-xs text-rc-grey-light mt-1.5 leading-relaxed hidden sm:block">
                  {gas.source}
                </p>
              </div>

              {/* GWP value */}
              <div className="text-right flex-shrink-0 min-w-[88px]">
                <span
                  className="font-heading font-extrabold text-rc-dark block leading-none"
                  style={{ fontSize: gas.gwpLabel.length > 6 ? '0.82rem' : '1rem' }}
                >
                  {gas.gwpLabel}
                </span>
                <span className="text-xs text-rc-grey-light uppercase tracking-wide mt-1 block">
                  {gas.gwpNote}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="px-7 py-3 border-t border-rc-border"
          style={{ backgroundColor: '#F8F9FA' }}
        >
          <p className="text-xs text-rc-grey-light">
            Bar widths use a logarithmic scale. In absolute terms, SF₆ is 23,900× more potent
            than CO₂ over a 100-year period.{' '}
            <a
              href="https://www.ipcc.ch/report/ar6/wg1/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-rc-green hover:underline"
            >
              IPCC AR6
            </a>
          </p>
        </div>

      </div>
    </figure>
  )
}
