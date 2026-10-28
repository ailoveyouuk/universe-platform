# Identity settings review (2026-10-28)

Scope: what the code and infrastructure files say about sign-in (Microsoft Entra External ID, tenant "Universe Platform", universeplatform.ciamlogin.com). What lives only in the Entra portal could not be read from here and is listed as **Lewis to confirm**.

## What the code does (checked)
- **Token checks:** the API verifies every bearer token against the tenant's own OIDC discovery document (issuer and signing keys), and the audience must equal the API app registration's client ID (`UNIVERSE_CIAM_API_AUDIENCE`). Tokens without `oid` or an email claim are rejected.
- **No auto-provisioning:** an identity is let in only if its object ID is already linked, or its email matches a user in status INVITED (first sign-in links it). Deactivated users and suspended organisations are refused; platform staff are exempt from suspension so support can get in.
- **Server-side app gating** is in place (done 2026-10-26).
- **Sessions:** MSAL caches in sessionStorage (not localStorage), no cookies for auth state.
- **Secrets:** no client secret is wired into the API; the Key Vault still holds an unused `universe-ciam-client-secret` entry.

## Change made today
- **Fail closed in production.** If the CIAM settings were ever missing from a production container, the old code skipped token checks and used a fixed local dev user. It now refuses every request with "Sign-in is not configured on this server" whenever `NODE_ENV=production` (the container image sets it). Local development is unchanged.

## Findings to act on
| # | Finding | Action | Who |
|---|---|---|---|
| 1 | First sign-in links an invited user **by email** from the token's `preferred_username`/`upn`. That is only safe if the CIAM sign-up/sign-in flow verifies the email (one-time passcode or a verified social/work account) before issuing a token. | Confirm the user flow requires email verification and that self-service sign-up is off (invite-only). | Lewis (Entra portal) |
| 2 | The `apps/supplier-portal` code still exists although the Supplier Portal was dropped. | Remove its redirect URI from the app registration; decide whether to delete the app folder from the repo. | Lewis decides; Claude removes code |
| 3 | Redirect URIs: each of the six live Static Web Apps (and Insights, Tenders) needs its exact URL registered as a **SPA** redirect URI; no wildcard, no localhost entries once live. | Check the list on the web app registration; remove localhost and old preview hostnames before go-live. | Lewis |
| 4 | Unused secret `universe-ciam-client-secret` in Key Vault. | Delete it (or keep as disabled) once confirmed not needed. Nothing hard-deleted without your say-so. | Lewis |
| 5 | MFA and conditional access for **platform staff** (global admins). | Require MFA for staff; consider a separate break-glass account kept offline. | Lewis |
| 6 | Token lifetimes and sign-out: default access tokens last about an hour; confirm refresh and "sign out everywhere" behave as wanted for deactivated users (the API re-checks status on every request, so a deactivated user is blocked within one call). | No change needed in code; confirm in testing. | Claude + Lewis |
| 7 | The "local dev" bypass still exists for development. | Keep (now blocked in production); never set `LOCAL_DEV_EMAIL` on a deployed container. | Claude |
| 8 | Admin roster: the people holding platform-staff roles. | List them and trim to the minimum before real data arrives. | Lewis |

## Not checked from here
Entra tenant settings, user flows, branding, redirect URI list, MFA policy and staff roster (portal only).
