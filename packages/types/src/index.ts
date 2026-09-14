// ─────────────────────────────────────────────────────────────────────────────
// @rc/types — Renewables Connect shared type definitions
// All four apps (learner, institution, employer, admin) import from here.
// These types mirror the Prisma schema in @rc/db.
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums ─────────────────────────────────────────────────────────────────────

export type PartNumber = 1 | 2 | 3
export type UserRole = 'learner' | 'institution_admin' | 'institution_tutor' | 'employer_admin' | 'employer_recruiter' | 'rc_admin' | 'rc_analyst' | 'rc_support'
export type OrgType = 'EMPLOYER' | 'INSTITUTION'
export type OrgPartnershipTier = 'STANDARD' | 'PARTNER' | 'GOLD_PARTNER' | 'PLATINUM_PARTNER'
export type SMStatus = 'not_started' | 'in_progress' | 'completed'
export type CompletionLevel = 'none' | 'partial' | 'part' | 'module'
export type PartnerStatus = 'active' | 'onboarding' | 'inactive'
export type PartnerTier = 'standard' | 'premium' | 'enterprise'
export type PipelineStage = 'interested' | 'contacted' | 'interviewing' | 'offered' | 'hired'
export type RoleStatus = 'open' | 'filled' | 'paused'
export type CertificateLevel = 'submodule' | 'part' | 'module'
export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertCategory = 'engagement' | 'performance' | 'system' | 'commercial'
export type ActivityEventType =
  | 'learner_registered'
  | 'learner_completed_sm'
  | 'learner_completed_part'
  | 'learner_completed_module'
  | 'institution_joined'
  | 'employer_joined'
  | 'employer_shortlisted'
  | 'col_score_low'

// ── Core entities ─────────────────────────────────────────────────────────────

export interface User {
  id: string
  azureAdId: string             // Azure AD object ID — primary auth identifier
  email: string
  displayName: string
  role: UserRole
  createdAt: string
  lastSignInAt: string | null
}

// ── Learner domain ────────────────────────────────────────────────────────────

// Just the fields a learner-facing app needs to brand a page for their
// institution — never the full Institution row (contact details,
// partner-tier/CRM fields etc. are none of a learner's business).
export interface InstitutionBrand {
  id: string
  name: string
  shortName: string
  primaryColor: string
  logoUrl: string | null
}

export interface Learner {
  id: string
  userId: string
  institutionId: string | null  // self-enrolled learners land on the synthetic "Individual Learners" institution, not null
  cohortId: string | null
  enrolledAt: string
  lastActiveAt: string | null
  availableToEmployers: boolean // candidate has opted in to employer visibility
  smProgress: Record<string, SMProgress>
  institution?: InstitutionBrand | null // present on GET /api/learners/:id and the auth/register response
}

export interface SMProgress {
  id: string
  learnerId: string
  smId: number
  smSlug: string
  smTitle: string
  partNumber: PartNumber
  status: SMStatus
  startedAt: string | null
  completedAt: string | null
  colScore: COLScore | null
}

export interface COLScore {
  id: string
  smProgressId: string
  score: number
  maxScore: number
  percent: number
  attempts: number
  lastAttemptAt: string
}

export interface Certificate {
  id: string
  learnerId: string
  level: CertificateLevel
  title: string
  subtitle: string
  moduleContext: string
  recipientName: string
  completedAt: string
  partNumber: PartNumber | null
  partAccent: 'rc-green' | 'blue-500' | 'purple-500' | null
  smId: number | null
  certifyingBody: string | null
  credentialId: string
}

// ── Institution domain ────────────────────────────────────────────────────────

export interface Institution {
  id: string
  name: string
  shortName: string
  logoUrl: string | null
  primaryColor: string
  status: PartnerStatus
  partnerSince: string
  cohorts: Cohort[]
}

export interface Cohort {
  id: string
  institutionId: string
  name: string
  startDate: string
  studentIds: string[]
}

export interface InstitutionUser {
  id: string
  userId: string
  institutionId: string
  role: 'admin' | 'tutor' | 'viewer'
}

// ── Employer domain ───────────────────────────────────────────────────────────

export interface Employer {
  id: string
  name: string
  shortName: string
  sector: string
  logoUrl: string | null
  partnerTier: PartnerTier
  status: PartnerStatus
  partnerSince: string
  activeRoles: JobRole[]
}

