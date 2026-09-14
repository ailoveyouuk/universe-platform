import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prismaClient'
import { SM_CURRICULUM } from '../lib/curriculum'
import { ACCESS_GRANT_DAYS } from '../lib/access'
import { getOrCreateIndividualLearnersInstitution, shapeInstitutionBrand } from '../lib/institutionBrand'

const STAFF_ROLES = [
  'institution_admin', 'institution_tutor', 'employer_admin', 'employer_recruiter',
  'rc_admin', 'rc_analyst', 'rc_support',
] as const
type StaffRole = typeof STAFF_ROLES[number]

async function seedSMProgress(learnerId: string) {
  await prisma.sMProgress.createMany({
    data: SM_CURRICULUM.map(sm => ({
      learnerId,
      smId:       sm.id,
      smSlug:     sm.slug,
      smTitle:    sm.title,
      partNumber: sm.partNumber,
    })),
    skipDuplicates: true,
  })
}

// Creates the Learner row for a brand-new (or previously staff-only) learner
// sign-in, applying a matching pending LearnerInvite if one exists for this
// email — institution/cohort placement and an initial curriculum-parts
// AccessGrant, exactly as an admin configured when they added this learner
// via rc-admin. Marks the invite redeemed so it can't be reused. A learner
// with no matching invite still registers fine (the original, fully
// self-service path) — they simply start with no institution/cohort/access,
// same as before this feature existed.
async function provisionLearner(userId: string, email: string): Promise<string> {
  const invite = await prisma.learnerInvite.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, redeemedAt: null },
    orderBy: { createdAt: 'desc' },
  })

  // No invite means nobody sponsored this signup — give them the
  // "Individual Learners" placeholder institution rather than leaving
  // institutionId null, so they show up somewhere in rc-admin and pick up
  // standard (unbranded) runtime styling like any other institution's
  // learners, instead of being a special-cased null everywhere downstream.
  const institutionId = invite?.institutionId ?? (await getOrCreateIndividualLearnersInstitution()).id

  const learner = await prisma.learner.create({
    data: {
      userId,
      institutionId,
      cohortId: invite?.cohortId ?? null,
    },
  })
  await seedSMProgress(learner.id)

  if (invite) {
    await prisma.learnerInvite.update({ where: { id: invite.id }, data: { redeemedAt: new Date() } })

    // Access comes from the cohort when the invite placed this learner in
    // one — the cohort's own parts/accessDurationDays (set once, by
    // whoever created it, exactly like the invite-link join flow in
    // routes/invites.ts) is what "what this cohort can access, for how
    // long" actually means. invite.parts is only consulted as a fallback
    // for a cohort-less invite (institution-only or fully unsponsored),
    // where there's no cohort to define access instead.
    if (invite.cohortId) {
      const cohort = await prisma.cohort.findUnique({ where: { id: invite.cohortId } })
      if (cohort && cohort.parts.length > 0) {
        const grantedAt = new Date()
        await prisma.accessGrant.create({
          data: {
            parts: cohort.parts,
            learnerId: learner.id,
            source: 'invite',
            notes: `Cohort: ${cohort.name}`,
            grantedAt,
            expiresAt: new Date(grantedAt.getTime() + cohort.accessDurationDays * 24 * 60 * 60 * 1000),
          },
        })
      }
    } else if (invite.parts.length > 0) {
      const grantedAt = new Date()
      await prisma.accessGrant.create({
        data: {
          parts: invite.parts,
          learnerId: learner.id,
          source: 'invite',
          grantedAt,
          expiresAt: new Date(grantedAt.getTime() + ACCESS_GRANT_DAYS * 24 * 60 * 60 * 1000),
        },
      })
    }
  }

  return learner.id
}

// Provisions the InstitutionUser/EmployerUser join row a staff role needs to
// be scoped by requireInstitutionScope/requireEmployerScope, if one wasn't
// already created by an earlier registration (register is called on every
// sign-in, not just the first one).
async function ensureOrgLink(userId: string, role: StaffRole, institutionId: string | null, employerId: string | null) {
  if ((role === 'institution_admin' || role === 'institution_tutor') && institutionId) {
    const linkRole = role === 'institution_admin' ? 'admin' : 'tutor'
    await prisma.institutionUser.upsert({
      where:  { userId },
      create: { userId, institutionId, role: linkRole },
      update: { institutionId, role: linkRole },
    })
  }
  if ((role === 'employer_admin' || role === 'employer_recruiter') && employerId) {
    const linkRole = role === 'employer_admin' ? 'admin' : 'recruiter'
    await prisma.employerUser.upsert({
      where:  { userId },
      create: { userId, employerId, role: linkRole },
      update: { employerId, role: linkRole },
    })
  }
  // Platform (RC-staff) tier lives on AdminUser, not just the legacy `role`
  // field on User — this is what lib/auth.ts's requireGlobalRead/Write and
  // isGlobalAdmin/isGlobalStaff actually check. rc_analyst/rc_support both
  // collapse to the single 'coordinator' tier (read-everything, write/export
  // nothing); rc_admin is 'admin' (read + write + export, everything).
  if (['rc_admin', 'rc_analyst', 'rc_support'].includes(role)) {
    const adminRole = role === 'rc_admin' ? 'admin' : 'coordinator'
    await prisma.adminUser.upsert({
      where:  { userId },
      create: { userId, role: adminRole },
      update: { role: adminRole },
    })
  }
}

