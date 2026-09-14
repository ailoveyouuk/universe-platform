// ─────────────────────────────────────────────────────────────────────────────
// Sub-Module 7: Chart Data & Visualizations — Nuclear Energy
// ─────────────────────────────────────────────────────────────────────────────

import type { ChartVisualization } from '@/types'

// ── Chart 1: Global Nuclear Electricity Generation Share by Country (2023) ───

export const nuclearShareChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm7-share',
  title: 'Top Countries by Nuclear Share of Electricity Generation (2023)',
  description:
    'France remains the world leader in nuclear electricity, generating around 70% of its power from nuclear reactors. Other nations with high nuclear shares include Slovakia, Ukraine, and Belgium. The United States generates the most nuclear electricity in absolute terms, but its share of total generation is around 19%.',
  type: 'horizontalBar',
  labels: ['France', 'Slovakia', 'Ukraine', 'Belgium', 'Hungary', 'Switzerland', 'Finland', 'South Korea', 'USA', 'UK'],
  datasets: [
    {
      label: 'Nuclear Share of Electricity Generation (%)',
      data: [70, 59, 58, 47, 44, 40, 36, 30, 19, 15],
      backgroundColor: ['#4A90D9', '#5BA3E8', '#4A90D9', '#4A90D9', '#4A90D9', '#4A90D9', '#5BA3E8', '#4A90D9', '#3A80C9', '#4A90D9'],
    },
  ],
  xAxisLabel: 'Nuclear Share (%)',
  source: 'World Nuclear Association & IAEA PRIS 2024',
  sourceUrl: 'https://www.world-nuclear.org/information-library/current-and-future-generation/nuclear-power-in-the-world-today.aspx',
}

// ── Chart 2: Global Nuclear Installed Capacity (2000–2023) ───────────────────

export const nuclearCapacityChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm7-capacity',
  title: 'Global Nuclear Installed Capacity (2000–2023)',
  description:
    'Global nuclear capacity held relatively steady at around 370–395 GW between 2000 and 2020, with the Fukushima accident in 2011 causing a temporary dip as several nations phased out or reduced their programmes. New capacity additions — particularly in China and South Korea — have brought global capacity back to around 395 GW by 2023.',
  type: 'line',
  labels: ['2000', '2003', '2006', '2009', '2012', '2015', '2018', '2020', '2022', '2023'],
  datasets: [
    {
      label: 'Global Nuclear Installed Capacity (GW)',
      data: [351, 357, 368, 372, 373, 376, 392, 393, 394, 395],
      backgroundColor: 'rgba(74, 144, 217, 0.15)',
      borderColor: '#4A90D9',
    },
  ],
  xAxisLabel: 'Year',
  yAxisLabel: 'Installed Capacity (GW)',
  source: 'IAEA Power Reactor Information System (PRIS) 2024',
  sourceUrl: 'https://pris.iaea.org/PRIS/home.aspx',
}

// ── Chart 3: Levelised Cost of Nuclear Energy vs Other Technologies (2023) ───

export const nuclearLcoeChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm7-lcoe',
  title: 'Levelised Cost of Energy — Nuclear vs Other Technologies (2023)',
  description:
    'New-build nuclear remains one of the more expensive electricity sources per MWh, with typical LCOE estimates of $80–160/MWh, driven largely by high upfront capital costs and long construction timelines. Advanced SMR designs aim to bring costs down to $60–100/MWh. By contrast, new onshore wind and solar PV consistently achieve $30–50/MWh.',
  type: 'bar',
  labels: ['Onshore Wind', 'Solar PV', 'Offshore Wind', 'Nuclear (new-build)', 'Gas CCGT', 'Coal'],
  datasets: [
    {
      label: 'LCOE — Low Estimate (USD/MWh)',
      data: [25, 24, 60, 80, 45, 65],
      backgroundColor: 'rgba(74, 144, 217, 0.5)',
    },
    {
      label: 'LCOE — High Estimate (USD/MWh)',
      data: [50, 48, 110, 160, 90, 140],
      backgroundColor: 'rgba(74, 144, 217, 0.85)',
    },
  ],
  xAxisLabel: 'Technology',
  yAxisLabel: 'LCOE (USD/MWh)',
  source: 'IRENA & IEA Projected Costs of Generating Electricity 2020/2023',
  sourceUrl: 'https://www.iea.org/reports/projected-costs-of-generating-electricity-2020',
}

// ── Chart 4: Nuclear Capacity Under Construction by Country (2024) ────────────

export const nuclearUnderConstructionChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm7-construction',
  title: 'Nuclear Capacity Under Construction by Country (2024)',
  description:
    'China is by far the most active builder of new nuclear capacity, with over 20 GW under construction. India, South Korea, and several European countries are also commissioning new plants. The global pipeline of new nuclear reflects growing interest in nuclear as a low-carbon baseload energy source.',
  type: 'horizontalBar',
  labels: ['China', 'India', 'South Korea', 'Turkey', 'UAE', 'Russia', 'UK', 'USA'],
  datasets: [
    {
      label: 'Capacity Under Construction (GW)',
      data: [22.5, 6.3, 5.3, 4.5, 2.9, 2.7, 3.2, 2.2],
      backgroundColor: ['#4A90D9', '#5BA3E8', '#4A90D9', '#4A90D9', '#5BA3E8', '#4A90D9', '#3A80C9', '#4A90D9'],
    },
  ],
  xAxisLabel: 'Capacity (GW)',
  source: 'IAEA PRIS & World Nuclear Association 2024',
  sourceUrl: 'https://www.world-nuclear.org/information-library/current-and-future-generation/plans-for-new-reactors-worldwide.aspx',
}

// ── Chart 5: Lifecycle CO₂ Emissions by Electricity Source ───────────────────

export const nuclearLifecycleEmissionsChart: ChartVisualization = {
  _type: 'chartVisualization',
  _key: 'sm7-lifecycle-emissions',
  title: 'Lifecycle CO₂ Emissions by Electricity Source (gCO₂e/kWh)',
  description:
    'Nuclear energy\'s full lifecycle carbon footprint — including construction, operation, fuel processing, and decommissioning — is comparable to wind and solar, and roughly 60–100× lower than coal or gas. These ranges reflect real-world variability in site conditions, construction methods, and grid carbon intensity during build.',
  type: 'horizontalBar',
  labels: ['Coal', 'Gas (CCGT)', 'Solar PV', 'Onshore Wind', 'Nuclear', 'Offshore Wind'],
  datasets: [
    {
      label: 'Low Estimate (gCO₂e/kWh)',
      data: [740, 410, 20, 7, 4, 7],
      backgroundColor: 'rgba(74, 144, 217, 0.45)',
    },
    {
      label: 'High Estimate (gCO₂e/kWh)',
      data: [910, 650, 50, 10, 12, 15],
      backgroundColor: 'rgba(74, 144, 217, 0.85)',
    },
  ],
  xAxisLabel: 'Lifecycle CO₂ Emissions (gCO₂e/kWh)',
  source: 'IPCC Sixth Assessment Report — Annex III: Technology-specific parameters (2022)',
  sourceUrl: 'https://www.ipcc.ch/report/ar6/wg3/',
}
