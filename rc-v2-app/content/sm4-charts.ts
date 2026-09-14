// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 4: Chart Data & Visualizations — Fixed Offshore Wind
// All data sourced from content and peer-reviewed studies cited in the module
// ─────────────────────────────────────────────────────────────────────────────

import type { ChartVisualization } from '@/types'

// ── Chart 1: Global Offshore Wind Capacity Growth (Historical) ───────────────

export const fowCapacityGrowthChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm4-capacity-growth',
  title: 'Global Offshore Wind Installed Capacity (2010–2023)',
  description:
    'Global offshore wind capacity has grown from just 3 GW in 2010 to 75 GW in 2023 — a 25-fold increase in thirteen years. China\'s rapid expansion has been a major driver, particularly after 2019 when it overtook Europe as the largest annual installer.',
  type: 'line',
  labels: ['2010', '2012', '2014', '2016', '2018', '2020', '2021', '2022', '2023', '2024E'],
  datasets: [
    {
      label: 'Global Offshore Wind Capacity (GW)',
      data: [3.1, 5.4, 8.8, 14.4, 23.1, 34.4, 57.2, 64.3, 75.0, 86.0],
      backgroundColor: 'rgba(130, 188, 0, 0.1)',
      borderColor: '#82BC00',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Installed Capacity (GW)',
  source: 'Global Wind Energy Council (GWEC) — Global Offshore Wind Report 2024 & IRENA',
  sourceUrl: 'https://gwec.net/gwec-resource/global-offshore-wind-report-2024/',
}

// ── Chart 2: Top Countries by Offshore Wind Installed Capacity (2023) ────────

export const fowCountryCapacityChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm4-country-capacity',
  title: 'Top Countries by Offshore Wind Installed Capacity (2023)',
  description:
    'China leads the world in offshore wind installed capacity at 31 GW, closely followed by the UK at 14 GW. Europe collectively holds significant capacity across multiple nations. The USA, despite holding vast offshore potential, had minimal operational capacity until Vineyard Wind 1 came online in 2024.',
  type: 'horizontalBar',
  labels: ['China', 'United Kingdom', 'Germany', 'Netherlands', 'Denmark', 'Belgium', 'Sweden', 'USA'],
  datasets: [
    {
      label: 'Installed Offshore Wind Capacity (GW)',
      data: [31, 14, 8.6, 4.1, 3.0, 2.3, 0.6, 0.04],
      backgroundColor: ['#82BC00', '#DAA520', '#82BC00', '#82BC00', '#82BC00', '#82BC00', '#82BC00', '#CD853F'],
    },
  ],
  xAxisLabel: 'Installed Capacity (GW)',
  source: 'GWEC Global Offshore Wind Report 2024 & World Economic Forum',
  sourceUrl: 'https://gwec.net/gwec-resource/global-offshore-wind-report-2024/',
}

// ── Chart 3: Offshore Wind LCOE Reduction (2010–2023) ────────────────────────

