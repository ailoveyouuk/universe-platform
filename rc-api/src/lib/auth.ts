import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { config } from '../config'
import { prisma } from './prismaClient'

let jwks: ReturnType<typeof jwksClient> | null = null
let ciamJwks: ReturnType<typeof jwksClient> | null = null

function getJwksClient() {
  if (!config.azure.tenantId) return null
  if (!jwks) {
    jwks = jwksClient({
      jwksUri: config.azure.jwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 10 * 60 * 1000,
    })
  }
  return jwks
}

// Learner-facing Entra External ID (CIAM) tenant — see config.ts's
// `azureCiam` block. Returns null (same as getJwksClient() above) until
// AZURE_CIAM_TENANT_ID is actually set somewhere, so verifyAzureToken()
// below never takes the CIAM branch in any deployment today.
function getCiamJwksClient() {
  if (!config.azureCiam.tenantId) return null
  if (!ciamJwks) {
    ciamJwks = jwksClient({
      jwksUri: config.azureCiam.jwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 10 * 60 * 1000,
    })
  }
  return ciamJwks
}

export interface AuthenticatedUser {
  id: string
  azureAdId: string
  email: string
  displayName: string
  role: string
  // Platform (RC-staff) tier — independent of the legacy `role` field above.
  // null for everyone except internal RC staff. 'admin' sees and can change
  // everything platform-wide; 'coordinator' sees exactly the same data but
  // every write/export route requires 'admin' specifically, so a
  // Coordinator can look at anything but never change or export it.
  // Sourced from AdminUser, not `role` — see requireAuth below.
  platformRole: 'admin' | 'coordinator' | null
  // Org-scoped access — present only if this person has an InstitutionUser
  // / EmployerUser row. Not mutually exclusive with platformRole or with
  // each other: one person can hold several of these at once (e.g. an
  // rc_admin who is also set up as an employer contact for a demo).
  institutionId: string | null
  employerId: string | null
}

declare module 'fastify' {
  interface FastifyRequest {
    rcUser?: AuthenticatedUser
  }
}

async function verifyAzureToken(token: string): Promise<{ oid: string; email: string; name: string } | null> {
  const client = getJwksClient()

  if (!client || !config.azure.tenantId) {
    console.warn('⚠  Azure AD not configured — skipping token verification (dev mode only)')
    try {
      const decoded = jwt.decode(token) as Record<string, string> | null
      if (!decoded) return null
      return {
        oid:   decoded['oid'] ?? 'dev-user',
        email: decoded['email'] ?? decoded['preferred_username'] ?? 'dev@rc.com',
        name:  decoded['name'] ?? 'Dev User',
      }
    } catch {
      return null
    }
  }

  // If the CIAM tenant is configured (see config.ts) and this token's own
  // `iss` claim matches it, verify against the CIAM tenant's keys/issuer/
  // audience instead of the workforce tenant's. Peeking at the unverified
  // claim is safe here — it only *selects which JWKS to verify against*,
  // the actual signature/issuer/audience check below is what proves the
  // token is genuine, exactly as it always was for the workforce path.
  const ciamClient = getCiamJwksClient()
  if (ciamClient) {
    const unverified = jwt.decode(token) as Record<string, string> | null
    if (unverified?.['iss'] === config.azureCiam.issuer) {
      return verifyWithClient(token, ciamClient, config.azureCiam.audience, config.azureCiam.issuer)
    }
  }

  return verifyWithClient(token, client, config.azure.audience, config.azure.issuer)
}

function verifyWithClient(
  token: string,
  client: ReturnType<typeof jwksClient>,
  audience: string | string[],
  issuer: string,
): Promise<{ oid: string; email: string; name: string } | null> {
  return new Promise((resolve) => {
    const getKey: jwt.GetPublicKeyOrSecret = (header, callback) => {
      client.getSigningKey(header.kid, (err, key) => {
        if (err) { callback(err); return }
        callback(null, key?.getPublicKey())
      })
    }

    jwt.verify(token, getKey, {
      // jsonwebtoken's own VerifyOptions type wants a non-empty tuple for
      // multi-value audience, not plain string[] — this cast is safe here:
      // config.azureCiam.audience is only ever consulted on the CIAM branch,
      // which is only taken once a real (non-empty) clientIds list exists.
      audience: audience as string | [string, ...string[]],
      issuer,
      algorithms: ['RS256'],
    }, (err: Error | null, decoded: string | jwt.JwtPayload | undefined) => {
      if (err || !decoded || typeof decoded === 'string') { resolve(null); return }
      const p = decoded as Record<string, string>
      resolve({ oid: p['oid'], email: p['email'] ?? p['preferred_username'] ?? '', name: p['name'] ?? '' })
    })
  })
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Missing Bearer token', statusCode: 401 } })
    return
  }

  const token = authHeader.slice(7)
  const claims = await verifyAzureToken(token)

  if (!claims) {
    reply.code(401).send({ error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired', statusCode: 401 } })
    return
  }

  const user = await prisma.user.findUnique({
    where: { azureAdId: claims.oid },
    include: { adminUser: true, institutionUser: true, employerUser: true },
  })

  if (!user) {
    reply.code(403).send({ error: { code: 'USER_NOT_FOUND', message: 'User not registered on this platform', statusCode: 403 } })
    return
  }

  request.rcUser = {
    id:            user.id,
    azureAdId:     user.azureAdId,
    email:         user.email,
    displayName:   user.displayName,
    role:          user.role,
    platformRole:  user.adminUser ? (user.adminUser.role === 'admin' ? 'admin' : 'coordinator') : null,
    institutionId: user.institutionUser?.institutionId ?? null,
    employerId:    user.employerUser?.employerId ?? null,
  }
}

// True platform-wide access: sees and can change everything, every
// institution and employer. Only ever AdminUser.role === 'admin' — never
// granted just because an institution/employer person's own role within
// their org happens to be called "admin"; that stays scoped to their one
// org via requireInstitutionScope/requireEmployerScope below.
export function isGlobalAdmin(user?: AuthenticatedUser | null): boolean {
  return user?.platformRole === 'admin'
}

// Platform-wide READ visibility — Admin or Coordinator, identical scope.
// Every write/export route must use requireGlobalWrite instead, which a
// Coordinator never passes — that split is what keeps Coordinator
// "look at anything, change nothing."
export function isGlobalStaff(user?: AuthenticatedUser | null): boolean {
  return user?.platformRole === 'admin' || user?.platformRole === 'coordinator'
}

export function requireGlobalRead(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  return (async () => {
    await requireAuth(request, reply)
    if (reply.sent || !request.rcUser) return
    if (!isGlobalStaff(request.rcUser)) {
      reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'RC staff access required', statusCode: 403 } })
    }
  })()
}

