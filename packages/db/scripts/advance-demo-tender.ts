import { createHash, randomUUID } from "node:crypto";
import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * Simulates time passing on a SIMULATED tender (2026-10-21, requested by Lewis): moves the closing time (and any earlier deadlines)
 * just into the past so the issuer can open the bids, evaluate, award and debrief. Refuses anything that is not marked simulated.
 * The change is written to the tender's hash-chained timeline as TIMETABLE_CHANGED (flagged simulated) so the audit trail stays honest.
 * TENDER_REF defaults to SIM-TND-001. DRY_RUN defaults to true. Idempotent (does nothing if closing has already passed).
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const REF = process.env.TENDER_REF ?? "SIM-TND-001";
const HOUR = 3600000;

interface Fields {
  prevHash: string | null; id: string; tenderId: string; organizationId: string; counterpartyOrganizationId: string | null;
  actorOrganizationId: string; actorUserId: string | null; kind: string; summary: string; detailsJson: string | null; createdAt: Date;
}
const eventHash = (e: Fields) => createHash("sha256").update(JSON.stringify([e.prevHash ?? "", e.id, e.tenderId, e.organizationId, e.counterpartyOrganizationId ?? "", e.actorOrganizationId, e.actorUserId ?? "", e.kind, e.summary, e.detailsJson ?? "", e.createdAt.toISOString()])).digest("hex");

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const t = await tx.tender.findFirst({ where: { referenceNumber: REF } });
    if (!t) throw new Error(`${REF} not found`);
    if (!t.isSimulated) throw new Error(`${REF} is not a simulated tender; refusing to change its timetable.`);
    const now = new Date();
    // The closing time must come after the last submitted bid, or the record would show a bid arriving after the tender closed.
    const last = await tx.tenderBid.findFirst({ where: { tenderId: t.id, submittedAt: { not: null } }, orderBy: { submittedAt: "desc" }, select: { submittedAt: true } });
    const afterLastBid = last?.submittedAt ? new Date(last.submittedAt.getTime() + 60000) : null;
    if (t.closingAt && t.closingAt.getTime() <= now.getTime() && !(afterLastBid && t.closingAt.getTime() < afterLastBid.getTime())) { console.log(`${REF} has already closed (${t.closingAt.toISOString()}); nothing to do.`); return; }
    const closing = afterLastBid && afterLastBid.getTime() < now.getTime() ? afterLastBid : new Date(now.getTime() - 1 * HOUR);
    const before = (d: Date | null) => (d && d.getTime() > closing.getTime() - HOUR ? new Date(closing.getTime() - HOUR) : d);
    const data = { closingAt: closing, clarificationDeadline: before(t.clarificationDeadline) };
    console.log(`${REF}: closing ${t.closingAt?.toISOString()} -> ${closing.toISOString()}; clarification deadline ${t.clarificationDeadline?.toISOString()} -> ${data.clarificationDeadline?.toISOString()}`);
    if (dryRun) { console.log("DRY RUN: nothing written."); return; }
    await tx.tender.update({ where: { id: t.id }, data });
    const tail = await tx.$queryRaw<{ hash: string | null }[]>`SELECT TOP 1 [hash] FROM [dbo].[tender_events] WHERE [tenderId] = ${t.id} AND [hash] IS NOT NULL ORDER BY [createdAt] DESC, [id] DESC`;
    const row: Fields = { prevHash: tail[0]?.hash ?? null, id: randomUUID(), tenderId: t.id, organizationId: t.organizationId, counterpartyOrganizationId: null, actorOrganizationId: t.organizationId, actorUserId: null, kind: "TIMETABLE_CHANGED", summary: "Timetable changed: closing time set after the last bid (simulated passage of time)", detailsJson: JSON.stringify({ simulated: true, closingAt: closing.toISOString() }), createdAt: now };
    await tx.tenderEvent.create({ data: { ...row, hash: eventHash(row) } });
    console.log("Closing time moved and recorded on the timeline.");
  });
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
