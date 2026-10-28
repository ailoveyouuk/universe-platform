/**
 * Accounts that can never be locked out of Universe (2026-10-28, Lewis's instruction).
 * They must always be a SUPER_ADMIN and ACTIVE. The app refuses to deactivate them, change their platform role, change their
 * roles or reset their sign-in, and the sign-in guard puts the role and status back if anything else (a script, the database) changed them.
 * Break-glass if the Microsoft identity itself changed: run the "Restore protected admin" workflow (it re-invites the account so the next sign-in re-links it).
 * Add an address here only with the owner's say-so.
 */
export const PROTECTED_ADMIN_EMAILS: readonly string[] = ["lewis@eduparcs.onmicrosoft.com"];

export const isProtectedAdminEmail = (email: string | null | undefined): boolean =>
  !!email && PROTECTED_ADMIN_EMAILS.includes(email.trim().toLowerCase());

export const PROTECTED_MESSAGE = "This is a protected administrator account. It cannot be deactivated, demoted or have its sign-in reset from the app.";
