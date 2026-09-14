// ── Organisation / Partner profiles ──────────────────────────────────────────

export type OrgType             = 'EMPLOYER' | 'INSTITUTION'
export type OrgPartnershipTier  = 'STANDARD' | 'PARTNER' | 'GOLD_PARTNER' | 'PLATINUM_PARTNER'

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
  _count?:         { opportunities: number }
}

export interface OrgListItem {
  id:              string
  slug:            string
  type:            OrgType
  name:            string
  logoUrl:         string | null
  brandColour:     string | null
  country:         string | null
  city:            string | null
  partnershipTier: OrgPartnershipTier
  isPublished:     boolean
  createdAt:       string
  updatedAt:       string
  _count?:         { opportunities: number }
}

// ── Admin user ────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'rc_admin' | 'rc_analyst' | 'rc_support'
}

// ── Platform-wide stats ───────────────────────────────────────────────────────

export interface PlatformStats {
  // Learners
  totalLearners: number
  activeLearners30d: number       // active in last 30 days
  newLearners30d: number
  moduleCompletions: number       // total all-time module completions
  partCompletions: number
  smCompletions: number
  avgCOLPercent: number | null
  // Institutions
  totalInstitutions: number
  totalInstitutionStudents: number
  // Employers
  totalEmployers: number
  activeEmployers30d: number
  // Content
  totalCOLAttempts: number
}

// ── Learner funnel ────────────────────────────────────────────────────────────

export interface LearnerFunnel {
  registered: number
  startedSM1: number       // at least one SM started
  completedPart1: number   // all 5 Part 1 SMs done
  completedModule: number  // all 15 SMs done
}

// ── Institution summary (aggregate, not full detail) ─────────────────────────

export interface InstitutionSummary {
  id: string
  name: string
  shortName: string
  type: 'ACADEMIC' | 'CORPORATE'
  sector: string | null
  partnerTier: 'standard' | 'premium' | 'enterprise'
  logoUrl: string | null
  studentCount: number
  activeStudents30d: number
  avgCompletionPercent: number
  avgCOLPercent: number | null
  partnerSince: string
  status: 'active' | 'onboarding' | 'inactive'
}

// ── Employer summary ──────────────────────────────────────────────────────────

export interface EmployerSummary {
  id: string
  name: string
  sector: string
  partnerTier: 'standard' | 'premium' | 'enterprise'
  openRoles: number
  shortlistedCandidates: number
  lastActiveAt: string | null
  status: 'active' | 'onboarding' | 'inactive'
}

export type StaffRole =
  | 'rc_admin' | 'rc_analyst' | 'rc_support'
  | 'institution_admin' | 'institution_tutor'
  | 'employer_admin' | 'employer_recruiter'

export interface StaffInvite {
  id:             string
  email:          string
  firstName:      string | null
  lastName:       string | null
  role:           StaffRole
  institutionId:  string | null
  employerId:     string | null
  invitedByName:  string | null
  createdAt:      string
  redeemedAt:     string | null
}

export interface LearnerInvite {
  id:              string
  email:           string
  firstName:       string | null
  lastName:        string | null
  institutionId:   string | null
  cohortId:        string | null
  institutionName: string | null
  cohortName:      string | null
  parts:           number[]
  invitedByName:   string | null
  createdAt:       string
  redeemedAt:      string | null
}

// ── Content performance ───────────────────────────────────────────────────────

export interface SMPerformanceStat {
  smId: number
  smTitle: string
  partNumber: 1 | 2 | 3
  totalStarts: number
  totalCompletions: number
  completionRate: number       // 0–100
  avgCOLPercent: number | null
  avgTimeToCompleteHours: number | null
  dropoffRate: number          // % who started but didn't complete
}

// ── Platform activity feed ────────────────────────────────────────────────────

export type ActivityEventType =
  | 'learner_registered'
  | 'learner_completed_sm'
  | 'learner_completed_part'
  | 'learner_completed_module'
  | 'institution_joined'
  | 'employer_joined'
  | 'employer_shortlisted'
  | 'col_score_low'            // COL score below threshold — attention item

export interface PlatformActivityEvent {
  id: string
  type: ActivityEventType
  description: string
  entityId: string
  entityName: string
  timestamp: string
  metadata?: Record<string, string | number>
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface PlatformAlert {
  id: string
  severity: AlertSeverity
  title: string
  description: string
  affectedCount: number
  detectedAt: string
  category: 'engagement' | 'performance' | 'system' | 'commercial'
}

// ── Dashboard summary ─────────────────────────────────────────────────────────

export interface AdminDashboardData {
  stats: PlatformStats
  funnel: LearnerFunnel
  institutions: InstitutionSummary[]
  employers: EmployerSummary[]
  smPerformance: SMPerformanceStat[]
  recentActivity: PlatformActivityEvent[]
  alerts: PlatformAlert[]
}

// ── Access grants ────────────────────────────────────────────────────────────

export interface AccessGrant {
  id:              string
  parts:           number[]
  source:          string
  externalOrderId: string | null
  notes:           string | null
  grantedAt:       string
  expiresAt:       string
  learnerId:       string | null
  institutionId:   string | null
  cohortId:        string | null
  learner?:        { user: { displayName: string; email: string } } | null
  institution?:    { name: string; type: 'ACADEMIC' | 'CORPORATE' } | null
  cohort?:         { name: string } | null
}

export interface CohortSummary {
  id:                 string
  institutionId:      string
  name:               string
  startDate:          string
  parts:              number[]
  accessDurationDays: number
  seatCap:            number | null
  inviteCode:         string
  inviteUrl:          string
  learnersRedeemed:   number
  seatsRemaining:     number | null
  _count:             { learners: number }
}

// ── Institution detail (full record, for the institution admin page) ────────

export interface InstitutionDetail {
  id:           string
  name:         string
  shortName:    string
  type:         'ACADEMIC' | 'CORPORATE'
  sector:       string | null
  partnerTier:  'standard' | 'premium' | 'enterprise'
  website:      string | null
  overview:     string | null
  country:      string | null
  city:         string | null
  sizeBand:     string | null
  contactName:  string | null
  contactEmail: string | null
  contactPhone: string | null
  logoUrl:      string | null
  primaryColor: string
  status:       'active' | 'onboarding' | 'inactive'
  partnerSince: string
  selfServiceEnabled: boolean
  contractedParts:    number[]
  cohorts:      CohortSummary[]
}

export interface LearnerSearchResult {
  id:          string
  institution: { name: string } | null
  user:        { displayName: string; email: string }
}

export interface LearnerListRow {
  id:            string
  user:          { displayName: string; email: string }
  institution:   { name: string } | null
  cohort:        { name: string } | null
  enrolledAt:    string
  lastActiveAt:  string | null
  unlockedParts: number[]
}

export interface LearnerListPage {
  learners: LearnerListRow[]
  total:    number
  page:     number
  pageSize: number
}

export interface LearnerDetail {
  id:               string
  enrolledAt:       string
  lastActiveAt:     string | null
  availableToEmployers: boolean
  user:             { displayName: string; email: string }
  institution:      { name: string } | null
  cohort:           { name: string } | null
  smProgress: {
    id: string
    smId: number
    smTitle: string
    partNumber: number
    status: 'not_started' | 'in_progress' | 'completed'
    startedAt: string | null
    completedAt: string | null
    colScore: { score: number; maxScore: number; percent: number; attempts: number; lastAttemptAt: string } | null
  }[]
  certificates: { id: string; level: string; title: string; completedAt: string }[]
  accessGrants: { id: string; parts: number[]; source: string; grantedAt: string; expiresAt: string }[]
}
