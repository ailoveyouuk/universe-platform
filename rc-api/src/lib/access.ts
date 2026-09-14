import { prisma } from './prismaClient'
import { getSMMeta, SM_CURRICULUM } from './curriculum'

export interface AccessGrantSummary {
  id:        string
  parts:     number[]
  source:    string
  grantedAt: Date
  expiresAt: Date
  scope:     'learner' | 'institution' | 'cohort'
}

export interface LearnerAccess {
  parts:  number[]
  grants: AccessGrantSummary[]
}

export const ACCESS_GRANT_DAYS = 365

// Staff who need to see the curriculum to do their job get it unlocked by
// default, with no AccessGrant/purchase involved: RC's own team (QA, demos,
// there's no one who could "sponsor" RC's own access), plus institution
// admins/tutors (they administer or teach a cohort and need to see what
// they're assigning/teaching, independent of whether their institution has
// bought access yet). Employer staff are deliberately excluded — they work
// with candidates and roles, not course content, so they follow the normal
// AccessGrant rules like any other account. This is a real authorization
// rule, not a fake grant: checked on every call from the account's real
// role, and it never creates a row implying anyone purchased anything.
const STAFF_PREVIEW_ROLES = new Set([
  'rc_admin', 'rc_analyst', 'rc_support',
  'institution_admin', 'institution_tutor',
])

// A learner's unlocked curriculum parts are the union of every non-expired
// AccessGrant that applies to them: granted directly to their learner record
// (an individual purchase), or granted to their institution or specific
// cohort (sponsored access, inherited — not re-granted per learner). Both
// academic and corporate sponsors are Institution rows (Institution.type),
// so there is only ever one sponsorship path. Institution- and cohort-level
// grants both apply at once, since a cohort can be topped up beyond what
// its institution has.
export async function getLearnerAccess(learnerId: string): Promise<LearnerAccess> {
  const learner = await prisma.learner.findUnique({
    where: { id: learnerId },
    select: {
      institutionId: true,
      cohortId: true,
      user: {
        select: {
          role: true,
          // Checked in ADDITION to the legacy `role` string below, not
          // instead of it. `User.role` is only ever set at row creation
          // (see routes/auth.ts) — granting or changing staff access on an
          // ALREADY-existing User (the normal case: someone signs into
          // rc-learner once as a plain learner, then is made an RC
          // Coordinator/institution admin afterwards) updates AdminUser/
          // InstitutionUser via ensureOrgLink(), but never touches this
          // row's `role` column. Without checking the live relations too,
          // that person's `role` stays stuck at 'learner' forever and this
          // whole preview-unlock never fires for them, even though their
          // real access (AdminUser/InstitutionUser) is correctly in place.
          adminUser: { select: { role: true } },
          institutionUser: { select: { role: true } },
        },
      },
    },
  })
  if (!learner) return { parts: [], grants: [] }

  const isStaffPreview =
    STAFF_PREVIEW_ROLES.has(learner.user.role) ||
    learner.user.adminUser != null ||
    (learner.user.institutionUser != null && ['admin', 'tutor'].includes(learner.user.institutionUser.role))

  if (isStaffPreview) {
    const allParts = Array.from(new Set(SM_CURRICULUM.map(sm => sm.partNumber))).sort((a, b) => a - b)
    return { parts: allParts, grants: [] }
  }

  const orConditions: Array<{ learnerId?: string; institutionId?: string; cohortId?: string }> = [
    { learnerId },
  ]
  if (learner.institutionId) orConditions.push({ institutionId: learner.institutionId })
  if (learner.cohortId)      orConditions.push({ cohortId: learner.cohortId })

  const grants = await prisma.accessGrant.findMany({
    where:   { OR: orConditions, expiresAt: { gt: new Date() } },
    orderBy: { grantedAt: 'desc' },
  })

  const partsSet = new Set<number>()
  for (const g of grants) for (const p of g.parts) partsSet.add(p)

  return {
    parts: Array.from(partsSet).sort((a, b) => a - b),
    grants: grants.map(g => ({
      id:        g.id,
      parts:     g.parts,
      source:    g.source,
      grantedAt: g.grantedAt,
      expiresAt: g.expiresAt,
      scope: g.learnerId ? 'learner' : g.institutionId ? 'institution' : 'cohort',
    })),
  }
}

export function isSMUnlocked(smId: number, unlockedParts: number[]): boolean {
  const meta = getSMMeta(smId)
  if (!meta) return false
  return unlockedParts.includes(meta.partNumber)
}
