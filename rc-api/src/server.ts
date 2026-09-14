import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import sensible from '@fastify/sensible'
import { config } from './config'
import { learnerRoutes } from './routes/learners'
import { institutionRoutes } from './routes/institutions'
import { employerRoutes } from './routes/employers'
import { adminRoutes } from './routes/admin'
import { authRoutes } from './routes/auth'
import { organisationRoutes } from './routes/organisations'
import { inviteRoutes } from './routes/invites'
import { staffInviteRoutes } from './routes/staffInvites'
import { learnerInviteRoutes } from './routes/learnerInvites'
import { peopleRoutes } from './routes/people'
import { importPeopleRoutes } from './routes/importPeople'

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: config.isDev ? 'info' : 'warn',
      transport: config.isDev ? { target: 'pino-pretty' } : undefined,
    },
  })

  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, {
    origin: config.cors.origins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
  await app.register(sensible)

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  await app.register(authRoutes)
  await app.register(learnerRoutes)
  await app.register(institutionRoutes)
  await app.register(employerRoutes)
  await app.register(adminRoutes)
  await app.register(organisationRoutes)
  await app.register(inviteRoutes)
  await app.register(staffInviteRoutes)
  await app.register(learnerInviteRoutes)
  await app.register(peopleRoutes)
  await app.register(importPeopleRoutes)

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ error: { code: 'NOT_FOUND', message: `Route ${request.method} ${request.url} not found`, statusCode: 404 } })
  })

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error)
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500
    reply.code(statusCode).send({
      error: { code: (error as { code?: string }).code ?? 'INTERNAL_ERROR', message: (error as Error).message ?? 'Unknown error', statusCode },
    })
  })

  return app
}
