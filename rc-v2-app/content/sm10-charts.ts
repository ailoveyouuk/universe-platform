// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 10: Chart Data & Visualizations — Hydropower & Geothermal
// ─────────────────────────────────────────────────────────────────────────────

import type { ChartVisualization } from '@/types'

// ── Chart 1: Top Countries by Hydropower Installed Capacity (2023) ────────────

export const hydroCountriesChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm10-countries',
  title: 'Top Countries by Hydropower Installed Capacity (2023)',
  description:
    'China is the undisputed leader in hydropower, with over 420 GW of installed capacity — nearly three times that of Brazil. China\'s Three Gorges Dam alone, at 22.5 GW, remains the world\'s largest power station of any type. Brazil, the United States, Canada, and India round out the top five, with hydropower providing a vital baseload contribution to each country\'s grid.',
  type: 'horizontalBar',
  labels: ['China', 'Brazil', 'USA', 'Canada', 'India', 'Russia', 'Norway', 'Turkey', 'Japan', 'France'],
  datasets: [
    {
      label: 'Installed Hydropower Capacity (GW)',
      data: [421, 109, 102, 82, 51, 50, 33, 31, 22, 25],
      backgroundColor: ['#0277BD', '#0288D1', '#0277BD', '#0277BD', '#0288D1', '#0277BD', '#029FDA', '#0277BD', '#0288D1', '#0277BD'],
    },
  ],
  xAxisLabel: 'Installed Capacity (GW)',
  source: 'International Hydropower Association (IHA) Hydropower Status Report 2024',
  sourceUrl: 'https://www.hydropower.org/publications/hydropower-status-report-2024',
}

// ── Chart 2: Global Hydropower Capacity Growth (2000–2023) ───────────────────

export const hydroCapacityChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm10-capacity',
  title: 'Global Hydropower Installed Capacity (2000–2023)',
  description:
    'Global hydropower capacity has grown from around 700 GW in 2000 to over 1,400 GW in 2023, making it the world\'s largest source of renewable electricity by installed capacity. The bulk of recent growth has been driven by large dam projects in China, Brazil, and Ethiopia, supplemented by pumped-storage hydro for grid balancing.',
  type: 'line',
  labels: ['2000', '2003', '2006', '2009', '2012', '2015', '2018', '2020', '2022', '2023'],
  datasets: [
    {
      label: 'Global Hydropower Capacity (GW)',
      data: [700, 760, 820, 920, 1030, 1140, 1270, 1330, 1392, 1420],
      backgroundColor: 'rgba(2, 119, 189, 0.15)',
      borderColor: '#0277BD',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Installed Capacity (GW)',
  source: 'International Hydropower Association (IHA) 2024',
  sourceUrl: 'https://www.hydropower.org/',
}

// ── Chart 3: Hydropower Types — Global Capacity Split (2023) ─────────────────

export const hydroTypesChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm10-types',
  title: 'Hydropower Types — Global Installed Capacity (2023)',
  description:
    'Conventional reservoir-based dams remain the dominant form of hydropower globally, accounting for the majority of installed capacity. Pumped-storage hydro — which acts as a giant battery for grid balancing — is the second largest, and its importance is growing rapidly as variable renewables scale up. Run-of-river and micro-hydro complete the picture.',
  type: 'bar',
  labels: ['Conventional Reservoir Dam', 'Pumped-Storage Hydro', 'Run-of-River', 'Micro-Hydro (<10 MW)'],
  datasets: [
    {
      label: 'Installed Capacity (GW)',
      data: [820, 180, 380, 40],
      backgroundColor: ['#0277BD', '#29B6F6', '#0288D1', '#4FC3F7'],
    },
  ],
  xAxisLabel: 'Hydropower Type',
  yAxisLabel: 'Installed Capacity (GW)',
  source: 'International Hydropower Association (IHA) Hydropower Status Report 2024',
  sourceUrl: 'https://www.hydropower.org/publications/hydropower-status-report-2024',
}

// ── Chart 4: Geothermal Energy — Top Countries by Capacity (2023) ────────────

export const geothermalChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm10-geothermal',
  title: 'Top Countries by Geothermal Installed Capacity (2023)',
  description:
    'The United States leads the world in geothermal electricity capacity with nearly 4 GW, concentrated in California and Nevada. Indonesia, the Philippines, and Kenya are major geothermal producers relative to their overall generation capacity. Iceland is notable for generating nearly 30% of its electricity and over 90% of its heating from geothermal energy.',
  type: 'horizontalBar',
  labels: ['USA', 'Indonesia', 'Philippines', 'Kenya', 'New Zealand', 'Iceland', 'Mexico', 'Italy', 'Turkey', 'Japan'],
  datasets: [
    {
      label: 'Geothermal Installed Capacity (GW)',
      data: [3.9, 2.4, 1.9, 0.95, 0.9, 0.75, 0.95, 0.92, 1.8, 0.6],
      backgroundColor: ['#FF7043', '#FF8A65', '#FF7043', '#FF7043', '#FF8A65', '#FF7043', '#FF7043', '#FF8A65', '#FF7043', '#FF7043'],
    },
  ],
  xAxisLabel: 'Installed Capacity (GW)',
  source: 'IRENA Renewable Capacity Statistics 2024',
  sourceUrl: 'https://www.irena.org/Statistics',
}
