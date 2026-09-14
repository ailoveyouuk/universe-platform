// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 12: Chart Data & Visualizations — Carbon Capture & Storage
// ─────────────────────────────────────────────────────────────────────────────

import type { ChartVisualization } from '@/types'

// ── Chart 1: Global CCS Capacity — Operational & Under Development (2024) ────

export const ccsCapacityChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm12-capacity',
  title: 'Global CCS Capture Capacity — Operational & Development Pipeline (2024)',
  description:
    'As of 2024, approximately 50 million tonnes of CO2 per year (Mtpa) of CCS capacity is operational globally, with a further 200+ Mtpa in advanced development or construction. The pipeline has grown significantly since 2020, driven by government incentives such as the US Inflation Reduction Act\'s 45Q tax credit. Scaling to the gigatonne level required for net-zero will demand a 100-fold increase in deployment.',
  type: 'bar',
  labels: ['Operational (2020)', 'Operational (2022)', 'Operational (2024)', 'In Construction (2024)', 'Advanced Dev. (2024)', 'Early Dev. (2024)'],
  datasets: [
    {
      label: 'CO2 Capture Capacity (Mtpa)',
      data: [40, 45, 50, 60, 200, 350],
      backgroundColor: ['#455A64', '#546E7A', '#607D8B', '#78909C', '#90A4AE', '#B0BEC5'],
    },
  ],
  xAxisLabel: 'Project Stage',
  yAxisLabel: 'CO2 Capture Capacity (Mtpa)',
  source: 'Global CCS Institute Status of CCS Report 2024',
  sourceUrl: 'https://www.globalccsinstitute.com/resources/publications-reports-research/status-of-carbon-capture-and-storage-2024/',
}

// ── Chart 2: CCS Cost Trends — Capture Cost by Sector (2023) ─────────────────

export const ccsCostChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm12-cost',
  title: 'CCS Capture Costs by Sector (USD per tonne CO2, 2023)',
  description:
    'CCS capture costs vary enormously by sector. Industrial processes producing concentrated CO2 streams — such as natural gas processing, ethanol production, and fertiliser manufacture — are the cheapest to capture from, at $15–30 per tonne. Power generation and direct air capture (DAC) are more expensive, with DAC currently costing $300–1000 per tonne, though costs are falling rapidly.',
  type: 'horizontalBar',
  labels: ['Gas Processing', 'Ethanol/Fertiliser', 'Cement', 'Steel', 'Power (gas)', 'Power (coal)', 'Direct Air Capture'],
  datasets: [
    {
      label: 'Capture Cost (USD/tCO2) — Low',
      data: [15, 20, 50, 55, 55, 60, 300],
      backgroundColor: 'rgba(96, 125, 139, 0.5)',
    },
    {
      label: 'Capture Cost (USD/tCO2) — High',
      data: [25, 30, 100, 110, 100, 130, 1000],
      backgroundColor: 'rgba(96, 125, 139, 0.85)',
    },
  ],
  xAxisLabel: 'Cost (USD/tCO2)',
  source: 'IEA Carbon Capture, Utilisation and Storage Report 2023',
  sourceUrl: 'https://www.iea.org/reports/ccus-in-clean-energy-transitions',
}

// ── Chart 3: Global CCS Projects by Sector (2024) ────────────────────────────

export const ccsProjectsChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm12-sectors',
  title: 'Global CCS Projects by Sector — Share of Capture Capacity (2024)',
  description:
    'The natural gas processing sector dominates current operational CCS capacity, as CO2 removal is often required before gas can meet pipeline quality standards. Power generation and industrial applications are the fastest-growing segments of the project pipeline. Direct air capture projects remain small but are attracting significant investment and policy attention.',
  type: 'bar',
  labels: ['Natural Gas Processing', 'Power Generation', 'Steel & Cement', 'Chemicals', 'Hydrogen Production', 'Direct Air Capture'],
  datasets: [
    {
      label: 'Share of Global CCS Capacity (%)',
      data: [38, 22, 18, 12, 7, 3],
      backgroundColor: ['#607D8B', '#546E7A', '#78909C', '#455A64', '#90A4AE', '#B0BEC5'],
    },
  ],
  xAxisLabel: 'Sector',
  yAxisLabel: 'Share of Capture Capacity (%)',
  source: 'Global CCS Institute Status Report 2024',
  sourceUrl: 'https://www.globalccsinstitute.com/',
}

// ── Chart 4: CCS Required for Net-Zero — IPCC Scenarios ──────────────────────

export const ccsNetZeroChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm12-netzero',
  title: 'CCS Scale Required for Net-Zero — IPCC Scenarios (Gtpa CO2)',
  description:
    'The IPCC Sixth Assessment Report indicates that most credible 1.5°C pathways require between 3 and 16 Gt of CO2 removal per year by 2050, with CCS playing a central role. Current global CCS capacity is around 0.05 Gt — meaning the world must scale CCS by a factor of 60–300x over the next 25 years to stay on track. BECCS (bioenergy with CCS) and DACCS (direct air capture with CCS) are key components.',
  type: 'bar',
  labels: ['Current Capacity (2024)', '2030 Target (NZE)', '2040 Target (NZE)', '2050 Target (IPCC Low)', '2050 Target (IPCC High)'],
  datasets: [
    {
      label: 'Annual CO2 Capture (Gt CO2/year)',
      data: [0.05, 1.0, 4.5, 3.0, 16.0],
      backgroundColor: ['#B0BEC5', '#90A4AE', '#78909C', '#607D8B', '#455A64'],
    },
  ],
  xAxisLabel: 'Scenario',
  yAxisLabel: 'Annual CO2 Capture (Gt/year)',
  source: 'IPCC AR6 & IEA Net Zero by 2050 Scenario',
  sourceUrl: 'https://www.ipcc.ch/report/ar6/syr/',
}
