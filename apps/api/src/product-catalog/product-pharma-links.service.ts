import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@universe/db";
import {
  PHARMA_ATTRIBUTION, PHARMA_SUGGEST_MIN_SCORE, cleanManualPilUrl, manualPilLink, pilLinksForReference, scorePharmaMatch,
  type PilLink, type ProductPharmaLinkView, type ProductPharmaPanel,
} from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission, assertNotDemoUser } from "../common/authorization";

const who = (u: RequestUser) => `${u.forename} ${u.surname}`.trim() || u.email || null;

const refSelect = {
  id: true, source: true, sourceKey: true, name: true, activeSubstances: true, inn: true, atcCode: true, holder: true, status: true,
  legalStatus: true, windsorCategory: true, isGeneric: true, isBiosimilar: true, isOrphan: true, sourceUrl: true, productType: true,
} as const;

/**
 * Links between catalogue products and the EMA/MHRA register. The matcher only ever SUGGESTS; a person with products.approve confirms or
 * rejects, and only confirmed links drive leaflet links, the verified pill and the product's ATC code. Global data, no tenant context.
 */
@Injectable()
export class ProductPharmaLinksService {
  private view(l: { id: string; status: string; score: number; basis: string | null; decidedByName: string | null; decidedAt: Date | null; reference: { id: string; source: string; sourceKey: string; name: string; activeSubstances: string | null; inn: string | null; atcCode: string | null; holder: string | null; status: string; legalStatus: string | null; windsorCategory: string | null; isGeneric: boolean; isBiosimilar: boolean; isOrphan: boolean; sourceUrl: string | null; productType: string } }): ProductPharmaLinkView {
    const r = l.reference;
    return {
      id: l.id, status: l.status as ProductPharmaLinkView["status"], score: l.score, basis: l.basis, decidedByName: l.decidedByName, decidedAt: l.decidedAt?.toISOString() ?? null,
      reference: { id: r.id, source: r.source as "EMA" | "MHRA", sourceKey: r.sourceKey, name: r.name, activeSubstances: r.activeSubstances, inn: r.inn, atcCode: r.atcCode, holder: r.holder, status: r.status, legalStatus: r.legalStatus, windsorCategory: r.windsorCategory, isGeneric: r.isGeneric, isBiosimilar: r.isBiosimilar, isOrphan: r.isOrphan, sourceUrl: r.sourceUrl },
      pilLinks: pilLinksForReference({ source: r.source, sourceKey: r.sourceKey, sourceUrl: r.sourceUrl, productType: r.productType }),
    };
  }

  async panel(productId: string, showSimulated = true): Promise<ProductPharmaPanel> {
    const product = await prisma.productMaster.findUnique({ where: { id: productId }, select: { id: true, atcCode: true, pilUrl: true, isSimulated: true } });
    if (!product || (product.isSimulated && !showSimulated)) throw new NotFoundException("Product not found.");
    const rows = await prisma.productPharmaLink.findMany({ where: { productMasterId: productId, status: { not: "REJECTED" } }, include: { reference: { select: refSelect } }, orderBy: [{ status: "asc" }, { score: "desc" }] });
    const links = rows.map((r) => this.view(r));
    const pil: PilLink[] = links.filter((l) => l.status === "CONFIRMED").flatMap((l) => l.pilLinks);
    const manual = manualPilLink(product.pilUrl);
    if (manual) pil.push(manual);
    return { simulated: product.isSimulated, atcCode: product.atcCode, verified: links.some((l) => l.status === "CONFIRMED"), links, pil, manualPilUrl: product.pilUrl, attribution: PHARMA_ATTRIBUTION };
  }

