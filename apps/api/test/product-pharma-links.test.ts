import { randomUUID } from "node:crypto";
import { prisma } from "@universe/db";
import { afterAll, describe, expect, it } from "vitest";
import { ProductPharmaLinksService } from "../src/product-catalog/product-pharma-links.service";
import { PharmaReferenceService } from "../src/pharma-reference/pharma-reference.service";
import { ProductCatalogService, catalogueWhere } from "../src/product-catalog/product-catalog.service";
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

  it("ringfences simulated products: their links are hidden and uncounted outside demo organisations", async () => {
    const ref = await prisma.pharmaReference.create({ data: { source: "MHRA", sourceKey: `PL ${sfx}/0001`, name: `Simtest${sfx}`, inn: `simsubstance${sfx}`, productType: "HUMAN", status: "Authorised", rawHash: "h" } });
    const sim = await prisma.productMaster.create({ data: { name: `Simtest${sfx} 10 mg`, category: "Pharmaceuticals", inn: `simsubstance${sfx}`, isSimulated: true } });
    await prisma.productPharmaLink.create({ data: { productMasterId: sim.id, pharmaReferenceId: ref.id, status: "CONFIRMED", isSimulated: true } });
    try {
      const reg = new PharmaReferenceService();
      const real = await reg.search({ q: `Simtest${sfx}`, linked: "YES" }, false);
      expect(real.total).toBe(0); // not counted as linked for a real organisation
      const realAll = await reg.search({ q: `Simtest${sfx}` }, false);
      expect(realAll.items[0].linkedProducts).toBe(0);
      const demo = await reg.search({ q: `Simtest${sfx}`, linked: "YES" }, true);
      expect(demo.total).toBe(1);
      expect((await reg.get(ref.id, false)).linkedProducts).toHaveLength(0);
      expect((await reg.get(ref.id, true)).linkedProducts[0]).toMatchObject({ id: sim.id, isSimulated: true });
      await expect(svc.panel(sim.id, false)).rejects.toThrow(); // a real organisation cannot open a simulated product's panel
      expect((await svc.panel(sim.id, true)).simulated).toBe(true);
      const hidden = await new ProductCatalogService().list({ q: `Simtest${sfx}`, showSimulated: false });
      expect(hidden.items).toHaveLength(0);
    } finally {
      await prisma.productPharmaLink.deleteMany({ where: { productMasterId: sim.id } });
      await prisma.productMaster.delete({ where: { id: sim.id } });
      await prisma.pharmaReference.delete({ where: { id: ref.id } });
    }
  });

  it("builds one filter definition for list and export, combining register and suggestion filters", () => {
    const w = catalogueWhere({ register: "EMA", hasSuggestions: true, atc: "j01", hsCode: "30.04" }) as { AND: unknown[]; atcCode: { startsWith: string }; hsCode: { startsWith: string } };
    expect(w.AND).toHaveLength(2);
    expect(w.atcCode.startsWith).toBe("J01");
    expect(w.hsCode.startsWith).toBe("3004");
  });
});
