import type { CandidateProfile } from '@rc/types'
import type { ProfileSection, ProfileSectionCompletion, LocalProfileSummary } from '@/types/profile'

function isComplete(val: unknown): boolean {
  if (val === null || val === undefined) return false
  if (typeof val === 'boolean') return true          // false means explicitly answered
  if (typeof val === 'string') return val.trim().length > 0
  if (Array.isArray(val)) return val.length >= 1
  return false
}

const SECTION_FIELDS: Record<ProfileSection, (keyof CandidateProfile)[]> = {
  1: ['rightToWorkUK', 'visaSponsorshipNeeded', 'securityClearance', 'ukResidencyYears',
      'countryOfResidence', 'ukRegion', 'willingToRelocate', 'relocationRegions',
      'openToInternational', 'hasDriversLicence'],
  2: ['primaryTechArea', 'secondaryTechAreas', 'climatePolicyInterests', 'functionalDisciplines',
      'targetRoleTypes', 'preferredEmployerTypes', 'companySizePreference'],
  3: ['experienceLevel', 'yearsInRenewables', 'previousSector', 'projectPhasesExp',
      'largestProjectScale', 'commercialRegimeExp', 'employmentStatus', 'availability',
      'noticePeriod', 'employmentTypePrefs', 'workArrangementPrefs', 'salaryExpectation'],
  4: ['highestQualification', 'qualificationSubject', 'professionalBodies', 'charteredStatus',
      'safetyCertifications', 'technicalCertifications', 'otherCertifications'],
  5: ['softwareSkills', 'engineeringTools', 'financialTools', 'regulatoryKnowledge',
      'gridKnowledge', 'languages'],
  6: ['offshoreExpTypes', 'turbineOEMExp', 'batteryChemistry', 'electrolyserTypes',
      'reactorTypes', 'ccsTechTypes', 'solarScaleExp', 'marineEnergyTypes', 'carbonEsgExp'],
  7: ['clientManagementLevel', 'technicalReportWriter', 'bidManagement', 'teamLeadershipLevel',
      'budgetResponsibility', 'financialModelling', 'expertWitness', 'hasPublications'],
  // linkedinUrl and portfolioUrl are optional — not counted
  8: ['careerMotivations', 'shortTermGoal', 'personalStatement'],
  9: ['optInToDiscovery', 'profileVisibility', 'allowEmployerContact'],
}

export function calcSectionCompletion(
  profile: Partial<CandidateProfile>,
  section: ProfileSection,
): ProfileSectionCompletion {
  const fields = SECTION_FIELDS[section]
  const total  = fields.length
  const completed = fields.filter(f => isComplete(profile[f])).length
  return { section, completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 }
}

export function getSectionFields(section: ProfileSection): (keyof CandidateProfile)[] {
  return SECTION_FIELDS[section]
}

export function extractSectionData(
  profile: Partial<CandidateProfile>,
  section: ProfileSection,
): Partial<CandidateProfile> {
  const fields = SECTION_FIELDS[section]
  return Object.fromEntries(
    fields.filter(f => f in profile).map(f => [f, profile[f]]),
  ) as Partial<CandidateProfile>
}

export function calcProfileSummary(profile: Partial<CandidateProfile>): LocalProfileSummary {
  const sections = ([1, 2, 3, 4, 5, 6, 7, 8, 9] as ProfileSection[]).map(s =>
    calcSectionCompletion(profile, s),
  )
  const totalFields    = sections.reduce((sum, s) => sum + s.total, 0)
  const totalCompleted = sections.reduce((sum, s) => sum + s.completed, 0)
  const overallPct     = totalFields > 0 ? Math.round((totalCompleted / totalFields) * 100) : 0
  const sectionsComplete = sections.filter(s => s.pct === 100).length
  return { overallPct, sectionsComplete, sections }
}
