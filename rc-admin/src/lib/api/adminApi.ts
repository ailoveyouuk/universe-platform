import { apiGet, apiPost, apiPatch, apiDelete, apiPostForBlob, isBlobDownloadError } from '@rc/api-client'
import type {
  AdminUser, PlatformStats, LearnerFunnel,
  InstitutionSummary, EmployerSummary,
  SMPerformanceStat, PlatformActivityEvent,
  PlatformAlert, AdminDashboardData,
  Organisation, OrgListItem, Opportunity,
  AccessGrant, CohortSummary, LearnerSearchResult, LearnerDetail, LearnerListPage,
  InstitutionDetail, StaffInvite, StaffRole, LearnerInvite,
} from '@/lib/data/types'

export async function getAdminUser(userId: string): Promise<AdminUser | null> {
  const result = await apiGet<AdminUser>(`/api/admin/users/${userId}`)
  return result.error ? null : result.data
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const result = await apiGet<PlatformStats>('/api/admin/stats')
  return result.error
    ? { totalLearners: 0, activeLearners30d: 0, newLearners30d: 0, moduleCompletions: 0, partCompletions: 0, smCompletions: 0, avgCOLPercent: null, totalInstitutions: 0, totalInstitutionStudents: 0, totalEmployers: 0, activeEmployers30d: 0, totalCOLAttempts: 0 }
    : result.data
}

export async function getLearnerFunnel(): Promise<LearnerFunnel> {
  const result = await apiGet<LearnerFunnel>('/api/admin/learners/funnel')
  return result.error
    ? { registered: 0, startedSM1: 0, completedPart1: 0, completedModule: 0 }
    : result.data
}

export async function getInstitutions(): Promise<InstitutionSummary[]> {
  const result = await apiGet<InstitutionSummary[]>('/api/admin/institutions')
  return result.error ? [] : result.data
}

// The full institution profile pro forma — name/shortName/type are the
// only required fields (so a quick-create still works), everything else is
// optional and can be filled in now or later via updateInstitution.
export interface InstitutionProfileInput {
  name?: string
  shortName?: string
  type?: 'ACADEMIC' | 'CORPORATE'
  sector?: string
  partnerTier?: 'standard' | 'premium' | 'enterprise'
  website?: string
  overview?: string
  country?: string
  city?: string
  sizeBand?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  logoUrl?: string
  primaryColor?: string
}

export interface CreateInstitutionInput extends InstitutionProfileInput {
  name: string
  shortName: string
  type: 'ACADEMIC' | 'CORPORATE'
}

export async function createInstitution(
  input: CreateInstitutionInput,
): Promise<{ data: InstitutionSummary | null; error: string | null }> {
  const result = await apiPost<InstitutionSummary>('/api/admin/institutions', input)
  return result.error ? { data: null, error: result.error.message } : { data: result.data, error: null }
}

export async function getInstitutionDetail(id: string): Promise<InstitutionDetail | null> {
  const result = await apiGet<InstitutionDetail>(`/api/admin/institutions/${id}`)
  return result.error ? null : result.data
}

export async function updateInstitution(id: string, input: InstitutionProfileInput): Promise<InstitutionDetail | null> {
  const result = await apiPatch<InstitutionDetail>(`/api/admin/institutions/${id}`, input)
  return result.error ? null : result.data
}

// Deliberately separate from updateInstitution — see the matching note on
// the rc-api route: a self-service-only save must never risk nulling out
// the rest of the institution's profile just because this call didn't
// mention it.
export async function updateInstitutionSelfService(
  id: string, input: { selfServiceEnabled: boolean; contractedParts: number[] },
): Promise<InstitutionDetail | null> {
  const result = await apiPatch<InstitutionDetail>(`/api/admin/institutions/${id}/self-service`, input)
  return result.error ? null : result.data
}

export interface CreateCohortInput {
  institutionId: string
  name: string
  startDate?: string
  parts: number[]
  accessDurationDays?: number
  seatCap?: number | null
}

