import { prisma, withTenantContext } from "./index";

/**
 * Data-sharing consent model (2026-09-24 decision — see architecture doc,
 * "Anonymized cross-tenant insights"): consent is CONTRACTUAL, not a
 * self-service toggle. Every organization agrees to the anonymized-insights
 * terms (as part of Universe's privacy policy / data sharing agreement) as a
 * condition of onboarding — an org that doesn't want to consent doesn't use
 * the platform. So there's no per-org opt-in UI; instead, provisioning a new
 * organization ALWAYS creates one DataSharingConsent row alongside it,
 * recording that the signed agreement is on file. `acceptedById` is the
 * platform-staff member who provisioned the org (i.e. who confirmed the
 * agreement is on file), not an org user — the org's own users don't exist
 * yet at provisioning time. If the terms are ever renegotiated for a specific
 * org (e.g. a client insists on a narrower scope or opts out entirely),
 * that's a `revokedAt` + a fresh row, done manually by platform staff — not
 * something this function needs to anticipate.
 */
export const CURRENT_DATA_SHARING_TERMS_VERSION = "2026.1";

/** The categories every org consents to feeding into anonymized cross-tenant
 * insights by default, per the current terms. Kept as a named export (not
 * inlined) so the Insights ETL and this provisioning step can't drift apart
 * on what "the default scope" means. */
export const DEFAULT_DATA_SHARING_SCOPE = ["pricing", "specifications", "quality"];

/**
 * The starter role template every new tenant organization gets on
 * provisioning. Shared by the seed script and the API's
 * OrganizationsService (used from the Admin app) so there's exactly one
 * definition — no organization, including whichever one pilots Universe
 * first, gets special-cased treatment.
 */
export const DEFAULT_ROLE_TEMPLATE: { name: string; appScope: string; permissionKeys: string[] }[] = [
  {
    name: "Organization Admin",
    appScope: "*",
    permissionKeys: [
      "projects.view",
      "projects.create",
      "projects.edit",
      "projects.delete",
      "projects.financials.view",
      "projects.financials.edit",
      "org.users.manage",
      "org.roles.manage",
    ],
  },
  {
    name: "Project Manager",
    appScope: "project-management",
    permissionKeys: [
      "projects.view",
      "projects.create",
      "projects.edit",
      "projects.financials.view",
      "projects.financials.edit",
    ],
  },
  {
    name: "Read Only",
    appScope: "project-management",
    permissionKeys: ["projects.view"],
  },
];

/**
 * SUPPLIER-type organizations (added 2026-09-24 — see architecture doc,
 * "Supplier/manufacturer marketplace") get this instead of
 * DEFAULT_ROLE_TEMPLATE — "Project Manager"/"Read Only" don't mean anything
 * for an org that doesn't run projects on Universe, it manages a directory
 * listing. One role for now (no read-only tier yet — a supplier org is
 * expected to start small); split further if/when a real need shows up.
 */
export const DEFAULT_SUPPLIER_ROLE_TEMPLATE: { name: string; appScope: string; permissionKeys: string[] }[] = [
  {
    name: "Supplier Admin",
    appScope: "*",
    permissionKeys: ["supplier.profile.manage", "supplier.products.manage", "supplier.leads.view", "org.users.manage", "org.roles.manage"],
  },
];

/**
 * Provisions a new tenant organization with its starter roles — either the
 * buyer template (DEFAULT_ROLE_TEMPLATE) or, for a SUPPLIER-type org, the
 * supplier one above. This is what Universe's platform-operator team runs
 * (via the Admin app, or directly during early bring-up) to onboard each new
 * organization — every organization goes through this same path, with no
 * default or "house" organization treated differently, and no special-cased
 * fork for suppliers beyond which role template it gets.
 *
 * The role-creation loop runs inside withTenantContext(org.id, ...) — the
 * `roles` table is RLS-protected (see infra/sql/row-level-security.sql),
 * and unlike EntraAuthGuard's identity lookup (which genuinely has to span
 * every organization, since it doesn't know the caller's org yet), THIS
 * write is for a specific, already-created org's own roles, so it's a
 * normal tenant-scoped operation, not a platform-staff exception. Found the
 * hard way: `prisma.role.upsert` with no session context set silently hits
 * RLS's default-deny BLOCK PREDICATE once RLS is live — confirmed in CI
 * 2026-09-24 running tenant-isolation.test.ts for the first time against a
 * real database.
 */
export async function createOrganizationWithDefaultRoles(params: {
  name: string;
  slug: string;
  /** BUYER (default) or SUPPLIER — see Organization.type's doc comment in
   * schema.prisma. */
  type?: "BUYER" | "SUPPLIER";
  /** The platform-staff user provisioning this org, i.e. confirming the
   * signed data-sharing agreement is on file. Optional only for the seed
   * script's own bootstrap path, which has no authenticated caller — every
   * real API-driven creation (OrganizationsService.create) always has one. */
  acceptedById?: string;
}) {
  const type = params.type ?? "BUYER";
  const roleTemplate = type === "SUPPLIER" ? DEFAULT_SUPPLIER_ROLE_TEMPLATE : DEFAULT_ROLE_TEMPLATE;

  const org = await prisma.organization.upsert({
    where: { slug: params.slug },
    update: {},
    create: { name: params.name, slug: params.slug, type },
  });

  // Both the consent row and the role loop below run inside the SAME
  // withTenantContext(org.id, ...) — data_sharing_consents is RLS-protected
  // (infra/sql/row-level-security.sql) exactly like roles is, so a bare
  // `prisma.dataSharingConsent.upsert` with no session context would hit the
  // same default-deny BLOCK PREDICATE that bit the role-creation loop
  // originally (see this function's header comment). Mandatory, not
  // optional — one consent record per org, created here so there's no path
  // to a provisioned organization that skipped it.
  await withTenantContext(org.id, async (tx) => {
    await tx.dataSharingConsent.upsert({
      where: { organizationId: org.id },
      update: {},
      create: {
        organizationId: org.id,
        scope: JSON.stringify(DEFAULT_DATA_SHARING_SCOPE),
        termsVersion: CURRENT_DATA_SHARING_TERMS_VERSION,
        acceptedById: params.acceptedById,
      },
    });

    for (const role of roleTemplate) {
      const created = await tx.role.upsert({
        where: { organizationId_name_appScope: { organizationId: org.id, name: role.name, appScope: role.appScope } },
        update: {},
        create: { organizationId: org.id, name: role.name, appScope: role.appScope },
      });

      for (const key of role.permissionKeys) {
        const permission = await tx.permission.findUniqueOrThrow({ where: { key } });
        await tx.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: created.id, permissionId: permission.id } },
          update: {},
          create: { roleId: created.id, permissionId: permission.id },
        });
      }
    }
  });

  return org;
}
