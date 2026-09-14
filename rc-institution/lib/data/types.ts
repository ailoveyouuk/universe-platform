export type PartNumber = 1 | 2 | 3

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

export interface COLScore {
  score: number
  maxScore: number
  percent: number
  attempts: number
  lastAttemptAt: string
}

export interface SMProgress {
  smId: number
  smSlug: string
  smTitle: string
  partNumber: PartNumber
  status: 'not_started' | 'in_progress' | 'completed'
  startedAt: string | null
  completedAt: string | null
  colScore: COLScore | null
}

export interface Student {
  id: string
  name: string
  email: string
  cohortId: string
  enrolledAt: string
  lastActiveAt: string | null
  smProgress: Record<string, SMProgress>
  unlockedParts: PartNumber[]
}

export interface Cohort {
  id: string
  name: string
  institutionId: string
  startDate: string
  studentIds: string[]
  // What this cohort actually grants — access is sourced from here (rc-api's
  // provisionLearner), not chosen separately per invite.
  parts: PartNumber[]
  accessDurationDays: number
  seatCap: number | null
  learnersRedeemed: number
  seatsRemaining: number | null
}

export interface Institution {
  id: string
  name: string
  shortName: string
  logoUrl: string | null
  primaryColor: string
  selfServiceEnabled: boolean
  contractedParts: number[]
  cohorts: Cohort[]
}

export interface InstitutionUser {
  id: string
  name: string
  email: string
  institutionId: string
  role: 'admin' | 'tutor' | 'viewer'
}

export interface SMStat {
  smId: number
  smTitle: string
  partNumber: PartNumber
  studentsAttempted: number
  studentsCompleted: number
  avgCOLPercent: number | null
}

export interface InstitutionStats {
  totalStudents: number
  activeStudents: number
  avgCompletionPercent: number
  avgCOLPercent: number
  smStats: SMStat[]
}