export async function createCohort(input: CreateCohortInput): Promise<CohortSummary | null> {
  const result = await apiPost<CohortSummary>('/api/admin/cohorts', input)
  return result.error ? null : result.data
}

export interface CreateEmployerInput {
  name: string
  shortName: string
  sector: string
  partnerTier?: 'standard' | 'premium' | 'enterprise'
}

export interface EmployerDetail {
  id: string; name: string; shortName: string; sector: string
  partnerTier: 'standard' | 'premium' | 'enterprise'
  status: 'active' | 'onboarding' | 'inactive'
  logoUrl: string | null
}

export async function createEmployer(input: CreateEmployerInput): Promise<EmployerSummary | null> {
  const result = await apiPost<EmployerSummary>('/api/admin/employers', input)
  return result.error ? null : result.data
}

export async function getEmployerDetail(id: string): Promise<EmployerDetail | null> {
  const result = await apiGet<EmployerDetail>(`/api/admin/employers/${id}`)
  return result.error ? null : result.data
}

export async function getEmployers(): Promise<EmployerSummary[]> {
  const result = await apiGet<EmployerSummary[]>('/api/admin/employers')
  return result.error ? [] : result.data
}

export async function getSMPerformance(): Promise<SMPerformanceStat[]> {
  const result = await apiGet<SMPerformanceStat[]>('/api/admin/content/sm-performance')
  return result.error ? [] : result.data
}

export async function getPlatformActivity(limit = 20): Promise<PlatformActivityEvent[]> {
  const result = await apiGet<PlatformActivityEvent[]>(`/api/admin/activity?limit=${limit}`)
  return result.error ? [] : result.data
}

export async function deleteActivityEvent(id: string): Promise<{ ok: boolean; error: string | null }> {
  const result = await apiDelete(`/api/admin/activity/${id}`)
  return { ok: !result.error, error: result.error?.message ?? null }
}

export async function getPlatformAlerts(): Promise<PlatformAlert[]> {
  const result = await apiGet<PlatformAlert[]>('/api/admin/alerts')
  return result.error ? [] : result.data
}

// A failed fetch used to fall back to an all-zero AdminDashboardData object
// — which rendered exactly like a genuinely empty platform, with nothing on
// screen to say the request had actually failed (seen live: a phone session
// with a stale/expired token showed "0" across every KPI, indistinguishable
// from the platform really having no learners or institutions). Now throws
// instead, so the page can tell the two apart and show an actual error.
export async function getDashboard(): Promise<AdminDashboardData> {
  const result = await apiGet<AdminDashboardData>('/api/admin/dashboard')
  if (result.error) throw new Error(result.error.message)
  return result.data
}

export async function dismissAlert(alertId: string): Promise<void> {
  await apiDelete(`/api/admin/alerts/${alertId}`)
}

export interface ReportColumn { key: string; label: string }
export interface ReportData { columns: ReportColumn[]; rows: Record<string, string | number | null>[] }

export async function viewReport(
  type: 'learners' | 'institutions' | 'employers' | 'content',
): Promise<ReportData> {
  const result = await apiGet<ReportData>(`/api/admin/reports/${type}`)
  if (result.error) throw new Error(result.error.message)
  return result.data
}

export async function exportReport(
  type: 'learners' | 'institutions' | 'employers' | 'content',
  format: 'csv' | 'xlsx',
): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await apiPostForBlob('/api/admin/reports/export', { type, format })
  if (isBlobDownloadError(result)) {
    return { ok: false, message: result.error.message }
  }
  // The backend always sets a Content-Disposition filename (rc-<type>-<date>.<ext>)
  // — this fallback only matters if that header is ever stripped somewhere in
  // between (a proxy, an older browser), so the download still has a sane name.
  const filename = result.filename ?? `rc-${type}.${format}`
  const url = URL.createObjectURL(result.blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return { ok: true }
}

// ── Organisations ─────────────────────────────────────────────────────────────

