import type { FastifyInstance } from 'fastify'
import { requireGlobalWrite } from '../lib/auth'
import { prisma } from '../lib/prismaClient'
import { notifyNewLearner, notifyInstitutionStaff } from '../lib/notifications'

// Invite-by-email provisioning for learners — the admin-side equivalent of
// StaffInvite (see routes/staffInvites.ts), scoped to the one role that was
// previously fully self-service. There is no way to synchronously "create" a
// learner: a real Learner row requires a real Azure AD identity, which only
// exists once that person actually signs in. So this just records intent —
// email, and optionally the institution/cohort/curriculum parts an admin
// wants applied — and routes/auth.ts's register() redeems it (creating the
// Learner, applying institutionId/cohortId, and granting an AccessGrant for
// any parts) the moment that email signs in to rc-learner.
export async function learnerInviteRoutes(app: FastifyInstance) {
  app.get('/api/admin/learner-invites', { preHandler: requireGlobalWrite }, async (request) => {
    const query = request.query as { institutionId?: string }
    const invites = await prisma.learnerInvite.findMany({
      where: { institutionId: query.institutionId ?? undefined },
      orderBy: { createdAt: 'desc' },
    })

    // Shape in institution/cohort names for display — the invite itself
    // only stores ids (loose references, same as StaffInvite), so the
    // frontend would otherwise have to cross-reference these itself.
    const instIds = [...new Set(invites.map(i => i.institutionId).filter((x): x is string => !!x))]
    const cohortIds = [...new Set(invites.map(i => i.cohortId).filter((x): x is string => !!x))]
    const [insts, cohorts] = await Promise.all([
      instIds.length   ? prisma.institution.findMany({ where: { id: { in: instIds } }, select: { id: true, name: true } })   : Promise.resolve([]),
      cohortIds.length ? prisma.cohort.findMany({ where: { id: { in: cohortIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    ])
    const instName   = (id: string | null) => (id ? insts.find(i => i.id === id)?.name ?? null : null)
    const cohortName = (id: string | null) => (id ? cohorts.find(c => c.id === id)?.name ?? null : null)

    const shaped = invites.map(inv => ({
      ...inv,
      institutionName: instName(inv.institutionId),
      cohortName:      cohortName(inv.cohortId),
    }))
    return { data: shaped, error: null }
  })

  app.post('/api/admin/learner-invites', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const body = request.body as {
      email?: string; firstName?: string; lastName?: string; institutionId?: string; cohortId?: string; parts?: number[]
    }
    const email = body.email?.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      return reply.code(400).send({ error: { code: 'INVALID_INVITE', message: 'A valid email is required', statusCode: 400 } })
    }
    if (body.cohortId && !body.institutionId) {
      return reply.code(400).send({ error: { code: 'INVALID_INVITE', message: 'institutionId is required when cohortId is set', statusCode: 400 } })
    }

    // A cohort defines its own parts/accessDurationDays (see routes/auth.ts's
    // provisionLearner) — any parts the caller passed alongside a cohortId
    // are ignored and never stored, so the invite can't drift from what the
    // cohort actually grants. parts is only meaningful for a cohort-less
    // invite (institution-only or fully unsponsored).
    let cohortId: string | null = null
    if (body.cohortId) {
      const cohort = await prisma.cohort.findUnique({ where: { id: body.cohortId } })
      if (!cohort || cohort.institutionId !== body.institutionId) {
        return reply.code(400).send({ error: { code: 'INVALID_COHORT', message: 'Cohort not found for this institution', statusCode: 400 } })
      }
      cohortId = cohort.id
    }
    const parts = cohortId ? [] : (body.parts ?? [])
    if (!Array.isArray(parts) || !parts.every(p => [1, 2, 3].includes(p))) {
      return reply.code(400).send({ error: { code: 'INVALID_INVITE', message: 'parts must only contain 1, 2 and/or 3', statusCode: 400 } })
    }

    const existingLearner = await prisma.learner.findFirst({ where: { user: { email } } })
    if (existingLearner) {
      return reply.code(409).send({ error: { code: 'ALREADY_A_LEARNER', message: `${email} is already a registered learner — use Access Grants to change their access instead.`, statusCode: 409 } })
    }
    const alreadyInvited = await prisma.learnerInvite.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, redeemedAt: null } })
    if (alreadyInvited) {
      return reply.code(409).send({ error: { code: 'ALREADY_INVITED', message: `${email} already has a pending learner invite`, statusCode: 409 } })
    }

    const invite = await prisma.learnerInvite.create({
      data: {
        email,
        firstName: body.firstName?.trim() || null,
        lastName: body.lastName?.trim() || null,
        institutionId: body.institutionId ?? null,
        cohortId,
        parts,
        invitedByName: request.rcUser?.displayName ?? null,
      },
    })

    // Onboarding emails - best-effort, never blocks the response (see
    // lib/email.ts). A cohort-linked invite gets its access/duration FROM
    // the cohort; a cohort-less invite uses `parts` directly.
    if (invite.institutionId) {
      const institution = await prisma.institution.findUnique({ where: { id: invite.institutionId }, select: { name: true } })
      const cohort = invite.cohortId ? await prisma.cohort.findUnique({ where: { id: invite.cohortId } }) : null
      if (institution) {
        await notifyNewLearner({
          email: invite.email,
          firstName: invite.firstName,
          institutionId: invite.institutionId,
          institutionName: institution.name,
          cohortName: cohort?.name ?? null,
          parts: cohort?.parts ?? invite.parts,
          cohortAccessDurationDays: cohort?.accessDurationDays ?? null,
        })
        await notifyInstitutionStaff({ institutionId: invite.institutionId, institutionName: institution.name, newLearnerCount: 1 })
      }
    } else {
      await notifyNewLearner({ email: invite.email, firstName: invite.firstName, parts: invite.parts })
    }

    reply.code(201)
    return { data: invite, error: null }
  })

  app.delete('/api/admin/learner-invites/:id', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const invite = await prisma.learnerInvite.findUnique({ where: { id } })
    if (!invite) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Invite not found', statusCode: 404 } })
    if (invite.redeemedAt) return reply.code(409).send({ error: { code: 'ALREADY_REDEEMED', message: 'This invite has already been redeemed and can no longer be revoked', statusCode: 409 } })
    await prisma.learnerInvite.delete({ where: { id } })
    return { data: { ok: true }, error: null }
  })

  // Bulk variant — mirrors POST /api/admin/access-grants/bulk's per-row
  // independence (one bad row never blocks the rest) and 500-row cap.
  app.post('/api/admin/learner-invites/bulk', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const body = request.body as {
      emails?: string[]
      rows?: { email?: string; firstName?: string; lastName?: string }[]
      institutionId?: string; cohortId?: string; parts?: number[]
    }
    // `rows` (with optional per-person firstName/lastName) is preferred —
    // `emails` is kept for backward compatibility with older callers that
    // only ever sent plain addresses.
    const inputRows: { email: string; firstName?: string; lastName?: string }[] =
      Array.isArray(body.rows) && body.rows.length > 0
        ? body.rows.map(r => ({ email: r.email ?? '', firstName: r.firstName, lastName: r.lastName }))
        : (body.emails ?? []).map(e => ({ email: e }))
    if (inputRows.length === 0) {
      return reply.code(400).send({ error: { code: 'INVALID_ROWS', message: 'emails must be a non-empty array', statusCode: 400 } })
    }
    if (inputRows.length > 500) {
      return reply.code(400).send({ error: { code: 'TOO_MANY_ROWS', message: 'bulk import is capped at 500 rows per request', statusCode: 400 } })
    }
    if (body.cohortId && !body.institutionId) {
      return reply.code(400).send({ error: { code: 'INVALID_INVITE', message: 'institutionId is required when cohortId is set', statusCode: 400 } })
    }

    let cohortId: string | null = null
    if (body.cohortId) {
      const cohort = await prisma.cohort.findUnique({ where: { id: body.cohortId } })
      if (!cohort || cohort.institutionId !== body.institutionId) {
        return reply.code(400).send({ error: { code: 'INVALID_COHORT', message: 'Cohort not found for this institution', statusCode: 400 } })
      }
      cohortId = cohort.id
    }
    const parts = cohortId ? [] : (body.parts ?? [])
    if (!Array.isArray(parts) || !parts.every(p => [1, 2, 3].includes(p))) {
      return reply.code(400).send({ error: { code: 'INVALID_INVITE', message: 'parts must only contain 1, 2 and/or 3', statusCode: 400 } })
    }

    const created: Array<{ email: string; id: string; firstName: string | null }> = []
    const failed: Array<{ email: string; reason: string }> = []

    for (const row of inputRows) {
      const email = (row.email ?? '').trim().toLowerCase()
      if (!email || !email.includes('@')) { failed.push({ email: row.email ?? '', reason: 'invalid email' }); continue }

      const existingLearner = await prisma.learner.findFirst({ where: { user: { email } } })
      if (existingLearner) { failed.push({ email, reason: 'already a registered learner' }); continue }
      const alreadyInvited = await prisma.learnerInvite.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, redeemedAt: null } })
      if (alreadyInvited) { failed.push({ email, reason: 'already has a pending invite' }); continue }

      const firstName = row.firstName?.trim() || null
      const lastName = row.lastName?.trim() || null
      const invite = await prisma.learnerInvite.create({
        data: {
          email,
          firstName,
          lastName,
          institutionId: body.institutionId ?? null,
          cohortId,
          parts,
          invitedByName: request.rcUser?.displayName ?? null,
        },
      })
      created.push({ email, id: invite.id, firstName })
    }

    // Onboarding emails - one welcome email per learner created, plus ONE
    // summary email per institution staff member covering the whole batch
    // (never one staff email per learner - see lib/notifications.ts).
    if (created.length > 0) {
      const institution = body.institutionId
        ? await prisma.institution.findUnique({ where: { id: body.institutionId }, select: { name: true } })
        : null
      const cohort = cohortId ? await prisma.cohort.findUnique({ where: { id: cohortId } }) : null

      for (const c of created) {
        if (institution) {
          await notifyNewLearner({
            email: c.email,
            firstName: c.firstName,
            institutionId: body.institutionId,
            institutionName: institution.name,
            cohortName: cohort?.name ?? null,
            parts: cohort?.parts ?? parts,
            cohortAccessDurationDays: cohort?.accessDurationDays ?? null,
          })
        } else {
          await notifyNewLearner({ email: c.email, firstName: c.firstName, parts })
        }
      }
      if (institution && body.institutionId) {
        await notifyInstitutionStaff({ institutionId: body.institutionId, institutionName: institution.name, newLearnerCount: created.length })
      }
    }

    return { data: { created: created.length, failed }, error: null }
  })
}
