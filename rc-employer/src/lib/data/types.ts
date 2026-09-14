// ── Completion levels ────────────────────────────────────────────────────────

export type CompletionLevel = 'none' | 'partial' | 'part' | 'module'
// none     = no SMs completed
// partial  = some SMs completed (not a full part)
// part     = at least one full part (5 SMs) completed
// module   = all 15 SMs completed

export type PartNumber = 1 | 2 | 3

// ── Candidate (as visible to an employer) ────────────────────────────────────
// Only fields the candidate has consented to share with employers.

export interface CandidateProfile {
  id: string
  displayName: string           // may be anonymised until employer expresses interest
  completionLevel: CompletionLevel
  partsCompleted: PartNumber[]  // e.g. [1, 2] = completed Parts 1 and 2
  smsCompleted: number          // total count (0-15)
  avgCOLPercent: number | null  // null if no COL attempts yet
  topSkillAreas: string[]       // SM titles where COL >= 80%
  completedModuleAt: string | null  // ISO date, null if not fully complete
  lastActiveAt: string | null
  availableForRoles: boolean    // candidate has opted in to employer visibility
  credentialIds: string[]       // certificate credential IDs
  profileCompleted: boolean     // has filled in at least the core candidate-profile sections

  // Everything below is sourced from CandidateProfile (rc-v2-app profile
  // Sections 1-8), gated on the same optInToDiscovery consent -- every field
  // a learner filled in and consented to share, minus linkedinUrl/
  // portfolioUrl which the API withholds to preserve anonymisation.

  // Section 1 - right to work & location
  rightToWorkUK: string | null
  visaSponsorshipNeeded: string | null   // 'Yes' | 'No' | null
  securityClearance: string | null
  ukRegion: string | null
  willingToRelocate: string | null
  relocationRegions: string[]
  openToInternational: string | null     // 'Yes' | 'No' | null
  hasDriversLicence: string | null       // 'Yes' | 'No' | null

  // Section 2 - interests
  primaryTechArea: string | null
  secondaryTechAreas: string[]
  climatePolicyInterests: string[]
  functionalDisciplines: string[]
  targetRoleTypes: string[]
  preferredEmployerTypes: string[]
  companySizePreference: string | null

  // Section 3 - experience
  experienceLevel: string | null
  yearsInRenewables: string | null
  previousSector: string | null
  projectPhasesExp: string[]
  largestProjectScale: string | null
  commercialRegimeExp: string[]
  employmentStatus: string | null
  availability: string | null
  noticePeriod: string | null
  employmentTypePrefs: string[]
  workArrangementPrefs: string[]

  // Section 4 - qualifications
  highestQualification: string | null
  qualificationSubject: string | null
  professionalBodies: string[]
  charteredStatus: string | null
  safetyCertifications: string[]
  technicalCertifications: string[]

  // Section 5 - technical skills
  softwareSkills: Record<string, string> | null
  engineeringTools: string[]
  financialTools: string[]
  regulatoryKnowledge: string[]
  gridKnowledge: string | null
  languages: Record<string, string> | null

  // Section 6 - sector specialism
  offshoreExpTypes: string[]
  turbineOEMExp: string[]
  batteryChemistry: string[]
  electrolyserTypes: string[]
  reactorTypes: string[]
  ccsTechTypes: string[]
  solarScaleExp: string[]
  marineEnergyTypes: string[]
  carbonEsgExp: string[]

  // Section 7 - professional track record
  clientManagementLevel: string | null
  technicalReportWriter: string | null   // 'Yes' | 'No' | null
  bidManagement: string | null           // 'Yes' | 'No' | null
  teamLeadershipLevel: string | null
  budgetResponsibility: string | null
  financialModelling: string | null      // 'Yes' | 'No' | null
  expertWitness: string | null           // 'Yes' | 'No' | null
  hasPublications: string | null         // 'Yes' | 'No' | null

  // Section 8 - career aspirations
  careerMotivations: string[]
  shortTermGoal: string | null
}

// -- Candidate profile breakdowns (talent-pool/profile-stats) ---------------
// One tally per value a candidate could select for that field, sorted most-
// common first. Used to draw the Insights page's profile breakdown charts
// and to populate filter-dropdown options from real data.

export interface ProfileTally {
  value: string
  count: number
}