export async function getAdminOrganisations(params?: { type?: string; page?: number }): Promise<{ orgs: OrgListItem[]; pagination: { total: number; pages: number } }> {
  const qs = new URLSearchParams()
  if (params?.type) qs.set('type', params.type)
  if (params?.page) qs.set('page', String(params.page))
  const result = await apiGet<{ orgs: OrgListItem[]; pagination: { total: number; pages: number } }>(`/api/admin/organisations${qs.toString() ? `?${qs}` : ''}`)
  return result.error ? { orgs: [], pagination: { total: 0, pages: 0 } } : result.data
}

export async function getAdminOrganisation(id: string): Promise<Organisation | null> {
  const result = await apiGet<Organisation>(`/api/admin/organisations/${id}`)
  return result.error ? null : result.data
}

export async function createOrganisation(data: Partial<Organisation>): Promise<Organisation | null> {
  const result = await apiPost<Organisation>('/api/organisations', data)
  return result.error ? null : result.data
}

export async function updateOrganisation(id: string, data: Partial<Organisation>): Promise<Organisation | null> {
  const result = await apiPatch<Organisation>(`/api/organisations/${id}`, data)
  return result.error ? null : result.data
}

export async function deleteOrganisation(id: string): Promise<boolean> {
  const result = await apiDelete(`/api/organisations/${id}`)
  return !result.error
}

export async function toggleOrgPublish(id: string, isPublished: boolean): Promise<boolean> {
  const result = await apiPatch(`/api/organisations/${id}/publish`, { isPublished })
  return !result.error
}

export async function createOpportunity(orgId: string, data: Partial<Opportunity>): Promise<Opportunity | null> {
  const result = await apiPost<Opportunity>(`/api/organisations/${orgId}/opportunities`, data)
  return result.error ? null : result.data
}

export async function updateOpportunity(orgId: string, oppId: string, data: Partial<Opportunity>): Promise<boolean> {
  const result = await apiPatch(`/api/organisations/${orgId}/opportunities/${oppId}`, data)
  return !result.error
}

export async function deleteOpportunity(orgId: string, oppId: string): Promise<boolean> {
  const result = await apiDelete(`/api/organisations/${orgId}/opportunities/${oppId}`)
  return !result.error
}

// ── Access grants ────────────────────────────────────────────────────────────

export async function getAccessGrants(filter?: { institutionId?: string; cohortId?: string; learnerId?: string }): Promise<AccessGrant[]> {
  const qs = new URLSearchParams()
  if (filter?.institutionId) qs.set('institutionId', filter.institutionId)
  if (filter?.cohortId)      qs.set('cohortId', filter.cohortId)
  if (filter?.learnerId)     qs.set('learnerId', filter.learnerId)
  const result = await apiGet<AccessGrant[]>(`/api/admin/access-grants${qs.toString() ? `?${qs}` : ''}`)
  return result.error ? [] : result.data
}

export interface CreateAccessGrantInput {
  parts: number[]
  learnerId?: string
  institutionId?: string
  cohortId?: string
  source?: string
  externalOrderId?: string
  notes?: string
}

export async function createAccessGrant(input: CreateAccessGrantInput): Promise<AccessGrant | null> {
  const result = await apiPost<AccessGrant>('/api/admin/access-grants', input)
  return result.error ? null : result.data
}

export async function revokeAccessGrant(id: string): Promise<boolean> {
  const result = await apiPatch(`/api/admin/access-grants/${id}/revoke`, {})
  return !result.error
}

export async function getCohorts(institutionId?: string): Promise<CohortSummary[]> {
  const qs = institutionId ? `?institutionId=${institutionId}` : ''
  const result = await apiGet<CohortSummary[]>(`/api/admin/cohorts${qs}`)
  return result.error ? [] : result.data
}

export interface BulkAccessGrantRow {
  email: string
  parts: number[]
}

export interface BulkAccessGrantResult {
  created: number
  failed: Array<{ email: string; reason: string }>
}

export async function createBulkAccessGrants(
  rows: BulkAccessGrantRow[],
  opts?: { source?: string; notes?: string; expiresAt?: string },
): Promise<BulkAccessGrantResult | null> {
  const result = await apiPost<BulkAccessGrantResult>('/api/admin/access-grants/bulk', { rows, ...opts })
  return result.error ? null : result.data
}