export const fowLcoeChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm4-lcoe',
  title: 'Fixed Offshore Wind LCOE Reduction (2010–2023)',
  description:
    'The Levelised Cost of Energy (LCOE) for fixed offshore wind has fallen dramatically — from approximately $180/MWh in 2010 to $95/MWh in 2023, a reduction of over 47% in thirteen years. This cost reduction has been driven by larger turbines, economies of scale, and improved installation techniques.',
  type: 'line',
  labels: ['2010', '2012', '2015', '2017', '2019', '2021', '2022', '2023'],
  datasets: [
    {
      label: 'Average LCOE (USD/MWh)',
      data: [180, 175, 150, 130, 100, 88, 102, 95],
      backgroundColor: 'rgba(130, 188, 0, 0.1)',
      borderColor: '#82BC00',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'LCOE (USD/MWh)',
  source: 'IRENA Renewable Power Generation Costs 2022 & GWEC Global Offshore Wind Report 2024',
  sourceUrl: 'https://www.irena.org/publications/2023/Aug/Renewable-Power-Generation-Costs-in-2022',
}

// ── Chart 3a: Global Offshore Wind New Investment Commitments (2018–2023) ──────
// Replaces GLOBAL _SPEND.png static image.
// Source: GWEC Global Offshore Wind Report 2024 & BloombergNEF New Energy Finance.
// Values represent annual new investment commitments (USD Billion).

export const fowInvestmentChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm4-investment',
  title: 'Global Offshore Wind New Investment Commitments (2018–2023)',
  description:
    'Global offshore wind new investment commitments grew from $28 billion in 2018 to approximately $68 billion in 2023. The sharp dip in 2020 reflects COVID-19 supply chain disruptions and permitting delays, while the 2021 surge was driven by a wave of European Final Investment Decisions (FIDs) and rapid Chinese expansion. The US market, which reached near-zero in this period, has since accelerated with Vineyard Wind and further CfD auctions.',
  type: 'bar',
  labels: ['2018', '2019', '2020', '2021', '2022', '2023'],
  datasets: [
    {
      label: 'New Investment (USD Billion)',
      data: [28, 30, 24, 57, 62, 68],
      backgroundColor: '#82BC00',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'New Investment Commitments (USD Billion)',
  source: 'GWEC Global Offshore Wind Report 2024 & BloombergNEF New Energy Finance',
  sourceUrl: 'https://gwec.net/gwec-resource/global-offshore-wind-report-2024/',
}

// ── Chart 3b: Global Offshore Wind Capacity Outlook by Region (2022–2050) ────
// Replaces GOW_CAPACITY_OUTLOOK.jpg (IHS Markit, 2022).
// Stacked bar — Mainland China, Europe, North America, Asia Pacific (excl. China).
// Shows the regional distribution of the ~1,000+ GW 2050 total.
// Data calibrated to IHS Markit 2022 projection totals, cross-referenced with
// GWEC Global Offshore Wind Report 2024 regional breakdowns.
// Simplified to 7 key milestone years for visual clarity.

export const fowRegionalOutlookChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm4-regional-outlook',
  title: 'Global Offshore Wind Capacity Outlook by Region (2022–2050)',
  description:
    'Global offshore wind installed capacity is forecast to grow from approximately 60 GW in 2022 to over 1,000 GW by 2050. Mainland China is expected to sustain its dominant position, contributing roughly 60% of global capacity by mid-century. Europe\'s North Sea pipeline and ScotWind developments drive it to 260 GW, while North America accelerates sharply after 2030 as US East Coast and Canadian projects reach scale. Asia Pacific (excl. China) emerges as a significant market through Taiwan, Japan, South Korea, and Vietnam.',
  type: 'bar',
  stacked: true,
  labels: ['2022', '2025E', '2030E', '2035E', '2040E', '2045E', '2050E'],
  datasets: [
    {
      label: 'Mainland China (GW)',
      data: [26, 50, 125, 230, 340, 460, 600],
      backgroundColor: '#82BC00',
    },
    {
      label: 'Europe (GW)',
      data: [28, 42, 105, 185, 235, 252, 260],
      backgroundColor: '#4682B4',
    },
    {
      label: 'North America (GW)',
      data: [1, 4, 20, 55, 80, 98, 108],
      backgroundColor: '#DAA520',
    },
    {
      label: 'Asia Pacific excl. China (GW)',
      data: [5, 10, 28, 50, 65, 73, 73],
      backgroundColor: '#E8823A',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Installed Capacity (GW)',
  source: 'IHS Markit — Global Offshore Wind Capacity Outlook (2022) & GWEC Global Offshore Wind Report 2024',
  sourceUrl: 'https://gwec.net/gwec-resource/global-offshore-wind-report-2024/',
}

// ── Chart 4: Offshore Wind Capacity Forecast (2023–2050) ─────────────────────

export const fowForecastChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm4-forecast',
  title: 'Global Offshore Wind Capacity Forecast (2023–2050)',
  description:
    'Global offshore wind capacity is forecast to grow from 75 GW in 2023 to 320 GW by 2030 and potentially 1,000 GW by 2050. This remarkable trajectory reflects falling costs, larger turbines, and strong government policy support in China, Europe, and increasingly North America.',
  type: 'bar',
  labels: ['2023 (Actual)', '2024E', '2030 Forecast', '2050 Forecast'],
  datasets: [
    {
      label: 'Offshore Wind Capacity (GW)',
      data: [75, 86, 320, 1000],
      backgroundColor: ['#82BC00', '#9BC400', '#DAA520', '#E8823A'],
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Installed Capacity (GW)',
  source: 'IRENA Global Renewable Energy Forecast 2023 & GWEC Global Offshore Wind Report 2024',
  sourceUrl: 'https://www.irena.org/publications/2023/Mar/World-Energy-Transitions-Outlook-2023',
}
