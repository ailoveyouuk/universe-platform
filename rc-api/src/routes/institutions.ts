import type { FastifyInstance } from 'fastify'
import { requireInstitutionScope } from '../lib/auth'
import { prisma } from '../lib/prismaClient'
import { getLearnerAccess, ACCESS_GRANT_DAYS } from '../lib/access'
import { SM_CURRICULUM } from '../lib/curriculum'
import { generateUniqueInviteCode } from '../lib/inviteCode'
import { config } from '../config'
import { notifyNewLearner, notifyInstitutionStaff } from '../lib/notifications'

export async function institutionRoutes(app: FastifyInstance) {
  app.get('/api/institutions/:id', { preHandler: requireInstitutionScope('id') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const inst = await prisma.institution.findUnique({ where: { id }, include: { cohorts: true } })
    if (!inst) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Institution not found', statusCode: 404 } })
    return { data: inst, error: null }
  })

  // Shaped to match rc-institution's Student type: name/email pulled off the
  // related User (Learner itself has neither), smProgress re-keyed from the
  // Prisma array into a Record<smId, SMProgress> the roster UI indexes by
  // sub-module id, and unlockedParts added from the same union-of-grants
  // logic the learner app itself uses (learner + institution + cohort
  // grants) so a sponsor can see access level alongside progress.
  app.get('/api/institutions/:id/students', { preHandler: requireInstitutionScope('id') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const learners = await prisma.learner.findMany({
      where: { institutionId: id },
      include: {
        user: { select: { displayName: true, email: true } },
        smProgress: { include: { colScore: true } },
      },
    })

    const students = await Promise.all(learners.map(async learner => {
      const access = await getLearnerAccess(learner.id)

      const smProgress: Record<string, {
        smId: number; smSlug: string; smTitle: string; partNumber: number
        status: string; startedAt: string | null; completedAt: string | null
        colScore: { score: number; maxScore: number; percent: number; attempts: number; lastAttemptAt: string } | null
      }> = {}
      for (const p of learner.smProgress) {
        smProgress[String(p.smId)] = {
          smId: p.smId,
          smSlug: p.smSlug,
          smTitle: p.smTitle,
          partNumber: p.partNumber,
          status: p.status,
          startedAt: p.startedAt?.toISOString() ?? null,
          completedAt: p.completedAt?.toISOString() ?? null,
          colScore: p.colScore
            ? {
                score: p.colScore.score,
                maxScore: p.colScore.maxScore,
                percent: p.colScore.percent,
                attempts: p.colScore.attempts,
                lastAttemptAt: p.colScore.lastAttemptAt.toISOString(),
              }
            : null,
        }
      }

      return {
        id: learner.id,
        name: learner.user.displayName || learner.user.email,
        email: learner.user.email,
        cohortId: learner.cohortId ?? '',
        enrolledAt: learner.enrolledAt.toISOString(),
        lastActiveAt: learner.lastActiveAt?.toISOString() ?? null,
        smProgress,
        unlockedParts: access.parts,
      }
    }))

    return { data: students, error: null }
  })

  app.get('/api/institutions/:id/cohorts', { preHandler: requireInstitutionScope('id') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const cohorts = await prisma.cohort.findMany({
      where: { institutionId: id },
      include: { learners: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    })
    const shaped = cohorts.map(c => ({
      id: c.id,
      name: c.name,
      institutionId: c.institutionId,
      startDate: c.startDate.toISOString(),
      studentIds: c.learners.map(l => l.id),
      // Added so the self-service "Add learners" page can show what a
      // cohort actually grants and for how long, and so access can be
      // driven purely by cohort choice rather than a separate parts
      // picker — see routes/auth.ts's provisionLearner.
      parts: c.parts,
      accessDurationDays: c.accessDurationDays,
      seatCap: c.seatCap,
      learnersRedeemed: c.learners.length,
      seatsRemaining: c.seatCap != null ? Math.max(0, c.seatCap - c.learners.length) : null,
    }))
    return { data: shaped, error: null }
  })

  // Self-service cohort creation — an institution creating its own cohort
  // (name, duration, optional seat cap) rather than needing RC staff to do
  // it in rc-admin first. The one thing that isn't free to choose is
  // curriculum access: parts must stay inside the institution's own
  // contractedParts ceiling, exactly like the bulk learner-invite route
  // above — same reasoning, same guard, just applied at cohort-creation
  // time instead of invite time (which is when it now actually matters,
  // since access is sourced from the cohort — see routes/auth.ts).
  app.post('/api/institutions/:id/cohorts', { preHandler: requireInstitutionScope('id') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as {
      name?: string; parts?: number[]; accessDurationDays?: number; seatCap?: number | null
    }

    const institution = await prisma.institution.findUnique({ where: { id } })
    if (!institution) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Institution not found', statusCode: 404 } })
    }
    if (!institution.selfServiceEnabled) {
      return reply.code(403).send({
        error: {
          code: 'SELF_SERVICE_DISABLED',
          message: "Self-service isn't switched on for your institution yet — ask your Renewables Connect contact to enable it.",
          statusCode: 403,
        },
      })
    }
    if (!body.name?.trim()) {
      return reply.code(400).send({ error: { code: 'INVALID_COHORT', message: 'Give the cohort a name', statusCode: 400 } })
    }
    const parts = body.parts ?? []
    if (!Array.isArray(parts) || parts.length === 0 || !parts.every(p => [1, 2, 3].includes(p))) {
      return reply.code(400).send({ error: { code: 'INVALID_PARTS', message: 'parts must be a non-empty array of 1, 2 and/or 3', statusCode: 400 } })
    }
    if (!parts.every(p => institution.contractedParts.includes(p))) {
      return reply.code(403).send({
        error: {
          code: 'PARTS_EXCEED_CONTRACT',
          message: institution.contractedParts.length > 0
            ? `Your institution can only grant: ${institution.contractedParts.map(p => `Part ${p}`).join(', ')}.`
            : 'Your institution has no curriculum access configured yet — ask your Renewables Connect contact.',
          statusCode: 403,
        },
      })
    }
    if (body.seatCap != null && (!Number.isInteger(body.seatCap) || body.seatCap < 1)) {
      return reply.code(400).send({ error: { code: 'INVALID_SEAT_CAP', message: 'seatCap must be a positive integer, or omitted for unlimited', statusCode: 400 } })
    }
    if (body.accessDurationDays != null && (!Number.isInteger(body.accessDurationDays) || body.accessDurationDays < 1)) {
      return reply.code(400).send({ error: { code: 'INVALID_DURATION', message: 'accessDurationDays must be a positive integer', statusCode: 400 } })
    }

    const inviteCode = await generateUniqueInviteCode()
    const cohort = await prisma.cohort.create({
      data: {
        institutionId: id,
        name: body.name.trim(),
        startDate: new Date(),
        parts,
        accessDurationDays: body.accessDurationDays ?? ACCESS_GRANT_DAYS,
        seatCap: body.seatCap ?? null,
        inviteCode,
      },
    })

    await notifyInstitutionStaff({
      institutionId: id,
      institutionName: institution.name,
      newCohorts: [{ name: cohort.name, parts: cohort.parts, accessDurationDays: cohort.accessDurationDays }],
    })

    reply.code(201)
    return {
      data: {
        id: cohort.id,
        name: cohort.name,
        institutionId: cohort.institutionId,
        startDate: cohort.startDate.toISOString(),
        studentIds: [] as string[],
        parts: cohort.parts,
        accessDurationDays: cohort.accessDurationDays,
        seatCap: cohort.seatCap,
        learnersRedeemed: 0,
        seatsRemaining: cohort.seatCap,
        inviteUrl: `${config.learnerAppUrl}/join?code=${cohort.inviteCode}`,
      },
      error: null,
    }
  })

  app.get('/api/institutions/:id/stats', { preHandler: requireInstitutionScope('id') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const [totalStudents, activeStudents, colAggregate, allCompleted, smProgressRows] = await Promise.all([
      prisma.learner.count({ where: { institutionId: id } }),
      prisma.learner.count({ where: { institutionId: id, lastActiveAt: { gte: thirtyDaysAgo } } }),
      prisma.cOLScore.aggregate({ _avg: { percent: true }, where: { smProgress: { learner: { institutionId: id } } } }),
      prisma.sMProgress.count({ where: { learner: { institutionId: id }, status: 'completed' } }),
      // Per-SM breakdown this institution's own dashboard renders (attempted
      // vs completed counts, avg COL score) — was missing entirely, which
      // crashed every chart on the dashboard that reads stats.smStats the
      // moment an institution had any real learner activity to show.
      prisma.sMProgress.findMany({
        where: { learner: { institutionId: id }, status: { in: ['in_progress', 'completed'] } },
        include: { colScore: { select: { percent: true } } },
      }),
    ])
    const totalPossible = totalStudents * 15

    const bySmId = new Map<number, { attempted: number; completed: number; colSum: number; colCount: number }>()
    for (const row of smProgressRows) {
      const entry = bySmId.get(row.smId) ?? { attempted: 0, completed: 0, colSum: 0, colCount: 0 }
      entry.attempted += 1
      if (row.status === 'completed') entry.completed += 1
      if (row.colScore) { entry.colSum += row.colScore.percent; entry.colCount += 1 }
      bySmId.set(row.smId, entry)
    }
    const smStats = SM_CURRICULUM
      .filter(sm => bySmId.has(sm.id))
      .map(sm => {
        const entry = bySmId.get(sm.id)!
        return {
          smId: sm.id,
          smTitle: sm.title,
          partNumber: sm.partNumber,
          studentsAttempted: entry.attempted,
          studentsCompleted: entry.completed,
          avgCOLPercent: entry.colCount > 0 ? entry.colSum / entry.colCount : null,
        }
      })

    return {
      data: {
        totalStudents,
        activeStudents,
        avgCompletionPercent: totalPossible > 0 ? (allCompleted / totalPossible) * 100 : 0,
        avgCOLPercent: colAggregate._avg.percent ?? 0,
        smStats,
      },
      error: null,
    }
  })

  app.get('/api/institutions/:id/dashboard', { preHandler: requireInstitutionScope('id') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    // recentActivity used to be prisma.platformActivityEvent.findMany() with
    // NO institution filter at all — PlatformActivityEvent has no
    // institutionId/employerId column, so that was pulling every learner
    // registration, employer shortlist etc. across the WHOLE platform into
    // what's meant to be one institution's own dashboard. requireInstitutionScope
    // stops a caller reaching a different institution's :id, but did nothing
    // about this endpoint handing back platform-wide data regardless of
    // which :id was requested. Replaced with this institution's own recent
    // SM completions, which is both actually scoped and more relevant to an
    // institution admin than platform-wide noise.
    const [statsRes, cohortsRes, recentCompletions] = await Promise.all([
      app.inject({ method: 'GET', url: `/api/institutions/${id}/stats`, headers: request.headers }),
      app.inject({ method: 'GET', url: `/api/institutions/${id}/cohorts`, headers: request.headers }),
      prisma.sMProgress.findMany({
        where: { status: 'completed', learner: { institutionId: id } },
        orderBy: { completedAt: 'desc' },
        take: 20,
        include: { learner: { include: { user: { select: { displayName: true, email: true } } } } },
      }),
    ])
    const recentActivity = recentCompletions.map(p => ({
      id: p.id,
      type: 'learner_completed_sm' as const,
      description: `${p.learner.user.displayName || p.learner.user.email} completed ${p.smTitle}`,
      entityId: p.learnerId,
      entityName: p.learner.user.displayName || p.learner.user.email,
      timestamp: (p.completedAt ?? p.updatedAt).toISOString(),
    }))
    return {
      data: {
        stats: JSON.parse(statsRes.body).data,
        cohorts: JSON.parse(cohortsRes.body).data,
        recentActivity,
      },
      error: null,
    }
  })

  // Self-service "Add learners" — an institution's own admin/tutor bulk-
  // inviting their own learners, with no RC staff involved. Reuses the same
  // LearnerInvite mechanism as rc-admin's tool (routes/learnerInvites.ts):
  // each email becomes a pending invite that activates into a real Learner,
  // with this institution/cohort/access applied, the moment that person
  // signs in (routes/auth.ts). Two things make this safe to expose
  // directly to institution staff: requireInstitutionScope('id') means
  // nobody can act outside their own institution (Global Admin excepted,
  // same as every other route here), and every requested part must be
  // inside the institution's own contractedParts ceiling — an institution
  // can never grant itself more than what it's actually paid for.
  app.post('/api/institutions/:id/learner-invites/bulk', { preHandler: requireInstitutionScope('id') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as {
      emails?: string[]
      rows?: { email?: string; firstName?: string; lastName?: string }[]
      cohortId?: string; parts?: number[]
    }

    const institution = await prisma.institution.findUnique({ where: { id } })
    if (!institution) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Institution not found', statusCode: 404 } })
    }
    if (!institution.selfServiceEnabled) {
      return reply.code(403).send({
        error: {
          code: 'SELF_SERVICE_DISABLED',
          message: "Self-service learner adding isn't switched on for your institution yet — ask your Renewables Connect contact to enable it.",
          statusCode: 403,
        },
      })
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

    let cohortId: string | null = null
    if (body.cohortId) {
      const cohort = await prisma.cohort.findUnique({ where: { id: body.cohortId } })
      if (!cohort || cohort.institutionId !== id) {
        return reply.code(400).send({ error: { code: 'INVALID_COHORT', message: 'Cohort not found for this institution', statusCode: 400 } })
      }
      cohortId = cohort.id
    }

    // A cohort defines its own parts/accessDurationDays — already checked
    // against contractedParts when the cohort itself was created (rc-admin's
    // POST /api/admin/cohorts, or this institution's own POST
    // /api/institutions/:id/cohorts below), so there's nothing left to
    // validate here. parts is only meaningful, and only checked against the
    // contract ceiling, for a cohort-less invite.
    const parts = cohortId ? [] : (body.parts ?? [])
    if (!cohortId) {
      if (!Array.isArray(parts) || !parts.every(p => [1, 2, 3].includes(p))) {
        return reply.code(400).send({ error: { code: 'INVALID_PARTS', message: 'parts must only contain 1, 2 and/or 3', statusCode: 400 } })
      }
      if (!parts.every(p => institution.contractedParts.includes(p))) {
        return reply.code(403).send({
          error: {
            code: 'PARTS_EXCEED_CONTRACT',
            message: institution.contractedParts.length > 0
              ? `Your institution can only grant: ${institution.contractedParts.map(p => `Part ${p}`).join(', ')}.`
              : 'Your institution has no curriculum access configured yet — ask your Renewables Connect contact.',
            statusCode: 403,
          },
        })
      }
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
          institutionId: id,
          cohortId,
          parts,
          invitedByName: request.rcUser?.displayName ?? null,
        },
      })
      created.push({ email, id: invite.id, firstName })
    }

    if (created.length > 0) {
      const cohort = cohortId ? await prisma.cohort.findUnique({ where: { id: cohortId } }) : null
      for (const c of created) {
        await notifyNewLearner({
          email: c.email,
          firstName: c.firstName,
          institutionId: id,
          institutionName: institution.name,
          cohortName: cohort?.name ?? null,
          parts: cohort?.parts ?? parts,
          cohortAccessDurationDays: cohort?.accessDurationDays ?? null,
        })
      }
      await notifyInstitutionStaff({ institutionId: id, institutionName: institution.name, newLearnerCount: created.length })
    }

    return { data: { created: created.length, failed }, error: null }
  })
}
