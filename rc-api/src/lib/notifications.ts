// Glue between the invite-creation routes and the onboarding-notification
// emails (lib/email.ts + lib/emailTemplates.ts). Two entry points:
//   - notifyInstitutionStaff: call once per institution touched by a
//     mutation (staff added, learners added, cohorts created) — fans out
//     ONE summary email to every current staff recipient at that
//     institution (redeemed InstitutionUser accounts + still-pending
//     StaffInvite rows), rather than one email per underlying change.
//   - notifyNewLearner: call once per LearnerInvite created — always
//     individual, never batched, since it's addressed to that one learner.
// Both are best-effort: sendEmail() itself never throws (see lib/email.ts),
// so a caller can fire-and-forget these without try/catch, but callers
// should still `void` or `await` deliberately rather than letting an
// unhandled rejection surface if something upstream changes that contract.

import { prisma } from './prismaClient'
import { sendEmail } from './email'
import { learnerWelcomeEmail, institutionUpdateEmail, type StaffContact } from './emailTemplates'
import { ACCESS_GRANT_DAYS } from './access'

interface StaffRecipient { email: string; name: string | null; role: string }

async function getInstitutionStaffRecipients(institutionId: string): Promise<StaffRecipient[]> {
  const [users, invites] = await Promise.all([
    prisma.institutionUser.findMany({
      where: { institutionId },
      include: { user: { select: { email: true, displayName: true } } },
    }),
    prisma.staffInvite.findMany({
      where: { institutionId, redeemedAt: null },
    }),
  ])

  const seen = new Set<string>()
  const recipients: StaffRecipient[] = []
  for (const u of users) {
    const email = u.user.email.toLowerCase()
    if (seen.has(email)) continue
    seen.add(email)
    recipients.push({ email: u.user.email, name: u.user.displayName ?? null, role: u.role })
  }
  for (const inv of invites) {
    const email = inv.email.toLowerCase()
    if (seen.has(email)) continue
    seen.add(email)
    const name = inv.firstName ? `${inv.firstName}${inv.lastName ? ` ${inv.lastName}` : ''}` : null
    recipients.push({ email: inv.email, name, role: inv.role })
  }
  return recipients
}

export interface InstitutionChangeSet {
  institutionId: string
  institutionName: string
  newStaff?: { email: string; role: string; name?: string | null }[]
  newLearnerCount?: number
  newCohorts?: { name: string; parts: number[]; accessDurationDays: number }[]
}

// Sends ONE summary email to every current staff recipient at the
// institution, describing everything in `change` together — so a 45-row
// import produces one email per staff member, not forty-five.
export async function notifyInstitutionStaff(change: InstitutionChangeSet): Promise<void> {
  const hasNews = (change.newStaff?.length ?? 0) > 0 || (change.newLearnerCount ?? 0) > 0 || (change.newCohorts?.length ?? 0) > 0
  if (!hasNews) return

  const recipients = await getInstitutionStaffRecipients(change.institutionId)
  if (recipients.length === 0) return

  // Cheap "first setup" vs "update" framing: if nothing existed at this
  // institution beyond what THIS change just created, call it a first
  // setup rather than an update.
  const [priorStaffCount, priorLearnerInviteCount, priorCohortCount] = await Promise.all([
    prisma.institutionUser.count({ where: { institutionId: change.institutionId } }),
    prisma.learnerInvite.count({ where: { institutionId: change.institutionId } }),
    prisma.cohort.count({ where: { institutionId: change.institutionId } }),
  ])
  const isFirstSetup =
    priorStaffCount <= (change.newStaff?.length ?? 0) &&
    priorLearnerInviteCount <= (change.newLearnerCount ?? 0) &&
    priorCohortCount <= (change.newCohorts?.length ?? 0)

  for (const r of recipients) {
    const { subject, html } = institutionUpdateEmail({
      recipientName: r.name,
      institutionName: change.institutionName,
      isFirstSetup,
      newStaff: change.newStaff ?? [],
      newLearnerCount: change.newLearnerCount ?? 0,
      newCohorts: change.newCohorts ?? [],
    })
    await sendEmail({ to: r.email, subject, html, kind: 'institution_update', institutionId: change.institutionId })
  }
}

export interface LearnerNotifyInput {
  email: string
  firstName?: string | null
  institutionId?: string | null
  institutionName?: string | null
  cohortName?: string | null
  parts: number[]
  cohortAccessDurationDays?: number | null
}

// Always one email per learner — never batched, since it's about them
// specifically (their own access, their own institution, who to contact).
export async function notifyNewLearner(input: LearnerNotifyInput): Promise<void> {
  let staffContacts: StaffContact[] | undefined
  if (input.institutionId) {
    const staff = await getInstitutionStaffRecipients(input.institutionId)
    // Only recipients we have a real name for (a redeemed account, or a
    // pending invite that came in with a name attached) make a sensible
    // "get in touch with" contact — cap at 3 so this doesn't turn into a
    // full staff directory.
    staffContacts = staff.filter((s): s is StaffRecipient & { name: string } => s.name !== null)
      .slice(0, 3)
      .map(s => ({ name: s.name, email: s.email, role: s.role }))
  }

  const { subject, html } = learnerWelcomeEmail({
    email: input.email,
    firstName: input.firstName ?? null,
    institutionName: input.institutionName ?? null,
    cohortName: input.cohortName ?? null,
    staffContacts,
    parts: input.parts,
    durationDays: input.cohortAccessDurationDays ?? ACCESS_GRANT_DAYS,
  })
  await sendEmail({ to: input.email, subject, html, kind: 'learner_welcome', institutionId: input.institutionId ?? null })
}
