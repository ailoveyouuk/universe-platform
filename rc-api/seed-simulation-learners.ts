// ─────────────────────────────────────────────────────────────────────────
// One-off seed: 45 simulated learners under "TEST — Simulation Institution"
// with varied curriculum progress, COL scores, certificates, and fully
// opted-in/completed CandidateProfiles — so rc-institution and rc-employer
// report/candidate views have representative data to demo against.
//
// Run from rc-api/ with production DATABASE_URL, e.g.:
//   DATABASE_URL='postgresql://...' npx tsx ../scripts-scratch/seed-simulation-learners.ts
//
// Idempotency: refuses to run if this institution already has learners,
// unless FORCE=1 is set — prevents an accidental double-run duplicating
// 45 more fake accounts.
// ─────────────────────────────────────────────────────────────────────────

import { PrismaClient } from './generated/prisma'
import { randomUUID } from 'node:crypto'

const prisma = new PrismaClient()

// Local copy of src/lib/inviteCode.ts's generator (avoiding a cross-import
// that would spin up a second PrismaClient instance just for this script).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = ''
    for (let i = 0; i < 6; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
    code = `RC-${code}`
    const existing = await prisma.cohort.findUnique({ where: { inviteCode: code }, select: { id: true } })
    if (!existing) return code
  }
  throw new Error('Could not generate a unique invite code after multiple attempts')
}

const INSTITUTION_ID = 'cmtu3zgl5004q71wdch7kabt2' // TEST — Simulation Institution

const SM_CURRICULUM = [
  { id: 1,  slug: 'greenhouse-gas-emissions', title: 'Greenhouse Gas Emissions',       partNumber: 1 },
  { id: 2,  slug: 'global-race-to-net-zero',  title: 'The Global Race to Net Zero',    partNumber: 1 },
  { id: 3,  slug: 'energy-transition',        title: 'The Energy Transition',          partNumber: 1 },
  { id: 4,  slug: 'fixed-offshore-wind',      title: 'Fixed Offshore Wind',            partNumber: 1 },
  { id: 5,  slug: 'floating-offshore-wind',   title: 'Floating Offshore Wind',         partNumber: 1 },
  { id: 6,  slug: 'onshore-wind',             title: 'Onshore Wind',                   partNumber: 2 },
  { id: 7,  slug: 'nuclear',                  title: 'Nuclear Energy',                 partNumber: 2 },
  { id: 8,  slug: 'solar',                    title: 'Solar Power',                    partNumber: 2 },
  { id: 9,  slug: 'biomass',                  title: 'Biomass & Bioenergy',            partNumber: 2 },
  { id: 10, slug: 'hydropower',               title: 'Hydropower',                     partNumber: 2 },
  { id: 11, slug: 'hydrogen',                 title: 'Hydrogen & Fuel Cells',          partNumber: 3 },
  { id: 12, slug: 'carbon-capture',           title: 'Carbon Capture & Storage',       partNumber: 3 },
  { id: 13, slug: 'wave-tidal',               title: 'Wave & Tidal Energy',            partNumber: 3 },
  { id: 14, slug: 'skills-roles',             title: 'Skills & Roles in Renewables',   partNumber: 3 },
  { id: 15, slug: 'future-renewables',        title: 'The Future of Renewables',       partNumber: 3 },
]

const PARTS = [
  { number: 1, title: 'Part 1', subtitle: 'The Transition',    accent: 'rc-green' },
  { number: 2, title: 'Part 2', subtitle: 'Core Generation',   accent: 'blue-500' },
  { number: 3, title: 'Part 3', subtitle: 'The Future',        accent: 'purple-500' },
]
const MODULE_CONTEXT = 'Module 1 — An Introduction to Renewables & Clean Energy'
const MODULE_TITLE   = 'Module 1: An Introduction to Renewables & Clean Energy'
const CERTIFYING_BODY = 'Renewables Connect'

