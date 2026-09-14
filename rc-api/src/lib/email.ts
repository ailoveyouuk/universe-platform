import { Resend } from 'resend'
import { config } from '../config'
import { prisma } from './prismaClient'

// Thin wrapper around Resend so every send goes through one place: it logs
// to EmailLog (best-effort — a logging failure never surfaces to the
// caller), and no-ops with a console warning whenever RESEND_API_KEY isn't
// configured yet, so invite/import routes can call this unconditionally
// without needing to know whether email is live in this environment.
let resendClient: Resend | null = null
function getResendClient(): Resend | null {
  if (!config.email.resendApiKey) return null
  if (!resendClient) resendClient = new Resend(config.email.resendApiKey)
  return resendClient
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  kind: string // free-form tag for EmailLog, e.g. 'learner_welcome' | 'staff_update'
  institutionId?: string | null
  replyTo?: string
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const client = getResendClient()
  if (!client) {
    console.warn(`[email] RESEND_API_KEY not configured — skipping "${input.kind}" email to ${input.to} ("${input.subject}")`)
    return
  }

  let resendId: string | null = null
  let error: string | null = null
  try {
    const { data, error: sendError } = await client.emails.send({
      from: config.email.fromRegistrations,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      replyTo: input.replyTo ?? config.email.supportEmail,
    })
    if (sendError) {
      error = sendError.message ?? JSON.stringify(sendError)
      console.error(`[email] Resend rejected "${input.kind}" to ${input.to}:`, error)
    } else {
      resendId = data?.id ?? null
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    console.error(`[email] Failed to send "${input.kind}" to ${input.to}:`, error)
  }

  // Best-effort logging — never let a logging failure look like a send
  // failure to the caller, and never throw back into the invite/import
  // request that triggered this.
  try {
    await prisma.emailLog.create({
      data: {
        kind: input.kind,
        toEmail: input.to,
        subject: input.subject,
        institutionId: input.institutionId ?? null,
        resendId,
        error,
      },
    })
  } catch (logErr) {
    console.error('[email] Failed to write EmailLog row:', logErr)
  }
}