export interface ProfileStats {
  totalAvailable: number
  profilesCompleted: number
  rightToWork: {
    rightToWorkUK: ProfileTally[]
    willingToRelocate: ProfileTally[]
    ukRegion: ProfileTally[]
    openToInternational: ProfileTally[]
  }
  interests: {
    primaryTechArea: ProfileTally[]
    targetRoleTypes: ProfileTally[]
    preferredEmployerTypes: ProfileTally[]
    climatePolicyInterests: ProfileTally[]
  }
  experience: {
    experienceLevel: ProfileTally[]
    employmentStatus: ProfileTally[]
    availability: ProfileTally[]
    yearsInRenewables: ProfileTally[]
    workArrangementPrefs: ProfileTally[]
  }
  qualifications: {
    highestQualification: ProfileTally[]
    professionalBodies: ProfileTally[]
    charteredStatus: ProfileTally[]
    safetyCertifications: ProfileTally[]
  }
  technicalSkills: {
    engineeringTools: ProfileTally[]
    regulatoryKnowledge: ProfileTally[]
    gridKnowledge: ProfileTally[]
  }
  sectorSpecialism: {
    offshoreExpTypes: ProfileTally[]
    turbineOEMExp: ProfileTally[]
    batteryChemistry: ProfileTally[]
    solarScaleExp: ProfileTally[]
    marineEnergyTypes: ProfileTally[]
  }
  trackRecord: {
    clientManagementLevel: ProfileTally[]
    teamLeadershipLevel: ProfileTally[]
    technicalReportWriter: ProfileTally[]
    bidManagement: ProfileTally[]
  }
  careerAspirations: {
    careerMotivations: ProfileTally[]
  }
}

// ── Employer ─────────────────────────────────────────────────────────────────

export interface Employer {
  id: string
  name: string
  shortName: string
  sector: string               // e.g. 'Solar', 'Wind', 'Storage', 'Multi-technology'
  logoUrl: string | null
  partnerTier: 'standard' | 'premium' | 'enterprise'
  activeRoles: JobRole[]
}

export interface EmployerUser {
  id: string
  name: string
  email: string
  employerId: string
  role: 'admin' | 'recruiter' | 'viewer'
  jobTitle: string
}

export interface JobRole {
  id: string
  title: string
  department: string
  requiredSMs: number[]         // SM IDs the employer considers relevant
  minCOLPercent: number | null  // minimum COL score threshold
  minSMsCompleted: number
  postedAt: string
  status: 'open' | 'filled' | 'paused'
}

// ── Shortlist / pipeline ──────────────────────────────────────────────────────

export interface ShortlistedCandidate {
  candidateId: string
  roleId: string | null         // which role they're being considered for
  addedAt: string
  notes: string
  stage: 'interested' | 'contacted' | 'interviewing' | 'offered' | 'hired'
}

// ── Talent pool stats (returned by API) ──────────────────────────────────────

export interface TalentPoolStats {
  totalAvailable: number        // candidates who opted in to employer visibility
  newThisMonth: number          // newly qualified in last 30 days
  moduleComplete: number        // all 15 SMs done
  partComplete: number          // at least 1 full part done
  avgCOLPercent: number | null
  smCoverage: SMCoverage[]      // how many candidates have completed each SM
}

export interface SMCoverage {
  smId: number
  smTitle: string
  partNumber: PartNumber
  candidatesCompleted: number
  avgCOLPercent: number | null
}

// ── Organisation / Partner profile ───────────────────────────────────────────

export type OrgPartnershipTier = 'STANDARD' | 'PARTNER' | 'GOLD_PARTNER' | 'PLATINUM_PARTNER'

export interface Organisation {
  id:              string
  slug:            string
  type:            'EMPLOYER' | 'INSTITUTION'
  name:            string
  logoUrl:         string | null
  brandColour:     string | null
  country:         string | null
  city:            string | null
  website:         string | null
  overview:        string | null
  tagline:         string | null
  heroImageUrl:    string | null
  galleryImages:   string[]
  videoUrl:        string | null
  socialLinks:     Record<string, string> | null
  sectors:         string[]
  yearFounded:     number | null
  employeeCount:   string | null
  partnershipTier: OrgPartnershipTier
  testimonial:     { quote: string; authorName: string; authorRole: string } | null
  rcContactId:     string | null
  opportunities:   Array<{ id: string; title: string; type: string | null; description: string | null; url: string | null; isActive: boolean }>
  isPublished:     boolean
  createdAt:       string
  updatedAt:       string
}

// ── Employer dashboard summary ────────────────────────────────────────────────

export interface EmployerDashboardData {
  stats: TalentPoolStats
  recentlyQualified: CandidateProfile[]   // last 10 who became available
  shortlisted: ShortlistedCandidate[]
  activeRoles: JobRole[]
}