// ── RNG helpers ─────────────────────────────────────────────────────────────
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function pickSome<T>(arr: T[], min: number, max: number): T[] {
  const n = min + Math.floor(Math.random() * (max - min + 1))
  const copy = [...arr]
  const out: T[] = []
  for (let i = 0; i < n && copy.length > 0; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0])
  }
  return out
}
function randInt(min: number, max: number): number { return min + Math.floor(Math.random() * (max - min + 1)) }
function daysAgo(n: number): Date { return new Date(Date.now() - n * 24 * 60 * 60 * 1000) }

// ── Name pool (45 distinct, UK-representative) ──────────────────────────────
const NAMES: [string, string][] = [
  ['Olivia', 'Whitfield'], ['Jack', 'Nolan'], ['Amara', 'Osei'], ['Harry', 'Fenwick'],
  ['Sophie', 'MacLeod'], ['Daniel', 'Okafor'], ['Isla', 'Balfour'], ['Ryan', 'Doherty'],
  ['Priya', 'Chandran'], ['Thomas', 'Aldridge'], ['Freya', 'Sinclair'], ['Muhammad', 'Iqbal'],
  ['Grace', 'Pemberton'], ['Callum', 'Wishart'], ['Zara', 'Hussain'], ['Ethan', 'Kowalski'],
  ['Chloe', 'Redmond'], ['Nathan', 'Achebe'], ['Millie', 'Fairweather'], ['Oscar', 'Bramwell'],
  ['Anya', 'Petrov'], ['Lewis', 'Trevithick'], ['Ruby', 'Ogunleye'], ['Finn', 'Carragher'],
  ['Layla', 'Farooq'], ['Jacob', 'Stanmore'], ['Evie', 'Robb'], ['Kian', 'Gallagher'],
  ['Nadia', 'Hasan'], ['Charlie', 'Winstanley'], ['Amelia', 'Forsyth'], ['Aaron', 'Nkemelu'],
  ['Lucy', 'Bickerstaff'], ['Owen', 'Prentice'], ['Fatima', 'Rahman'], ['George', 'Delaney'],
  ['Erin', 'Shanklin'], ['Adam', 'Mbeki'], ['Holly', 'Fitzsimmons'], ['Leo', 'Vasquez'],
  ['Maya', 'Chowdhury'], ['Samuel', 'Ridgeway'], ['Iris', 'Northcott'], ['Ben', 'Ellery'],
  ['Nina', 'Abara'],
]

const UK_REGIONS = [
  'London', 'South East England', 'South West England', 'East of England',
  'West Midlands', 'East Midlands', 'Yorkshire and the Humber',
  'North West England', 'North East England', 'Scotland', 'Wales', 'Northern Ireland',
]
const TECH_AREAS = [
  'Offshore Wind', 'Onshore Wind', 'Solar Power', 'Hydrogen & Fuel Cells',
  'Nuclear Energy', 'Carbon Capture & Storage', 'Wave & Tidal Energy',
  'Biomass & Bioenergy', 'Hydropower', 'Grid & Energy Storage',
]
const QUALIFICATIONS = ['BEng (Hons)', 'MEng', 'BSc (Hons)', 'MSc', 'HND', 'PhD', 'ONC/HNC']
const SUBJECTS = [
  'Mechanical Engineering', 'Electrical Engineering', 'Renewable Energy Engineering',
  'Environmental Science', 'Physics', 'Civil Engineering', 'Energy Systems',
  'Marine Engineering', 'Chemistry', 'Sustainability & Climate Policy',
]
const PROFESSIONAL_BODIES = ['IMechE', 'IET', 'IChemE', 'ICE', 'Energy Institute', 'RenewableUK (member)']
const EXPERIENCE_LEVELS = ['entry_level', 'graduate', 'early_career', 'experienced', 'senior']
const ROLE_TYPES = [
  'Graduate Engineer', 'Project Engineer', 'Site Technician', 'Design Engineer',
  'O&M Technician', 'Consultant', 'Project Manager', 'Data Analyst',
  'Policy Analyst', 'HSE Advisor',
]
const EMPLOYER_TYPES = [
  'Developer', 'EPC Contractor', 'OEM / Manufacturer', 'Utility',
  'Consultancy', 'Government / Regulator', 'Investor / Financier',
]
const CAREER_MOTIVATIONS = [
  'Fighting climate change', 'Career progression', 'Higher earning potential',
  'Job security in a growing sector', 'Working with new technology', 'Relocating into the sector',
]
const EMPLOYMENT_STATUS = ['employed', 'seeking_work', 'student', 'career_break']
const SOFTWARE_POOL = ['AutoCAD', 'MATLAB', 'PVsyst', 'WAsP', 'Excel (advanced modelling)', 'Python', 'ETAP', 'ANSYS']
const SOFTWARE_LEVELS = ['beginner', 'intermediate', 'advanced']

