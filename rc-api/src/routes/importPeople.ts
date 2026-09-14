import type { FastifyInstance } from 'fastify'
import { requireGlobalWrite } from '../lib/auth'
import { prisma } from '../lib/prismaClient'
import { ACCESS_GRANT_DAYS } from '../lib/access'
import { generateUniqueInviteCode } from '../lib/inviteCode'
import { notifyNewLearner, notifyInstitutionStaff } from '../lib/notifications'

// Bulk import from the "RC_Bulk_Add_People_Template.xlsx" spreadsheet — RC
// staff parse the file client-side (rc-admin) into rows matching this shape
// and POST them here, either as a dry run (dryRun: true — resolves and
// validates everything, creates nothing, just reports what WOULD happen) or
// for real. Both modes share this exact same resolution logic so the
// preview a staff member approves is guaranteed to match what actually
// happens on commit — the only difference is whether prisma.create() calls
// are real or replayed as no-ops with placeholder ids.

const NEW_INSTITUTION_LABEL = '— New institution (name it in the column to the right) —'
const NO_INSTITUTION_LABEL = '(no institution — unsponsored learner)'

const ROLE_MAP: Record<string, 'learner' | 'institution_admin' | 'institution_tutor'> = {
  'Learner': 'learner',
  'Institution Admin': 'institution_admin',
  'Institution Tutor': 'institution_tutor',
}

const ACCESS_MAP: Record<string, number[]> = {
  'None': [],
  'Part 1': [1],
  'Part 2': [2],
  'Part 3': [3],
  'Part 1 + 2': [1, 2],
  'Part 1 + 3': [1, 3],
  'Part 2 + 3': [2, 3],
  'All (Part 1 + 2 + 3)': [1, 2, 3],
}

