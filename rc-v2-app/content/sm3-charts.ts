// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 3: Chart Data & Visualizations — The Energy Transition
// All data sourced from content and peer-reviewed studies cited in the module
// ─────────────────────────────────────────────────────────────────────────────

import type { ChartVisualization } from '@/types'

// ── Chart A: Global Primary Energy Consumption (1850–2020) ───────────────────
// Replaces MORE SUSTAINABLE.png. Source: Our World in Data / Vaclav Smil.
// Shows the exponential surge from industrialisation to the present day.
// Units: TWh of primary energy.

export const globalEnergyConsumptionChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm3-global-energy-consumption',
  title: 'Global Primary Energy Consumption (1850–2020)',
  description:
    'Global energy demand has grown exponentially since the Industrial Revolution — from roughly 10,000 TWh in 1850 to over 173,000 TWh by 2020. The sharpest acceleration occurred after 1950, driven by post-war industrialisation, population growth, and the widespread adoption of electricity. This rapid growth is the fundamental driver of the energy transition challenge.',
  type: 'line',
  labels: [
    '1850','1860','1870','1880','1890','1900','1910','1920','1930','1940',
    '1950','1960','1970','1980','1990','2000','2010','2020',
  ],
  datasets: [
    {
      label: 'Global Primary Energy (TWh)',
      data: [
        10200, 12100, 14800, 18300, 22600, 27800, 34500, 40200, 47000, 52000,
        62000, 84000, 114000, 133000, 142000, 152000, 163000, 173000,
      ],
      backgroundColor: 'rgba(130,188,0,0.10)',
      borderColor: '#82BC00',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Primary Energy Consumption (TWh)',
  source: 'Our World in Data — Global Primary Energy Consumption (Smil / BP Statistical Review)',
  sourceUrl: 'https://ourworldindata.org/energy-production-consumption',
}

// ── Chart B: Renewable Energy Share of Primary Energy by Country (2021) ──────
// Replaces SHARE_OF_PRIMARY_ENERGY.png world map with a clearer ranked chart.
// Source: Our World in Data / IEA — Share of Modern Renewables in Primary Energy.
// Note: includes hydro, wind, solar, geothermal, modern bioenergy.

export const renewableShareByCountryChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm3-renewable-share-country',
  title: 'Renewable Energy Share of Primary Energy by Country (2021)',
  description:
    'The share of renewables in primary energy varies enormously by country — from near-100% in Iceland (geothermal and hydro) to under 5% in fossil-fuel-dependent economies. Brazil benefits from vast hydro resources; the Nordic countries from hydro and wind. The world average sits at approximately 14%, revealing the scale of transition still required.',
  type: 'horizontalBar',
  labels: [
    'Iceland', 'Norway', 'Brazil', 'Canada', 'Sweden', 'New Zealand',
    'Germany', 'United Kingdom', 'World Average', 'China', 'United States', 'India',
  ],
  datasets: [
    {
      label: '% Renewable Share of Primary Energy (2021)',
      data: [99, 76, 48, 35, 34, 32, 19, 15, 14, 13, 12, 6],
      backgroundColor: '#82BC00',
    },
  ],
  xAxisLabel: '% of Primary Energy from Renewables',
  source: 'Our World in Data — Share of Primary Energy from Renewables (IEA / BP, 2021)',
  sourceUrl: 'https://ourworldindata.org/renewable-energy',
}

// ── Chart C: Global Energy Investment by Source (2010–2030) ──────────────────
// Replaces GLOBAL_ENERGY_INVESTMENT.png. Source: IEA World Energy Investment.
// Shows the shift of capital from fossil fuels towards clean energy.
// Units: USD billion per annum. 2024–2030 based on IEA Stated Policies Scenario.

