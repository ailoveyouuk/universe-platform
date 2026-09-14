import type { FastifyInstance } from 'fastify'
import { requireGlobalWrite } from '../lib/auth'
import { prisma } from '../lib/prismaClient'

// Unified staff directory + access removal — the "once and done, configurable
// and removable only via rc-admin" surface. Merges the three real access
// grants (AdminUser/InstitutionUser/EmployerUser — each one row per user,
// userId is @unique on all three, so a person has at most one of each) with
// any still-pending StaffInvite, keyed by email so someone who hasn't signed
// in yet still shows up. Complements staffInvites.ts (which only ever
// covered the "invite" side): DELETE there requires redeemedAt to be null,
// so once access is actually granted there was previously no way to remove
// it at all — these DELETE routes are that missing piece.
export async function peopleRoutes(app: FastifyInstance) {
  app.get('/api/admin/people', { preHandler: requireGlobalWrite }, async () => {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { adminUser: { isNot: null } },
          { institutionUser: { isNot: null } },
          { employerUser: { isNot: null } },
        ],
      },
      include: {
        adminUser: true,
        institutionUser: { include: { institution: { select: { id: true, name: true } } } },
        employerUser: { include: { employer: { select: { id: true, name: true } } } },
      },
      orderBy: { email: 'asc' },
    })

    const pendingInvites = await prisma.staffInvite.findMany({
      where: { redeemedAt: null },
      orderBy: { createdAt: 'desc' },
    })

    const instIds = [...new Set(pendingInvites.map(i => i.institutionId).filter((x): x is string => !!x))]
    const empIds  = [...new Set(pendingInvites.map(i => i.employerId).filter((x): x is string => !!x))]
    const [insts, emps] = await Promise.all([
      instIds.length ? prisma.institution.findMany({ where: { id: { in: instIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
      empIds.length  ? prisma.employer.findMany({ where: { id: { in: empIds } }, select: { id: true, name: true } })  : Promise.resolve([]),
    ])
    const instName = (id: string | null) => (id ? insts.find(i => i.id === id)?.name ?? null : null)
    const empName  = (id: string | null) => (id ? emps.find(e => e.id === id)?.name ?? null : null)

    interface PendingRow {
      id: string; role: string; institutionName: string | null; employerName: string | null; createdAt: string
    }
    interface PersonRow {
      email: string; displayName: string | null; userId: string | null
      platformRole: 'admin' | 'coordinator' | null
      institution: { id: string; name: string; role: string } | null
      employer: { id: string; name: string; role: string } | null
      pending: PendingRow[]
    }

    const byEmail = new Map<string, PersonRow>()

    for (const u of users) {
      byEmail.set(u.email.toLowerCase(), {
        email: u.email, displayName: u.displayName, userId: u.id,
        platformRole: u.adminUser ? (u.adminUser.role === 'admin' ? 'admin' : 'coordinator') : null,
        institution: u.institutionUser
          ? { id: u.institutionUser.institution.id, name: u.institutionUser.institution.name, role: u.institutionUser.role }
          : null,
        employer: u.employerUser
          ? { id: u.employerUser.employer.id, name: u.employerUser.employer.name, role: u.employerUser.role }
          : null,
        pending: [],
      })
    }

    for (const inv of pendingInvites) {
      const key = inv.email.toLowerCase()
      if (!byEmail.has(key)) {
        byEmail.set(key, {
          email: inv.email, displayName: null, userId: null,
          platformRole: null, institution: null, employer: null, pending: [],
        })
      }
      byEmail.get(key)!.pending.push({
        id: inv.id, role: inv.role,
        institutionName: instName(inv.institutionId), employerName: empName(inv.employerId),
        createdAt: inv.createdAt.toISOString(),
      })
    }

    const people = [...byEmail.values()].sort((a, b) => a.email.localeCompare(b.email))
    return { data: people, error: null }
  })

  // Remove someone's platform (Global Admin/Coordinator) access. Two guard
  // rails: nobody can remove their own platform access from here (avoids
  // an accidental self-lockout — ask another admin instead), and the very
  // last Global Admin can't be removed at all, mirroring the bootstrap rule
  // in routes/auth.ts (rcAdminCount === 0 is what lets the FIRST admin in
  // without an invite) — dropping to zero would brick onboarding entirely.
  app.delete('/api/admin/people/:userId/platform-role', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const { userId } = request.params as { userId: string }
    if (userId === request.rcUser!.id) {
      return reply.code(400).send({
        error: { code: 'CANNOT_SELF_DEMOTE', message: "You can't remove your own platform access — ask another admin to do it.", statusCode: 400 },
      })
    }
    const target = await prisma.adminUser.findUnique({ where: { userId } })
    if (target?.role === 'admin') {
      const adminCount = await prisma.adminUser.count({ where: { role: 'admin' } })
      if (adminCount <= 1) {
        return reply.code(400).send({
          error: { code: 'LAST_ADMIN', message: 'This is the only remaining Global Admin — promote someone else first.', statusCode: 400 },
        })
      }
    }
    await prisma.adminUser.deleteMany({ where: { userId } })
    return { data: { ok: true }, error: null }
  })

  app.delete('/api/admin/people/:userId/institution', { preHandler: requireGlobalWrite }, async (request) => {
    const { userId } = request.params as { userId: string }
    await prisma.institutionUser.deleteMany({ where: { userId } })
    return { data: { ok: true }, error: null }
  })

  app.delete('/api/admin/people/:userId/employer', { preHandler: requireGlobalWrite }, async (request) => {
    const { userId } = request.params as { userId: string }
    await prisma.employerUser.deleteMany({ where: { userId } })
    return { data: { ok: true }, error: null }
  })
}
