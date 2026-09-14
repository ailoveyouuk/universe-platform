import type { FastifyInstance } from 'fastify'
import { requireGlobalWrite } from '../lib/auth'
import { prisma } from '../lib/prismaClient'
import { notifyInstitutionStaff } from '../lib/notifications'

const rcAdminOnly = requireGlobalWrite

const RC_STAFF_ROLES = ['rc_admin', 'rc_analyst', 'rc_support']
const INSTITUTION_ROLES = ['institution_admin', 'institution_tutor']
const EMPLOYER_ROLES = ['employer_admin', 'employer_recruiter']
const ALL_STAFF_ROLES = [...RC_STAFF_ROLES, ...INSTITUTION_ROLES, ...EMPLOYER_ROLES]

// Invite-only provisioning for every non-learner role — see routes/auth.ts
// for the redemption side. Only an existing rc_admin can create these, which
// is how "who can grant access to what" actually gets enforced: nobody can
// promote themselves, and an institution/employer contact can only ever be
// scoped to the institution/employer Lewis (or another rc_admin) names here.
export async function staffInviteRoutes(app: FastifyInstance) {
  app.get('/api/admin/staff-invites', { preHandler: rcAdminOnly }, async (request) => {
    const query = request.query as { institutionId?: string; employerId?: string }
    const invites = await prisma.staffInvite.findMany({
      where: {
        institutionId: query.institutionId ?? undefined,
        employerId:    query.employerId ?? undefined,
      },
      orderBy: { createdAt: 'desc' },
    })
    return { data: invites, error: null }
  })

  app.post('/api/admin/staff-invites', { preHandler: rcAdminOnly }, async (request, reply) => {
    const body = request.body as {
      email?: string; firstName?: string; lastName?: string; role?: string; institutionId?: string; employerId?: string
    }
    const email = body.email?.trim().toLowerCase()
    if (!email || !body.role || !ALL_STAFF_ROLES.includes(body.role)) {
      return reply.code(400).send({
        error: { code: 'INVALID_INVITE', message: `email is required and role must be one of ${ALL_STAFF_ROLES.join(', ')}`, statusCode: 400 },
      })
    }
    if (INSTITUTION_ROLES.includes(body.role) && !body.institutionId) {
      return reply.code(400).send({ error: { code: 'INVALID_INVITE', message: 'institutionId is required for an institution role', statusCode: 400 } })
    }
    if (EMPLOYER_ROLES.includes(body.role) && !body.employerId) {
      return reply.code(400).send({ error: { code: 'INVALID_INVITE', message: 'employerId is required for an employer role', statusCode: 400 } })
    }

    // Scoped to the SAME grant (email + role + org) rather than "any pending
    // invite for this email" — someone can legitimately have two different
    // pending invites at once (e.g. an institution invite and a separate
    // employer invite). Deliberately no longer blocks inviting someone who
    // is already a registered user: that's exactly how an existing rc_admin
    // (or any existing account) picks up access to another app — see the
    // existing-user branch in routes/auth.ts, which now redeems pending
    // invites on every sign-in instead of only ever on first registration.
    const alreadyInvited = await prisma.staffInvite.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        redeemedAt: null,
        role: body.role as never,
        institutionId: INSTITUTION_ROLES.includes(body.role) ? (body.institutionId ?? null) : null,
        employerId:    EMPLOYER_ROLES.includes(body.role) ? (body.employerId ?? null) : null,
      },
    })
    if (alreadyInvited) {
      return reply.code(409).send({ error: { code: 'ALREADY_INVITED', message: `${email} already has a pending invite for this exact role/organisation`, statusCode: 409 } })
    }

    const invite = await prisma.staffInvite.create({
      data: {
        email, role: body.role as never,
        firstName: body.firstName?.trim() || null,
        lastName: body.lastName?.trim() || null,
        institutionId: RC_STAFF_ROLES.includes(body.role) ? null : (body.institutionId ?? null),
        employerId:    RC_STAFF_ROLES.includes(body.role) ? null : (body.employerId ?? null),
        invitedByName: request.rcUser?.displayName ?? null,
      },
    })

    // Onboarding email - institution roles only for now (employer staff
    // notifications are deliberately out of scope, per Lewis: "we'll
    // tackle that later"). This is ALSO how a brand-new institution
    // contact gets their own "you're set up" email - they're included in
    // the staff recipient list for this same change.
    if (invite.institutionId && INSTITUTION_ROLES.includes(body.role)) {
      const institution = await prisma.institution.findUnique({ where: { id: invite.institutionId }, select: { name: true } })
      if (institution) {
        await notifyInstitutionStaff({
          institutionId: invite.institutionId,
          institutionName: institution.name,
          newStaff: [{
            email: invite.email,
            role: invite.role,
            name: invite.firstName ? `${invite.firstName}${invite.lastName ? ` ${invite.lastName}` : ''}` : null,
          }],
        })
      }
    }

    reply.code(201)
    return { data: invite, error: null }
  })

  app.delete('/api/admin/staff-invites/:id', { preHandler: rcAdminOnly }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const invite = await prisma.staffInvite.findUnique({ where: { id } })
    if (!invite) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Invite not found', statusCode: 404 } })
    if (invite.redeemedAt) return reply.code(409).send({ error: { code: 'ALREADY_REDEEMED', message: 'This invite has already been redeemed and can no longer be revoked', statusCode: 409 } })
    await prisma.staffInvite.delete({ where: { id } })
    return { data: { ok: true }, error: null }
  })
}