export const energyInvestmentProjectionChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm3-energy-investment-projection',
  title: 'Global Energy Investment by Source — Historical & Projected (2010–2030)',
  description:
    'Global energy investment has shifted decisively towards clean energy. Solar and wind, which attracted minimal investment in 2010, now dominate new capital allocation. By 2030, the IEA projects clean energy investment to exceed $3 trillion annually under net-zero-aligned scenarios — compared to roughly $1 trillion for all energy in 2010.',
  type: 'bar',
  stacked: true,
  labels: ['2010', '2015', '2019', '2020', '2021', '2022', '2023', '2025', '2030'],
  datasets: [
    {
      label: 'Solar',
      data: [80, 200, 280, 290, 340, 420, 500, 620, 900],
      backgroundColor: '#DAA520',
    },
    {
      label: 'Wind',
      data: [90, 150, 180, 180, 220, 270, 310, 390, 550],
      backgroundColor: '#82BC00',
    },
    {
      label: 'Other Clean Energy',
      data: [130, 160, 200, 195, 230, 260, 290, 360, 480],
      backgroundColor: '#4682B4',
    },
    {
      label: 'Natural Gas',
      data: [280, 310, 320, 260, 280, 300, 295, 270, 230],
      backgroundColor: '#CD853F',
    },
    {
      label: 'Coal',
      data: [160, 130, 100, 80, 100, 110, 90, 75, 50],
      backgroundColor: '#4A4A4A',
    },
    {
      label: 'Oil',
      data: [310, 400, 380, 270, 290, 350, 360, 320, 260],
      backgroundColor: '#8B4513',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Investment (USD Billion)',
  source: 'IEA World Energy Investment 2023 & Net Zero by 2050 projections',
  sourceUrl: 'https://www.iea.org/reports/world-energy-investment-2023',
}

// ── Chart 0: Global Electricity Production by Source (1990–2021) ─────────────
// Replaces GLOBAL ELEC PRODUCTION.png (Our World in Data, CC BY 4.0).
// Source: IEA World Energy Statistics / Our World in Data — Electricity by Source.
// Units: TWh. Years selected for visual clarity.

export const globalElecProductionChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm3-global-elec-production',
  title: 'Global Electricity Production by Source (1990–2021)',
  description:
    'Global electricity production has grown from around 11,800 TWh in 1990 to over 28,000 TWh in 2021. While coal and gas have grown in absolute terms, renewables — led by hydropower, then wind and solar — have accelerated sharply. As of the early 2020s, fossil fuels still account for approximately 60% of global electricity, with renewables around 30%.',
  type: 'bar',
  stacked: true,
  labels: ['1990', '1995', '2000', '2005', '2010', '2015', '2018', '2020', '2021'],
  datasets: [
    {
      label: 'Coal',
      data: [4688, 5022, 6136, 7400, 8700, 9667, 10099, 9431, 10043],
      backgroundColor: '#4A4A4A',
    },
    {
      label: 'Natural Gas',
      data: [1666, 1795, 2598, 3200, 4600, 5510, 6163, 6284, 6374],
      backgroundColor: '#CD853F',
    },
    {
      label: 'Oil',
      data: [1181, 1177, 1068, 1000, 900, 790, 670, 594, 629],
      backgroundColor: '#8B4513',
    },
    {
      label: 'Nuclear',
      data: [2013, 2332, 2591, 2768, 2756, 2504, 2701, 2718, 2806],
      backgroundColor: '#4682B4',
    },
    {
      label: 'Hydropower',
      data: [2142, 2548, 2894, 3112, 3490, 3985, 4193, 4355, 4288],
      backgroundColor: '#2196F3',
    },
    {
      label: 'Wind',
      data: [4, 15, 85, 247, 614, 1234, 1773, 1879, 1869],
      backgroundColor: '#82BC00',
    },
    {
      label: 'Solar',
      data: [0, 1, 2, 5, 35, 254, 584, 844, 1033],
      backgroundColor: '#DAA520',
    },
    {
      label: 'Other Renewables',
      data: [152, 194, 243, 305, 430, 607, 707, 788, 865],
      backgroundColor: '#556B2F',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Electricity Production (TWh)',
  source: 'Our World in Data — Electricity Production by Source (IEA data)',
  sourceUrl: 'https://ourworldindata.org/electricity-mix',
}

// ── Chart 1: Global Renewable Energy Jobs Growth ─────────────────────────────

export const renewableJobsChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm3-renewable-jobs',
  title: 'Global Renewable Energy Employment (2012–2024)',
  description:
    'The renewable energy sector has grown from 4.3 million jobs in 2012 to 16.2 million in 2023/24 — a near fourfold increase in twelve years. The growth is accelerating, reflecting the rapid scale-up of solar, wind, and supporting industries.',
  type: 'line',
  labels: ['2012', '2013', '2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023/24'],
  datasets: [
    {
      label: 'Renewable Energy Jobs (Millions)',
      data: [4.3, 5.7, 7.7, 8.1, 9.8, 10.5, 11.0, 11.5, 12.0, 12.7, 13.7, 16.2],
      backgroundColor: 'rgba(130, 188, 0, 0.1)',
      borderColor: '#82BC00',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Jobs (Millions)',
  source: 'IRENA Renewable Energy and Jobs — Annual Review 2024',
  sourceUrl: 'https://www.irena.org/Publications/2024/Sep/Renewable-Energy-and-Jobs-Annual-Review-2024',
}

// ── Chart 2: Clean Energy vs Fossil Fuel Investment (2023) ───────────────────

export const energyInvestmentChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm3-energy-investment',
  title: 'Global Energy Investment: Clean Energy vs Fossil Fuels (2023)',
  description:
    'In 2023, global investment in clean energy reached approximately $1.74 trillion — nearly double the $950 billion invested in fossil fuels. This milestone, reported by the IEA, marks a fundamental reorientation of global capital towards the energy transition.',
  type: 'bar',
  labels: ['Clean Energy', 'Fossil Fuels'],
  datasets: [
    {
      label: 'Global Investment (USD Billion)',
      data: [1740, 950],
      backgroundColor: ['#82BC00', '#CD853F'],
    },
  ],
  xAxisLabel: 'Energy Category',
  yAxisLabel: 'Investment (USD Billion)',
  source: 'International Energy Agency (IEA) — World Energy Investment 2023',
  sourceUrl: 'https://www.iea.org/reports/world-energy-investment-2023',
}

// ── Chart 3: EV Market Share Comparison 2024 ─────────────────────────────────

export const evAdoptionChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm3-ev-adoption',
  title: 'Electric Vehicle Market Share of New Car Sales (2024)',
  description:
    'Norway leads the world with EVs accounting for 88.9% of new car sales in 2024 — approaching full electrification of the new car market. The UK reached 20% and the US 8%, both rising year-on-year. Norway\'s success demonstrates what long-term, consistent policy support can achieve.',
  type: 'bar',
  labels: ['Norway', 'United Kingdom', 'United States'],
  datasets: [
    {
      label: '% of New Car Sales (2024)',
      data: [88.9, 20, 8],
      backgroundColor: ['#82BC00', '#DAA520', '#CD853F'],
    },
  ],
  xAxisLabel: 'Country',
  yAxisLabel: '% of New Car Sales that are Electric',
  source: 'BBC News — Norway on Track to be First to Go All-Electric (January 2025) & SMMT / US DOE',
  sourceUrl: 'https://www.bbc.co.uk/news/articles/c5y4xy27r1lo',
}

// ── Chart 4: Renewable Energy Share of Global Electricity Generation ─────────

export const renewableShareChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm3-renewable-share',
  title: 'Renewable Energy Share of Global Electricity Generation (2000–2023)',
  description:
    'The share of renewable energy in global electricity generation has grown from approximately 19% in 2000 to 30% by 2023, with the IEA reporting 26% in their landmark 2022 assessment. The rise of solar and wind accounts for the majority of recent growth.',
  type: 'line',
  labels: ['2000', '2005', '2010', '2015', '2018', '2020', '2021', '2022', '2023'],
  datasets: [
    {
      label: '% of Global Electricity from Renewables',
      data: [19, 20, 21, 23, 26, 28, 28, 29, 30],
      backgroundColor: 'rgba(130, 188, 0, 0.1)',
      borderColor: '#82BC00',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: '% of Global Electricity Generation',
  source: 'International Energy Agency (IEA) — Electricity Information 2023 & Renewables 2023',
  sourceUrl: 'https://www.iea.org/reports/renewables-2023',
}

// ── Chart 5a: RE Employment by Technology — Trend (2012–2023) ─────────────────
// Replaces ECONOMIC_IMPACT_GRAPH.png (IRENA, CC BY 4.0).
// Source: IRENA Renewable Energy and Jobs Annual Reviews (2013–2024).
// All figures in millions of jobs.

export const reEmploymentByTechChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm3-re-employment-tech',
  title: 'Renewable Energy Employment by Technology (2012–2023)',
  description:
    'Solar PV has been the principal driver of green jobs growth — expanding from 1.3 million jobs in 2012 to 7.1 million in 2023, representing 44% of all renewable energy employment. Bioenergy and hydropower are consistent large employers, while wind energy has grown steadily. Modern cooking fuels (biogas/biomass) became a significant counted category from 2015.',
  type: 'bar',
  labels: ['2012', '2015', '2018', '2021', '2023'],
  datasets: [
    {
      label: 'Solar PV (M jobs)',
      data: [1.3, 2.8, 3.6, 4.9, 7.1],
      backgroundColor: '#82BC00',
    },
    {
      label: 'Bioenergy (M jobs)',
      data: [1.5, 1.9, 2.9, 3.5, 3.7],
      backgroundColor: '#DAA520',
    },
    {
      label: 'Hydropower (M jobs)',
      data: [1.4, 1.5, 1.7, 2.0, 2.2],
      backgroundColor: '#4682B4',
    },
    {
      label: 'Wind Energy (M jobs)',
      data: [0.5, 1.1, 1.3, 1.4, 1.5],
      backgroundColor: '#E8823A',
    },
    {
      label: 'Modern Cooking Fuels & Other (M jobs)',
      data: [0.1, 0.8, 1.5, 0.9, 1.7],
      backgroundColor: '#556B2F',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Jobs (Millions)',
  source: 'IRENA Renewable Energy and Jobs — Annual Review 2024',
  sourceUrl: 'https://www.irena.org/Publications/2024/Sep/Renewable-Energy-and-Jobs-Annual-Review-2024',
}

// ── Chart 5b: RE Employment by Technology — 2023 Snapshot ─────────────────────
// Replaces ECONOMIC_IMPACT_GRAPH_2.png (IRENA, CC BY 4.0).
// Source: IRENA Renewable Energy and Jobs Annual Review 2024.

export const reEmploymentSnapshot2023Chart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm3-re-employment-2023',
  title: 'Renewable Energy Employment by Technology — 2023 Snapshot (16.2 Million Total)',
  description:
    'Solar PV alone accounts for 44% of all 16.2 million renewable energy jobs in 2023, reflecting the extraordinary scale of panel manufacturing and installation worldwide — concentrated in China, India, and the US. Bioenergy, hydropower, and wind energy together account for most of the remainder. The sector has nearly doubled in ten years.',
  type: 'horizontalBar',
  labels: [
    'Solar PV',
    'Bioenergy (Liquid Biofuels, Biomass & Biogas)',
    'Hydropower',
    'Modern Cooking Fuels',
    'Wind Energy',
    'Geothermal & Other',
  ],
  datasets: [
    {
      label: 'Jobs (Millions) — 2023',
      data: [7.1, 3.7, 2.2, 1.7, 1.5, 0.1],
      backgroundColor: '#82BC00',
    },
  ],
  xAxisLabel: 'Jobs (Millions)',
  source: 'IRENA Renewable Energy and Jobs — Annual Review 2024',
  sourceUrl: 'https://www.irena.org/Publications/2024/Sep/Renewable-Energy-and-Jobs-Annual-Review-2024',
}

// ── Chart 5: Pumped Hydro Storage Performance ─────────────────────────────────

export const storageTechnologyChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm3-storage-technology',
  title: 'Energy Storage Technologies — Round-Trip Efficiency Comparison',
  description:
    'Round-trip efficiency measures how much energy is recovered from a storage system compared to what was put in. Lithium-ion batteries lead at 90–95%, followed by pumped hydro at 70–85%. Each technology has different optimal use-cases based on duration, scale, and response time.',
  type: 'horizontalBar',
  labels: ['Lithium-Ion Batteries', 'Pumped Hydro Storage', 'Flow Batteries', 'Compressed Air', 'Hydrogen (P2H2P)'],
  datasets: [
    {
      label: 'Round-Trip Efficiency (%)',
      data: [92, 78, 70, 55, 35],
      backgroundColor: '#82BC00',
    },
  ],
  xAxisLabel: 'Round-Trip Efficiency (%)',
  source: 'IRENA Electricity Storage and Renewables: Costs and Markets to 2030 & IEA Energy Storage',
  sourceUrl: 'https://www.irena.org/publications/2017/Oct/Electricity-Storage-and-Renewables-Costs-and-Markets',
}
