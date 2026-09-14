import type { FastifyInstance } from 'fastify'
import { requireOwnLearner } from '../lib/auth'
import { prisma } from '../lib/prismaClient'
import { getSMMeta } from '../lib/curriculum'
import { getLearnerAccess } from '../lib/access'
import { shapeInstitutionBrand } from '../lib/institutionBrand'

export async function learnerRoutes(app: FastifyInstance) {
  app.get('/api/learners/:id', { preHandler: requireOwnLearner('id') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const learner = await prisma.learner.findUnique({
      where: { id },
      include: { smProgress: { include: { colScore: true } }, institution: true },
    })
    if (!learner) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Learner not found', statusCode: 404 } })
    // Shape institution down to the branding-relevant fields only — the raw
    // row also carries contact details and partner-tier/CRM fields that are
    // none of a learner's business.
    const { institution, ...learnerFields } = learner
    return { data: { ...learnerFields, institution: shapeInstitutionBrand(institution) }, error: null }
  })

  app.patch('/api/learners/:id/progress/:smId', { preHandler: requireOwnLearner('id') }, async (request, reply) => {
    const { id, smId } = request.params as { id: string; smId: string }
    const body = request.body as { status?: string; startedAt?: string; completedAt?: string }
    const smIdNum = parseInt(smId, 10)

    // upsert, not updateMany — a learner's SMProgress row is seeded at
    // registration, but this stays resilient for any learner created before
    // that seeding existed (updateMany silently touches 0 rows and looks
    // like success when the row is missing; upsert can't fail that way).
    const meta = getSMMeta(smIdNum)
    if (!meta) {
      return reply.code(400).send({ error: { code: 'INVALID_SM', message: 'Unknown sub-module id', statusCode: 400 } })
    }

    const status = body.status as 'not_started' | 'in_progress' | 'completed' | undefined

    const updated = await prisma.sMProgress.upsert({
      where:  { learnerId_smId: { learnerId: id, smId: smIdNum } },
      create: {
        learnerId:   id,
        smId:        smIdNum,
        smSlug:      meta.slug,
        smTitle:     meta.title,
        partNumber:  meta.partNumber,
        status:      status ?? 'in_progress',
        startedAt:   body.startedAt   ? new Date(body.startedAt)   : new Date(),
        completedAt: body.completedAt ? new Date(body.completedAt) : undefined,
      },
      update: {
        ...(status            && { status }),
        ...(body.startedAt    && { startedAt:   new Date(body.startedAt) }),
        ...(body.completedAt  && { completedAt: new Date(body.completedAt) }),
      },
    })
    await prisma.learner.update({ where: { id }, data: { lastActiveAt: new Date() } })
    return { data: updated, error: null }
  })

  app.post('/api/learners/:id/progress/:smId/col', { preHandler: requireOwnLearner('id') }, async (request, reply) => {
    const { id, smId } = request.params as { id: string; smId: string }
    const body = request.body as { score: number; maxScore: number; percent: number }
    const smProgress = await prisma.sMProgress.findFirst({ where: { learnerId: id, smId: parseInt(smId, 10) } })
    if (!smProgress) return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'SM progress not found', statusCode: 404 } })
    const colScore = await prisma.cOLScore.upsert({
      where: { smProgressId: smProgress.id },
      create: { smProgressId: smProgress.id, score: body.score, maxScore: body.maxScore, percent: body.percent, attempts: 1, lastAttemptAt: new Date() },
      update: { score: body.score, maxScore: body.maxScore, percent: body.percent, attempts: { increment: 1 }, lastAttemptAt: new Date() },
    })
    return { data: colScore, error: null }
  })

  app.get('/api/learners/:id/certificates', { preHandler: requireOwnLearner('id') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const certs = await prisma.certificate.findMany({ where: { learnerId: id }, orderBy: { issuedAt: 'desc' } })
    return { data: certs, error: null }
  })

  app.post('/api/learners/:id/certificates', { preHandler: requireOwnLearner('id') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as {
      level: string; title: string; subtitle: string; moduleContext: string
      recipientName: string; completedAt: string; partNumber?: number
      partAccent?: string; certifyingBody?: string; credentialId: string
    }
    const cert = await prisma.certificate.create({
      data: {
        learnerId: id,
        level: body.level as 'submodule' | 'part' | 'module',
        title: body.title,
        subtitle: body.subtitle,
        moduleContext: body.moduleContext,
        recipientName: body.recipientName,
        completedAt: new Date(body.completedAt),
        partNumber: body.partNumber,
        partAccent: body.partAccent,
        certifyingBody: body.certifyingBody,
        credentialId: body.credentialId,
      },
    })
    reply.code(201)
    return { data: cert, error: null }
  })

  app.get('/api/learners/:id/profile', { preHandler: requireOwnLearner('id') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const profile = await prisma.candidateProfile.findUnique({ where: { learnerId: id } })
    return { data: profile, error: null }
  })

  app.patch('/api/learners/:id/profile', { preHandler: requireOwnLearner('id') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as Partial<Record<string, unknown>>
    const profile = await prisma.candidateProfile.upsert({
      where:  { learnerId: id },
      create: { learnerId: id, ...body },
      update: body,
    })
    return { data: profile, error: null }
  })

  // Which curriculum parts this learner can currently study — the union of
  // any non-expired access grant on their own learner record plus any on
  // their institution, cohort, or sponsoring employer. Drives what the
  // dashboard shows as unlocked vs locked.
  app.get('/api/learners/:id/access', { preHandler: requireOwnLearner('id') }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const access = await getLearnerAccess(id)
    return { data: access, error: null }
  })
}
