import { randomUUID } from "node:crypto";
import { prisma } from "@universe/db";
import { afterAll, describe, expect, it } from "vitest";
import { ProductPharmaLinksService } from "../src/product-catalog/product-pharma-links.service";
import { ProductCatalogService } from "../src/product-catalog/product-catalog.service";
import type { RequestUser } from "../src/auth/entra-auth.guard";

const sfx = randomUUID().slice(0, 8);
const svc = new ProductPharmaLinksService();
const approver = { id: "u-" + sfx, forename: "Test", surname: "Approver", email: "t@example.org", permissions: ["products.approve"], platformStaffRole: "NONE", inDemoOrganization: false, organizationId: "x" } as unknown as RequestUser;
const plain = { ...approver, permissions: [] } as unknown as RequestUser;

describe("product ↔ register links", () => {
  let productId = "", refId = "";
  afterAll(async () => {
    await prisma.productPharmaLink.deleteMany({ where: { productMasterId: productId } });
    await prisma.productMaster.deleteMany({ where: { id: productId } });
    await prisma.pharmaReference.deleteMany({ where: { id: refId } });
  });

  it("suggests, needs an approver to confirm, then exposes leaflet links, ATC and the register filter", async () => {
    const ref = await prisma.pharmaReference.create({ data: { source: "EMA", sourceKey: `EMEA/H/C/L${sfx}`, name: `Zarzotest${sfx}`, inn: `filgrastimtest${sfx}`, activeSubstances: `filgrastimtest${sfx}`, atcCode: "L03AA02", productType: "HUMAN", status: "Authorised", rawHash: "h", sourceUrl: `https://www.ema.europa.eu/en/medicines/human/EPAR/zarzotest${sfx}` } });
    refId = ref.id;
    const p = await prisma.productMaster.create({ data: { name: `Zarzotest${sfx} 30 MU`, category: "Pharmaceuticals", brand: `Zarzotest${sfx}`, inn: `filgrastimtest${sfx}`, isSimulated: false } });
    productId = p.id;

    const s = await svc.suggest(approver, productId);
    expect(s.verified).toBe(false);
    const link = s.links.find((l) => l.reference.id === refId);
    expect(link?.status).toBe("SUGGESTED");
    expect(s.pil).toHaveLength(0); // a suggestion never produces a leaflet link

    await expect(svc.decide(plain, link!.id, "CONFIRMED")).rejects.toThrow();
    const c = await svc.decide(approver, link!.id, "CONFIRMED");
    expect(c.verified).toBe(true);
    expect(c.atcCode).toBe("L03AA02");
    expect(c.pil.map((l) => l.kind)).toEqual(["PIL_PDF", "EPAR_PAGE"]);

    const again = await svc.suggest(approver, productId); // does not reset a decided link
    expect(again.links.find((l) => l.reference.id === refId)?.status).toBe("CONFIRMED");

    const list = await new ProductCatalogService().list({ register: "EMA", atc: "L03", q: `Zarzotest${sfx}` });
    expect(list.items.map((i) => i.id)).toContain(productId);
    expect(list.items[0].pharmaVerifiedSources).toEqual(["EMA"]);
    const none = await new ProductCatalogService().list({ register: "NONE", q: `Zarzotest${sfx}` });
    expect(none.items.map((i) => i.id)).not.toContain(productId);
  });

  it("rejects non-https hand-entered leaflet links and shows good ones as unofficial", async () => {
    await expect(svc.setManualPil(approver, productId, "http://x.example/pil")).rejects.toThrow();
    const r = await svc.setManualPil(approver, productId, "https://example.org/pil.pdf");
    expect(r.pil.at(-1)).toMatchObject({ source: "SUPPLIER", official: false });
  });
});
