// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 5: Chart Data & Visualizations — Floating Offshore Wind
// All data sourced from content and peer-reviewed studies cited in the module
// ─────────────────────────────────────────────────────────────────────────────

import type { ChartVisualization } from '@/types'

// ── Chart 1: LCOE Comparison — FLOW vs Fixed vs Onshore ──────────────────────

export const flowLcoeComparisonChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm5-lcoe-comparison',
  title: 'LCOE Comparison: Floating Offshore Wind vs Competing Technologies',
  description:
    'Floating offshore wind currently has a significantly higher LCOE than fixed offshore wind or onshore wind, reflecting its status as an emerging technology. However, DNV\'s Energy Transition Outlook forecasts that FLOW\'s LCOE will fall dramatically — from ~$180/MWh today to ~$74/MWh by 2050 — approaching cost parity with established technologies.',
  type: 'bar',
  labels: ['Floating Offshore Wind (Current)', 'Fixed Offshore Wind (2023)', 'Onshore Wind (2023)', 'Floating Offshore Wind (2050 Forecast)'],
  datasets: [
    {
      label: 'LCOE (USD/MWh)',
      data: [180, 77, 46, 74],
      backgroundColor: ['#CD853F', '#82BC00', '#82BC00', '#DAA520'],
    },
  ],
  xAxisLabel: 'Technology',
  yAxisLabel: 'Levelised Cost of Energy (USD/MWh)',
  source: 'DNV Energy Transition Outlook Report 2023 & IRENA Renewable Power Generation Costs 2022',
  sourceUrl: 'https://www.dnv.com/energy-transition-outlook/',
}

// ── Chart 2: FLOW Capital Cost Breakdown (per MW) ─────────────────────────────

export const flowCapexChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm5-capex-breakdown',
  title: 'Floating Offshore Wind — Capital Cost Breakdown (£/MW)',
  description:
    'The typical capital cost structure for a floating offshore wind project, at approximately £4 billion per GW of installed capacity. Balance of Plant (BoP) — the subsea cables, moorings, and offshore substations — is the single largest cost component, followed by the turbine itself.',
  type: 'doughnut',
  labels: [
    'Balance of Plant (£1,700k/MW)',
    'Wind Turbine (£1,300k/MW)',
    'Installation & Commissioning (£370k/MW)',
    'Contingency & Insurance (£270k/MW)',
    'Decommissioning (£150k/MW)',
    'Development & PM (£150k/MW)',
    'Operations & Maintenance (£71k/MW/yr)',
  ],
  datasets: [
    {
      label: '£/MW',
      data: [1700, 1300, 370, 270, 150, 150, 71],
      backgroundColor: ['#82BC00', '#E8823A', '#DAA520', '#4682B4', '#556B2F', '#CD853F', '#8B4513'],
    },
  ],
  source: 'Floating Offshore Wind Cost Reduction Pathway — ORE Catapult / Crown Estate Scotland',
  sourceUrl: 'https://ore.catapult.org.uk/',
}

// ── Chart 3: Global FLOW Market Size Forecast (2022–2032) ─────────────────────

