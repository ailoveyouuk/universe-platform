import type { FastifyInstance } from 'fastify'
import { requireAuth, requireGlobalRead, requireGlobalWrite, isGlobalAdmin } from '../lib/auth'
import { prisma } from '../lib/prismaClient'

const orgSelect = {
  id: true,
  slug: true,
  type: true,
  name: true,
  logoUrl: true,
  brandColour: true,
  country: true,
  city: true,
  website: true,
  overview: true,
  tagline: true,
  heroImageUrl: true,
  galleryImages: true,
  videoUrl: true,
  socialLinks: true,
  sectors: true,
  yearFounded: true,
  employeeCount: true,
  partnershipTier: true,
  testimonial: true,
  rcContactId: true,
  isPublished: true,
  createdAt: true,
  updatedAt: true,
  opportunities: {
    where: { isActive: true },
    orderBy: { createdAt: 'desc' as const },
  },
}

export async function organisationRoutes(app: FastifyInstance) {
  // ── Public: list published orgs ─────────────────────────────────────────────
  app.get('/api/organisations', async (request) => {
    const query = request.query as {
      type?: string
      sector?: string
      page?: string
      limit?: string
    }

    const page  = Math.max(1, parseInt(query.page  ?? '1',  10))
    const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? '24', 10)))
    const skip  = (page - 1) * limit

    const where = {
      isPublished: true,
      ...(query.type   && { type: query.type as 'EMPLOYER' | 'INSTITUTION' }),
      ...(query.sector && { sectors: { has: query.sector } }),
    }

    const [total, orgs] = await Promise.all([
      prisma.organisation.count({ where }),
      prisma.organisation.findMany({
        where,
        select: {
          id: true,
          slug: true,
          type: true,
          name: true,
          logoUrl: true,
          brandColour: true,
          country: true,
          city: true,
          tagline: true,
          sectors: true,
          partnershipTier: true,
          isPublished: true,
          createdAt: true,
        },
        orderBy: [
          { partnershipTier: 'asc' },
          { name: 'asc' },
        ],
        skip,
        take: limit,
      }),
    ])

    return {
      data: {
        orgs,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
      error: null,
    }
  })

  // ── Public: get single org by slug ──────────────────────────────────────────
  app.get('/api/organisations/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    const org = await prisma.organisation.findUnique({
      where: { slug },
      select: orgSelect,
    })

    if (!org || !org.isPublished) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Organisation not found', statusCode: 404 } })
    }

    return { data: org, error: null }
  })

  // ── Auth: get own org (for employer/institution users) ──────────────────────
  app.get('/api/organisations/mine', { preHandler: requireAuth }, async (request, reply) => {
    const user = request.rcUser!
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organisationId: true },
    })

    if (!dbUser?.organisationId) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'No organisation linked to this account', statusCode: 404 } })
    }

    const org = await prisma.organisation.findUnique({
      where: { id: dbUser.organisationId },
      select: { ...orgSelect, opportunities: { orderBy: { createdAt: 'desc' as const } } },
    })

    if (!org) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Organisation not found', statusCode: 404 } })
    }

    return { data: org, error: null }
  })

  // ── Admin: create org ───────────────────────────────────────────────────────
  app.post('/api/organisations', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const body = request.body as {
      slug: string
      type: 'EMPLOYER' | 'INSTITUTION'
      name: string
      logoUrl?: string
      brandColour?: string
      country?: string
      city?: string
      website?: string
      overview?: string
      tagline?: string
      heroImageUrl?: string
      galleryImages?: string[]
      videoUrl?: string
      socialLinks?: object
      sectors?: string[]
      yearFounded?: number
      employeeCount?: string
      partnershipTier?: 'STANDARD' | 'PARTNER' | 'GOLD_PARTNER' | 'PLATINUM_PARTNER'
      testimonial?: object
      rcContactId?: string
      isPublished?: boolean
    }

    const org = await prisma.organisation.create({
      data: {
        slug:            body.slug,
        type:            body.type,
        name:            body.name,
        logoUrl:         body.logoUrl         ?? null,
        brandColour:     body.brandColour     ?? null,
        country:         body.country         ?? null,
        city:            body.city            ?? null,
        website:         body.website         ?? null,
        overview:        body.overview        ?? null,
        tagline:         body.tagline         ?? null,
        heroImageUrl:    body.heroImageUrl    ?? null,
        galleryImages:   body.galleryImages   ?? [],
        videoUrl:        body.videoUrl        ?? null,
        socialLinks:     body.socialLinks     ?? undefined,
        sectors:         body.sectors         ?? [],
        yearFounded:     body.yearFounded     ?? null,
        employeeCount:   body.employeeCount   ?? null,
        partnershipTier: body.partnershipTier ?? 'STANDARD',
        testimonial:     body.testimonial     ?? undefined,
        rcContactId:     body.rcContactId     ?? null,
        isPublished:     body.isPublished     ?? false,
      },
    })

    reply.code(201)
    return { data: org, error: null }
  })

  // ── Admin or org member: update org ─────────────────────────────────────────
  app.patch('/api/organisations/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user   = request.rcUser!

    const isAdmin = isGlobalAdmin(user)

    if (!isAdmin) {
      const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { organisationId: true } })
      if (dbUser?.organisationId !== id) {
        return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Not authorised to edit this organisation', statusCode: 403 } })
      }
    }

    const body = request.body as Record<string, unknown>

    // Admin-only fields that non-admins cannot touch
    if (!isAdmin) {
      delete body['partnershipTier']
      delete body['isPublished']
      delete body['rcContactId']
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await prisma.organisation.update({ where: { id }, data: body as any })

    return { data: updated, error: null }
  })

  // ── Admin: delete org ───────────────────────────────────────────────────────
  app.delete('/api/organisations/:id', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.organisation.delete({ where: { id } })
    reply.code(204).send()
  })

  // ── Admin: add opportunity ──────────────────────────────────────────────────
  app.post('/api/organisations/:id/opportunities', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body   = request.body as {
      title: string
      type?: string
      description?: string
      url?: string
    }

    const opp = await prisma.opportunity.create({
      data: {
        organisationId: id,
        title:          body.title,
        type:           body.type        ?? null,
        description:    body.description ?? null,
        url:            body.url         ?? null,
        isActive:       true,
      },
    })

    reply.code(201)
    return { data: opp, error: null }
  })

  // ── Admin: update opportunity ───────────────────────────────────────────────
  app.patch('/api/organisations/:id/opportunities/:oppId', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const { oppId } = request.params as { id: string; oppId: string }
    const body      = request.body as Partial<{
      title: string
      type: string
      description: string
      url: string
      isActive: boolean
    }>

    const opp = await prisma.opportunity.update({ where: { id: oppId }, data: body })
    return { data: opp, error: null }
  })

  // ── Admin: delete opportunity ───────────────────────────────────────────────
  app.delete('/api/organisations/:id/opportunities/:oppId', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const { oppId } = request.params as { id: string; oppId: string }
    await prisma.opportunity.delete({ where: { id: oppId } })
    reply.code(204).send()
  })

  // ── Admin: toggle publish ───────────────────────────────────────────────────
  app.patch('/api/organisations/:id/publish', { preHandler: requireGlobalWrite }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body   = request.body as { isPublished: boolean }
    const org    = await prisma.organisation.update({ where: { id }, data: { isPublished: body.isPublished } })
    return { data: { id: org.id, isPublished: org.isPublished }, error: null }
  })

  // ── Admin: list all orgs (including unpublished) ────────────────────────────
  app.get('/api/admin/organisations', { preHandler: requireGlobalRead }, async (request) => {
    const query = request.query as { type?: string; page?: string; limit?: string }
    const page  = Math.max(1, parseInt(query.page  ?? '1',  10))
    const limit = Math.min(100, parseInt(query.limit ?? '50', 10))
    const skip  = (page - 1) * limit

    const where = query.type ? { type: query.type as 'EMPLOYER' | 'INSTITUTION' } : {}

    const [total, orgs] = await Promise.all([
      prisma.organisation.count({ where }),
      prisma.organisation.findMany({
        where,
        select: {
          id: true, slug: true, type: true, name: true, logoUrl: true,
          brandColour: true, country: true, city: true, partnershipTier: true,
          isPublished: true, createdAt: true, updatedAt: true,
          _count: { select: { opportunities: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ])

    return { data: { orgs, pagination: { total, page, limit, pages: Math.ceil(total / limit) } }, error: null }
  })

  // ── Admin: get single org by id (admin detail view) ─────────────────────────
  app.get('/api/admin/organisations/:id', { preHandler: requireGlobalRead }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const org = await prisma.organisation.findUnique({
      where: { id },
      select: { ...orgSelect, opportunities: { orderBy: { createdAt: 'desc' as const } } },
    })
    if (!org) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Organisation not found', statusCode: 404 } })
    return { data: org, error: null }
  })
}
