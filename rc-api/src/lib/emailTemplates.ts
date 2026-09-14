// Onboarding-notification email content — see lib/email.ts for the actual
// send/log mechanics. Two email "families":
//   - learnerWelcomeEmail:  one per learner, the moment their LearnerInvite
//     is created (whether via single add, bulk add, self-service, or the
//     Excel import) — describes THEIR OWN access, institution (if any),
//     who to contact for support, and how to log in.
//   - institutionUpdateEmail: one per institution staff member (redeemed or
//     still-pending), sent as a single summary whenever a batch of changes
//     lands on their institution's account — new staff, new learners, new/
//     updated cohorts — confirming things are live and how to log in. This
//     is also literally a new staff member's own "you're set up" email,
//     since they're included in the recipient list for the same batch that
//     created their own invite.
// Employers are deliberately out of scope for now (Lewis: "we'll tackle
// that later").

import { config } from '../config'

const PART_LABELS: Record<number, string> = { 1: 'Part 1', 2: 'Part 2', 3: 'Part 3' }

const ROLE_LABELS: Record<string, string> = {
  institution_admin: 'Institution Admin',
  institution_tutor: 'Institution Tutor',
  learner: 'Learner',
}

export function describeAccess(parts: number[]): string {
  const sorted = [...parts].sort((a, b) => a - b)
  if (sorted.length === 0) return 'no curriculum access yet'
  if (sorted.length === 3) return 'the full course (Parts 1, 2 and 3)'
  return sorted.map(p => PART_LABELS[p] ?? `Part ${p}`).join(' and ')
}

function describeDuration(days: number): string {
  if (days % 365 === 0 && days / 365 >= 1) {
    const years = days / 365
    return `${days} days (${years} year${years === 1 ? '' : 's'}) from your first sign-in`
  }
  return `${days} days from your first sign-in`
}