export async function searchLearnersByEmail(email: string): Promise<LearnerSearchResult[]> {
  if (!email.trim()) return []
  const result = await apiGet<LearnerSearchResult[]>(`/api/admin/learners/search?email=${encodeURIComponent(email)}`)
  return result.error ? [] : result.data
}

export async function getLearners(opts: { page?: number; pageSize?: number; q?: string } = {}): Promise<LearnerListPage | null> {
  const params = new URLSearchParams()
  if (opts.page)     params.set('page', String(opts.page))
  if (opts.pageSize) params.set('pageSize', String(opts.pageSize))
  if (opts.q?.trim()) params.set('q', opts.q.trim())
  const result = await apiGet<LearnerListPage>(`/api/admin/learners?${params.toString()}`)
  return result.error ? null : result.data
}

export async function getLearnerDetail(id: string): Promise<LearnerDetail | null> {
  const result = await apiGet<LearnerDetail>(`/api/admin/learners/${id}`)
  return result.error ? null : result.data
}

// Full, permanent removal — for a genuine mistake (wrong email, a stray
// test sign-up), not day-to-day access management. Unlike every other
// remove/revoke action in this app, this one really deletes the account;
// the platform still keeps a permanent record that this person once
// registered, in the Activity feed, independent of the account itself.
export async function deleteLearnerAccount(id: string): Promise<{ ok: boolean; error: string | null }> {
  const result = await apiDelete(`/api/admin/learners/${id}/account`)
  return result.error ? { ok: false, error: result.error.message } : { ok: true, error: null }
}

// ── Staff invites (institution/employer/rc-admin access, invite-only) ────────

export interface CreateStaffInviteInput {
  email: string
  firstName?: string
  lastName?: string
  role: StaffRole
  institutionId?: string
  employerId?: string
}

export async function getStaffInvites(filter?: { institutionId?: string; employerId?: string }): Promise<StaffInvite[]> {
  const qs = new URLSearchParams()
  if (filter?.institutionId) qs.set('institutionId', filter.institutionId)
  if (filter?.employerId) qs.set('employerId', filter.employerId)
  const result = await apiGet<StaffInvite[]>(`/api/admin/staff-invites${qs.toString() ? `?${qs}` : ''}`)
  return result.error ? [] : result.data
}

export async function createStaffInvite(input: CreateStaffInviteInput): Promise<{ data: StaffInvite | null; error: string | null }> {
  const result = await apiPost<StaffInvite>('/api/admin/staff-invites', input)
  return { data: result.error ? null : result.data, error: result.error?.message ?? null }
}

export async function revokeStaffInvite(id: string): Promise<{ ok: boolean; error: string | null }> {
  const result = await apiDelete(`/api/admin/staff-invites/${id}`)
  return result.error ? { ok: false, error: result.error.message } : { ok: true, error: null }
}

// ── Learner invites (add learner(s) via rc-admin, invite-by-email) ──────────
// Mirrors staff invites but for the one role that was previously fully
// self-service — see rc-api routes/learnerInvites.ts. Bundles institution/
// cohort/curriculum-parts into the invite itself, applied automatically the
// moment that email signs in to rc-learner (routes/auth.ts).
export interface CreateLearnerInviteInput {
  email: string
  firstName?: string
  lastName?: string
  institutionId?: string
  cohortId?: string
  parts?: number[]
}

export async function getLearnerInvites(filter?: { institutionId?: string }): Promise<LearnerInvite[]> {
  const qs = filter?.institutionId ? `?institutionId=${filter.institutionId}` : ''
  const result = await apiGet<LearnerInvite[]>(`/api/admin/learner-invites${qs}`)
  return result.error ? [] : result.data
}

export async function createLearnerInvite(input: CreateLearnerInviteInput): Promise<{ data: LearnerInvite | null; error: string | null }> {
  const result = await apiPost<LearnerInvite>('/api/admin/learner-invites', input)
  return { data: result.error ? null : result.data, error: result.error?.message ?? null }
}

