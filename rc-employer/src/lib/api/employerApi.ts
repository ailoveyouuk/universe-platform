import { apiGet, apiPost, apiPatch } from '@rc/api-client'
import type {
  Employer, EmployerUser, CandidateProfile,
  ShortlistedCandidate, JobRole, TalentPoolStats,
  EmployerDashboardData, ProfileStats,
} from '@/lib/data/types'

export async function getEmployer(employerId: string): Promise<Employer | null> {
  const result = await apiGet<Employer>(`/api/employers/${employerId}`)
  return result.error ? null : result.data
}

export async function getEmployerUser(userId: string): Promise<EmployerUser | null> {
  const result = await apiGet<EmployerUser>(`/api/users/${userId}`)
  return result.error ? null : result.data
}

export async function getTalentPoolStats(employerId: string): Promise<TalentPoolStats> {
  const result = await apiGet<TalentPoolStats>(`/api/employers/${employerId}/talent-pool/stats`)
  return result.error
    ? { totalAvailable: 0, newThisMonth: 0, moduleComplete: 0, partComplete: 0, avgCOLPercent: null, smCoverage: [] }
    : result.data
}

export interface CandidateFilters {
  completionLevel?: string
  minCOL?: number
  partCompleted?: number
  // Right to work & location
  rightToWorkUK?: string
  willingToRelocate?: string
  ukRegion?: string
  // Interests
  primaryTechArea?: string
  targetRoleType?: string
  preferredEmployerType?: string
  // Experience
  experienceLevel?: string
  employmentStatus?: string
  availability?: string
  // Qualifications
  highestQualification?: string
  professionalBody?: string
  charteredStatus?: string
  // Sector specialism
  turbineOEM?: string
  offshoreExpType?: string
  batteryChemistry?: string
  solarScaleExp?: string
  // Track record & career
  teamLeadershipLevel?: string
  careerMotivation?: string
}

export async function getCandidates(
  employerId: string,
  filters?: CandidateFilters
): Promise<CandidateProfile[]> {
  const params = new URLSearchParams()
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') params.set(key, String(value))
    }
  }
  const qs = params.toString() ? `?${params}` : ''
  const result = await apiGet<CandidateProfile[]>(`/api/employers/${employerId}/candidates${qs}`)
  return result.error ? [] : result.data
}

export async function getProfileStats(employerId: string): Promise<ProfileStats | null> {
  const result = await apiGet<ProfileStats>(`/api/employers/${employerId}/talent-pool/profile-stats`)
  return result.error ? null : result.data
}

export async function getShortlist(employerId: string): Promise<ShortlistedCandidate[]> {
  const result = await apiGet<ShortlistedCandidate[]>(`/api/employers/${employerId}/shortlist`)
  return result.error ? [] : result.data
}

export async function addToShortlist(
  employerId: string,
  candidateId: string,
  roleId: string | null,
  notes: string,
): Promise<ShortlistedCandidate | null> {
  const result = await apiPost<ShortlistedCandidate>(
    `/api/employers/${employerId}/shortlist`,
    { candidateId, roleId, notes },
  )
  return result.error ? null : result.data
}

export async function updateShortlistStage(
  employerId: string,
  candidateId: string,
  stage: ShortlistedCandidate['stage'],
): Promise<void> {
  await apiPatch(`/api/employers/${employerId}/shortlist/${candidateId}`, { stage })
}

export async function getActiveRoles(employerId: string): Promise<JobRole[]> {
  const result = await apiGet<JobRole[]>(`/api/employers/${employerId}/roles?status=open`)
  return result.error ? [] : result.data
}

export async function getAllRoles(employerId: string): Promise<JobRole[]> {
  const result = await apiGet<JobRole[]>(`/api/employers/${employerId}/roles`)
  return result.error ? [] : result.data
}

export async function createRole(
  employerId: string,
  role: { title: string; department: string; requiredSMs: number[]; minCOLPercent: number | null; minSMsCompleted: number },
): Promise<JobRole | null> {
  const result = await apiPost<JobRole>(`/api/employers/${employerId}/roles`, role)
  return result.error ? null : result.data
}

export async function updateRoleStatus(
  employerId: string,
  roleId: string,
  status: JobRole['status'],
): Promise<JobRole | null> {
  const result = await apiPatch<JobRole>(`/api/employers/${employerId}/roles/${roleId}`, { status })
  return result.error ? null : result.data
}

export async function getDashboardSummary(employerId: string): Promise<EmployerDashboardData> {
  const result = await apiGet<EmployerDashboardData>(`/api/employers/${employerId}/dashboard`)
  return result.error
    ? { stats: { totalAvailable: 0, newThisMonth: 0, moduleComplete: 0, partComplete: 0, avgCOLPercent: null, smCoverage: [] }, recentlyQualified: [], shortlisted: [], activeRoles: [] }
    : result.data
}

export interface EmployerSummary {
  id: string
  name: string
  sector: string
}

// Global Admin/Coordinator only — powers the org picker in
// EmployerAccessGate/EmployerHeader for staff with platform-wide access but
// no employer of their own. Reuses the same list the rc-admin app's own
// employers page shows (rcStaff-gated server-side).
export async function listEmployers(): Promise<EmployerSummary[]> {
  const result = await apiGet<EmployerSummary[]>('/api/admin/employers')
  return result.error ? [] : result.data
}