export interface EmployerUser {
  id: string
  userId: string
  employerId: string
  role: 'admin' | 'recruiter' | 'viewer'
  jobTitle: string
}

export interface JobRole {
  id: string
  employerId: string
  title: string
  department: string
  requiredSMs: number[]
  minCOLPercent: number | null
  minSMsCompleted: number
  postedAt: string
  status: RoleStatus
}

export interface ShortlistedCandidate {
  id: string
  employerId: string
  learnerId: string
  roleId: string | null
  addedAt: string
  notes: string
  stage: PipelineStage
}

// ── Candidate view (employer-facing summary of a learner) ─────────────────────

export interface CandidateView {
  id: string                    // learnerId
  displayName: string
  completionLevel: CompletionLevel
  partsCompleted: PartNumber[]
  smsCompleted: number
  avgCOLPercent: number | null
  topSkillAreas: string[]
  completedModuleAt: string | null
  lastActiveAt: string | null
  availableForRoles: boolean
  credentialIds: string[]
}

// ── Candidate profile (structured career profile filled in by candidate) ───────

export interface SoftwareSkill {
  toolName: string
  proficiency: 'beginner' | 'proficient' | 'expert'
}

export interface LanguageSkill {
  language: string
  proficiency: 'basic' | 'conversational' | 'professional' | 'native'
}

export interface CandidateProfile {
  id: string
  learnerId: string
  updatedAt: string

  // Section 1
  rightToWorkUK?: string
  visaSponsorshipNeeded?: boolean
  securityClearance?: string
  ukResidencyYears?: string
  countryOfResidence?: string
  ukRegion?: string
  willingToRelocate?: string
  relocationRegions: string[]
  openToInternational?: boolean
  hasDriversLicence?: boolean

  // Section 2
  primaryTechArea?: string
  secondaryTechAreas: string[]
  climatePolicyInterests: string[]
  functionalDisciplines: string[]
  targetRoleTypes: string[]
  preferredEmployerTypes: string[]
  companySizePreference?: string

  // Section 3
  experienceLevel?: string
  yearsInRenewables?: string
  previousSector?: string
  projectPhasesExp: string[]
  largestProjectScale?: string
  commercialRegimeExp: string[]
  employmentStatus?: string
  availability?: string
  noticePeriod?: string
  employmentTypePrefs: string[]
  workArrangementPrefs: string[]
  salaryExpectation?: string

  // Section 4
  highestQualification?: string
  qualificationSubject?: string
  professionalBodies: string[]
  charteredStatus?: string
  safetyCertifications: string[]
  technicalCertifications: string[]
  otherCertifications?: string

  // Section 5
  softwareSkills: SoftwareSkill[]
  engineeringTools: string[]
  financialTools: string[]
  regulatoryKnowledge: string[]
  gridKnowledge?: string
  languages: LanguageSkill[]

  // Section 6
  offshoreExpTypes: string[]
  turbineOEMExp: string[]
  batteryChemistry: string[]
  electrolyserTypes: string[]
  reactorTypes: string[]
  ccsTechTypes: string[]
  solarScaleExp: string[]
  marineEnergyTypes: string[]
  carbonEsgExp: string[]

  // Section 7
  clientManagementLevel?: string
  technicalReportWriter?: boolean
  bidManagement?: boolean
  teamLeadershipLevel?: string
  budgetResponsibility?: string
  financialModelling?: boolean
  expertWitness?: boolean
  hasPublications?: boolean

  // Section 8
  careerMotivations: string[]
  shortTermGoal?: string
  linkedinUrl?: string
  portfolioUrl?: string
  personalStatement?: string

  // Section 9
  optInToDiscovery: boolean
  profileVisibility: 'all' | 'partners' | 'hidden'
  allowEmployerContact: boolean
}

export interface ProfileSectionCompletion {
  section: number
  name: string
  completedFields: number
  totalFields: number
  percent: number
  complete: boolean
}

export interface CandidateProfileSummary {
  learnerId: string
  profile: CandidateProfile | null
  sectionCompletion: ProfileSectionCompletion[]
  overallPercent: number
}

// ── Admin domain ──────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string
  userId: string
  role: 'superadmin' | 'analyst' | 'support'
}

export interface PlatformAlert {
  id: string
  severity: AlertSeverity
  title: string
  description: string
  affectedCount: number
  detectedAt: string
  resolvedAt: string | null
  category: AlertCategory
}