export async function authRoutes(app: FastifyInstance) {
  // Only `learner` is truly self-service (matches a Microsoft sign-in to
  // whatever cohort invite link they redeem next, if any). Every staff role
  // — rc-admin/analyst/support, institution admin/tutor, employer
  // admin/recruiter — requires a matching, unredeemed StaffInvite created by
  // an rc_admin first (see routes/staffInvites.ts). The one exception is a
  // single-use bootstrap: the very first rc_admin ever (table has none yet)
  // doesn't need an invite, since nobody could have created one for them.
  // The role/institutionId/employerId actually applied always come from the
  // matched invite, never trusted from the request body — otherwise anyone
  // could just POST role: 'rc_admin' and grant themselves full access.
  app.post('/api/auth/register', async (request, reply) => {
    const body = request.body as {
      azureAdId: string; email: string; displayName: string; role: string
    }

    const existing = await prisma.user.findUnique({
      where: { azureAdId: body.azureAdId },
      include: { learner: true, institutionUser: true, employerUser: true },
    })

    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { lastSignInAt: new Date() } })

      // Redeem any pending invite(s) for this email on EVERY sign-in, not
      // just the first. This is the actual fix for the bug where someone
      // who already has one role (e.g. rc_admin) could never pick up a
      // second, unrelated grant (e.g. employer access created afterwards)
      // — previously this whole branch never looked at StaffInvite at all.
      const pending = await prisma.staffInvite.findMany({
        where: { email: { equals: existing.email, mode: 'insensitive' }, redeemedAt: null },
      })
      for (const inv of pending) {
        await ensureOrgLink(existing.id, inv.role as StaffRole, inv.institutionId, inv.employerId)
        await prisma.staffInvite.update({ where: { id: inv.id }, data: { redeemedAt: new Date() } })
      }

      // Mirror the same email-matched staff fallback the brand-new-user
      // branch below already has. Someone can reach THIS branch (an
      // existing User row, matched by azureAdId) while still missing
      // their staff link if that row was created before they had any
      // invite or staff access — most importantly the platform's own
      // bootstrap Global Admin: their rc-admin sign-in lives on the
      // separate Workforce AD tenant (a different azureAdId, a different
      // User row with the real AdminUser link) from their rc-learner CIAM
      // identity. If that CIAM identity was ever registered as a plain
      // learner (e.g. an earlier attempt before this fix existed), every
      // later sign-in hits this `existing` branch and — without this
      // check — would loop forever with no pending StaffInvite to redeem,
      // since the bootstrap admin never gets one. So: whenever there's no
      // pending invite to redeem, also look for another User under the
      // same email who already has real staff access, and mirror it onto
      // this identity too.
      if (pending.length === 0) {
        const existingStaffByEmail = await prisma.user.findFirst({
          where: {
            id: { not: existing.id },
            email: { equals: existing.email, mode: 'insensitive' },
            OR: [
              { adminUser: { isNot: null } },
              { institutionUser: { isNot: null } },
              { employerUser: { isNot: null } },
            ],
          },
          include: { adminUser: true, institutionUser: true, employerUser: true },
        })
        if (existingStaffByEmail) {
          await ensureOrgLink(
            existing.id,
            existingStaffByEmail.role as StaffRole,
            existingStaffByEmail.institutionUser?.institutionId ?? null,
            existingStaffByEmail.employerUser?.employerId ?? null
          )
        }
      }

      const refreshed = await prisma.user.findUnique({
        where: { id: existing.id },
        include: { learner: true, institutionUser: true, employerUser: true, adminUser: true },
      })
      if (!refreshed) {
        return { data: null, error: { code: 'USER_NOT_FOUND', message: 'User disappeared during registration', statusCode: 500 } }
      }
      await ensureOrgLink(refreshed.id, refreshed.role as StaffRole, refreshed.institutionUser?.institutionId ?? null, refreshed.employerUser?.employerId ?? null)

      // Platform tier (Global Admin / Coordinator) — orthogonal to
      // institutionId/employerId above. Frontends use this to offer a
      // global-staff org picker instead of "access not set up" when someone
      // has platform-wide access but no org of their own (see
      // InstitutionAccessGate/EmployerAccessGate in rc-institution/rc-employer).
      const platformRole = refreshed.adminUser ? (refreshed.adminUser.role === 'admin' ? 'admin' : 'coordinator') : null

      // A Learner row is not exclusive with a staff role — an institution
      // tutor or rc_admin signing into the learner app (body.role === 'learner')
      // should get their own Learner record too, rather than the registration
      // silently succeeding with learnerId: null and leaving the learner app
      // stuck waiting for an id that will never arrive.
      let learnerId = refreshed.learner?.id ?? null
      if (!learnerId && body.role === 'learner') {
        learnerId = await provisionLearner(refreshed.id, refreshed.email)
      } else if (learnerId) {
        await seedSMProgress(learnerId)
      }

      // Learner runtime branding (--rc-accent etc.) is keyed off the
      // learner's institution, not the staff org link above — fetch it
      // only when this sign-in actually has a Learner row.
      const learnerInstitution = learnerId
        ? shapeInstitutionBrand((await prisma.learner.findUnique({ where: { id: learnerId }, include: { institution: true } }))?.institution ?? null)
        : null

      return {
        data: {
          ...refreshed, learnerId, platformRole, isNewUser: false,
          institutionId: refreshed.institutionUser?.institutionId ?? null,
          employerId:    refreshed.employerUser?.employerId ?? null,
          institution: learnerInstitution,
        },
        error: null,
      }
    }

    if (body.role === 'learner') {
      // A brand-new sign-in to rc-learner has never been seen under ANY
      // identity tenant before, so this is the only place a staff invite
      // can be picked up for someone whose very first touch on the
      // platform happens to be the learner app — most importantly RC
      // staff (rc_admin/rc_analyst/rc_support), who authenticate rc-admin
      // through the separate Workforce Azure AD tenant and therefore can
      // NEVER reach the `existing` branch above via rc-learner's CIAM
      // identity: their rc-admin sign-in and rc-learner sign-in produce
      // two different azureAdId values on two different tenants, so
      // without this check they'd register as a plain learner forever,
      // stuck on the "not connected" splash despite having a real
      // Coordinator/Admin invite waiting for them. Institution/employer
      // staff share rc-learner's CIAM tenant so they'd normally pick this
      // up on their org app instead — but if rc-learner happens to be the
      // first app they ever open, they hit exactly the same gap, so this
      // check isn't limited to RC-staff roles.
      const staffInvite = await prisma.staffInvite.findFirst({
        where: { email: { equals: body.email, mode: 'insensitive' }, redeemedAt: null },
        orderBy: { createdAt: 'desc' },
      })

      // A pending invite isn't the only way someone can already be staff:
      // the very first rc_admin ever (the bootstrap account — see the
      // isBootstrap branch below) never gets a StaffInvite row at all,
      // since by definition nobody existed yet to create one for them.
      // Anyone else whose invite was redeemed before this fix existed is
      // in the same boat. So when there's no pending invite, also check
      // for an existing User under this email (any tenant, any prior
      // sign-in) who already has real staff access, and mirror it onto
      // this brand-new CIAM identity the same way. Without this, the
      // platform's own Global Admin could sign into rc-learner and be
      // told "not connected."
      const existingStaffByEmail = staffInvite ? null : await prisma.user.findFirst({
        where: {
          email: { equals: body.email, mode: 'insensitive' },
          OR: [
            { adminUser: { isNot: null } },
            { institutionUser: { isNot: null } },
            { employerUser: { isNot: null } },
          ],
        },
        include: { adminUser: true, institutionUser: true, employerUser: true },
      })

      const role: StaffRole | 'learner' =
        staffInvite ? (staffInvite.role as StaffRole) :
        existingStaffByEmail ? (existingStaffByEmail.role as StaffRole) :
        'learner'
      const user = await prisma.user.create({
        data: { azureAdId: body.azureAdId, email: body.email, displayName: body.displayName, role, lastSignInAt: new Date() },
      })

      let institutionId: string | null = null
      let employerId: string | null = null
      let platformRole: 'admin' | 'coordinator' | null = null
      if (staffInvite) {
        institutionId = staffInvite.institutionId
        employerId = staffInvite.employerId
        await ensureOrgLink(user.id, role as StaffRole, institutionId, employerId)
        await prisma.staffInvite.update({ where: { id: staffInvite.id }, data: { redeemedAt: new Date() } })
        platformRole = role === 'rc_admin' ? 'admin' : (role === 'rc_analyst' || role === 'rc_support') ? 'coordinator' : null
      } else if (existingStaffByEmail) {
        institutionId = existingStaffByEmail.institutionUser?.institutionId ?? null
        employerId = existingStaffByEmail.employerUser?.employerId ?? null
        await ensureOrgLink(user.id, role as StaffRole, institutionId, employerId)
        platformRole = existingStaffByEmail.adminUser
          ? (existingStaffByEmail.adminUser.role === 'admin' ? 'admin' : 'coordinator')
          : null
      }

      // Still provision a Learner row regardless of the resolved role —
      // they signed into the learner app, so they need one, the same way
      // an existing staff user picking up rc-learner for the first time
      // gets one via the `existing` branch above. getLearnerAccess()
      // unlocks all curriculum automatically for this User's role when
      // it's rc_admin/rc_analyst/rc_support/institution_admin/institution_tutor
      // (see lib/access.ts's STAFF_PREVIEW_ROLES) — no AccessGrant needed.
      const learnerId = await provisionLearner(user.id, user.email)
      // A permanent, standalone log entry (no FK to the User row it
      // describes — see PlatformActivityEvent) of everyone who has ever
      // registered on the platform, staff or plain learner alike, so this
      // stays discoverable even if the account itself is later deleted
      // (see the account_deleted event below). Distinguish a staff invite
      // picked up here (their first-ever touch happened to be rc-learner)
      // from an ordinary self-serve learner sign-up, so the activity feed
      // reads accurately either way.
      await prisma.platformActivityEvent.create({
        data: (staffInvite || existingStaffByEmail)
          ? {
              type: 'staff_registered',
              description: `${body.displayName} registered as ${role} (first signed in via rc-learner)`,
              entityId: user.id, entityName: body.displayName,
              metadata: { email: body.email, role },
            }
          : { type: 'learner_registered', description: `${body.displayName} joined as a learner`, entityId: user.id, entityName: body.displayName },
      })
      const learnerInstitution = shapeInstitutionBrand(
        (await prisma.learner.findUnique({ where: { id: learnerId }, include: { institution: true } }))?.institution ?? null
      )
      reply.code(201)
      return { data: { ...user, learnerId, platformRole, isNewUser: true, institutionId, employerId, institution: learnerInstitution }, error: null }
    }

    // Staff role — bootstrap or invite required. Bootstrap is keyed off
    // AdminUser (the real source of truth for platform tier), not the
    // legacy User.role string.
    const rcAdminCount = await prisma.adminUser.count({ where: { role: 'admin' } })
    let invite = await prisma.staffInvite.findFirst({
      where: { email: { equals: body.email, mode: 'insensitive' }, redeemedAt: null },
      orderBy: { createdAt: 'desc' },
    })

    const isBootstrap = rcAdminCount === 0 && !invite
    if (!invite && !isBootstrap) {
      return reply.code(403).send({
        error: { code: 'NOT_INVITED', message: "Your account isn't set up yet — ask your Renewables Connect admin to invite you.", statusCode: 403 },
      })
    }

    const role: StaffRole = isBootstrap ? 'rc_admin' : (invite!.role as StaffRole)
    const institutionId = invite?.institutionId ?? null
    const employerId = invite?.employerId ?? null

    const user = await prisma.user.create({
      data: { azureAdId: body.azureAdId, email: body.email, displayName: body.displayName, role, lastSignInAt: new Date() },
    })
    await ensureOrgLink(user.id, role, institutionId, employerId)
    if (invite) {
      await prisma.staffInvite.update({ where: { id: invite.id }, data: { redeemedAt: new Date() } })
    }

    // Same permanent, FK-free registration log as the learner branch above
    // — this was previously missing here entirely, so no staff sign-in
    // (rc-admin, rc-institution or rc-employer) ever showed up as "someone
    // registered," which broke the goal of a durable record of everyone
    // who's ever registered regardless of current access.
    await prisma.platformActivityEvent.create({
      data: {
        type: 'staff_registered',
        description: isBootstrap
          ? `${body.displayName} registered as the first Global Admin (bootstrap)`
          : `${body.displayName} registered as ${role}`,
        entityId: user.id, entityName: body.displayName,
        metadata: { email: body.email, role, institutionId, employerId },
      },
    })

    const platformRole = role === 'rc_admin' ? 'admin' : (role === 'rc_analyst' || role === 'rc_support') ? 'coordinator' : null

    reply.code(201)
    return { data: { ...user, learnerId: null, platformRole, isNewUser: true, institutionId, employerId }, error: null }
  })
}