interface ImportRow {
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

interface RowFailure { row: number; email: string; reason: string }
interface PlannedInstitution { name: string; id: string }
interface PlannedCohort { name: string; institutionName: string; institutionId: string; parts: number[]; accessDurationDays: number; id: string }

function deriveShortName(name: string): string {
  const stop = new Set(['the', 'of', 'and', 'for', 'a', 'an', '&'])
  const words = name.replace(/[^A-Za-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  const initials = words.filter(w => !stop.has(w.toLowerCase())).map(w => w[0]!.toUpperCase()).join('')
  return (initials.length >= 2 ? initials : name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4) || 'INST').slice(0, 10)
}

export async function importPeopleRoutes(app: FastifyInstance) {
  app.post('/api/admin/learner-invites/import', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const body = request.body as { rows?: ImportRow[]; dryRun?: boolean }
    const dryRun = body.dryRun !== false // default true — an explicit dryRun:false is required to actually create anything
    const rows = (body.rows ?? []).filter(r =>
      (r.email ?? '').trim() || (r.institution ?? '').trim() || (r.newInstitutionName ?? '').trim()
    )
    if (rows.length === 0) {
      return reply.code(400).send({ error: { code: 'INVALID_ROWS', message: 'No usable rows found in the file.', statusCode: 400 } })
    }
    if (rows.length > 500) {
      return reply.code(400).send({ error: { code: 'TOO_MANY_ROWS', message: `${rows.length} rows — import is capped at 500 at a time. Split into batches.`, statusCode: 400 } })
    }

    const failed: RowFailure[] = []
    const fail = (row: ImportRow, reason: string) => failed.push({ row: row.rowNumber, email: row.email ?? '', reason })

    // ── Institutions: resolve existing (case-insensitive), plan/create new ──
    const existingInstitutions = await prisma.institution.findMany({ select: { id: true, name: true } })
    const institutionIdByName = new Map<string, string>(existingInstitutions.map(i => [i.name.trim().toLowerCase(), i.id]))
    const plannedInstitutions: PlannedInstitution[] = []

    const newInstitutionGroups = new Map<string, ImportRow[]>()
    for (const row of rows) {
      if ((row.institution ?? '').trim() === NEW_INSTITUTION_LABEL) {
        const name = (row.newInstitutionName ?? '').trim()
        if (!name) { fail(row, 'Institution is "New institution" but New institution name is blank'); continue }
        const key = name.toLowerCase()
        if (!newInstitutionGroups.has(key)) newInstitutionGroups.set(key, [])
        newInstitutionGroups.get(key)!.push(row)
      }
    }
    for (const [key, groupRows] of newInstitutionGroups) {
      const name = (groupRows[0].newInstitutionName ?? '').trim()
      // A row can ask for a "new" institution that was actually created by
      // an earlier row/import already, or matches something that already
      // exists under that exact name — reuse it rather than creating a
      // second institution with the same name.
      const existingId = institutionIdByName.get(key)
      if (existingId) {
        for (const row of groupRows) row.institution = name // fall through to the normal existing-institution lookup below
        continue
      }
      const id = dryRun ? `NEW_INSTITUTION:${key}` : (await prisma.institution.create({
        data: { name, shortName: deriveShortName(name), type: 'ACADEMIC' },
      })).id
      institutionIdByName.set(key, id)
      plannedInstitutions.push({ name, id })
    }

    function resolveInstitutionId(row: ImportRow): { ok: true; id: string | null } | { ok: false } {
      const raw = (row.institution ?? '').trim()
      if (!raw || raw === NO_INSTITUTION_LABEL) return { ok: true, id: null }
      const id = institutionIdByName.get(raw.toLowerCase())
      if (!id) return { ok: false }
      return { ok: true, id }
    }

    // ── Cohorts: resolve existing (scoped to institution), plan/create new ──
    const cohortIdByInstAndName = new Map<string, string>() // key: `${institutionId}::${lowercased name}`
    const existingCohorts = await prisma.cohort.findMany({ select: { id: true, name: true, institutionId: true, parts: true, accessDurationDays: true } })
    const cohortCountByInstAndName = new Map<string, number>()
    for (const c of existingCohorts) {
      const key = `${c.institutionId}::${c.name.trim().toLowerCase()}`
      cohortCountByInstAndName.set(key, (cohortCountByInstAndName.get(key) ?? 0) + 1)
      if (!cohortIdByInstAndName.has(key)) cohortIdByInstAndName.set(key, c.id) // first match only — ambiguity checked below
    }
    const plannedCohorts: PlannedCohort[] = []

    const newCohortGroups = new Map<string, { row: ImportRow; institutionId: string }[]>()
    const rowInstitutionId = new Map<ImportRow, string | null>()
    for (const row of rows) {
      const resolved = resolveInstitutionId(row)
      if (!resolved.ok) continue // institution errors are reported in the main pass below
      rowInstitutionId.set(row, resolved.id)
      const newCohortName = (row.newCohortName ?? '').trim()
      if (newCohortName) {
        if (!resolved.id) { continue } // reported below — a new cohort needs a real institution
        const key = `${resolved.id}::${newCohortName.toLowerCase()}`
        if (!newCohortGroups.has(key)) newCohortGroups.set(key, [])
        newCohortGroups.get(key)!.push({ row, institutionId: resolved.id })
      }
    }
    for (const [key, groupRows] of newCohortGroups) {
      const { row: firstRow, institutionId } = groupRows[0]
      const name = (firstRow.newCohortName ?? '').trim()
      if (cohortIdByInstAndName.has(key)) { continue } // already exists under this institution — falls through to normal lookup
      const accessLabel = (firstRow.curriculumAccess ?? '').trim()
      const parts = ACCESS_MAP[accessLabel]
      if (!parts || parts.length === 0) {
        for (const { row } of groupRows) fail(row, `New cohort "${name}" needs a Curriculum access value (on the first row that defines it)`)
        continue
      }
      const duration = firstRow.newCohortDurationDays && firstRow.newCohortDurationDays > 0 ? Math.round(firstRow.newCohortDurationDays) : ACCESS_GRANT_DAYS
      const instName = existingInstitutions.find(i => i.id === institutionId)?.name
        ?? plannedInstitutions.find(i => i.id === institutionId)?.name ?? '(unknown)'
      const id = dryRun ? `NEW_COHORT:${key}` : (await prisma.cohort.create({
        data: { institutionId, name, startDate: new Date(), parts, accessDurationDays: duration, inviteCode: await generateUniqueInviteCode() },
      })).id
      cohortIdByInstAndName.set(key, id)
      plannedCohorts.push({ name, institutionName: instName, institutionId, parts, accessDurationDays: duration, id })
    }

    function resolveCohortId(row: ImportRow, institutionId: string | null): { ok: true; id: string | null } | { ok: false; reason: string } {
      const newCohortName = (row.newCohortName ?? '').trim()
      if (newCohortName) {
        if (!institutionId) return { ok: false, reason: 'New cohort needs an institution — pick one, or add it via New institution name' }
        const key = `${institutionId}::${newCohortName.toLowerCase()}`
        const id = cohortIdByInstAndName.get(key)
        return id ? { ok: true, id } : { ok: false, reason: `Could not resolve new cohort "${newCohortName}"` }
      }
      const existingName = (row.cohort ?? '').trim()
      if (!existingName) return { ok: true, id: null }
      if (!institutionId) return { ok: false, reason: 'Cohort given but no institution to look it up under' }
      const key = `${institutionId}::${existingName.toLowerCase()}`
      const count = cohortCountByInstAndName.get(key) ?? 0
      if (count === 0) return { ok: false, reason: `No cohort named "${existingName}" found for this institution` }
      if (count > 1) return { ok: false, reason: `More than one cohort is named "${existingName}" for this institution — rename one, or use Access Grants after creating the invite` }
      return { ok: true, id: cohortIdByInstAndName.get(key)! }
    }

    // ── Per-row creation ──────────────────────────────────────────────────
    let learnerInvitesCreated = 0
    let staffInvitesCreated = 0

    // Notification bookkeeping — real sends only (never during a dry-run
    // preview). Learner welcome emails go out individually as each row is
    // created; staff notifications are batched to ONE summary email per
    // institution, sent after the whole import finishes (see
    // lib/notifications.ts) rather than one per row.
    const institutionNameById = new Map<string, string>([
      ...existingInstitutions.map(i => [i.id, i.name] as const),
      ...plannedInstitutions.map(i => [i.id, i.name] as const),
    ])
    const cohortInfoById = new Map<string, { name: string; parts: number[]; accessDurationDays: number }>([
      ...existingCohorts.map(c => [c.id, { name: c.name, parts: c.parts, accessDurationDays: c.accessDurationDays }] as const),
      ...plannedCohorts.map(c => [c.id, { name: c.name, parts: c.parts, accessDurationDays: c.accessDurationDays }] as const),
    ])
    const newStaffByInstitution = new Map<string, { email: string; role: string }[]>()
    const newLearnerCountByInstitution = new Map<string, number>()

    for (const row of rows) {
      const email = (row.email ?? '').trim().toLowerCase()
      if (!email || !email.includes('@')) { fail(row, 'Missing or invalid email'); continue }

      const roleKey = (row.role ?? '').trim()
      const role = ROLE_MAP[roleKey]
      if (!role) { fail(row, `Role must be Learner, Institution Admin or Institution Tutor (got "${roleKey || '(blank)'}")`); continue }

      const instResolved = resolveInstitutionId(row)
      if (!instResolved.ok) { fail(row, `Institution "${row.institution}" doesn't match any existing institution, and isn't "${NEW_INSTITUTION_LABEL}" or "${NO_INSTITUTION_LABEL}"`); continue }
      const institutionId = instResolved.id

      const cohortResolved = resolveCohortId(row, institutionId)
      if (!cohortResolved.ok) { fail(row, cohortResolved.reason); continue }
      const cohortId = cohortResolved.id

      if (role === 'learner') {
        const existingLearner = await prisma.learner.findFirst({ where: { user: { email } } })
        if (existingLearner) { fail(row, 'Already a registered learner'); continue }
        const alreadyInvited = await prisma.learnerInvite.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, redeemedAt: null } })
        if (alreadyInvited) { fail(row, 'Already has a pending learner invite'); continue }

        const parts = cohortId ? [] : (ACCESS_MAP[(row.curriculumAccess ?? '').trim()] ?? [])
        if (!dryRun) {
          await prisma.learnerInvite.create({
            data: { email, firstName: row.firstName?.trim() || null, lastName: row.surname?.trim() || null, institutionId, cohortId, parts, invitedByName: request.rcUser?.displayName ?? null },
          })
          const cohortInfo = cohortId ? cohortInfoById.get(cohortId) : undefined
          await notifyNewLearner({
            email,
            firstName: row.firstName?.trim() || null,
            institutionId,
            institutionName: institutionId ? (institutionNameById.get(institutionId) ?? null) : null,
            cohortName: cohortInfo?.name ?? null,
            parts: cohortInfo?.parts ?? parts,
            cohortAccessDurationDays: cohortInfo?.accessDurationDays ?? null,
          })
          if (institutionId) {
            newLearnerCountByInstitution.set(institutionId, (newLearnerCountByInstitution.get(institutionId) ?? 0) + 1)
          }
        }
        learnerInvitesCreated++
      } else {
        if (!institutionId) { fail(row, `${roleKey} rows need an institution`); continue }
        const alreadyInvited = await prisma.staffInvite.findFirst({
          where: { email: { equals: email, mode: 'insensitive' }, redeemedAt: null, role, institutionId },
        })
        if (alreadyInvited) { fail(row, 'Already has a pending staff invite for this exact role/institution'); continue }
        if (!dryRun) {
          await prisma.staffInvite.create({
            data: { email, firstName: row.firstName?.trim() || null, lastName: row.surname?.trim() || null, role, institutionId, invitedByName: request.rcUser?.displayName ?? null },
          })
          if (!newStaffByInstitution.has(institutionId)) newStaffByInstitution.set(institutionId, [])
          newStaffByInstitution.get(institutionId)!.push({ email, role })
        }
        staffInvitesCreated++
      }
    }

    if (!dryRun) {
      const touchedInstitutionIds = new Set<string>([
        ...newStaffByInstitution.keys(),
        ...newLearnerCountByInstitution.keys(),
        ...plannedCohorts.map(c => c.institutionId),
      ])
      for (const institutionId of touchedInstitutionIds) {
        const institutionName = institutionNameById.get(institutionId)
        if (!institutionName) continue
        await notifyInstitutionStaff({
          institutionId,
          institutionName,
          newStaff: newStaffByInstitution.get(institutionId) ?? [],
          newLearnerCount: newLearnerCountByInstitution.get(institutionId) ?? 0,
          newCohorts: plannedCohorts
            .filter(c => c.institutionId === institutionId)
            .map(c => ({ name: c.name, parts: c.parts, accessDurationDays: c.accessDurationDays })),
        })
      }
    }

    return {
      data: {
        dryRun,
        institutionsCreated: plannedInstitutions,
        cohortsCreated: plannedCohorts,
        learnerInvitesCreated,
        staffInvitesCreated,
        failed,
      },
      error: null,
    }
  })
}