// ── Shared visual shell ─────────────────────────────────────────────────
function emailShell(opts: { preheader: string; title: string; bodyHtml: string; loginUrl: string; loginLabel: string }): string {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f6f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;font-size:1px;color:#f4f6f2;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${opts.preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f2;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e3e8dd;">
        <tr><td style="background:#1f6f4a;padding:24px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;font-family:inherit;">Renewables Connect</span>
        </td></tr>
        <tr><td style="padding:32px;color:#1a1a1a;font-size:15px;line-height:1.6;">
          <h1 style="font-size:20px;margin:0 0 16px;color:#14331f;">${opts.title}</h1>
          ${opts.bodyHtml}
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px;">
            <tr><td style="border-radius:8px;background:#1f6f4a;">
              <a href="${opts.loginUrl}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-weight:600;text-decoration:none;font-size:14px;">${opts.loginLabel}</a>
            </td></tr>
          </table>
          <p style="font-size:13px;color:#556052;margin-top:8px;">Sign in with the Microsoft account tied to this email address — there's no separate password to set up.</p>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f4f6f2;border-top:1px solid #e3e8dd;font-size:12px;color:#6b7566;line-height:1.6;">
          Technical queries: <a href="mailto:${config.email.supportEmail}" style="color:#1f6f4a;">${config.email.supportEmail}</a><br>
          Renewables Connect
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Learner welcome email ───────────────────────────────────────────────
export interface StaffContact { name: string | null; email: string; role: string }

export interface LearnerWelcomeInput {
  email: string
  firstName?: string | null
  institutionName?: string | null
  cohortName?: string | null
  staffContacts?: StaffContact[]
  parts: number[]
  durationDays: number
}

export function learnerWelcomeEmail(input: LearnerWelcomeInput): { subject: string; html: string } {
  const greeting = input.firstName ? `Hi ${input.firstName},` : 'Hi there,'
  const access = describeAccess(input.parts)
  const duration = describeDuration(input.durationDays)

  let institutionPara = ''
  if (input.institutionName) {
    institutionPara = `<p>You've been registered as a learner with <strong>${input.institutionName}</strong>${input.cohortName ? ` (${input.cohortName})` : ''} on Renewables Connect.</p>`
  } else {
    institutionPara = `<p>You've been given independent access to Renewables Connect — not tied to an institution or employer.</p>`
  }

  let supportPara = ''
  if (input.staffContacts && input.staffContacts.length > 0) {
    const list = input.staffContacts
      .map(c => `${c.name ? `${c.name} (${ROLE_LABELS[c.role] ?? c.role})` : ROLE_LABELS[c.role] ?? c.role} — <a href="mailto:${c.email}" style="color:#1f6f4a;">${c.email}</a>`)
      .join('<br>')
    supportPara = `<p>For questions about your course or access, get in touch with your institution's team:</p><p style="margin:0 0 16px;">${list}</p>`
  }

  const bodyHtml = `
    <p>${greeting}</p>
    ${institutionPara}
    <p>Your access: <strong>${access}</strong>, valid for ${duration}.</p>
    ${supportPara}
  `

  const subject = input.institutionName
    ? `You're set up on Renewables Connect — ${input.institutionName}`
    : `You're set up on Renewables Connect`

  return {
    subject,
    html: emailShell({
      preheader: `Your Renewables Connect access is ready — ${access}.`,
      title: 'Your access is ready',
      bodyHtml,
      loginUrl: config.learnerAppUrl,
      loginLabel: 'Sign in to Renewables Connect',
    }),
  }
}

// ── Institution staff update email ──────────────────────────────────────
export interface InstitutionUpdateInput {
  recipientName?: string | null
  institutionName: string
  isFirstSetup: boolean
  newStaff: { email: string; role: string; name?: string | null }[]
  newLearnerCount: number
  newCohorts: { name: string; parts: number[]; accessDurationDays: number }[]
}

export function institutionUpdateEmail(input: InstitutionUpdateInput): { subject: string; html: string } {
  const greeting = input.recipientName ? `Hi ${input.recipientName},` : 'Hi there,'

  const headline = input.isFirstSetup
    ? `<strong>${input.institutionName}</strong> is now set up and live on Renewables Connect.`
    : `<strong>${input.institutionName}</strong>'s account on Renewables Connect has been updated.`

  const parts: string[] = []
  if (input.newStaff.length > 0) {
    const list = input.newStaff
      .map(s => `${s.name ? `${s.name} — ${s.email}` : s.email} (${ROLE_LABELS[s.role] ?? s.role})`)
      .join('<br>')
    parts.push(`<p><strong>${input.newStaff.length} staff member${input.newStaff.length === 1 ? '' : 's'} added:</strong><br>${list}</p>`)
  }
  if (input.newLearnerCount > 0) {
    parts.push(`<p><strong>${input.newLearnerCount} learner${input.newLearnerCount === 1 ? '' : 's'} invited.</strong></p>`)
  }
  if (input.newCohorts.length > 0) {
    const list = input.newCohorts
      .map(c => `${c.name} — ${describeAccess(c.parts)}, ${describeDuration(c.accessDurationDays)}`)
      .join('<br>')
    parts.push(`<p><strong>${input.newCohorts.length} cohort${input.newCohorts.length === 1 ? '' : 's'} set up:</strong><br>${list}</p>`)
  }

  const bodyHtml = `
    <p>${greeting}</p>
    <p>${headline}</p>
    ${parts.join('\n')}
    <p>Everyone above can sign in now with their Microsoft account — no separate password needed.</p>
  `

  const subject = input.isFirstSetup
    ? `${input.institutionName} is live on Renewables Connect`
    : `${input.institutionName}: account update — Renewables Connect`

  return {
    subject,
    html: emailShell({
      preheader: headline.replace(/<[^>]+>/g, ''),
      title: input.isFirstSetup ? 'Your account is live' : 'Account update',
      bodyHtml,
      loginUrl: config.institutionAppUrl,
      loginLabel: 'Sign in to your institution dashboard',
    }),
  }
}