export function requireGlobalWrite(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  return (async () => {
    await requireAuth(request, reply)
    if (reply.sent || !request.rcUser) return
    if (!isGlobalAdmin(request.rcUser)) {
      reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Admin access required — Coordinators have read-only access', statusCode: 403 } })
    }
  })()
}

// Generic role-string check — kept for checks unrelated to the RC-staff
// platform tier (e.g. gating a learner-only route). Not used for
// rc-admin/coordinator gating any more; see requireGlobalRead/Write above.
export function requireRole(...roles: string[]) {
  return async function(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await requireAuth(request, reply)
    if (reply.sent) return
    if (!request.rcUser || !roles.includes(request.rcUser.role)) {
      reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions', statusCode: 403 } })
    }
  }
}

// Every /api/learners/:id/* route is called ONLY by rc-learner (rc-v2-app),
// always with the signed-in learner's own id — rc-admin's learner drill-down
// uses the separate, already-globally-gated /api/admin/learners/:id instead,
// and no institution/employer app calls these at all. So there is no
// legitimate case where the :id in the URL should differ from the caller's
// own Learner row; previously these routes only checked requireAuth, which
// meant ANY signed-in account (any other learner included) could read or
// even overwrite another learner's progress, COL scores, certificates and
// profile just by knowing their learner id.
export function requireOwnLearner(paramName = 'id') {
  return async function(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await requireAuth(request, reply)
    if (reply.sent || !request.rcUser) return

    const requestedId = (request.params as Record<string, string>)[paramName]
    const learner = await prisma.learner.findUnique({ where: { userId: request.rcUser.id }, select: { id: true } })
    if (!learner || learner.id !== requestedId) {
      reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Not your learner record', statusCode: 403 } })
    }
  }
}

// Institution staff can only ever act on their OWN institution — :id in the
// URL must match their InstitutionUser row. Global Admin bypasses entirely
// (read + write, any institution). Global Coordinator sees any institution
// but is blocked from every write here, regardless of which one — matches
// "Coordinator can look, never change." Checked from request.rcUser
// (already resolved in requireAuth), not a fresh DB lookup, and keyed off
// whether the link actually exists rather than the legacy `role` string —
// so this still works correctly for someone who holds this alongside
// another role (e.g. also rc_admin).
export function requireInstitutionScope(paramName = 'id') {
  return async function(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await requireAuth(request, reply)
    if (reply.sent || !request.rcUser) return

    if (isGlobalAdmin(request.rcUser)) return

    const isWrite = request.method !== 'GET' && request.method !== 'HEAD'
    if (request.rcUser.platformRole === 'coordinator') {
      if (!isWrite) return
      reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Coordinators have read-only access', statusCode: 403 } })
      return
    }

    const requestedId = (request.params as Record<string, string>)[paramName]
    if (!request.rcUser.institutionId || request.rcUser.institutionId !== requestedId) {
      reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Not a member of this institution', statusCode: 403 } })
    }
  }
}

// Mirror of requireInstitutionScope for employer staff/data.
export function requireEmployerScope(paramName = 'id') {
  return async function(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await requireAuth(request, reply)
    if (reply.sent || !request.rcUser) return

    if (isGlobalAdmin(request.rcUser)) return

    const isWrite = request.method !== 'GET' && request.method !== 'HEAD'
    if (request.rcUser.platformRole === 'coordinator') {
      if (!isWrite) return
      reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Coordinators have read-only access', statusCode: 403 } })
      return
    }

    const requestedId = (request.params as Record<string, string>)[paramName]
    if (!request.rcUser.employerId || request.rcUser.employerId !== requestedId) {
      reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Not a member of this employer', statusCode: 403 } })
    }
  }
}
