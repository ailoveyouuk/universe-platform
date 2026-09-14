// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 11: Chart Data & Visualizations — Hydrogen
// ─────────────────────────────────────────────────────────────────────────────

import type { ChartVisualization } from '@/types'

// ── Chart 1: Hydrogen Production Methods — Current Share (2023) ───────────────

export const hydrogenProductionChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm11-production',
  title: 'Global Hydrogen Production by Method (2023)',
  description:
    'Today, hydrogen is overwhelmingly produced from fossil fuels: roughly 48% from natural gas via steam methane reforming (grey hydrogen), 30% from coal gasification (often in China), and 22% as a by-product of oil refining. Less than 1% of global hydrogen is currently produced via electrolysis using renewable electricity — so-called "green hydrogen" — but this share is expected to grow dramatically through the 2030s.',
  type: 'bar',
  labels: ['Natural Gas (SMR)', 'Coal Gasification', 'Oil Refining By-product', 'Green Electrolysis', 'Other'],
  datasets: [
    {
      label: 'Share of Global Hydrogen Production (%)',
      data: [48, 30, 21, 0.7, 0.3],
      backgroundColor: ['#78909C', '#546E7A', '#90A4AE', '#00ACC1', '#B0BEC5'],
    },
  ],
  xAxisLabel: 'Production Method',
  yAxisLabel: 'Share (%)',
  source: 'IEA Global Hydrogen Review 2023',
  sourceUrl: 'https://www.iea.org/reports/global-hydrogen-review-2023',
}

// ── Chart 2: Green Hydrogen Cost Projections (2023–2050) ─────────────────────

export const hydrogenCostChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm11-cost',
  title: 'Green Hydrogen Cost Projections (2023–2050)',
  description:
    'Green hydrogen currently costs approximately $4–8/kg to produce — significantly more than grey hydrogen at $1–2.50/kg. However, falling electrolyser costs and cheaper renewable electricity are expected to drive green hydrogen costs down to $1.50–3.00/kg by 2030 and potentially $1.00–2.00/kg by 2050, making it competitive with fossil-derived hydrogen.',
  type: 'line',
  labels: ['2023', '2025', '2027', '2030', '2035', '2040', '2050'],
  datasets: [
    {
      label: 'Green Hydrogen — High Cost (USD/kg)',
      data: [8.0, 6.5, 5.0, 3.5, 2.5, 2.0, 1.5],
      backgroundColor: 'rgba(0, 172, 193, 0.1)',
      borderColor: '#00ACC1',
    },
    {
      label: 'Green Hydrogen — Low Cost (USD/kg)',
      data: [4.0, 3.2, 2.5, 1.8, 1.4, 1.2, 1.0],
      backgroundColor: 'rgba(0, 172, 193, 0.25)',
      borderColor: '#00838F',
    },
    {
      label: 'Grey Hydrogen Cost (USD/kg)',
      data: [1.8, 1.9, 2.0, 2.2, 2.3, 2.4, 2.5],
      backgroundColor: 'rgba(120, 144, 156, 0.1)',
      borderColor: '#78909C',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Cost (USD/kg)',
  source: 'IRENA Green Hydrogen Cost Reduction 2024 & IEA Global Hydrogen Review',
  sourceUrl: 'https://www.irena.org/publications/2020/Dec/Green-hydrogen-cost-reduction',
}

// ── Chart 3: Hydrogen End-Use Sectors (2023 vs 2050 Projection) ───────────────

export const hydrogenSectorsChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm11-sectors',
  title: 'Hydrogen End-Use by Sector — Today vs 2050 Projection',
  description:
    'Today, virtually all hydrogen demand comes from industrial uses — primarily ammonia production for fertilisers and oil refining. By 2050, green hydrogen could power heavy transport (shipping, aviation, heavy trucks), provide industrial process heat for steel and cement, enable long-duration energy storage, and heat buildings, with demand potentially reaching 500–700 million tonnes per year.',
  type: 'bar',
  labels: ['Ammonia/Fertiliser', 'Oil Refining', 'Steel & Metals', 'Transport (Heavy)', 'Power Storage', 'Buildings/Heating'],
  datasets: [
    {
      label: 'Hydrogen Demand — Today (Mt/year)',
      data: [33, 42, 5, 0.5, 0, 0],
      backgroundColor: 'rgba(0, 172, 193, 0.5)',
    },
    {
      label: 'Hydrogen Demand — 2050 Projection (Mt/year)',
      data: [80, 30, 90, 120, 50, 40],
      backgroundColor: 'rgba(0, 172, 193, 0.85)',
    },
  ],
  xAxisLabel: 'Sector',
  yAxisLabel: 'Demand (Mt H2/year)',
  source: 'IEA Net Zero by 2050 & IRENA World Energy Transitions Outlook',
  sourceUrl: 'https://www.iea.org/reports/net-zero-by-2050',
}

// ── Chart 4: Electrolyser Capacity Additions (2020–2023 & Pipeline) ───────────

export const electrolyserChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm11-electrolyser',
  title: 'Global Electrolyser Capacity — Installed & Pipeline (2020–2030)',
  description:
    'Installed electrolyser capacity for green hydrogen production grew from under 0.5 GW in 2020 to around 1.4 GW by end-2023. The announced project pipeline is far larger, with over 350 GW of projects in various stages of development targeting completion before 2030 — though many face financing, policy, and infrastructure challenges before they proceed.',
  type: 'bar',
  labels: ['2020', '2021', '2022', '2023', '2025 (target)', '2030 (pipeline)'],
  datasets: [
    {
      label: 'Installed Electrolyser Capacity (GW)',
      data: [0.3, 0.5, 0.9, 1.4, null, null],
      backgroundColor: 'rgba(0, 172, 193, 0.85)',
    },
    {
      label: 'Announced Pipeline (GW)',
      data: [null, null, null, null, 30, 350],
      backgroundColor: 'rgba(0, 172, 193, 0.35)',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Electrolyser Capacity (GW)',
  source: 'IEA Global Hydrogen Review 2023',
  sourceUrl: 'https://www.iea.org/reports/global-hydrogen-review-2023',
}
