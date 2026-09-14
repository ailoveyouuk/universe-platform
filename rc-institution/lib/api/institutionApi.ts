import { apiGet, apiPost } from '@rc/api-client'
import type { Institution, InstitutionUser, Student, Cohort, InstitutionStats } from '@/lib/data/types'

export async function getInstitution(institutionId: string): Promise<Institution | null> {
  const result = await apiGet<Institution>(`/api/institutions/${institutionId}`)
  return result.error ? null : result.data
}

export async function getInstitutionUser(userId: string): Promise<InstitutionUser | null> {
  const result = await apiGet<InstitutionUser>(`/api/users/${userId}`)
  return result.error ? null : result.data
}

export async function getStudents(institutionId: string): Promise<Student[]> {
  const result = await apiGet<Student[]>(`/api/institutions/${institutionId}/students`)
  return result.error ? [] : result.data
}

export async function getCohorts(institutionId: string): Promise<Cohort[]> {
  const result = await apiGet<Cohort[]>(`/api/institutions/${institutionId}/cohorts`)
  return result.error ? [] : result.data
}

export interface CreateCohortInput {
  name: string
  parts: number[]
  accessDurationDays?: number
  seatCap?: number | null
}

// Self-service cohort creation — same PARTS_EXCEED_CONTRACT enforcement as
// bulkAddLearners below, just checked at cohort-creation time (see rc-api's
// POST /api/institutions/:id/cohorts).
export async function createCohort(
  institutionId: string,
  input: CreateCohortInput,
): Promise<{ data: Cohort | null; error: string | null }> {
  const result = await apiPost<Cohort>(`/api/institutions/${institutionId}/cohorts`, input)
  return { data: result.error ? null : result.data, error: result.error?.message ?? null }
}

export interface BulkAddLearnersResult {
  created: number
  failed: Array<{ email: string; reason: string }>
}

export interface BulkAddLearnerRow {
  email: string
  firstName?: string
  lastName?: string
}

export async function bulkAddLearners(
  institutionId: string,
  input: { rows: BulkAddLearnerRow[]; cohortId?: string; parts?: number[] },
): Promise<{ data: BulkAddLearnersResult | null; error: string | null }> {
  const result = await apiPost<BulkAddLearnersResult>(`/api/institutions/${institutionId}/learner-invites/bulk`, input)
  return { data: result.error ? null : result.data, error: result.error?.message ?? null }
}

export async function getInstitutionStats(institutionId: string): Promise<InstitutionStats> {
  const result = await apiGet<InstitutionStats>(`/api/institutions/${institutionId}/stats`)
  return result.error
    ? { totalStudents: 0, activeStudents: 0, avgCompletionPercent: 0, avgCOLPercent: 0, smStats: [] }
    : result.data
}

export async function getStudentById(studentId: string): Promise<Student | null> {
  const result = await apiGet<Student>(`/api/students/${studentId}`)
  return result.error ? null : result.data
}


export interface InstitutionSummary {
  id: string
  name: string
  shortName: string
}

// Global Admin/Coordinator only — powers the org picker in
// InstitutionAccessGate/InstitutionHeader for staff with platform-wide
// access but no institution of their own. Reuses the same list the
// rc-admin app's own institutions page shows (rcStaff-gated server-side).
export async function listInstitutions(): Promise<InstitutionSummary[]> {
  const result = await apiGet<InstitutionSummary[]>('/api/admin/institutions')
  return result.error ? [] : result.data
}