  /** Find likely register entries for a product and store them as SUGGESTED. Never changes a link a person has already decided. */
  async suggest(user: RequestUser, productId: string) {
    assertNotDemoUser(user, "Suggesting register matches");
    const p = await prisma.productMaster.findUnique({ where: { id: productId }, select: { id: true, name: true, inn: true, brand: true, atcCode: true, isSimulated: true } });
    if (!p) throw new NotFoundException("Product not found.");
    const terms = [p.brand, p.inn].map((t) => (t ?? "").trim()).filter((t) => t.length >= 3);
    if (!terms.length) terms.push(p.name.split(/[\s,(]/)[0] ?? "");
    const usable = terms.filter((t) => t.length >= 3);
    if (!usable.length) return this.panel(productId);
    const cands = await prisma.pharmaReference.findMany({
      where: { removedAt: null, status: "Authorised", OR: usable.flatMap((t) => [{ name: { contains: t } }, { inn: { contains: t } }]) },
      select: refSelect, take: 200,
    });
    const scored = cands.map((c) => ({ c, ...scorePharmaMatch(p, c) })).filter((x) => x.score >= PHARMA_SUGGEST_MIN_SCORE).sort((a, b) => b.score - a.score).slice(0, 12);
    if (scored.length) {
      const existing = await prisma.productPharmaLink.findMany({ where: { productMasterId: productId, pharmaReferenceId: { in: scored.map((x) => x.c.id) } }, select: { pharmaReferenceId: true } });
      const have = new Set(existing.map((e) => e.pharmaReferenceId));
      const fresh = scored.filter((x) => !have.has(x.c.id));
      if (fresh.length) await prisma.productPharmaLink.createMany({ data: fresh.map((x) => ({ productMasterId: productId, pharmaReferenceId: x.c.id, status: "SUGGESTED", score: x.score, basis: x.basis.join(", "), isSimulated: p.isSimulated })) });
    }
    return this.panel(productId);
  }

  async decide(user: RequestUser, linkId: string, decision: "CONFIRMED" | "REJECTED") {
    assertNotDemoUser(user, "Confirming a register match (it changes the shared catalogue)");
    assertHasPermission(user, "products.approve");
    const link = await prisma.productPharmaLink.findUnique({ where: { id: linkId }, include: { reference: { select: { atcCode: true } }, product: { select: { atcCode: true } } } });
    if (!link) throw new NotFoundException("Match not found.");
    await prisma.productPharmaLink.update({ where: { id: linkId }, data: { status: decision, decidedById: user.id, decidedByName: who(user), decidedAt: new Date() } });
    // A confirmed link fills the product's ATC code if it has none; it never overwrites one a person entered.
    if (decision === "CONFIRMED" && link.reference.atcCode && !link.product.atcCode) {
      await prisma.productMaster.update({ where: { id: link.productMasterId }, data: { atcCode: link.reference.atcCode } });
    }
    return this.panel(link.productMasterId);
  }

  /** Link a product to a specific register entry chosen by a person (already confirmed). */
  async linkManually(user: RequestUser, productId: string, pharmaReferenceId: string) {
    assertNotDemoUser(user, "Linking a register entry (it changes the shared catalogue)");
    assertHasPermission(user, "products.approve");
    const ref = await prisma.pharmaReference.findUnique({ where: { id: pharmaReferenceId }, select: { id: true, atcCode: true } });
    if (!ref) throw new NotFoundException("Register entry not found.");
    const product = await prisma.productMaster.findUnique({ where: { id: productId }, select: { id: true, atcCode: true, isSimulated: true } });
    if (!product) throw new NotFoundException("Product not found.");
    const data = { status: "CONFIRMED", decidedById: user.id, decidedByName: who(user), decidedAt: new Date(), basis: "chosen by a person", score: 100, isSimulated: product.isSimulated };
    await prisma.productPharmaLink.upsert({ where: { productMasterId_pharmaReferenceId: { productMasterId: productId, pharmaReferenceId } }, create: { productMasterId: productId, pharmaReferenceId, ...data }, update: data });
    if (ref.atcCode && !product.atcCode) await prisma.productMaster.update({ where: { id: productId }, data: { atcCode: ref.atcCode } });
    return this.panel(productId);
  }

  async setManualPil(user: RequestUser, productId: string, url: string | null) {
    assertNotDemoUser(user, "Setting a leaflet link (it changes the shared catalogue)");
    assertHasPermission(user, "products.approve");
    const clean = url ? cleanManualPilUrl(url) : null;
    if (url && !clean) throw new BadRequestException("Enter a full https:// link.");
    await prisma.productMaster.update({ where: { id: productId }, data: { pilUrl: clean } });
    return this.panel(productId);
  }
}
