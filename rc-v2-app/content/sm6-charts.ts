// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 6: Chart Data & Visualizations — Onshore Wind
// All data sourced from content and peer-reviewed studies cited in the module
// ─────────────────────────────────────────────────────────────────────────────

import type { ChartVisualization } from '@/types'

// ── Chart 1: Global Onshore Wind LCOE Reduction (2010–2023) ──────────────────

export const onshoreWindLcoeChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm6-lcoe',
  title: 'Global Onshore Wind LCOE Reduction (2010–2023)',
  description:
    'The Levelised Cost of Energy (LCOE) for onshore wind has fallen dramatically over the past decade — from around $100/MWh in 2010 to approximately $33/MWh in 2023, making it one of the cheapest sources of electricity in the world. Global averages reached £26/MWh in 2021, with costs projected to fall further to £20–25/MWh by 2030.',
  type: 'line',
  labels: ['2010', '2012', '2014', '2016', '2018', '2019', '2020', '2021', '2022', '2023'],
  datasets: [
    {
      label: 'Global Average LCOE (USD/MWh)',
      data: [100, 90, 79, 66, 56, 53, 41, 34, 37, 33],
      backgroundColor: 'rgba(130, 188, 0, 0.1)',
      borderColor: '#82BC00',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'LCOE (USD/MWh)',
  source: 'IRENA Renewable Power Generation Costs 2022 & GWEC Global Wind Report 2024',
  sourceUrl: 'https://www.irena.org/publications/2023/Aug/Renewable-Power-Generation-Costs-in-2022',
}

// ── Chart 2: Global Onshore Wind Installed Capacity (2010–2023) ──────────────

export const onshoreWindCapacityChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm6-capacity',
  title: 'Global Onshore Wind Installed Capacity (2010–2023)',
  description:
    'Global onshore wind capacity has grown from 178 GW in 2010 to over 950 GW in 2023 — more than a five-fold increase in thirteen years. In 2020, onshore wind became the largest renewable energy source globally. China and the United States are by far the two largest markets.',
  type: 'line',
  labels: ['2010', '2012', '2014', '2016', '2018', '2019', '2020', '2021', '2022', '2023'],
  datasets: [
    {
      label: 'Global Onshore Wind Capacity (GW)',
      data: [178, 254, 336, 445, 544, 597, 698, 837, 906, 950],
      backgroundColor: 'rgba(130, 188, 0, 0.1)',
      borderColor: '#82BC00',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Installed Capacity (GW)',
  source: 'GWEC Global Wind Report 2024 & IRENA',
  sourceUrl: 'https://gwec.net/global-wind-report/',
}

// ── Chart 3: Top Countries by Onshore Wind Installed Capacity (2023) ─────────

export const onshoreWindCountriesChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm6-countries',
  title: 'Top Countries by Onshore Wind Installed Capacity (2023)',
  description:
    'China leads the world in onshore wind installed capacity at 440 GW — nearly three times that of the United States (150 GW). Together, China and the US account for over 60% of global onshore wind capacity. India, Germany, and Spain round out the top five.',
  type: 'horizontalBar',
  labels: ['China', 'United States', 'Germany', 'India', 'Spain', 'Brazil', 'France', 'United Kingdom'],
  datasets: [
    {
      label: 'Installed Onshore Wind Capacity (GW)',
      data: [440, 150, 61, 44, 30, 27, 22, 15],
      backgroundColor: ['#82BC00', '#DAA520', '#82BC00', '#82BC00', '#82BC00', '#82BC00', '#82BC00', '#CD853F'],
    },
  ],
  xAxisLabel: 'Installed Capacity (GW)',
  source: 'GWEC Global Wind Report 2024',
  sourceUrl: 'https://gwec.net/global-wind-report/',
}

// ── Chart 4a: Global Onshore Wind Annual Additions by Region (2023–2028) ──────
// Replaces FUTURE.png (Statista, based on BNEF/GWEC data).
// Stacked bar showing annual new capacity additions (GW), not cumulative installed.
// Regions: Asia Pacific (China-dominated), Europe, America, Middle East & Africa.
// Data values read directly from the Statista chart labels.
// showDataLabels suppressed — stacked bars with 4 segments are too dense for labels.

export const onshoreWindRegionalInstallationsChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm6-regional-installations',
  title: 'Global Onshore Wind Annual Additions by Region (2023–2028)',
  description:
    'Annual global onshore wind additions are projected to grow from 105.4 GW in 2023 to 145.5 GW by 2028. Asia Pacific — dominated by China — accounts for roughly 62% of all new installations throughout the period. Europe and the Americas are both accelerating, driven by energy security imperatives and falling costs, while the Middle East and Africa represent the fastest-growing region proportionally, albeit from a small base.',
  type: 'bar',
  stacked: true,
  labels: ['2023', '2024E', '2025E', '2026E', '2027E', '2028E'],
  datasets: [
    {
      label: 'Asia Pacific (GW)',
      data: [75.8, 79.6, 81.9, 83.0, 88.1, 89.4],
      backgroundColor: '#82BC00',
    },
    {
      label: 'Europe (GW)',
      data: [14.5, 16.1, 20.9, 22.6, 25.1, 27.0],
      backgroundColor: '#4682B4',
    },
    {
      label: 'America (GW)',
      data: [14.1, 15.1, 18.3, 20.9, 22.2, 23.9],
      backgroundColor: '#DAA520',
    },
    {
      label: 'Middle East & Africa (GW)',
      data: [1.0, 2.3, 3.1, 3.9, 4.7, 5.2],
      backgroundColor: '#E8823A',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Annual Capacity Additions (GW)',
  source: 'Statista — Global Onshore Wind Capacity Additions by Region (2023–2028), based on BloombergNEF & GWEC data',
  sourceUrl: 'https://www.statista.com/statistics/476475/global-capacity-of-onshore-wind-power/',
}

// ── Chart 4b: Onshore Wind LCOE — Lazard Range & IRENA Average (2010–2023) ───
// Replaces LEVELISED_COSTS.png (AleaSoft, CC BY, sourcing Lazard v16 + IRENA).
// Band chart: shaded area between Lazard upper/lower estimates (RC green band)
// plus IRENA global average as a distinct terracotta line.
// Three-dataset multi-line: showDataLabels must be false.
// Fill: upper dataset fill:false; lower dataset fill:0 (fills to dataset 0 — the band).
// Source: Lazard LCOE Analysis v17 (2023) & IRENA Renewable Power Generation Costs 2023.

export const onshoreWindLcoeRangeChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm6-lcoe-range',
  title: 'Onshore Wind LCOE — Lazard Range & IRENA Average (2010–2023)',
  description:
    'The Levelised Cost of Energy for onshore wind has fallen by approximately 70% since 2010 — from a Lazard midpoint of around $113/MWh to approximately $50/MWh in 2023. The shaded band represents the range of project-level costs estimated by Lazard (low-to-high), reflecting variation in wind resources, financing conditions, and turbine sizes across markets. The IRENA global average (orange line) tracks the middle of the Lazard band, confirming cross-source consistency. The slight cost uptick in 2022–2023 reflects supply chain inflation and higher interest rates.',
  type: 'line',
  showDataLabels: false,
  labels: ['2010', '2011', '2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023'],
  datasets: [
    {
      label: 'Upper LCOE estimate — Lazard (USD/MWh)',
      data: [150, 143, 132, 121, 113, 102, 95, 86, 80, 77, 71, 67, 76, 80],
      borderColor: 'rgba(130,188,0,0.7)',
      backgroundColor: 'rgba(130,188,0,0.12)',
      borderDash: [6, 3],
      fill: false,
    },
    {
      label: 'Lower LCOE estimate — Lazard (USD/MWh)',
      data: [77, 70, 63, 55, 49, 44, 39, 34, 30, 26, 26, 24, 26, 29],
      borderColor: 'rgba(130,188,0,0.7)',
      backgroundColor: 'rgba(130,188,0,0.12)',
      fill: 0,
    },
    {
      label: 'IRENA Global Average (USD/MWh)',
      data: [102, 97, 91, 82, 75, 67, 59, 53, 49, 45, 41, 35, 37, 33],
      borderColor: '#E8823A',
      backgroundColor: 'rgba(232,130,58,0.05)',
      fill: false,
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'LCOE (USD/MWh)',
  source: 'Lazard LCOE Analysis v17.0 (2023) & IRENA Renewable Power Generation Costs 2023',
  sourceUrl: 'https://www.lazard.com/research-insights/levelized-cost-of-energyplus/',
}

// ── Chart 4: Global Onshore Wind Capacity Forecast (2023–2030) ───────────────

export const onshoreWindForecastChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm6-forecast',
  title: 'Global Onshore Wind Capacity Forecast (2023–2030)',
  description:
    'Global onshore wind capacity is forecast to grow from 950 GW in 2023 to over 2,200 GW by 2030, driven by China, emerging markets in Asia and Latin America, and a wave of repowering projects in Europe and North America. By 2030, onshore wind is expected to supply up to 30% of global electricity demand.',
  type: 'bar',
  labels: ['2023 (Actual)', '2025E', '2027E', '2030 Forecast'],
  datasets: [
    {
      label: 'Onshore Wind Capacity (GW)',
      data: [950, 1200, 1650, 2200],
      backgroundColor: ['#82BC00', '#9BC400', '#DAA520', '#E8823A'],
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Installed Capacity (GW)',
  source: 'GWEC Global Wind Report 2024 & IEA World Energy Outlook 2023',
  sourceUrl: 'https://gwec.net/global-wind-report/',
}
