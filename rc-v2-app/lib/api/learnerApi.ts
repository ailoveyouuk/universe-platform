import { apiGet, apiPost, apiPatch } from '@rc/api-client'
import type { Learner, Certificate, COLScore, SMStatus, CandidateProfile } from '@rc/types'

export interface LearnerAccess {
  parts: number[]
  grants: Array<{
    id: string
    parts: number[]
    source: string
    grantedAt: string
    expiresAt: string
    scope: 'learner' | 'institution' | 'cohort' | 'employer'
  }>
}

// Which curriculum parts this learner can currently study — the union of
// any individual purchase plus any sponsored access via their institution,
// cohort, or sponsoring employer. Drives what the dashboard shows as
// unlocked vs locked, and gates the actual sub-module content pages.
export async function getLearnerAccess(learnerId: string): Promise<LearnerAccess> {
  const result = await apiGet<LearnerAccess>(`/api/learners/${learnerId}/access`)
  return result.error || !result.data ? { parts: [], grants: [] } : result.data
}

export async function getLearner(learnerId: string): Promise<Learner | null> {
  const result = await apiGet<Learner>(`/api/learners/${learnerId}`)
  return result.error ? null : result.data
}

// Bootstraps (or fetches) this signed-in Azure AD account's User/Learner rows
// in Postgres and resolves the internal Learner.id — the id every other
// learnerApi.ts call needs, which is NOT the same as the Azure AD account id.
// Called once per sign-in by LearnerContext.
// Just what a learner-facing app needs to brand a page for their
// institution — mirrors InstitutionBrand in @rc/types.
export interface RegisteredInstitutionBrand {
  id: string
  name: string
  shortName: string
  primaryColor: string
  logoUrl: string | null
}

export async function registerLearner(data: {
  azureAdId: string
  email: string
  displayName: string
  role: string
}): Promise<{ userId: string; learnerId: string | null; isNewUser: boolean; institution: RegisteredInstitutionBrand | null } | null> {
  const result = await apiPost<{ id: string; learnerId: string | null; isNewUser?: boolean; institution?: RegisteredInstitutionBrand | null }>('/api/auth/register', data)
  if (result.error || !result.data) return null
  return {
    userId: result.data.id,
    learnerId: result.data.learnerId,
    isNewUser: result.data.isNewUser ?? false,
    institution: result.data.institution ?? null,
  }
}

// ── Invite-link redemption (institution/cohort self-serve enrolment) ────────

export interface InviteInfo {
  institutionName: string
  institutionType: 'ACADEMIC' | 'CORPORATE'
  cohortName: string
  parts: number[]
  accessDurationDays: number
  seatsRemaining: number | null
  full: boolean
}

// Public — no sign-in required — so /join can show "You're about to join
// <Institution>'s programme" before the student authenticates.
export async function getInviteInfo(code: string): Promise<{ data: InviteInfo | null; error: string | null }> {
  const result = await apiGet<InviteInfo>(`/api/invites/${code}`)
  return { data: result.data, error: result.error?.message ?? null }
}

export interface RedeemResult {
  alreadyRedeemed: boolean
  cohortName: string
  parts?: number[]
  expiresAt?: string
}

export async function redeemInvite(code: string): Promise<{ data: RedeemResult | null; error: string | null }> {
  const result = await apiPost<RedeemResult>(`/api/invites/${code}/redeem`, {})
  return { data: result.data, error: result.error?.message ?? null }
}

export async function updateSMProgress(
  learnerId: string,
  smId: number,
  data: { status?: SMStatus; startedAt?: string; completedAt?: string },
): Promise<boolean> {
  const result = await apiPatch<unknown>(`/api/learners/${learnerId}/progress/${smId}`, data)
  return !result.error
}

export async function submitCOLScore(
  learnerId: string,
  smId: number,
  score: number,
  maxScore: number,
): Promise<COLScore | null> {
  const percent = Math.round((score / maxScore) * 100)
  const result = await apiPost<COLScore>(
    `/api/learners/${learnerId}/progress/${smId}/col`,
    { score, maxScore, percent },
  )
  return result.error ? null : result.data
}

export async function getCertificates(learnerId: string): Promise<Certificate[]> {
  const result = await apiGet<Certificate[]>(`/api/learners/${learnerId}/certificates`)
  return result.error ? [] : result.data
}

export async function issueCertificate(
  learnerId: string,
  data: Omit<Certificate, 'id' | 'learnerId'>,
): Promise<Certificate | null> {
  const result = await apiPost<Certificate>(`/api/learners/${learnerId}/certificates`, data)
  return result.error ? null : result.data
}

export async function getCandidateProfile(learnerId: string): Promise<CandidateProfile | null> {
  const result = await apiGet<CandidateProfile>(`/api/learners/${learnerId}/profile`)
  return result.error ? null : result.data
}

export async function updateCandidateProfile(
  learnerId: string,
  data: Partial<CandidateProfile>,
): Promise<CandidateProfile | null> {
  const result = await apiPatch<CandidateProfile>(`/api/learners/${learnerId}/profile`, data)
  return result.error ? null : result.data
}