function buildCandidateProfile(techFocus: string, tier: string) {
  const experienceLevel = tier === 'fullModule' || tier === 'part1Part2Complete'
    ? pick(['early_career', 'experienced', 'senior'])
    : pick(EXPERIENCE_LEVELS)

  const softwareSkills: Record<string, string> = {}
  for (const s of pickSome(SOFTWARE_POOL, 2, 4)) softwareSkills[s] = pick(SOFTWARE_LEVELS)

  return {
    // Section 1
    rightToWorkUK: pick(['yes', 'yes', 'yes', 'yes', 'requires_sponsorship']),
    visaSponsorshipNeeded: Math.random() < 0.12,
    securityClearance: pick(['none', 'none', 'none', 'bpss', 'sc']),
    ukResidencyYears: pick(['<1', '1-2', '3-5', '5-10', '10+']),
    countryOfResidence: 'United Kingdom',
    ukRegion: pick(UK_REGIONS),
    willingToRelocate: pick(['yes', 'no', 'uk_only', 'uk_only']),
    relocationRegions: pickSome(UK_REGIONS, 0, 3),
    openToInternational: Math.random() < 0.3,
    hasDriversLicence: Math.random() < 0.75,

    // Section 2
    primaryTechArea: techFocus,
    secondaryTechAreas: pickSome(TECH_AREAS.filter(t => t !== techFocus), 1, 3),
    climatePolicyInterests: pickSome(['Net Zero policy', 'Carbon pricing', 'Just transition', 'Energy security', 'Grid reform'], 1, 3),
    functionalDisciplines: pickSome(['Engineering', 'Project Management', 'Operations & Maintenance', 'Commercial', 'HSE', 'Data & Analytics'], 1, 2),
    targetRoleTypes: pickSome(ROLE_TYPES, 1, 3),
    preferredEmployerTypes: pickSome(EMPLOYER_TYPES, 1, 3),
    companySizePreference: pick(['startup', 'sme', 'large_corporate', 'no_preference']),

    // Section 3
    experienceLevel,
    yearsInRenewables: pick(['0', '<1', '1-2', '3-5', '5+']),
    previousSector: pick(['Oil & Gas', 'Construction', 'Manufacturing', 'Utilities', 'None — first sector', 'Defence', 'Automotive']),
    projectPhasesExp: pickSome(['Feasibility', 'Design', 'Construction', 'Commissioning', 'Operations', 'Decommissioning'], 0, 3),
    largestProjectScale: pick(['<10MW', '10-100MW', '100-500MW', '500MW+', 'N/A']),
    commercialRegimeExp: pickSome(['CfD', 'PPA', 'ROC', 'Merchant', 'FIT'], 0, 2),
    employmentStatus: pick(EMPLOYMENT_STATUS),
    availability: pick(['immediate', '1_month_notice', '3_month_notice', 'not_actively_looking']),
    noticePeriod: pick(['None', '1 month', '2 months', '3 months']),
    employmentTypePrefs: pickSome(['Permanent', 'Contract', 'Graduate scheme', 'Internship'], 1, 2),
    workArrangementPrefs: pickSome(['On-site', 'Hybrid', 'Remote'], 1, 2),
    salaryExpectation: pick(['£25,000–£32,000', '£32,000–£40,000', '£40,000–£50,000', '£50,000–£65,000', '£65,000+']),

    // Section 4
    highestQualification: pick(QUALIFICATIONS),
    qualificationSubject: pick(SUBJECTS),
    professionalBodies: pickSome(PROFESSIONAL_BODIES, 0, 2),
    charteredStatus: pick(['none', 'working_towards', 'incorporated_engineer', 'chartered_engineer']),
    safetyCertifications: pickSome(['GWO Basic Safety Training', 'CSCS Card', 'IOSH Managing Safely', 'NEBOSH General Certificate'], 0, 2),
    technicalCertifications: pickSome(['City & Guilds Electrical', 'PV Installer Certification', 'Wind Turbine Technician Cert'], 0, 2),
    otherCertifications: null,

    // Section 5
    softwareSkills,
    engineeringTools: pickSome(['CAD', 'FEA', 'SCADA', 'GIS'], 0, 2),
    financialTools: pickSome(['Excel financial modelling', 'Project finance appraisal'], 0, 1),
    regulatoryKnowledge: pickSome(['Ofgem', 'Planning consent (NSIP)', 'Grid connection process', 'Environmental Impact Assessment'], 0, 2),
    gridKnowledge: pick(['basic', 'intermediate', 'advanced', null]),
    languages: { English: 'native' },

    // Section 6 — only meaningfully populated when it matches their focus
    offshoreExpTypes: techFocus === 'Offshore Wind' ? pickSome(['Fixed foundation', 'Floating'], 1, 2) : [],
    turbineOEMExp: techFocus.includes('Wind') ? pickSome(['Siemens Gamesa', 'Vestas', 'GE Renewable Energy'], 0, 2) : [],
    batteryChemistry: techFocus === 'Grid & Energy Storage' ? pickSome(['Lithium-ion', 'Flow battery'], 1, 1) : [],
    electrolyserTypes: techFocus === 'Hydrogen & Fuel Cells' ? pickSome(['PEM', 'Alkaline'], 1, 1) : [],
    reactorTypes: techFocus === 'Nuclear Energy' ? pickSome(['PWR', 'SMR'], 1, 1) : [],
    ccsTechTypes: techFocus === 'Carbon Capture & Storage' ? pickSome(['Post-combustion', 'Direct air capture'], 1, 1) : [],
    solarScaleExp: techFocus === 'Solar Power' ? pickSome(['Utility-scale', 'Rooftop/distributed'], 1, 1) : [],
    marineEnergyTypes: techFocus === 'Wave & Tidal Energy' ? pickSome(['Tidal stream', 'Wave device'], 1, 1) : [],
    carbonEsgExp: pickSome(['ESG reporting', 'Carbon footprinting'], 0, 1),

    // Section 7
    clientManagementLevel: pick(['none', 'supporting', 'lead']),
    technicalReportWriter: Math.random() < 0.6,
    bidManagement: Math.random() < 0.2,
    teamLeadershipLevel: pick(['none', 'team_lead', 'line_manager', 'senior_manager']),
    budgetResponsibility: pick(['none', '<£100k', '£100k-£1m', '£1m+']),
    financialModelling: Math.random() < 0.3,
    expertWitness: false,
    hasPublications: Math.random() < 0.1,

    // Section 8
    careerMotivations: pickSome(CAREER_MOTIVATIONS, 1, 3),
    shortTermGoal: pick([
      'Land my first role in the renewables sector',
      'Move from oil & gas into offshore wind',
      'Progress into a project management role',
      'Specialise further in grid-scale storage',
      'Build toward chartered engineer status',
      'Transition from academia into industry',
    ]),
    linkedinUrl: null,
    portfolioUrl: null,
    personalStatement: null, // filled per-learner below with their name

    // Section 9 — the whole point of this seed
    optInToDiscovery: true,
    profileVisibility: 'public',
    allowEmployerContact: true,
  }
}

