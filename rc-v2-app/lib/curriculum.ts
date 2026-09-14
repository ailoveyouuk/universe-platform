// ─────────────────────────────────────────────────────────────────────────────
// Curriculum - static metadata for all 15 sub-modules across 3 Parts
// This is the single source of truth used by the Dashboard, Part Overview
// pages, Sidebar, and the Module Viewer.
// ─────────────────────────────────────────────────────────────────────────────

export type PartNumber = 1 | 2 | 3

export interface SubModuleMeta {
  id:               number
  slug:             string
  title:            string
  shortDescription: string
  keyTopics:        string[]
  estimatedHours:   number
  sectionCount:     number
  colSectionId:     string   // ID of the Confirmation of Learning section for deep-linking
  available:        boolean
  partNumber:       PartNumber
}

export interface PartMeta {
  number:      PartNumber
  title:       string
  subtitle:    string
  description: string
  icon:        string
  accentColor: string
  subModules:  SubModuleMeta[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Part 1 sub-modules
// ─────────────────────────────────────────────────────────────────────────────

const PART_1_SUBMODULES: SubModuleMeta[] = [
  {
    id:               1,
    slug:             'greenhouse-gas-emissions',
    title:            'Greenhouse Gas Emissions',
    shortDescription: 'Explore the science of greenhouse gases, their global warming potentials, and their role in driving climate change.',
    keyTopics:        ['CO2 & Methane', 'Global Warming Potential', 'Carbon Budgets', 'Emissions by Sector'],
    estimatedHours:   2,
    sectionCount:     11,
    colSectionId:     'sec-11-col',
    available:        true,
    partNumber:       1,
  },
  {
    id:               2,
    slug:             'global-race-to-net-zero',
    title:            'The Global Race to Net Zero',
    shortDescription: 'Understand international climate commitments, net zero targets, and the policies accelerating the global clean energy transition.',
    keyTopics:        ['Paris Agreement', 'Net Zero Targets', 'Carbon Markets', 'Corporate Commitments'],
    estimatedHours:   2,
    sectionCount:     20,
    colSectionId:     'sm2-sec-col',
    available:        true,
    partNumber:       1,
  },
  {
    id:               3,
    slug:             'energy-transition',
    title:            'The Energy Transition',
    shortDescription: 'Discover how the world is shifting from fossil fuels to clean energy - the drivers, technologies, and economic forces reshaping our energy system.',
    keyTopics:        ['Energy Mix', 'Decarbonisation', 'Grid Integration', 'Investment Trends'],
    estimatedHours:   2,
    sectionCount:     16,
    colSectionId:     'sm3-sec-col',
    available:        true,
    partNumber:       1,
  },
  {
    id:               4,
    slug:             'fixed-offshore-wind',
    title:            'Fixed Offshore Wind',
    shortDescription: 'Deep-dive into fixed-foundation offshore wind technology, from turbine components to global capacity and market dynamics.',
    keyTopics:        ['Turbine Technology', 'Foundation Types', 'Market Capacity', 'Project Development'],
    estimatedHours:   2,
    sectionCount:     13,
    colSectionId:     'sm4-sec-col',
    available:        true,
    partNumber:       1,
  },
  {
    id:               5,
    slug:             'floating-offshore-wind',
    title:            'Floating Offshore Wind',
    shortDescription: 'Examine the frontier of offshore wind - floating platforms that unlock vast deep-water wind resources around the world.',
    keyTopics:        ['Floating Platforms', 'Mooring Systems', 'LCOE Trends', 'Global Pipeline'],
    estimatedHours:   2,
    sectionCount:     14,
    colSectionId:     'sm5-sec-col',
    available:        true,
    partNumber:       1,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Part 2 sub-modules
// ─────────────────────────────────────────────────────────────────────────────

const PART_2_SUBMODULES: SubModuleMeta[] = [
  {
    id:               6,
    slug:             'onshore-wind',
    title:            'Onshore Wind',
    shortDescription: 'The backbone of renewable power - explore onshore wind basic principles, global deployment, economics, and future trajectory.',
    keyTopics:        ['Wind Resource', 'Turbine Design', 'Grid Integration', 'Levelised Costs'],
    estimatedHours:   2,
    sectionCount:     11,
    colSectionId:     'sm6-sec-col',
    available:        true,
    partNumber:       2,
  },
  {
    id:               7,
    slug:             'nuclear',
    title:            'Nuclear Energy',
    shortDescription: 'Assess nuclear power role in the clean energy mix - from fission fundamentals to advanced reactor designs and the debate around its future.',
    keyTopics:        ['Fission Basics', 'Reactor Types', 'Safety Systems', 'SMRs & Advanced Nuclear'],
    estimatedHours:   2,
    sectionCount:     13,
    colSectionId:     'sm7-sec-col',
    available:        true,
    partNumber:       2,
  },
  {
    id:               8,
    slug:             'solar',
    title:            'Solar Power',
    shortDescription: 'From photovoltaic cells to utility-scale solar farms - understand the technology, economics, and explosive global growth of solar energy.',
    keyTopics:        ['PV Technology', 'Utility-Scale Solar', 'LCOE Decline', 'Storage Integration'],
    estimatedHours:   2,
    sectionCount:     8,
    colSectionId:     'sm8-sec-col',
    available:        true,
    partNumber:       2,
  },
  {
    id:               9,
    slug:             'biomass',
    title:            'Biomass & Bioenergy',
    shortDescription: 'Explore how organic materials are converted into heat, power, and fuel - and the sustainability questions that come with bioenergy at scale.',
    keyTopics:        ['Conversion Technologies', 'Feedstocks', 'Biofuels', 'Sustainability Criteria'],
    estimatedHours:   2,
    sectionCount:     8,
    colSectionId:     'sm9-sec-col',
    available:        true,
    partNumber:       2,
  },
  {
    id:               10,
    slug:             'hydropower',
    title:            'Hydropower',
    shortDescription: 'The world largest source of renewable electricity - discover hydropower technology, environmental considerations, and global significance.',
    keyTopics:        ['Dam Technology', 'Run-of-River', 'Pumped Storage', 'Environmental Impact'],
    estimatedHours:   2,
    sectionCount:     8,
    colSectionId:     'sm10-sec-col',
    available:        true,
    partNumber:       2,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Part 3 sub-modules
// ─────────────────────────────────────────────────────────────────────────────

const PART_3_SUBMODULES: SubModuleMeta[] = [
  {
    id:               11,
    slug:             'hydrogen',
    title:            'Hydrogen & Fuel Cells',
    shortDescription: 'Explore the promise and challenges of green hydrogen as a clean energy carrier, storage medium, and fuel for hard-to-abate sectors.',
    keyTopics:        ['Green Hydrogen', 'Electrolysis', 'Fuel Cells', 'Hydrogen Economy'],
    estimatedHours:   2,
    sectionCount:     10,
    colSectionId:     'sm11-sec-col',
    available:        true,
    partNumber:       3,
  },
  {
    id:               12,
    slug:             'carbon-capture',
    title:            'Carbon Capture & Storage',
    shortDescription: 'Understand CCS and CCUS technologies - capturing CO2 at source, direct air capture, and the role of carbon removal in net zero strategies.',
    keyTopics:        ['CCS Technology', 'DACCS', 'Geological Storage', 'Cost Trajectories'],
    estimatedHours:   2,
    sectionCount:     8,
    colSectionId:     'sm12-sec-col',
    available:        true,
    partNumber:       3,
  },
  {
    id:               13,
    slug:             'wave-tidal',
    title:            'Wave & Tidal Energy',
    shortDescription: 'Discover the enormous potential of ocean energy - wave devices, tidal stream turbines, and the path to commercial-scale deployment.',
    keyTopics:        ['Wave Energy Converters', 'Tidal Stream', 'Tidal Range', 'Marine Engineering'],
    estimatedHours:   2,
    sectionCount:     10,
    colSectionId:     'sm13-sec-col',
    available:        true,
    partNumber:       3,
  },
  {
    id:               14,
    slug:             'skills-roles',
    title:            'Skills & Roles in Renewables',
    shortDescription: 'Navigate the careers of tomorrow - the roles, skills, and opportunities driving the renewable energy workforce across engineering, finance, and policy.',
    keyTopics:        ['Career Pathways', 'Technical Roles', 'Finance & Development', 'Policy & Regulation'],
    estimatedHours:   2,
    sectionCount:     8,
    colSectionId:     'sm14-sec-col',
    available:        true,
    partNumber:       3,
  },
  {
    id:               15,
    slug:             'future-renewables',
    title:            'The Future of Renewables',
    shortDescription: 'Look ahead to emerging technologies, grid architecture of the future, and the innovations that will define the next chapter of the energy transition.',
    keyTopics:        ['Grid of the Future', 'Emerging Tech', 'AI & Energy', 'Investment Outlook'],
    estimatedHours:   2,
    sectionCount:     7,
    colSectionId:     'sm15-sec-col',
    available:        true,
    partNumber:       3,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Parts
// ─────────────────────────────────────────────────────────────────────────────

export const PARTS: PartMeta[] = [
  {
    number:      1,
    title:       'Part 1',
    subtitle:    'The Transition',
    description: 'From greenhouse gas science to the cutting edge of offshore wind - the foundations of the renewable energy world.',
    icon:        '⚡',
    accentColor: 'rc-green',
    subModules:  PART_1_SUBMODULES,
  },
  {
    number:      2,
    title:       'Part 2',
    subtitle:    'Core Generation',
    description: 'Onshore wind, nuclear, solar, biomass, and hydropower - the proven engines powering the global clean energy transition.',
    icon:        '☀',
    accentColor: 'blue-500',
    subModules:  PART_2_SUBMODULES,
  },
  {
    number:      3,
    title:       'Part 3',
    subtitle:    'The Future',
    description: 'Hydrogen, carbon capture, wave & tidal, and the careers and technologies that will define the next decade of energy.',
    icon:        '⬡',
    accentColor: 'purple-500',
    subModules:  PART_3_SUBMODULES,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getPartMeta(partNumber: number): PartMeta | undefined {
  return PARTS.find(p => p.number === partNumber)
}

export function getSubModuleMeta(slug: string): SubModuleMeta | undefined {
  return PARTS.flatMap(p => p.subModules).find(sm => sm.slug === slug)
}

export function getSubModulesByPart(partNumber: PartNumber): SubModuleMeta[] {
  return PARTS.find(p => p.number === partNumber)?.subModules ?? []
}

export function partTotalHours(partNumber: PartNumber): number {
  return getSubModulesByPart(partNumber).reduce((sum, sm) => sum + sm.estimatedHours, 0)
}
