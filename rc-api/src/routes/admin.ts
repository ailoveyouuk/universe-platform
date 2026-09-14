import type { FastifyInstance } from 'fastify'
import type { Institution, Cohort } from '../../generated/prisma'
import { requireGlobalRead, requireGlobalWrite } from '../lib/auth'
import { prisma } from '../lib/prismaClient'
import { computePlatformStats, computeLearnerFunnel, computeSMPerformanceStats } from '../lib/stats'
import { ACCESS_GRANT_DAYS, getLearnerAccess } from '../lib/access'
import { generateUniqueInviteCode } from '../lib/inviteCode'
import { config } from '../config'
import { buildReport, toCSV, toXLSX, REPORT_LABELS, type ReportType } from '../lib/reports'

const rcStaff = requireGlobalRead

export async function adminRoutes(app: FastifyInstance) {
  app.get('/api/admin/stats', { preHandler: rcStaff }, async () => {
    return { data: await computePlatformStats(), error: null }
  })

  app.get('/api/admin/learners/funnel', { preHandler: rcStaff }, async () => {
    return { data: await computeLearnerFunnel(), error: null }
  })

  app.get('/api/admin/content/sm-performance', { preHandler: rcStaff }, async () => {
    return { data: await computeSMPerformanceStats(), error: null }
  })

  app.get('/api/admin/institutions', { preHandler: rcStaff }, async () => {
    const institutions = await prisma.institution.findMany({
      include: { _count: { select: { learners: true } } },
      orderBy: { partnerSince: 'desc' },
    })
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const summaries = await Promise.all(institutions.map(async inst => {
      const [active, colAgg, allProgress] = await Promise.all([
        prisma.learner.count({ where: { institutionId: inst.id, lastActiveAt: { gte: thirtyDaysAgo } } }),
        prisma.cOLScore.aggregate({ _avg: { percent: true }, where: { smProgress: { learner: { institutionId: inst.id } } } }),
        prisma.sMProgress.count({ where: { learner: { institutionId: inst.id }, status: 'completed' } }),
      ])
      const total = inst._count.learners
      return {
        id: inst.id, name: inst.name, shortName: inst.shortName,
        type: inst.type, sector: inst.sector, partnerTier: inst.partnerTier, logoUrl: inst.logoUrl,
        studentCount: total, activeStudents30d: active,
        avgCompletionPercent: total > 0 ? (allProgress / (total * 15)) * 100 : 0,
        avgCOLPercent: colAgg._avg.percent ?? null,
        partnerSince: inst.partnerSince.toISOString(),
        status: inst.status,
      }
    }))
    return { data: summaries, error: null }
  })

  // Fields below are the unified profile pro forma for an institution-level
  // account: sector/partnerTier generalise what Employer already tracked for
  // corporate partners onto academic ones too, and website/overview/
  // country/city/sizeBand/contactName/contactPhone turn a bare name+email
  // into a real CRM-style record. All optional except name/shortName so a
  // quick-create still works, but the same body shape supports a full
  // profile filled in at once or completed later via PATCH.
  const PARTNER_TIERS = ['standard', 'premium', 'enterprise'] as const
  type InstitutionProfileBody = {
    name?: string; shortName?: string; type?: 'ACADEMIC' | 'CORPORATE'
    sector?: string; partnerTier?: string; website?: string; overview?: string
    country?: string; city?: string; sizeBand?: string
    contactName?: string; contactEmail?: string; contactPhone?: string
    logoUrl?: string; primaryColor?: string
  }
  function institutionProfileData(body: InstitutionProfileBody) {
    return {
      sector:       body.sector?.trim() || null,
      partnerTier:  (body.partnerTier as typeof PARTNER_TIERS[number]) ?? undefined,
      website:      body.website?.trim() || null,
      overview:     body.overview?.trim() || null,
      country:      body.country?.trim() || null,
      city:         body.city?.trim() || null,
      sizeBand:     body.sizeBand?.trim() || null,
      contactName:  body.contactName?.trim() || null,
      contactEmail: body.contactEmail?.trim() || null,
      contactPhone: body.contactPhone?.trim() || null,
      logoUrl:      body.logoUrl?.trim() || null,
      primaryColor: body.primaryColor?.trim() || undefined,
    }
  }

  // Shapes a Prisma institution (with cohorts + _count included) into what
  // rc-admin's institution detail page actually renders — inviteUrl and
  // learnersRedeemed aren't real columns, and the page's cohort list
  // unconditionally calls .map() on institution.cohorts, so any endpoint
  // that returns an institution for that page to setInstitution() with must
  // go through this, not just the initial GET. (PATCH previously returned
  // the bare update() result with no cohorts at all, which crashed the page
  // — cohorts was undefined — the moment anyone saved the profile form.)
  type InstitutionWithCohorts = Institution & {
    cohorts: (Cohort & { _count: { learners: number } })[]
  }
  function shapeInstitution(institution: InstitutionWithCohorts) {
    const cohorts = institution.cohorts.map(c => ({
      id: c.id, institutionId: c.institutionId, name: c.name, startDate: c.startDate.toISOString(),
      parts: c.parts, accessDurationDays: c.accessDurationDays, seatCap: c.seatCap,
      inviteCode: c.inviteCode, inviteUrl: `${config.learnerAppUrl}/join?code=${c.inviteCode}`,
      learnersRedeemed: c._count.learners,
      seatsRemaining: c.seatCap != null ? Math.max(0, c.seatCap - c._count.learners) : null,
    }))
    return { ...institution, cohorts }
  }
  const institutionCohortsInclude = {
    cohorts: { include: { _count: { select: { learners: true } as const } }, orderBy: { createdAt: 'desc' as const } },
  }

  app.post('/api/admin/institutions', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const body = request.body as InstitutionProfileBody
    if (!body.name?.trim() || !body.shortName?.trim()) {
      return reply.code(400).send({
        error: { code: 'INVALID_INSTITUTION', message: 'name and shortName are required', statusCode: 400 },
      })
    }
    if (body.partnerTier && !PARTNER_TIERS.includes(body.partnerTier as typeof PARTNER_TIERS[number])) {
      return reply.code(400).send({
        error: { code: 'INVALID_PARTNER_TIER', message: `partnerTier must be one of ${PARTNER_TIERS.join(', ')}`, statusCode: 400 },
      })
    }

    const institution = await prisma.institution.create({
      data: {
        name:      body.name.trim(),
        shortName: body.shortName.trim(),
        type:      body.type ?? 'ACADEMIC',
        ...institutionProfileData(body),
      },
    })
    reply.code(201)
    return { data: institution, error: null }
  })

  app.patch('/api/admin/institutions/:id', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as InstitutionProfileBody
    if (body.partnerTier && !PARTNER_TIERS.includes(body.partnerTier as typeof PARTNER_TIERS[number])) {
      return reply.code(400).send({
        error: { code: 'INVALID_PARTNER_TIER', message: `partnerTier must be one of ${PARTNER_TIERS.join(', ')}`, statusCode: 400 },
      })
    }
    const existing = await prisma.institution.findUnique({ where: { id } })
    if (!existing) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Institution not found', statusCode: 404 } })
    }

    const institution = await prisma.institution.update({
      where: { id },
      data: {
        name:      body.name?.trim() || undefined,
        shortName: body.shortName?.trim() || undefined,
        type:      body.type ?? undefined,
        ...institutionProfileData(body),
      },
      include: institutionCohortsInclude,
    })
    return { data: shapeInstitution(institution), error: null }
  })

  // Deliberately a separate route from the general profile PATCH above,
  // not folded into institutionProfileData: that helper nulls out any
  // field the request body omits (letting an admin explicitly clear a
  // profile field by submitting one blank), which is correct there but
  // would be a landmine here — a self-service-only save must never be
  // able to blank out the rest of the institution's profile just because
  // this request didn't mention it.
  app.patch('/api/admin/institutions/:id/self-service', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as { selfServiceEnabled?: boolean; contractedParts?: number[] }

    if (body.contractedParts && !body.contractedParts.every(p => [1, 2, 3].includes(p))) {
      return reply.code(400).send({
        error: { code: 'INVALID_PARTS', message: 'contractedParts must only contain 1, 2 and/or 3', statusCode: 400 },
      })
    }
    const existing = await prisma.institution.findUnique({ where: { id } })
    if (!existing) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Institution not found', statusCode: 404 } })
    }

    const institution = await prisma.institution.update({
      where: { id },
      data: {
        selfServiceEnabled: body.selfServiceEnabled ?? undefined,
        contractedParts:    body.contractedParts ?? undefined,
      },
      include: institutionCohortsInclude,
    })
    return { data: shapeInstitution(institution), error: null }
  })

  app.get('/api/admin/institutions/:id', { preHandler: rcStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const institution = await prisma.institution.findUnique({
      where: { id },
      include: institutionCohortsInclude,
    })
    if (!institution) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Institution not found', statusCode: 404 } })
    }
    return { data: shapeInstitution(institution), error: null }
  })

  app.get('/api/admin/employers', { preHandler: rcStaff }, async () => {
    const employers = await prisma.employer.findMany({
      include: {
        _count: { select: { jobRoles: true, shortlistedCandidates: true } },
        employerUsers: { include: { user: { select: { lastSignInAt: true } } } },
      },
      orderBy: { partnerSince: 'desc' },
    })
    const summaries = employers.map(emp => {
      const lastActive = emp.employerUsers
        .map(eu => eu.user.lastSignInAt)
        .filter((d): d is Date => d != null)
        .sort()
        .at(-1)
      return {
        id: emp.id, name: emp.name, sector: emp.sector,
        partnerTier: emp.partnerTier, status: emp.status,
        openRoles: emp._count.jobRoles,
        shortlistedCandidates: emp._count.shortlistedCandidates,
        lastActiveAt: lastActive?.toISOString() ?? null,
      }
    })
    return { data: summaries, error: null }
  })

  app.post('/api/admin/employers', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const body = request.body as { name?: string; shortName?: string; sector?: string; partnerTier?: string }
    if (!body.name?.trim() || !body.shortName?.trim() || !body.sector?.trim()) {
      return reply.code(400).send({
        error: { code: 'INVALID_EMPLOYER', message: 'name, shortName, and sector are required', statusCode: 400 },
      })
    }
    if (body.partnerTier && !PARTNER_TIERS.includes(body.partnerTier as typeof PARTNER_TIERS[number])) {
      return reply.code(400).send({
        error: { code: 'INVALID_PARTNER_TIER', message: `partnerTier must be one of ${PARTNER_TIERS.join(', ')}`, statusCode: 400 },
      })
    }
    const employer = await prisma.employer.create({
      data: {
        name: body.name.trim(), shortName: body.shortName.trim(), sector: body.sector.trim(),
        partnerTier: (body.partnerTier as typeof PARTNER_TIERS[number]) ?? undefined,
      },
    })
    reply.code(201)
    return { data: employer, error: null }
  })

  app.get('/api/admin/employers/:id', { preHandler: rcStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const employer = await prisma.employer.findUnique({ where: { id } })
    if (!employer) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Employer not found', statusCode: 404 } })
    return { data: employer, error: null }
  })

  app.get('/api/admin/activity', { preHandler: rcStaff }, async (request) => {
    const query = request.query as { limit?: string }
    const events = await prisma.platformActivityEvent.findMany({
      orderBy: { timestamp: 'desc' },
      take: parseInt(query.limit ?? '20', 10),
    })
    return { data: events, error: null }
  })

  // Hard delete — platform activity events are just a log, not a record
  // anything else references, so unlike alerts (soft-dismissed via
  // resolvedAt) there's no reason to keep a row around after removal.
  // Used to clear out test/seed data (e.g. an E2E test run) that would
  // otherwise sit in the feed indefinitely with no real learner behind it.
  app.delete('/api/admin/activity/:id', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await prisma.platformActivityEvent.findUnique({ where: { id } })
    if (!existing) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Activity event not found', statusCode: 404 } })
    await prisma.platformActivityEvent.delete({ where: { id } })
    return { data: { deleted: true }, error: null }
  })

  app.get('/api/admin/alerts', { preHandler: rcStaff }, async () => {
    const alerts = await prisma.platformAlert.findMany({
      where: { resolvedAt: null },
      orderBy: { detectedAt: 'desc' },
    })
    return { data: alerts, error: null }
  })

  app.delete('/api/admin/alerts/:id', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.platformAlert.update({ where: { id }, data: { resolvedAt: new Date() } })
    return { data: { dismissed: true }, error: null }
  })

  // Generated synchronously and streamed straight back as a file download —
  // there's no background job/queue here, the report sizes on this platform
  // (learners/institutions/employers/SM performance) are small enough that
  // querying + serializing is fast, so there's no benefit to the earlier
  // fake-202-"queued" placeholder this replaced. Row shapes are pulled from
  // rc-api/lib/reports.ts, which deliberately reuses the same queries the
  // equivalent rc-admin list pages already run, so an export always matches
  // what's on screen.
  const REPORT_TYPES = ['learners', 'institutions', 'employers', 'content'] as const
  // Read-only preview of the same data the export builds, so the page can
  // render a table in-app before anyone commits to a CSV/XLSX download.
  // Gated by rcStaff (read), not requireGlobalWrite — viewing report rows is
  // no different from viewing any other admin list page, and Coordinators
  // are allowed to look at anything; only the export route needs write.
  app.get('/api/admin/reports/:type', { preHandler: rcStaff }, async (request, reply) => {
    const { type } = request.params as { type: string }
    if (!REPORT_TYPES.includes(type as ReportType)) {
      return reply.code(400).send({
        error: { code: 'INVALID_REPORT_TYPE', message: `type must be one of ${REPORT_TYPES.join(', ')}`, statusCode: 400 },
      })
    }
    const report = await buildReport(type as ReportType)
    return { data: report, error: null }
  })

  app.post('/api/admin/reports/export', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const body = request.body as { type?: string; format?: string }
    if (!body.type || !REPORT_TYPES.includes(body.type as ReportType)) {
      return reply.code(400).send({
        error: { code: 'INVALID_REPORT_TYPE', message: `type must be one of ${REPORT_TYPES.join(', ')}`, statusCode: 400 },
      })
    }
    if (body.format !== 'csv' && body.format !== 'xlsx') {
      return reply.code(400).send({
        error: { code: 'INVALID_FORMAT', message: 'format must be csv or xlsx', statusCode: 400 },
      })
    }

    const type = body.type as ReportType
    const report = await buildReport(type)
    const datestamp = new Date().toISOString().slice(0, 10)
    const filenameBase = `rc-${type}-${datestamp}`

    if (body.format === 'csv') {
      const csv = toCSV(report)
      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header('Content-Disposition', `attachment; filename="${filenameBase}.csv"`)
      return reply.send(csv)
    }

    const buffer = await toXLSX(report, REPORT_LABELS[type])
    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    reply.header('Content-Disposition', `attachment; filename="${filenameBase}.xlsx"`)
    return reply.send(buffer)
  })

  // learnersRedeemed/seatsRemaining/inviteUrl let rc-admin show live
  // redemption progress on an invite link without a separate join query —
  // seat usage is just a count of Learners currently pointed at this
  // cohort, since redemption is what sets Learner.cohortId in the first
  // place (see routes/invites.ts).
  app.get('/api/admin/cohorts', { preHandler: rcStaff }, async (request) => {
    const query = request.query as { institutionId?: string }
    const cohorts = await prisma.cohort.findMany({
      where:   query.institutionId ? { institutionId: query.institutionId } : undefined,
      include: { _count: { select: { learners: true } } },
      orderBy: { startDate: 'desc' },
    })
    const shaped = cohorts.map(c => ({
      id: c.id, institutionId: c.institutionId, name: c.name, startDate: c.startDate.toISOString(),
      parts: c.parts, accessDurationDays: c.accessDurationDays, seatCap: c.seatCap,
      inviteCode: c.inviteCode, inviteUrl: `${config.learnerAppUrl}/join?code=${c.inviteCode}`,
      learnersRedeemed: c._count.learners,
      seatsRemaining: c.seatCap != null ? Math.max(0, c.seatCap - c._count.learners) : null,
      _count: c._count,
    }))
    return { data: shaped, error: null }
  })

  app.post('/api/admin/cohorts', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const body = request.body as {
      institutionId?: string; name?: string; startDate?: string
      parts?: number[]; accessDurationDays?: number; seatCap?: number | null
    }
    if (!body.institutionId || !body.name?.trim()) {
      return reply.code(400).send({
        error: { code: 'INVALID_COHORT', message: 'institutionId and name are required', statusCode: 400 },
      })
    }
    if (!Array.isArray(body.parts) || body.parts.length === 0 || !body.parts.every(p => [1, 2, 3].includes(p))) {
      return reply.code(400).send({
        error: { code: 'INVALID_PARTS', message: 'parts must be a non-empty array of 1, 2 and/or 3', statusCode: 400 },
      })
    }
    if (body.seatCap != null && (!Number.isInteger(body.seatCap) || body.seatCap < 1)) {
      return reply.code(400).send({
        error: { code: 'INVALID_SEAT_CAP', message: 'seatCap must be a positive integer, or omitted for unlimited', statusCode: 400 },
      })
    }

    const institution = await prisma.institution.findUnique({ where: { id: body.institutionId } })
    if (!institution) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Institution not found', statusCode: 404 } })
    }

    const inviteCode = await generateUniqueInviteCode()
    const cohort = await prisma.cohort.create({
      data: {
        institutionId:      body.institutionId,
        name:               body.name.trim(),
        startDate:          body.startDate ? new Date(body.startDate) : new Date(),
        parts:              body.parts,
        accessDurationDays: body.accessDurationDays ?? ACCESS_GRANT_DAYS,
        seatCap:            body.seatCap ?? null,
        inviteCode,
      },
    })
    reply.code(201)
    return {
      data: {
        ...cohort,
        inviteUrl: `${config.learnerAppUrl}/join?code=${cohort.inviteCode}`,
        learnersRedeemed: 0,
        seatsRemaining: cohort.seatCap,
        // Matches GET /api/admin/cohorts's shape exactly (which includes
        // _count) — the frontend's CohortSummary type declares _count as
        // required, and a freshly-created cohort genuinely has 0 learners,
        // so this was a real gap: the Learners page's "+ Create a new
        // cohort" flow appended this response straight into its cohort
        // list and crashed reading c._count.learners on it.
        _count: { learners: 0 },
      },
      error: null,
    }
  })

  // Full, paginated learner directory — the "list every learner" route
  // that was previously missing (see the search route's comment below,
  // now stale). Default page size 25, capped at 100. Optional `q` filters
  // by name/email substring (same case-insensitive match as search) so
  // this one endpoint covers both "browse everyone" and "find someone I
  // saw named in the Platform Activity feed." unlockedParts is computed
  // per row via the same getLearnerAccess() union used everywhere else
  // (learner + institution + cohort grants) so an admin can see access
  // level at a glance without opening each learner's detail view.
  app.get('/api/admin/learners', { preHandler: rcStaff }, async (request) => {
    const query = request.query as { page?: string; pageSize?: string; q?: string }
    const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize ?? '25', 10) || 25))
    const q = query.q?.trim()

    const where = q
      ? {
          user: {
            OR: [
              { email:       { contains: q, mode: 'insensitive' as const } },
              { displayName: { contains: q, mode: 'insensitive' as const } },
            ],
          },
        }
      : {}

    const [total, learners] = await Promise.all([
      prisma.learner.count({ where }),
      prisma.learner.findMany({
        where,
        include: {
          user:        { select: { displayName: true, email: true } },
          institution: { select: { name: true } },
          cohort:      { select: { name: true } },
        },
        orderBy: { enrolledAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    const rows = await Promise.all(learners.map(async learner => {
      const access = await getLearnerAccess(learner.id)
      return {
        id:            learner.id,
        user:          learner.user,
        institution:   learner.institution,
        cohort:        learner.cohort,
        enrolledAt:    learner.enrolledAt,
        lastActiveAt:  learner.lastActiveAt,
        unlockedParts: access.parts,
      }
    }))

    return { data: { learners: rows, total, page, pageSize }, error: null }
  })

  // Minimal lookup for attaching an individual grant to a learner — a full
  // learner directory (search/filter/sort across all learners) is its own
  // future page; this just resolves one email to a learner record.
  app.get('/api/admin/learners/search', { preHandler: rcStaff }, async (request) => {
    // Named "search by email" in the UI, but the dashboard's Platform
    // Activity feed only ever shows a learner's display name (e.g. "X
    // joined as a learner") with no email alongside it — searching only
    // by email made it impossible to find someone you'd just seen named
    // in that feed, which looked identical to "the learner doesn't
    // exist." Matching the name too closes that gap.
    const query = request.query as { email?: string }
    if (!query.email) return { data: [], error: null }
    const learners = await prisma.learner.findMany({
      where: {
        user: {
          OR: [
            { email:       { contains: query.email, mode: 'insensitive' } },
            { displayName: { contains: query.email, mode: 'insensitive' } },
          ],
        },
      },
      include: { user: { select: { displayName: true, email: true } }, institution: { select: { name: true } } },
      take: 10,
    })
    return { data: learners, error: null }
  })

  // Full detail for one learner — SM-by-SM progress with COL scores,
  // certificates earned, and current access grants. Powers the admin
  // Learners page's detail view once a search result is opened; unlike the
  // employer-facing candidate profile this is not filtered by
  // CandidateProfile.optInToDiscovery and shows real identity, since this is an internal
  // ops tool, not the public/employer-facing talent pool.
  app.get('/api/admin/learners/:id', { preHandler: rcStaff }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const learner = await prisma.learner.findUnique({
      where: { id },
      include: {
        user: { select: { displayName: true, email: true } },
        institution: { select: { name: true } },
        cohort: { select: { name: true } },
        smProgress: { include: { colScore: true }, orderBy: { smId: 'asc' } },
        certificates: { select: { id: true, level: true, title: true, completedAt: true } },
        accessGrants: {
          select: { id: true, parts: true, source: true, grantedAt: true, expiresAt: true },
          orderBy: { grantedAt: 'desc' },
        },
      },
    })
    if (!learner) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Learner not found', statusCode: 404 } })
    return { data: learner, error: null }
  })

  // Full, permanent account deletion — for genuine mistakes (a wrong email,
  // a stray test sign-up) rather than day-to-day access management, which
  // stays on the revoke-by-expiry / remove-access routes elsewhere (those
  // deliberately never delete anything, for the audit trail). This one
  // really does delete: the User row cascades (see schema.prisma's
  // onDelete: Cascade on Learner/SMProgress/Certificate/AccessGrant/
  // InstitutionUser/EmployerUser/AdminUser) to remove every trace of the
  // account from the live tables. requireGlobalWrite only — a Coordinator
  // (read-everything, write nothing) can't do this, same tier as every
  // other destructive route in this app.
  //
  // Before any of that, write a permanent PlatformActivityEvent capturing
  // who this was — PlatformActivityEvent has no foreign key to User (see
  // schema.prisma), so this line survives the cascade below and stays
  // queryable forever, satisfying "a log of anyone who has ever been
  // registered on the platform, regardless of whether they have access or
  // not" even after the account itself is gone.
  app.delete('/api/admin/learners/:id/account', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const learner = await prisma.learner.findUnique({
      where: { id },
      include: {
        user: { include: { adminUser: true, institutionUser: true, employerUser: true } },
        institution: { select: { name: true } },
        cohort: { select: { name: true } },
        smProgress: { include: { colScore: true }, orderBy: { smId: 'asc' } },
        certificates: true,
        accessGrants: true,
      },
    })
    if (!learner) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Learner not found', statusCode: 404 } })

    const { user } = learner
    const platformRole = user.adminUser ? (user.adminUser.role === 'admin' ? 'admin' : 'coordinator') : null
    const deletedBy = request.rcUser!.email

    // Full structured snapshot first — every Sub Module status/COL score,
    // certificate and access grant, exactly as it stood the moment before
    // deletion. This is the actual dataset for benchmarking curriculum/
    // content changes over time; it deliberately duplicates the raw rows
    // rather than just counts, since a summary here can't be un-summarised
    // later. See LearnerArchive's comment in schema.prisma for why it has
    // no relation fields.
    await prisma.learnerArchive.create({
      data: {
        deletedBy,
        originalUserId: user.id,
        originalLearnerId: learner.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        platformRole,
        registeredAt: user.createdAt,
        lastSignInAt: user.lastSignInAt,
        enrolledAt: learner.enrolledAt,
        lastActiveAt: learner.lastActiveAt,
        institutionName: learner.institution?.name ?? null,
        cohortName: learner.cohort?.name ?? null,
        smProgress: JSON.parse(JSON.stringify(learner.smProgress)),
        certificates: JSON.parse(JSON.stringify(learner.certificates)),
        accessGrants: JSON.parse(JSON.stringify(learner.accessGrants)),
      },
    })

    // The one-line, human-readable feed entry — "who and when," pointing
    // at the full record above for anyone who needs the detail.
    await prisma.platformActivityEvent.create({
      data: {
        type: 'account_deleted',
        description: `${user.displayName} (${user.email}) removed from the platform`,
        entityId: user.id, entityName: user.displayName,
        metadata: {
          email: user.email,
          registeredAt: user.createdAt,
          lastSignInAt: user.lastSignInAt,
          role: user.role,
          platformRole,
          institution: learner.institution?.name ?? null,
          cohort: learner.cohort?.name ?? null,
          hadInstitutionStaffAccess: !!user.institutionUser,
          hadEmployerStaffAccess: !!user.employerUser,
          deletedBy,
        },
      },
    })

    // Deleting the User row cascades through everything owned by it —
    // Learner, SMProgress, Certificate, AccessGrant (learner-scoped),
    // ShortlistedCandidate, CandidateProfile, and any AdminUser/
    // InstitutionUser/EmployerUser link — in one statement. LearnerArchive
    // has no relation to any of this, so it's untouched by the cascade.
    await prisma.user.delete({ where: { id: user.id } })

    return { data: { deleted: true }, error: null }
  })

  // ── Access grants ────────────────────────────────────────────────────────
  // Manual grant management, standing in for the WooCommerce webhook until
  // that integration exists. A grant belongs to exactly one of
  // learnerId/institutionId/cohortId — enforced here, not in the DB. Both
  // academic and corporate sponsors are Institution rows (Institution.type);
  // Employer is recruiting-only and never holds a grant.

  app.get('/api/admin/access-grants', { preHandler: rcStaff }, async (request) => {
    const query = request.query as {
      learnerId?: string; institutionId?: string; cohortId?: string
    }
    const where: Record<string, string> = {}
    if (query.learnerId)     where.learnerId = query.learnerId
    if (query.institutionId) where.institutionId = query.institutionId
    if (query.cohortId)      where.cohortId = query.cohortId

    const grants = await prisma.accessGrant.findMany({
      where,
      orderBy: { grantedAt: 'desc' },
      include: {
        learner:     { include: { user: { select: { displayName: true, email: true } } } },
        institution: { select: { name: true, type: true } },
        cohort:      { select: { name: true } },
      },
    })
    return { data: grants, error: null }
  })

  app.post('/api/admin/access-grants', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const body = request.body as {
      parts: number[]
      learnerId?: string; institutionId?: string; cohortId?: string
      source?: string; externalOrderId?: string; notes?: string
      expiresAt?: string
    }

    const targets = [body.learnerId, body.institutionId, body.cohortId].filter(Boolean)
    if (targets.length !== 1) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_GRANT_TARGET',
          message: 'Exactly one of learnerId, institutionId, or cohortId must be set',
          statusCode: 400,
        },
      })
    }
    if (!Array.isArray(body.parts) || body.parts.length === 0 || !body.parts.every(p => [1, 2, 3].includes(p))) {
      return reply.code(400).send({
        error: { code: 'INVALID_PARTS', message: 'parts must be a non-empty array of 1, 2 and/or 3', statusCode: 400 },
      })
    }

    const grantedAt = new Date()
    const expiresAt = body.expiresAt
      ? new Date(body.expiresAt)
      : new Date(grantedAt.getTime() + ACCESS_GRANT_DAYS * 24 * 60 * 60 * 1000)

    const grant = await prisma.accessGrant.create({
      data: {
        parts:           body.parts,
        learnerId:       body.learnerId ?? null,
        institutionId:   body.institutionId ?? null,
        cohortId:        body.cohortId ?? null,
        source:          body.source ?? 'manual',
        externalOrderId: body.externalOrderId ?? null,
        notes:           body.notes ?? null,
        grantedAt,
        expiresAt,
      },
    })
    reply.code(201)
    return { data: grant, error: null }
  })

  // Bulk grant creation — for a cohort/CSV import where a full admin-UI
  // round trip per row isn't practical (e.g. the upcoming 100-candidate test
  // cohort). Each row is independent: a bad email or invalid parts value
  // fails that row only, with a reason, so one typo in a 100-row import
  // doesn't block the other 99. A row's email is resolved against an
  // existing Learner (via User.email) — this does not create accounts, so a
  // learner must already have registered (signed in at least once) before a
  // grant can be created for them.
  app.post('/api/admin/access-grants/bulk', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const body = request.body as {
      rows: Array<{ email: string; parts: number[] }>
      source?: string
      notes?: string
      expiresAt?: string
    }

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return reply.code(400).send({
        error: { code: 'INVALID_ROWS', message: 'rows must be a non-empty array of { email, parts }', statusCode: 400 },
      })
    }
    if (body.rows.length > 500) {
      return reply.code(400).send({
        error: { code: 'TOO_MANY_ROWS', message: 'bulk import is capped at 500 rows per request', statusCode: 400 },
      })
    }

    const grantedAt = new Date()
    const expiresAt = body.expiresAt
      ? new Date(body.expiresAt)
      : new Date(grantedAt.getTime() + ACCESS_GRANT_DAYS * 24 * 60 * 60 * 1000)

    const created: Array<{ email: string; grantId: string }> = []
    const failed: Array<{ email: string; reason: string }> = []

    for (const row of body.rows) {
      const email = (row.email ?? '').trim().toLowerCase()
      if (!email) { failed.push({ email: row.email ?? '', reason: 'missing email' }); continue }
      if (!Array.isArray(row.parts) || row.parts.length === 0 || !row.parts.every(p => [1, 2, 3].includes(p))) {
        failed.push({ email, reason: 'parts must be 1, 2 and/or 3' })
        continue
      }

      const learner = await prisma.learner.findFirst({ where: { user: { email } } })
      if (!learner) {
        failed.push({ email, reason: 'no learner found for this email — they must register (sign in once) before a grant can be created' })
        continue
      }

      const grant = await prisma.accessGrant.create({
        data: {
          parts:     row.parts,
          learnerId: learner.id,
          source:    body.source ?? 'manual',
          notes:     body.notes ?? null,
          grantedAt,
          expiresAt,
        },
      })
      created.push({ email, grantId: grant.id })
    }

    reply.code(created.length > 0 ? 201 : 200)
    return { data: { created: created.length, failed }, error: null }
  })

  // Revoke by expiring immediately rather than deleting, so the grant stays
  // on record for the audit trail.
  app.patch('/api/admin/access-grants/:id/revoke', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const grant = await prisma.accessGrant.update({ where: { id }, data: { expiresAt: new Date() } })
    return { data: grant, error: null }
  })

  app.get('/api/admin/dashboard', { preHandler: rcStaff }, async (request) => {
    const [stats, funnel, smPerformance, recentActivity, alerts, instRes, empRes] = await Promise.all([
      computePlatformStats(),
      computeLearnerFunnel(),
      computeSMPerformanceStats(),
      prisma.platformActivityEvent.findMany({ orderBy: { timestamp: 'desc' }, take: 20 }),
      prisma.platformAlert.findMany({ where: { resolvedAt: null }, orderBy: { detectedAt: 'desc' } }),
      app.inject({ method: 'GET', url: '/api/admin/institutions', headers: request.headers }),
      app.inject({ method: 'GET', url: '/api/admin/employers',    headers: request.headers }),
    ])
    return {
      data: {
        stats, funnel,
        institutions: JSON.parse(instRes.body).data ?? [],
        employers:    JSON.parse(empRes.body).data ?? [],
        smPerformance, recentActivity, alerts,
      },
      error: null,
    }
  })
}