// ── Progress tiers ───────────────────────────────────────────────────────────
type Tier = 'justStarted' | 'midPart1' | 'part1Complete' | 'part1CompletePart2Partial'
          | 'part1Part2Complete' | 'part1Part2CompletePart3Partial' | 'fullModule'

const TIER_PLAN: { tier: Tier; count: number }[] = [
  { tier: 'justStarted', count: 6 },
  { tier: 'midPart1', count: 8 },
  { tier: 'part1Complete', count: 8 },
  { tier: 'part1CompletePart2Partial', count: 8 },
  { tier: 'part1Part2Complete', count: 7 },
  { tier: 'part1Part2CompletePart3Partial', count: 4 },
  { tier: 'fullModule', count: 4 },
]

// For a given tier, decide each SM's outcome: 'completed' | 'in_progress' | 'not_started'
function planSMs(tier: Tier): Record<number, 'completed' | 'in_progress' | 'not_started'> {
  const plan: Record<number, 'completed' | 'in_progress' | 'not_started'> = {}
  for (const sm of SM_CURRICULUM) plan[sm.id] = 'not_started'

  const part1 = SM_CURRICULUM.filter(s => s.partNumber === 1).map(s => s.id)
  const part2 = SM_CURRICULUM.filter(s => s.partNumber === 2).map(s => s.id)
  const part3 = SM_CURRICULUM.filter(s => s.partNumber === 3).map(s => s.id)

  const completeAll = (ids: number[]) => { for (const id of ids) plan[id] = 'completed' }
  const partial = (ids: number[], min: number, max: number) => {
    const n = randInt(min, Math.min(max, ids.length))
    const shuffled = [...ids].sort(() => Math.random() - 0.5)
    for (let i = 0; i < n; i++) plan[shuffled[i]] = 'completed'
    if (n < ids.length) plan[shuffled[n]] = 'in_progress'
  }

  switch (tier) {
    case 'justStarted':
      partial(part1, 1, 2)
      break
    case 'midPart1':
      partial(part1, 2, 4)
      break
    case 'part1Complete':
      completeAll(part1)
      break
    case 'part1CompletePart2Partial':
      completeAll(part1)
      partial(part2, 1, 3)
      break
    case 'part1Part2Complete':
      completeAll(part1)
      completeAll(part2)
      break
    case 'part1Part2CompletePart3Partial':
      completeAll(part1)
      completeAll(part2)
      partial(part3, 1, 3)
      break
    case 'fullModule':
      completeAll(part1)
      completeAll(part2)
      completeAll(part3)
      break
  }
  return plan
}

