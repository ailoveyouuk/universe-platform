// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 2: Chart Data & Visualizations — Global Race to Net Zero
// All data sourced from content and peer-reviewed studies cited in the module
// ─────────────────────────────────────────────────────────────────────────────

import type { ChartVisualization } from '@/types'

// ── Chart 1: National Net Zero Target Years ───────────────────────────────────

export const netZeroTargetsChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm2-netzero-targets',
  title: 'Years Remaining to Reach Net Zero — by Country (from 2024)',
  description:
    'Years each country has to achieve its Net Zero commitment from 2024. Germany leads with the most ambitious 2045 target; India has the longest runway at 2070. Countries sharing a 2050 target include the US, UK, Japan, South Korea, and Brazil.',
  type: 'horizontalBar',
  labels: ['Germany (2045)', 'UK (2050)', 'USA (2050)', 'Japan (2050)', 'South Korea (2050)', 'Brazil (2050)', 'China (2060)', 'India (2070)'],
  datasets: [
    {
      label: 'Years Remaining from 2024',
      data: [21, 26, 26, 26, 26, 26, 36, 46],
      backgroundColor: ['#82BC00', '#82BC00', '#82BC00', '#82BC00', '#82BC00', '#82BC00', '#DAA520', '#E8823A'],
    },
  ],
  xAxisLabel: 'Years Remaining from 2024',
  source: 'Climate Action Tracker & UNFCCC National Determined Contributions Registry (2024)',
  sourceUrl: 'https://climateactiontracker.org/',
}

// ── Chart 2: Global Renewable Energy Investment Growth ────────────────────────

export const renewableInvestmentChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm2-renewable-investment',
  title: 'Global Renewable Energy Investment (2015–2023)',
  description:
    'Annual global investment in renewable energy has more than doubled since 2015, reaching $623 billion in 2023. The acceleration reflects falling technology costs, strengthening policy support, and growing corporate Net Zero commitments.',
  type: 'line',
  labels: ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023'],
  datasets: [
    {
      label: 'Investment (USD Billion)',
      data: [286, 242, 280, 273, 282, 303, 366, 499, 623],
      backgroundColor: 'rgba(130, 188, 0, 0.1)',
      borderColor: '#82BC00',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Investment (USD Billion)',
  source: 'IRENA Renewable Energy Finance Reports 2023 & IEA World Energy Investment 2023',
  sourceUrl: 'https://www.irena.org/publications/2023/Nov/Renewable-Power-Generation-Costs-in-2022',
}

// ── Chart 3: Global Electric Vehicle Sales Growth ─────────────────────────────

export const evGlobalSalesChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm2-ev-sales',
  title: 'Global Electric Vehicle Sales (2015–2023)',
  description:
    'Annual global EV sales have grown from under 0.6 million in 2015 to over 14 million in 2023 — a 25-fold increase in eight years. The exponential growth reflects falling battery costs, expanded model ranges, and strengthening government policy support worldwide.',
  type: 'bar',
  labels: ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023'],
  datasets: [
    {
      label: 'EV Sales (Millions)',
      data: [0.55, 0.77, 1.2, 2.1, 2.3, 3.2, 6.75, 10.5, 14.0],
      backgroundColor: '#82BC00',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Electric Vehicles Sold (Millions)',
  source: 'International Energy Agency (IEA) — Global EV Outlook 2024',
  sourceUrl: 'https://www.iea.org/reports/global-ev-outlook-2024',
}

// ── Chart 4: Canada Milestone Emissions Targets ───────────────────────────────

export const canadaTargetsChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm2-canada-targets',
  title: 'Canada\'s Phased Emissions Reduction Targets',
  description:
    'Canada has adopted milestone-based Net Zero targets — a 40–45% emissions reduction by 2030 and 100% Net Zero by 2050. The staggered approach allows interim accountability checkpoints, a model being adopted by several ambitious nations.',
  type: 'bar',
  labels: ['2030 Target (Midpoint)', '2050 Target'],
  datasets: [
    {
      label: '% Emissions Reduction',
      data: [42.5, 100],
      backgroundColor: ['#DAA520', '#82BC00'],
    },
  ],
  xAxisLabel: 'Target Year',
  yAxisLabel: '% Emissions Reduction vs. Baseline',
  source: 'Government of Canada — 2030 Emissions Reduction Plan & Net-Zero Emissions Accountability Act',
  sourceUrl: 'https://www.canada.ca/en/services/environment/weather/climatechange/climate-plan/climate-plan-overview/emissions-reduction-2030.html',
}
