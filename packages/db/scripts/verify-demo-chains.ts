import { createHash } from "node:crypto";
import { prisma, withPlatformStaffContext } from "../src/index";

/** Read-only: walks the hash chain of every simulated published tender's timeline and reports any that is broken (2026-10-25). */
async function main() {
  const tenders = await withPlatformStaffContext((tx) => tx.tender.findMany({ where: { isSimulated: true }, select: { id: true, referenceNumber: true }, orderBy: { referenceNumber: "asc" } }));
  let bad = 0;
  for (const t of tenders) {
    const ev = await withPlatformStaffContext((tx) => tx.tenderEvent.findMany({ where: { tenderId: t.id, hash: { not: null } } }));
    const byPrev = new Map(ev.map((e) => [e.prevHash ?? "", e]));
    let prev = "", seen = 0, ok = true;
    for (;;) {
      const e = byPrev.get(prev);
      if (!e) break;
      const body = JSON.stringify([e.prevHash ?? "", e.id, e.tenderId, e.organizationId, e.counterpartyOrganizationId ?? "", e.actorOrganizationId, e.actorUserId ?? "", e.kind, e.summary, e.detailsJson ?? "", e.createdAt.toISOString()]);
      if (createHash("sha256").update(body).digest("hex") !== e.hash) ok = false;
      prev = e.hash!; seen++;
    }
    const verified = ok && seen === ev.length;
    if (!verified) bad++;
    console.log(`${t.referenceNumber.padEnd(14)} ${verified ? "VERIFIED" : "BROKEN"} (${seen} of ${ev.length} events)`);
  }
  console.log(`${tenders.length} timelines checked, ${bad} broken.`);
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