function colPercentFor(): number {
  // Roughly bell-shaped between 58 and 97
  const a = randInt(58, 97), b = randInt(58, 97)
  return Math.round((a + b) / 2)
}

async function main() {
  const existing = await prisma.learner.count({ where: { institutionId: INSTITUTION_ID } })
  if (existing > 0 && process.env.FORCE !== '1') {
    console.error(`Institution already has ${existing} learner(s). Set FORCE=1 to seed anyway.`)
    process.exit(1)
  }

  const inst = await prisma.institution.findUnique({ where: { id: INSTITUTION_ID } })
  if (!inst) throw new Error('Simulation institution not found — check INSTITUTION_ID')
  console.log(`Seeding into: ${inst.name} (${inst.id})`)

  // Three cohorts for structure/variety
  const cohortDefs = [
    { name: 'Simulation Cohort — Spring Intake', startDate: daysAgo(150) },
    { name: 'Simulation Cohort — Summer Intake', startDate: daysAgo(90) },
    { name: 'Simulation Cohort — Autumn Intake', startDate: daysAgo(30) },
  ]
  const cohorts = []
  for (const def of cohortDefs) {
    const inviteCode = await generateUniqueInviteCode()
    const cohort = await prisma.cohort.create({
      data: {
        institutionId: INSTITUTION_ID,
        name: def.name,
        startDate: def.startDate,
        parts: [1, 2, 3],
        accessDurationDays: 365,
        inviteCode,
      },
    })
    cohorts.push(cohort)
    console.log(`  cohort created: ${cohort.name} (${cohort.id})`)
  }

  // Build the 45-slot tier list, shuffled so cohort assignment isn't
  // correlated with progress tier (more realistic — every cohort has a mix).
  const slots: Tier[] = []
  for (const { tier, count } of TIER_PLAN) for (let i = 0; i < count; i++) slots.push(tier)
  slots.sort(() => Math.random() - 0.5)

  if (NAMES.length !== slots.length) {
    throw new Error(`Name pool (${NAMES.length}) must match slot count (${slots.length})`)
  }

  const usedEmails = new Set<string>()
  let createdCount = 0

  for (let i = 0; i < slots.length; i++) {
    const [first, last] = NAMES[i]
    const tier = slots[i]
    const displayName = `${first} ${last}`

    let emailBase = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '')
    let email = `${emailBase}@example.com`
    let suffix = 2
    while (usedEmails.has(email)) { email = `${emailBase}${suffix}@example.com`; suffix++ }
    usedEmails.add(email)

    const cohort = pick(cohorts)
    const enrolledAt = new Date(cohort.startDate.getTime() + randInt(0, 20) * 24 * 60 * 60 * 1000)

    const user = await prisma.user.create({
      data: {
        azureAdId: `sim-${randomUUID()}`,
        email,
        displayName,
        role: 'learner',
        lastSignInAt: daysAgo(randInt(0, 14)),
      },
    })

    const learner = await prisma.learner.create({
      data: {
        userId: user.id,
        institutionId: INSTITUTION_ID,
        cohortId: cohort.id,
        enrolledAt,
        lastActiveAt: daysAgo(randInt(0, 10)),
        availableToEmployers: true,
      },
    })

    // Full-curriculum access so progress isn't sitting behind a lock
    await prisma.accessGrant.create({
      data: {
        learnerId: learner.id,
        parts: [1, 2, 3],
        source: 'manual',
        notes: 'Simulation data seed — representative demo dataset',
        grantedAt: enrolledAt,
        expiresAt: new Date(enrolledAt.getTime() + 365 * 24 * 60 * 60 * 1000),
      },
    })

    // SM progress + COL scores
    const smPlan = planSMs(tier)
    let cursor = enrolledAt.getTime()
    const completedIdsByPart: Record<number, number[]> = { 1: [], 2: [], 3: [] }

    for (const sm of SM_CURRICULUM) {
      const status = smPlan[sm.id]
      if (status === 'not_started') continue

      cursor += randInt(1, 6) * 24 * 60 * 60 * 1000
      const startedAt = new Date(cursor)
      let completedAt: Date | null = null
      if (status === 'completed') {
        cursor += randInt(1, 4) * 24 * 60 * 60 * 1000
        completedAt = new Date(cursor)
      }

      const smProgress = await prisma.sMProgress.create({
        data: {
          learnerId: learner.id,
          smId: sm.id,
          smSlug: sm.slug,
          smTitle: sm.title,
          partNumber: sm.partNumber,
          status,
          startedAt,
          completedAt: completedAt ?? undefined,
        },
      })

      if (status === 'completed') {
        completedIdsByPart[sm.partNumber].push(sm.id)
        const percent = colPercentFor()
        await prisma.cOLScore.create({
          data: {
            smProgressId: smProgress.id,
            score: Math.round(percent / 10),
            maxScore: 10,
            percent,
            attempts: randInt(1, 2),
            lastAttemptAt: completedAt!,
          },
        })

        // Submodule certificate, matching the client's credentialId format
        const dateStr = completedAt!.toISOString().slice(0, 10).replace(/-/g, '')
        await prisma.certificate.create({
          data: {
            learnerId: learner.id,
            level: 'submodule',
            title: sm.title,
            subtitle: `Sub-module ${sm.id} of Module 1`,
            moduleContext: MODULE_CONTEXT,
            recipientName: displayName,
            completedAt: completedAt!,
            partNumber: sm.partNumber,
            partAccent: PARTS[sm.partNumber - 1].accent,
            smId: sm.id,
            certifyingBody: CERTIFYING_BODY,
            credentialId: `RC-SM${String(sm.id).padStart(2, '0')}-${dateStr}-${learner.id.slice(-4)}`,
          },
        })
      }
    }

    // Part-level certificates for any fully-completed part
    for (const part of PARTS) {
      if (completedIdsByPart[part.number].length === 5) {
        const partCompletedAt = new Date(cursor)
        const dateStr = partCompletedAt.toISOString().slice(0, 10).replace(/-/g, '')
        await prisma.certificate.create({
          data: {
            learnerId: learner.id,
            level: 'part',
            title: `${part.title}: ${part.subtitle}`,
            subtitle: `Completed all 5 sub-modules in ${part.title}`,
            moduleContext: MODULE_CONTEXT,
            recipientName: displayName,
            completedAt: partCompletedAt,
            partNumber: part.number,
            partAccent: part.accent,
            certifyingBody: CERTIFYING_BODY,
            credentialId: `RC-PT${part.number}-${dateStr}-${learner.id.slice(-4)}`,
          },
        })
      }
    }

    // Module-level certificate for the full completers
    if (tier === 'fullModule') {
      const moduleCompletedAt = new Date(cursor)
      const dateStr = moduleCompletedAt.toISOString().slice(0, 10).replace(/-/g, '')
      await prisma.certificate.create({
        data: {
          learnerId: learner.id,
          level: 'module',
          title: MODULE_TITLE,
          subtitle: 'Completed all 15 sub-modules across 3 parts',
          moduleContext: MODULE_CONTEXT,
          recipientName: displayName,
          completedAt: moduleCompletedAt,
          certifyingBody: CERTIFYING_BODY,
          credentialId: `RC-MOD1-${dateStr}-${learner.id.slice(-4)}`,
        },
      })
    }

    // Fully completed, opted-in CandidateProfile
    const profileData = buildCandidateProfile(pick(TECH_AREAS), tier)
    profileData.personalStatement = pick([
      `Motivated ${profileData.experienceLevel.replace('_', ' ')} professional building a career in ${profileData.primaryTechArea.toLowerCase()}, currently developing my technical foundations through Renewables Connect.`,
      `Making the transition into the renewables sector, with a particular interest in ${profileData.primaryTechArea.toLowerCase()} and hands-on project delivery.`,
      `Keen to bring my background in ${pick(['engineering', 'operations', 'project delivery', 'analysis'])} into the clean energy transition, focused on ${profileData.primaryTechArea.toLowerCase()}.`,
    ])

    await prisma.candidateProfile.create({
      data: { learnerId: learner.id, ...profileData },
    })

    createdCount++
    if (createdCount % 10 === 0) console.log(`  ...${createdCount}/${slots.length} learners created`)
  }

  await prisma.platformActivityEvent.create({
    data: {
      type: 'learner_registered',
      description: `${createdCount} simulated learners seeded into ${inst.name} for demo/report data`,
      entityId: INSTITUTION_ID,
      entityName: inst.name,
      metadata: { simulation: true, count: createdCount },
    },
  })

  console.log(`Done — ${createdCount} simulated learners created.`)
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
