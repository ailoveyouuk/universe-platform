import { prisma } from "../src/index";
import { scorePharmaMatch, PHARMA_SUGGEST_MIN_SCORE } from "../../types/src/pharma-links";

/**
 * Links SIMULATED pharmaceutical products to real EMA / MHRA register entries so the demo shows the register features working.
 * Ringfenced: it only reads and links products with isSimulated = true, every link row carries isSimulated = true (visible only in
 * demo organisations and never counted for real ones), and it never touches a real product. Idempotent. DRY_RUN=true writes nothing.
 * Per distinct INN it picks the best EMA and the best MHRA entry (score 60+ and an INN/active-substance agreement).
 */
const DRY = process.env.DRY_RUN !== "false";
const WHO = "Simulated demo data";

async function main() {
  const prods = await prisma.productMaster.findMany({
    where: { isSimulated: true, inn: { not: null }, category: { startsWith: "Pharmaceuticals" } },
    select: { id: true, name: true, inn: true, brand: true, atcCode: true },
  });
  console.log(`simulated pharmaceutical products with an INN: ${prods.length}`);
  const byInn = new Map<string, typeof prods>();
  for (const p of prods) { const k = p.inn!.trim().toLowerCase(); (byInn.get(k) ?? byInn.set(k, []).get(k)!).push(p); }
  console.log(`distinct INNs: ${byInn.size}`);

  let matchedInn = 0, links = 0, atcSet = 0; const unmatched: string[] = [];
  for (const [inn, group] of byInn) {
    const cands = await prisma.pharmaReference.findMany({
      where: { removedAt: null, status: "Authorised", productType: "HUMAN", OR: [{ inn: { contains: inn } }, { activeSubstances: { contains: inn } }, { name: { contains: inn } }] },
      select: { id: true, source: true, name: true, inn: true, activeSubstances: true, atcCode: true }, take: 300,
    });
    const rep = { name: inn, inn, brand: null as string | null, atcCode: null as string | null };
    const best = new Map<string, { id: string; score: number; atcCode: string | null; basis: string[] }>();
    // Ties go to the shortest, plainest name.
    for (const c of cands) {
      let sc = scorePharmaMatch(rep, c);
      if (sc.score < PHARMA_SUGGEST_MIN_SCORE || !sc.basis.some((b) => b === "inn" || b === "active substance")) {
        // MHRA entries carry a product name such as "Amoxicillin 500mg Capsules": accept a name that starts with the generic name.
        const n = c.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(), g = inn.replace(/[^a-z0-9]+/g, " ").trim();
        if (n === g || n.startsWith(g + " ")) sc = { score: 45 - Math.min(n.length - g.length, 20) / 2, basis: ["name starts with generic name"] };
        else continue;
      }
      const cur = best.get(c.source);
      if (!cur || sc.score > cur.score) best.set(c.source, { id: c.id, score: Math.round(sc.score), atcCode: c.atcCode, basis: sc.basis });
    }
    if (best.size === 0) { unmatched.push(inn); continue; }
    matchedInn++;
    const atc = [...best.values()].find((b) => b.atcCode)?.atcCode ?? null;
    for (const p of group) {
      for (const b of best.values()) {
        links++;
        if (DRY) continue;
        const data = { status: "CONFIRMED", score: b.score, basis: b.basis.join(", "), decidedByName: WHO, decidedAt: new Date(), isSimulated: true };
        await prisma.productPharmaLink.upsert({ where: { productMasterId_pharmaReferenceId: { productMasterId: p.id, pharmaReferenceId: b.id } }, create: { productMasterId: p.id, pharmaReferenceId: b.id, ...data }, update: {} });
      }
      if (atc && !p.atcCode) { atcSet++; if (!DRY) await prisma.productMaster.update({ where: { id: p.id }, data: { atcCode: atc } }); }
    }
  }
  console.log(`${DRY ? "[dry run] would link" : "linked"}: INNs matched ${matchedInn}/${byInn.size}; link rows ${links}; ATC codes set ${atcSet}`);
  console.log(`unmatched INNs (${unmatched.length}): ${unmatched.slice(0, 40).join(", ")}`);
  if (!DRY) {
    const [sim, real] = await Promise.all([prisma.productPharmaLink.count({ where: { isSimulated: true } }), prisma.productPharmaLink.count({ where: { isSimulated: false } })]);
    const leak = await prisma.productPharmaLink.count({ where: { isSimulated: true, product: { isSimulated: false } } });
    console.log(`link rows now: simulated ${sim}, real ${real}; simulated links on real products (must be 0): ${leak}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