export const flowMarketChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm5-market-forecast',
  title: 'Global Floating Offshore Wind Market Size Forecast (2022–2032)',
  description:
    'The global floating offshore wind market is projected to grow from $1.9 billion in 2022 to $65.37 billion by 2032 — a compound annual growth rate (CAGR) of 42.5%. This extraordinary trajectory reflects the vast offshore wind resources only accessible through floating technology.',
  type: 'bar',
  labels: ['2022', '2024E', '2026E', '2028E', '2030E', '2032E'],
  datasets: [
    {
      label: 'Market Size (USD Billion)',
      data: [1.9, 4.5, 10.0, 22.0, 42.0, 65.37],
      backgroundColor: '#82BC00',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Market Size (USD Billion)',
  source: 'Precedence Research — Floating Offshore Wind Power Market 2023–2032',
  sourceUrl: 'https://www.precedenceresearch.com/floating-offshore-wind-power-market',
}

// ── Chart 4a: DNV Wind LCOE Projection — 3 Technologies (2010–2050) ──────────
// Replaces chart 1.jpg (DNV Energy Transition Outlook Figure 3.10).
// Shows floating, fixed, and onshore wind LCOE trajectories in USD/MWh.
// showDataLabels: false — too many points for inline labels.
// Multi-colour: each dataset carries its own borderColor.
// Source: DNV Energy Transition Outlook 2023, Figure 3.10 (GlobalData historical).

export const windLcoeProjectionChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm5-wind-lcoe-projection',
  title: 'World Average Levelised Cost of Wind Energy (2010–2050)',
  description:
    'DNV\'s Energy Transition Outlook projects that floating offshore wind LCOE will fall from approximately $140/MWh today to around $70/MWh by 2050 — approaching cost parity with fixed offshore wind. Fixed offshore wind has already fallen from $100/MWh in 2010 to around $65/MWh, while onshore wind leads at ~$25/MWh by 2050. The near-term bump in floating costs (2028–2030) reflects first-of-kind commercial project premiums before economies of scale take hold.',
  type: 'line',
  showDataLabels: false,
  labels: ['2010', '2015', '2020', '2025', '2028', '2030', '2035', '2040', '2050'],
  datasets: [
    {
      label: 'Floating offshore wind (USD/MWh)',
      data: [null, null, null, 140, 147, 140, 105, 87, 70],
      borderColor: '#E8823A',
      backgroundColor: 'rgba(232,130,58,0.05)',
      fill: false,
    },
    {
      label: 'Fixed offshore wind (USD/MWh)',
      data: [100, 90, 80, 72, 68, 64, 59, 55, 50],
      borderColor: '#4682B4',
      backgroundColor: 'rgba(70,130,180,0.05)',
      fill: false,
    },
    {
      label: 'Onshore wind (USD/MWh)',
      data: [85, 70, 55, 43, 38, 35, 30, 27, 24],
      borderColor: '#82BC00',
      backgroundColor: 'rgba(130,188,0,0.05)',
      fill: false,
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'LCOE (USD/MWh)',
  source: 'DNV Energy Transition Outlook 2023 — Figure 3.10. Historical data: GlobalData (2023)',
  sourceUrl: 'https://www.dnv.com/energy-transition-outlook/',
}

// ── Chart 4b: Fixed vs Floating Offshore Wind — Capacity Growth (2022–2050) ──
// Derived from DNV ETO 2023 Figure 3.11 (chart 2.jpg), panel comparison.
// Shows the emergence of floating as a major technology alongside fixed.

export const dnvOffshoreGrowthChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm5-dnv-offshore-growth',
  title: 'Fixed vs Floating Offshore Wind — Global Capacity Growth (2022–2050)',
  description:
    'Fixed offshore wind is projected to grow from 55 GW in 2022 to 1,400 GW by 2050 — a 25-fold increase. Floating offshore wind starts from near-zero (0.15 GW in 2022) but is forecast to reach 261 GW by 2050, representing roughly one-fifth of total global offshore wind capacity. This chart illustrates the window of opportunity for floating wind as the industry\'s next growth frontier.',
  type: 'bar',
  labels: ['2022 (Actual)', '2030 Forecast', '2050 Forecast'],
  datasets: [
    {
      label: 'Fixed Offshore Wind (GW)',
      data: [55, 335, 1400],
      backgroundColor: '#4682B4',
    },
    {
      label: 'Floating Offshore Wind (GW)',
      data: [0.15, 36, 261],
      backgroundColor: '#82BC00',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Installed Capacity (GW)',
  source: 'DNV Energy Transition Outlook 2023 — Figure 3.11',
  sourceUrl: 'https://www.dnv.com/energy-transition-outlook/',
}

// ── Chart 4c: Floating Offshore Wind — Regional Capacity Forecast 2050 ───────
// Derived from DNV ETO 2023 Figure 3.11 (chart 2.jpg), floating offshore panel.
// Shows the regional breakdown of the 261 GW floating forecast for 2050.

export const flowRegionalForecast2050Chart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm5-flow-regional-2050',
  title: 'Floating Offshore Wind — Regional Capacity Forecast for 2050 (261 GW total)',
  description:
    'Europe leads the 2050 floating offshore wind forecast with approximately 120 GW — driven by ScotWind, Norwegian, French, and Portuguese pipelines. North America follows at ~70 GW (US West Coast, Gulf of Maine). Greater China contributes ~40 GW, and the Indian Subcontinent ~15 GW. The 80% of global offshore wind resource that sits in deep water is geographically distributed across all five regions, making floating wind a truly global technology.',
  type: 'horizontalBar',
  labels: ['Europe', 'North America', 'Greater China', 'Rest of World', 'Indian Subcontinent'],
  datasets: [
    {
      label: 'Floating Offshore Wind Capacity (GW) — 2050 Forecast',
      data: [120, 70, 40, 16, 15],
      backgroundColor: '#82BC00',
    },
  ],
  xAxisLabel: 'Installed Capacity (GW)',
  source: 'DNV Energy Transition Outlook 2023 — Figure 3.11',
  sourceUrl: 'https://www.dnv.com/energy-transition-outlook/',
}

// ── Chart 4d: BVG Associates — UK FLOW LCOE Range (2027–2035) ────────────────
// Replaces chart 3.jpg (BVG Associates, CC BY).
// Shows the high/low LCOE range for UK floating offshore wind projects
// by year of first operation, using a band chart (fill between two line series).
// showDataLabels: false — band charts don't suit individual point labels.
// Source: BVG Associates for the Crown Estate Scotland / ORE Catapult.

export const flowLcoeRangeChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm5-flow-lcoe-range',
  title: 'UK Floating Offshore Wind LCOE Range by Year of First Operation (2027–2035)',
  description:
    'BVG Associates\' analysis of the UK floating offshore wind pipeline shows LCOE falling from £90–140/MWh for projects commissioned in 2027 to approximately £30–55/MWh by 2035 (2021 prices). The band represents the range of project-level estimates — earlier projects carry more uncertainty. The decline reflects expected cost reductions from supply chain maturation, series production of platforms, and improved installation methods.',
  type: 'line',
  showDataLabels: false,
  labels: ['2027', '2028', '2029', '2030', '2031', '2032', '2033', '2034', '2035'],
  datasets: [
    {
      label: 'Upper LCOE estimate (£/MWh)',
      data: [140, 122, 108, 96, 85, 76, 68, 60, 55],
      borderColor: 'rgba(70,130,180,0.7)',
      backgroundColor: 'rgba(70,130,180,0.12)',
      borderDash: [6, 3],
      fill: false,
    },
    {
      label: 'Lower LCOE estimate (£/MWh)',
      data: [90, 78, 68, 58, 50, 44, 38, 33, 30],
      borderColor: 'rgba(70,130,180,0.7)',
      backgroundColor: 'rgba(70,130,180,0.12)',
      fill: 0,
    },
  ],
  xAxisLabel: 'Year of First Operation',
  yAxisLabel: 'LCOE (£/MWh, 2021 prices)',
  source: 'BVG Associates — Floating Offshore Wind Cost Reduction Pathway, for Crown Estate Scotland / ORE Catapult',
  sourceUrl: 'https://bvgassociates.com/publications/',
}

// ── Chart 4: Global FLOW Capacity Forecast ────────────────────────────────────

export const flowCapacityForecastChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm5-capacity-forecast',
  title: 'Global Floating Offshore Wind Capacity Forecast (2023–2050)',
  description:
    'Floating offshore wind is forecast to grow from around 150 MW of operational capacity today to potentially 40 GW by 2030 (though current build-out rates make this highly challenging) and 260 GW by 2050. The technology will be critical to meeting net-zero targets, given that 80% of global offshore wind resources lie in waters too deep for fixed foundations.',
  type: 'bar',
  labels: ['2023 (Actual)', '2030 Forecast', '2040 Forecast (GWEC)', '2050 Forecast'],
  datasets: [
    {
      label: 'Floating Offshore Wind Capacity (GW)',
      data: [0.15, 40, 70, 260],
      backgroundColor: ['#82BC00', '#9BC400', '#DAA520', '#E8823A'],
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Installed Capacity (GW)',
  source: 'GWEC Global Floating Wind Report 2023 & DNV Energy Transition Outlook 2023',
  sourceUrl: 'https://gwec.net/',
}