export async function revokeLearnerInvite(id: string): Promise<{ ok: boolean; error: string | null }> {
  const result = await apiDelete(`/api/admin/learner-invites/${id}`)
  return result.error ? { ok: false, error: result.error.message } : { ok: true, error: null }
}

export interface BulkLearnerInviteResult {
  created: number
  failed: Array<{ email: string; reason: string }>
}

export interface BulkLearnerInviteRow {
  email: string
  firstName?: string
  lastName?: string
}

export async function createBulkLearnerInvites(
  rows: BulkLearnerInviteRow[],
  opts?: { institutionId?: string; cohortId?: string; parts?: number[] },
): Promise<BulkLearnerInviteResult | null> {
  const result = await apiPost<BulkLearnerInviteResult>('/api/admin/learner-invites/bulk', { rows, ...opts })
  return result.error ? null : result.data
}

// ── Bulk import from the Excel template ──────────────────────────────────
// One row per person, matching RC_Bulk_Add_People_Template.xlsx's columns —
// parsed client-side in the Learners page. Shared preview/commit endpoint:
// dryRun:true resolves and validates everything without writing anything,
// so the preview a staff member approves is guaranteed to match what a
// dryRun:false commit actually does.
export interface ImportRow {
  rowNumber: number
  email?: string
  firstName?: string
  surname?: string
  role?: string
  institution?: string
  newInstitutionName?: string
  cohort?: string
  newCohortName?: string
  newCohortDurationDays?: number
  curriculumAccess?: string
  notes?: string
}

export interface ImportRowFailure { row: number; email: string; reason: string }
export interface ImportPlannedInstitution { name: string; id: string }
export interface ImportPlannedCohort { name: string; institutionName: string; parts: number[]; accessDurationDays: number; id: string }

export interface ImportResult {
  dryRun: boolean
  institutionsCreated: ImportPlannedInstitution[]
  cohortsCreated: ImportPlannedCohort[]
  learnerInvitesCreated: number
  staffInvitesCreated: number
  failed: ImportRowFailure[]
}

export async function importPeople(rows: ImportRow[], dryRun: boolean): Promise<{ data: ImportResult | null; error: string | null }> {
  const result = await apiPost<ImportResult>('/api/admin/learner-invites/import', { rows, dryRun })
  return { data: result.error ? null : result.data, error: result.error?.message ?? null }
}

// ── People (unified staff directory) ─────────────────────────────────────────
// Merges AdminUser/InstitutionUser/EmployerUser (real, already-granted
// access) with any still-pending StaffInvite, keyed by email — see
// rc-api routes/people.ts. Replaces the old per-app scattered invite UI
// (Team page + institution/employer detail mini-forms) with the single
// "add once, configure per app, remove any time" surface.
export interface PersonPendingInvite {
  id: string
  role: StaffRole
  institutionName: string | null
  employerName: string | null
  createdAt: string
}

export interface Person {
  email: string
  displayName: string | null
  userId: string | null
  platformRole: 'admin' | 'coordinator' | null
  institution: { id: string; name: string; role: string } | null
  employer: { id: string; name: string; role: string } | null
  pending: PersonPendingInvite[]
}

export async function getPeople(): Promise<Person[]> {
  const result = await apiGet<Person[]>('/api/admin/people')
  return result.error ? [] : result.data
}

export async function removePlatformRole(userId: string): Promise<{ ok: boolean; error: string | null }> {
  const result = await apiDelete(`/api/admin/people/${userId}/platform-role`)
  return result.error ? { ok: false, error: result.error.message } : { ok: true, error: null }
}

export async function removeInstitutionAccess(userId: string): Promise<{ ok: boolean; error: string | null }> {
  const result = await apiDelete(`/api/admin/people/${userId}/institution`)
  return result.error ? { ok: false, error: result.error.message } : { ok: true, error: null }
}

export async function removeEmployerAccess(userId: string): Promise<{ ok: boolean; error: string | null }> {
  const result = await apiDelete(`/api/admin/people/${userId}/employer`)
  return result.error ? { ok: false, error: result.error.message } : { ok: true, error: null }
}
