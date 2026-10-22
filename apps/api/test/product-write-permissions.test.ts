import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ExportRequestsService } from "../src/product-catalog/export-requests.service";
import { ExportRestrictionsService } from "../src/product-catalog/export-restrictions.service";
import { ProductCatalogService } from "../src/product-catalog/product-catalog.service";
import { ProductExportsService } from "../src/product-catalog/product-exports.service";
import { ProductFamiliesService } from "../src/product-catalog/product-families.service";
import { ProductRegistrationsService } from "../src/product-catalog/product-registrations.service";
import { ProductSafetyNoticesService } from "../src/product-catalog/product-safety-notices.service";
import { RegulatoryWatchService } from "../src/product-catalog/regulatory-watch.service";

/**
 * Product Database permission matrix (step 5, 2026-10-22). Every write that must be closed to an ordinary organisation user is tried as
 * one with no permissions and no staff role, and as a demo-organisation user where the write reaches the shared catalogue. Each must be
 * refused before touching the database, so this guards the check being the first line of each method.
 */
describe("Product Database writes: ordinary and demo users are refused", () => {
  const id = randomUUID();
  const base = { id, organizationId: randomUUID(), homeOrganizationId: randomUUID(), email: "p@example.com", forename: "Plain", surname: "User", organizationName: "Plain Org",
    organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null };
  const plain = { ...base, platformStaffRole: "NONE", permissions: [] } as unknown as RequestUser;
  const demo = { ...plain, isDemoUser: true } as unknown as RequestUser;
  const rid = () => randomUUID();

  const families = new ProductFamiliesService();
  const restrictions = new ExportRestrictionsService();
  const safety = new ProductSafetyNoticesService();
  const watch = new RegulatoryWatchService(safety, restrictions);
  const catalogue = new ProductCatalogService();
  const exportRequests = new ExportRequestsService(new ProductExportsService(catalogue, new ProductRegistrationsService(), {} as never, safety, restrictions));

  it("product families are staff-only", async () => {
    await expect(families.create(plain, { name: "x", category: "y" } as never)).rejects.toMatchObject({ status: 403 });
    await expect(families.update(plain, rid(), { name: "x" } as never)).rejects.toMatchObject({ status: 403 });
    await expect(families.assign(plain, rid(), { familyId: rid() } as never)).rejects.toMatchObject({ status: 403 });
    await expect(families.createFromProduct(plain, rid())).rejects.toMatchObject({ status: 403 });
  });

  it("regulatory watch decisions and export restrictions are staff-only", async () => {
    await expect(watch.confirm(plain, rid(), "n")).rejects.toMatchObject({ status: 403 });
    await expect(watch.dismiss(plain, rid(), "n")).rejects.toMatchObject({ status: 403 });
    await expect(restrictions.create(plain, { restrictingCountryCode: "GB", medicineName: "x" } as never)).rejects.toMatchObject({ status: 403 });
    await expect(restrictions.update(plain, rid(), { notes: "x" } as never)).rejects.toMatchObject({ status: 403 });
  });

  it("ratifying or rejecting an amendment needs products.approve; ratifying is closed to demo users", async () => {
    await expect(catalogue.ratifyAmendment(plain, rid())).rejects.toMatchObject({ status: 403 });
    await expect(catalogue.rejectAmendment(plain, rid(), { reason: "no" } as never)).rejects.toMatchObject({ status: 403 });
    await expect(catalogue.ratifyAmendment(demo, rid())).rejects.toMatchObject({ status: 403 });
  });

  it("demo users cannot add to or import into the shared catalogue", async () => {
    await expect(catalogue.create(demo, { name: "x", category: "y" } as never)).rejects.toMatchObject({ status: 403 });
    await expect(catalogue.importBatch(demo, "TEST", [] as never)).rejects.toMatchObject({ status: 403 });
  });

  it("only a global admin can decide a catalogue export request", async () => {
    await expect(exportRequests.decide(plain, rid(), { approve: true } as never)).rejects.toMatchObject({ status: 403 });
  });
});
