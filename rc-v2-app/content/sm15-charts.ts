// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 15: Chart Data & Visualizations — The Future of Renewables
// ─────────────────────────────────────────────────────────────────────────────

import type { ChartVisualization } from '@/types'

// ── Chart 1: Global Energy Mix — Current vs 2050 Projection ──────────────────

export const energyMixChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm15-mix',
  title: 'Global Electricity Generation Mix — 2023 vs 2050 Net-Zero Projection',
  description:
    'In 2023, fossil fuels still provided approximately 60% of the world\'s electricity. By 2050 under a net-zero scenario, solar and wind alone could provide around 70% of global electricity, with nuclear, hydropower, and other renewables making up most of the remainder. Coal generation would need to fall to near zero, with gas playing a limited role only alongside CCS.',
  type: 'bar',
  labels: ['Coal', 'Gas', 'Nuclear', 'Hydropower', 'Solar PV', 'Wind', 'Bioenergy', 'Other RE'],
  datasets: [
    {
      label: '2023 Actual — Share (%)',
      data: [35, 23, 10, 15, 5, 7, 3, 2],
      backgroundColor: 'rgba(120, 144, 156, 0.7)',
    },
    {
      label: '2050 Net-Zero — Share (%)',
      data: [0, 2, 10, 11, 40, 30, 5, 2],
      backgroundColor: 'rgba(130, 188, 0, 0.8)',
    },
  ],
  xAxisLabel: 'Energy Source',
  yAxisLabel: 'Share of Global Electricity Generation (%)',
  source: 'IEA Net Zero by 2050 Scenario & IRENA World Energy Transitions Outlook',
  sourceUrl: 'https://www.iea.org/reports/net-zero-by-2050',
}

// ── Chart 2: Global Renewable Energy Capacity Growth (2000–2023 & Projection) ─

export const renewableGrowthChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm15-growth',
  title: 'Global Renewable Energy Installed Capacity — Historical & Projected (GW)',
  description:
    'Total global renewable electricity capacity has grown from around 900 GW in 2000 to over 3,500 GW in 2023 — a near four-fold increase. Under accelerated transition scenarios, total renewable capacity could reach 10,000–15,000 GW by 2030 and 30,000+ GW by 2050. Annual renewable additions would need to triple from today\'s record-setting 300+ GW to maintain this trajectory.',
  type: 'line',
  labels: ['2000', '2005', '2010', '2015', '2018', '2020', '2022', '2023', '2025', '2030', '2040', '2050'],
  datasets: [
    {
      label: 'Total Renewable Capacity — Actual (GW)',
      data: [900, 1050, 1250, 1850, 2400, 2800, 3200, 3500, null, null, null, null],
      backgroundColor: 'rgba(130, 188, 0, 0.15)',
      borderColor: '#82BC00',
    },
    {
      label: 'Total Renewable Capacity — IEA NZE Projection (GW)',
      data: [null, null, null, null, null, null, null, 3500, 5500, 10500, 20000, 33000],
      backgroundColor: 'rgba(130, 188, 0, 0.05)',
      borderColor: '#A5C850',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Installed Capacity (GW)',
  source: 'IRENA & IEA Net Zero Emissions Scenario 2024',
  sourceUrl: 'https://www.iea.org/data-and-statistics/data-tools/energy-statistics-data-browser',
}

// ── Chart 3: Drivers of Renewable Energy Growth (2023 Survey) ────────────────

export const driversChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm15-drivers',
  title: 'Key Drivers of Renewable Energy Growth — Impact Assessment',
  description:
    'Multiple forces are driving renewable energy growth simultaneously. Cost competitiveness is now the single most important factor — renewables are cheaper than new fossil fuel power in most markets. Energy security concerns following the 2022 energy crisis, government policy support, corporate clean energy purchasing, and growing public demand for sustainability all play significant reinforcing roles.',
  type: 'bar',
  labels: ['Cost Competitiveness', 'Energy Security', 'Government Policy', 'Corporate Demand (PPAs)', 'Technology Maturity', 'Public Support', 'ESG Investment'],
  datasets: [
    {
      label: 'Driver Importance Score (0–10)',
      data: [9.5, 8.8, 8.5, 7.9, 7.8, 7.2, 7.0],
      backgroundColor: ['#82BC00', '#A5C850', '#82BC00', '#82BC00', '#A5C850', '#82BC00', '#82BC00'],
    },
  ],
  xAxisLabel: 'Growth Driver',
  yAxisLabel: 'Impact Score (0–10)',
  source: 'IRENA & World Economic Forum Energy Transition Index 2023',
  sourceUrl: 'https://www.weforum.org/reports/fostering-effective-energy-transition-2023',
}

// ── Chart 4: Technology Cost Projections 2023–2050 ────────────────────────────

export const technologyCostChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm15-costs',
  title: 'Renewable Energy LCOE Projections to 2050 (USD/MWh)',
  description:
    'All major renewable technologies are expected to continue declining in cost. Solar PV and onshore wind could reach $15–25/MWh by 2035 in the best locations. Offshore wind is projected to fall below $50/MWh by 2030. Green hydrogen, long-duration storage, and advanced nuclear remain higher-cost but critical technologies for balancing the grid and decarbonising hard-to-abate sectors.',
  type: 'line',
  labels: ['2023', '2025', '2027', '2030', '2035', '2040', '2050'],
  datasets: [
    {
      label: 'Solar PV (USD/MWh)',
      data: [49, 42, 36, 30, 22, 18, 15],
      backgroundColor: 'rgba(255, 193, 7, 0.1)',
      borderColor: '#FFC107',
    },
    {
      label: 'Onshore Wind (USD/MWh)',
      data: [33, 30, 27, 24, 20, 18, 16],
      backgroundColor: 'rgba(130, 188, 0, 0.1)',
      borderColor: '#82BC00',
    },
    {
      label: 'Offshore Wind (USD/MWh)',
      data: [84, 75, 68, 58, 48, 42, 38],
      backgroundColor: 'rgba(0, 119, 189, 0.1)',
      borderColor: '#0077BD',
    },
    {
      label: 'Battery Storage — 4h (USD/MWh)',
      data: [180, 145, 115, 90, 65, 50, 40],
      backgroundColor: 'rgba(74, 144, 217, 0.1)',
      borderColor: '#4A90D9',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'LCOE (USD/MWh)',
  source: 'IRENA Renewable Power Generation Costs 2023 & BloombergNEF New Energy Outlook 2024',
  sourceUrl: 'https://about.bnef.com/new-energy-outlook/',
}
