import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../lib/auth'
import { prisma } from '../lib/prismaClient'

// Public, unauthenticated invite-link flow: an institution admin (via
// rc-admin) creates a Cohort with parts/accessDurationDays/seatCap and gets
// back one shareable link — /join/<inviteCode> in rc-v2-app. A student opens
// it, signs in with Microsoft (which registers their User/Learner row via
// the existing /api/auth/register flow), and the app calls redeem here.
//
// Redemption sets Learner.institutionId/cohortId (for rosters/reporting)
// AND stamps its own learner-scoped AccessGrant with a duration clock that
// starts at redemption, not at cohort creation — see the schema comment on
// Cohort for why. "One redemption per Microsoft account" falls out for free:
// a Learner can only ever belong to one cohort at a time (Learner.cohortId
// is a single field), so a second redemption attempt is caught as
// ALREADY_ENROLLED rather than needing separate tracking.
export async function inviteRoutes(app: FastifyInstance) {
  // Lets the /join page show "You're about to join <Institution>'s
  // programme" and seat/expiry context BEFORE the student signs in.
  app.get('/api/invites/:code', async (request, reply) => {
    const { code } = request.params as { code: string }
    const cohort = await prisma.cohort.findUnique({
      where: { inviteCode: code },
      include: { institution: { select: { name: true, type: true } }, _count: { select: { learners: true } } },
    })
    if (!cohort) {
      return reply.code(404).send({ error: { code: 'INVITE_NOT_FOUND', message: 'This invite link is not valid.', statusCode: 404 } })
    }

    const seatsRemaining = cohort.seatCap != null ? Math.max(0, cohort.seatCap - cohort._count.learners) : null
    const full = cohort.seatCap != null && cohort._count.learners >= cohort.seatCap

    return {
      data: {
        institutionName: cohort.institution.name,
        institutionType: cohort.institution.type,
        cohortName:      cohort.name,
        parts:           cohort.parts,
        accessDurationDays: cohort.accessDurationDays,
        seatsRemaining,
        full,
      },
      error: null,
    }
  })

  app.post('/api/invites/:code/redeem', { preHandler: requireAuth }, async (request, reply) => {
    const { code } = request.params as { code: string }

    const cohort = await prisma.cohort.findUnique({ where: { inviteCode: code } })
    if (!cohort) {
      return reply.code(404).send({ error: { code: 'INVITE_NOT_FOUND', message: 'This invite link is not valid.', statusCode: 404 } })
    }

    const learner = await prisma.learner.findUnique({ where: { userId: request.rcUser!.id } })
    if (!learner) {
      // Should not normally happen — the client registers (creates the
      // Learner row) immediately on sign-in, before this call fires — but
      // guard it explicitly rather than throwing an opaque 500.
      return reply.code(409).send({
        error: { code: 'LEARNER_NOT_READY', message: 'Your account is still being set up — please try again in a moment.', statusCode: 409 },
      })
    }

    // Idempotent: redeeming the same link twice from the same account
    // (e.g. a page refresh) just confirms the existing enrolment.
    if (learner.cohortId === cohort.id) {
      return { data: { alreadyRedeemed: true, cohortName: cohort.name }, error: null }
    }
    if (learner.cohortId || learner.institutionId) {
      return reply.code(409).send({
        error: { code: 'ALREADY_ENROLLED', message: 'This account is already enrolled with a different sponsor. Contact support if this is unexpected.', statusCode: 409 },
      })
    }

    if (cohort.seatCap != null) {
      const redeemedCount = await prisma.learner.count({ where: { cohortId: cohort.id } })
      if (redeemedCount >= cohort.seatCap) {
        return reply.code(410).send({
          error: { code: 'COHORT_FULL', message: 'This programme has reached its seat limit. Contact the institution for another invite.', statusCode: 410 },
        })
      }
    }

    const grantedAt = new Date()
    const expiresAt = new Date(grantedAt.getTime() + cohort.accessDurationDays * 24 * 60 * 60 * 1000)

    const [, grant] = await prisma.$transaction([
      prisma.learner.update({
        where: { id: learner.id },
        data: { institutionId: cohort.institutionId, cohortId: cohort.id },
      }),
      prisma.accessGrant.create({
        data: {
          parts:     cohort.parts,
          learnerId: learner.id,
          source:    'invite-code',
          notes:     `Redeemed cohort invite: ${cohort.name}`,
          grantedAt,
          expiresAt,
        },
      }),
    ])

    return {
      data: {
        alreadyRedeemed: false,
        cohortName: cohort.name,
        parts: grant.parts,
        expiresAt: grant.expiresAt.toISOString(),
      },
      error: null,
    }
  })
}
