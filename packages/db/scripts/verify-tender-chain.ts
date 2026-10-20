import { createHash } from "node:crypto";
import { prisma, withPlatformStaffContext } from "../src/index";

/** Read-only: walks the hash chain of one tender's timeline (REF, default SIM-TND-001) exactly as the timeline verify page does and prints the result. */
const REF = process.env.TENDER_REF ?? "SIM-TND-001";
async function main() {
  const t = await withPlatformStaffContext((tx) => tx.tender.findFirst({ where: { referenceNumber: REF }, select: { id: true } }));
  if (!t) throw new Error(`${REF} not found`);
  const ev = await withPlatformStaffContext((tx) => tx.tenderEvent.findMany({ where: { tenderId: t.id, hash: { not: null } } }));
  const byPrev = new Map(ev.map((e) => [e.prevHash ?? "", e]));
  let prev = "", seen = 0, ok = true;
  for (;;) {
    const e = byPrev.get(prev);
    if (!e) break;
    const body = JSON.stringify([e.prevHash ?? "", e.id, e.tenderId, e.organizationId, e.counterpartyOrganizationId ?? "", e.actorOrganizationId, e.actorUserId ?? "", e.kind, e.summary, e.detailsJson ?? "", e.createdAt.toISOString()]);
    const h = createHash("sha256").update(body).digest("hex");
    console.log(`${e.createdAt.toISOString()}  ${e.kind.padEnd(24)} ${h === e.hash ? "hash OK" : "HASH MISMATCH"}`);
    if (h !== e.hash) ok = false;
    prev = e.hash!; seen++;
  }
  console.log(`Chain: ${ok && seen === ev.length ? "VERIFIED" : "BROKEN"} (${seen} of ${ev.length} events reached)`);
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