export interface PlatformActivityEvent {
  id: string
  type: ActivityEventType
  description: string
  entityId: string
  entityName: string
  timestamp: string
  metadata?: Record<string, string | number>
}

// ── Aggregated stats (returned by API — not stored directly) ──────────────────

export interface PlatformStats {
  totalLearners: number
  activeLearners30d: number
  newLearners30d: number
  moduleCompletions: number
  partCompletions: number
  smCompletions: number
  avgCOLPercent: number | null
  totalInstitutions: number
  totalInstitutionStudents: number
  totalEmployers: number
  activeEmployers30d: number
  totalCOLAttempts: number
}

export interface LearnerFunnel {
  registered: number
  startedSM1: number
  completedPart1: number
  completedModule: number
}

export interface InstitutionStats {
  totalStudents: number
  activeStudents: number
  avgCompletionPercent: number
  avgCOLPercent: number
  smStats: SMStat[]
}

export interface SMStat {
  smId: number
  smTitle: string
  partNumber: PartNumber
  studentsAttempted: number
  studentsCompleted: number
  avgCOLPercent: number | null
}

export interface TalentPoolStats {
  totalAvailable: number
  newThisMonth: number
  moduleComplete: number
  partComplete: number
  avgCOLPercent: number | null
  smCoverage: SMCoverage[]
}

export interface SMCoverage {
  smId: number
  smTitle: string
  partNumber: PartNumber
  candidatesCompleted: number
  avgCOLPercent: number | null
}

export interface SMPerformanceStat {
  smId: number
  smTitle: string
  partNumber: PartNumber
  totalStarts: number
  totalCompletions: number
  completionRate: number
  avgCOLPercent: number | null
  avgTimeToCompleteHours: number | null
  dropoffRate: number
}

export interface InstitutionSummary {
  id: string
  name: string
  shortName: string
  studentCount: number
  activeStudents30d: number
  avgCompletionPercent: number
  avgCOLPercent: number | null
  partnerSince: string
  status: PartnerStatus
}

export interface EmployerSummary {
  id: string
  name: string
  sector: string
  partnerTier: PartnerTier
  openRoles: number
  shortlistedCandidates: number
  lastActiveAt: string | null
  status: PartnerStatus
}

// ── Organisation / Partner profiles ──────────────────────────────────────────

export interface OrgSocialLinks {
  twitter?:   string
  linkedin?:  string
  instagram?: string
  facebook?:  string
  youtube?:   string
}

export interface OrgTestimonial {
  quote:       string
  authorName:  string
  authorRole:  string
  avatarUrl?:  string
}

export interface Opportunity {
  id:             string
  organisationId: string
  title:          string
  type:           string | null
  description:    string | null
  url:            string | null
  isActive:       boolean
  createdAt:      string
}

export interface Organisation {
  id:              string
  slug:            string
  type:            OrgType
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
  socialLinks:     OrgSocialLinks | null
  sectors:         string[]
  yearFounded:     number | null
  employeeCount:   string | null
  partnershipTier: OrgPartnershipTier
  testimonial:     OrgTestimonial | null
  rcContactId:     string | null
  opportunities:   Opportunity[]
  isPublished:     boolean
  createdAt:       string
  updatedAt:       string
}

export interface OrganisationListItem {
  id:              string
  slug:            string
  type:            OrgType
  name:            string
  logoUrl:         string | null
  brandColour:     string | null
  country:         string | null
  city:            string | null
  tagline:         string | null
  sectors:         string[]
  partnershipTier: OrgPartnershipTier
  isPublished:     boolean
  createdAt:       string
}

// ── API response wrappers ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: {
    code: string
    message: string
    statusCode: number
  }
}

export type ApiResult<T> = ApiResponse<T> | ApiError

// ── Dashboard summary payloads ────────────────────────────────────────────────

export interface InstitutionDashboardData {
  stats: InstitutionStats
  cohorts: Cohort[]
  recentActivity: PlatformActivityEvent[]
}

export interface EmployerDashboardData {
  stats: TalentPoolStats
  recentlyQualified: CandidateView[]
  shortlisted: ShortlistedCandidate[]
  activeRoles: JobRole[]
}

export interface AdminDashboardData {
  stats: PlatformStats
  funnel: LearnerFunnel
  institutions: InstitutionSummary[]
  employers: EmployerSummary[]
  smPerformance: SMPerformanceStat[]
  recentActivity: PlatformActivityEvent[]
  alerts: PlatformAlert[]
}
