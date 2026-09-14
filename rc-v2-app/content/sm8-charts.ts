// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 8: Chart Data & Visualizations — Solar Power
// ─────────────────────────────────────────────────────────────────────────────

import type { ChartVisualization } from '@/types'

// ── Chart 1: Global Solar PV LCOE Reduction (2010–2023) ──────────────────────

export const solarLcoeChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm8-lcoe',
  title: 'Global Solar PV LCOE Reduction (2010–2023)',
  description:
    'Solar PV has achieved the most dramatic cost reduction of any energy technology in history. The global average LCOE fell from approximately $445/MWh in 2010 to just $49/MWh in 2023 — a reduction of nearly 90% in thirteen years. Utility-scale projects in the sunniest regions now regularly achieve costs below $20/MWh.',
  type: 'line',
  labels: ['2010', '2012', '2014', '2016', '2018', '2019', '2020', '2021', '2022', '2023'],
  datasets: [
    {
      label: 'Global Average Solar PV LCOE (USD/MWh)',
      data: [445, 310, 200, 100, 78, 68, 57, 48, 49, 49],
      backgroundColor: 'rgba(255, 193, 7, 0.15)',
      borderColor: '#FFC107',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'LCOE (USD/MWh)',
  source: 'IRENA Renewable Power Generation Costs 2023',
  sourceUrl: 'https://www.irena.org/publications/2023/Aug/Renewable-Power-Generation-Costs-in-2022',
}

// ── Chart 2: Global Solar PV Installed Capacity (2010–2023) ──────────────────

export const solarCapacityChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm8-capacity',
  title: 'Global Solar PV Installed Capacity (2010–2023)',
  description:
    'Global solar PV capacity has grown from just 40 GW in 2010 to over 1,600 GW in 2023 — a 40-fold increase. Annual additions have accelerated sharply, with 2023 seeing a record 340 GW of new solar capacity installed. Solar is now the fastest-growing electricity source in history.',
  type: 'line',
  labels: ['2010', '2012', '2014', '2016', '2018', '2019', '2020', '2021', '2022', '2023'],
  datasets: [
    {
      label: 'Global Solar PV Capacity (GW)',
      data: [40, 100, 177, 295, 480, 630, 760, 940, 1185, 1600],
      backgroundColor: 'rgba(255, 193, 7, 0.15)',
      borderColor: '#FFC107',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Installed Capacity (GW)',
  source: 'IRENA & IEA Solar Power Special Report 2024',
  sourceUrl: 'https://www.iea.org/reports/solar-pv',
}

// ── Chart 3: Top Countries by Solar PV Capacity (2023) ───────────────────────

export const solarCountriesChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm8-countries',
  title: 'Top Countries by Solar PV Installed Capacity (2023)',
  description:
    'China dominates global solar PV deployment with over 600 GW of installed capacity — more than all other countries combined. The United States and India are in second and third place respectively, with Germany, Japan, and Australia also representing significant markets.',
  type: 'horizontalBar',
  labels: ['China', 'USA', 'India', 'Germany', 'Japan', 'Australia', 'Brazil', 'Italy', 'Spain', 'UK'],
  datasets: [
    {
      label: 'Installed Solar PV Capacity (GW)',
      data: [610, 139, 81, 73, 78, 36, 28, 25, 23, 15],
      backgroundColor: ['#FFC107', '#FFD54F', '#FFC107', '#FFC107', '#FFC107', '#FFD54F', '#FFC107', '#FFC107', '#FFC107', '#FFB300'],
    },
  ],
  xAxisLabel: 'Installed Capacity (GW)',
  source: 'IRENA Renewable Capacity Statistics 2024',
  sourceUrl: 'https://www.irena.org/Statistics',
}

// ── Chart 4: Solar Energy Applications — Capacity Split (2023) ───────────────

export const solarApplicationsChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm8-applications',
  title: 'Global Solar PV Capacity by Application Type (2023)',
  description:
    'Utility-scale solar farms account for the majority of global solar capacity, but distributed rooftop solar — on homes, businesses, and farms — is growing rapidly. Agrivoltaics, building-integrated PV (BIPV), and floating solar are emerging applications adding diversity to how and where solar is deployed.',
  type: 'bar',
  labels: ['Utility-Scale Ground Mount', 'Commercial Rooftop', 'Residential Rooftop', 'Floating Solar', 'Agrivoltaics'],
  datasets: [
    {
      label: 'Installed Capacity (GW)',
      data: [950, 320, 220, 30, 10],
      backgroundColor: ['#FFC107', '#FFD54F', '#FFE082', '#FFCA28', '#FFB300'],
    },
  ],
  xAxisLabel: 'Application Type',
  yAxisLabel: 'Installed Capacity (GW)',
  source: 'IEA Solar PV Special Report 2024',
  sourceUrl: 'https://www.iea.org/reports/solar-pv',
}
