import 'dotenv/config'

export const config = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDev: process.env.NODE_ENV !== 'production',

  db: {
    url: process.env.DATABASE_URL ?? '',
  },

  // Used to build invite links (routes/invites.ts, admin cohort creation) —
  // the live learner app origin, same value as LEARNER_APP_URL used for CORS.
  learnerAppUrl: process.env.LEARNER_APP_URL ?? 'http://localhost:3000',

  // Institution/employer app origins — used in onboarding emails' "how to
  // log in" links (see lib/email.ts). Same values as the CORS origins below.
  institutionAppUrl: process.env.INSTITUTION_APP_URL ?? 'http://localhost:3001',
  employerAppUrl:    process.env.EMPLOYER_APP_URL    ?? 'http://localhost:3002',

  // Onboarding-notification emails (registrations@renewablesconnect.com) —
  // see lib/email.ts / lib/emailTemplates.ts. RESEND_API_KEY is unset in
  // every environment until the domain is verified with Resend; sendEmail()
  // no-ops (logs a warning, doesn't throw) whenever it's missing, so invite
  // creation is never blocked on email delivery being configured.
  email: {
    resendApiKey: process.env.RESEND_API_KEY ?? '',
    fromRegistrations: process.env.EMAIL_FROM_REGISTRATIONS ?? 'Renewables Connect <registrations@renewablesconnect.com>',
    supportEmail: process.env.SUPPORT_EMAIL ?? 'support@renewablesconnect.com',
  },

  azure: {
    tenantId: process.env.AZURE_AD_TENANT_ID ?? '',
    clientId: process.env.AZURE_AD_CLIENT_ID ?? '',
    get jwksUri() {
      return `https://login.microsoftonline.com/${this.tenantId}/discovery/v2.0/keys`
    },
    // The rc-admin/rc-employer/rc-institution app registration issues
    // v1.0-format access tokens for the custom "access_as_user" scope
    // (its manifest's accessTokenAcceptedVersion is unset/1, not 2), so
    // the token's real `iss`/`aud` claims are the legacy v1.0 forms —
    // NOT the v2.0 login.microsoftonline.com/.../v2.0 issuer, and NOT a
    // bare client ID audience. Verified against a live decoded token:
    // iss: "https://sts.windows.net/<tenantId>/", aud: "api://<clientId>".
    get issuer() {
      return `https://sts.windows.net/${this.tenantId}/`
    },
    get audience() {
      return `api://${this.clientId}`
    },
  },

  // Microsoft Entra External ID (CIAM) — the shared "Renewables Connect
  // Customers" identity tenant, hosting one app registration per
  // CIAM-enabled frontend (learner, institution, employer — rc-admin stays
  // workforce-only). Each app registration has its own client ID, so the
  // API has to accept any of them as a valid token audience rather than
  // just one — set AZURE_CIAM_CLIENT_IDS to a comma-separated list on the
  // Container App (AZURE_CIAM_CLIENT_ID, singular, still works too, for
  // back-compat with the original single-app value). Fully inert until a
  // real CIAM tenant exists: every field below is '' until
  // AZURE_CIAM_TENANT_ID is set, and verifyAzureToken() (lib/auth.ts) only
  // attempts CIAM verification when this tenantId is non-empty.
  azureCiam: {
    tenantId: process.env.AZURE_CIAM_TENANT_ID ?? '',
    clientIds: (process.env.AZURE_CIAM_CLIENT_IDS ?? process.env.AZURE_CIAM_CLIENT_ID ?? '')
      .split(',').map(s => s.trim()).filter(Boolean),
    // CIAM's own custom/friendly domain, e.g. "platformcore.ciamlogin.com"
    // — kept only for anything that still wants the friendly form (none of
    // lib/auth.ts's own verification below uses it any more; see next
    // comment). Distinct from the workforce tenant's
    // login.microsoftonline.com host.
    domain: process.env.AZURE_CIAM_DOMAIN ?? '',
    // NOTE: a CIAM tenant always ISSUES tokens with its canonical
    // "<tenantId>.ciamlogin.com" host as the `iss` claim — never the
    // friendly/custom domain (e.g. "platformcore.ciamlogin.com") a user
    // may have actually signed in through. Verified against a real token
    // from rc-employer: iss was
    // "https://6654f402-....ciamlogin.com/6654f402-.../v2.0" even though
    // sign-in went through platformcore.ciamlogin.com. jwksUri/issuer
    // MUST both be built from the tenant-ID host, or jwt.verify's issuer
    // check silently rejects every real token (500ing as a 401
    // "invalid/expired" on every route that actually checks the Bearer
    // token) — this bit rc-employer's /api/admin/employers first only
    // because /api/auth/register never verifies the token at all (it
    // trusts azureAdId from the request body), so the mismatch was
    // invisible until a real protected route was hit.
    get jwksUri() {
      return `https://${this.tenantId}.ciamlogin.com/${this.tenantId}/discovery/v2.0/keys`
    },
    // CIAM issues v2.0-format tokens (unlike the workforce tenant's legacy
    // v1.0 tokens — see the note on `issuer` above) — aud: "<clientId>"
    // (a bare GUID, not an "api://" URI — v2.0 tokens don't use that form).
    get issuer() {
      return `https://${this.tenantId}.ciamlogin.com/${this.tenantId}/v2.0`
    },
    // jsonwebtoken's `audience` verify option accepts an array — valid if
    // the token's aud matches ANY entry, which is exactly what's needed
    // here: one token, issued by one of several client apps in the same
    // tenant, checked against the same shared JWKS/issuer.
    get audience() {
      return this.clientIds
    },
  },

  cors: {
    // Explicit env-var origins (set these in the Container App for production)
    // plus a regex that covers all Azure Static Web Apps preview domains.
    origins: [
      process.env.LEARNER_APP_URL     ?? 'http://localhost:3000',
      process.env.INSTITUTION_APP_URL ?? 'http://localhost:3001',
      process.env.EMPLOYER_APP_URL    ?? 'http://localhost:3002',
      process.env.ADMIN_APP_URL       ?? 'http://localhost:3003',
      /\.azurestaticapps\.net$/,
    ],
  },
}
