import { createHash, randomUUID } from "node:crypto";
import { prisma, withPlatformStaffContext, withTenantContext } from "../src/index";

/**
 * Populates the tamper-evident timeline of the simulated tender SIM-TND-001 (2026-10-20, requested by Lewis).
 * Writes the events the live app would have written as the tender went through creation, invitation, publication, the demo
 * organisation's declaration of interest, one private question and the published clarification, with a genuine hash chain
 * (same hashing as apps/api/src/tenders/tender-events.ts, copied so this script needs no API build), plus the question and
 * clarification rows they refer to. Does nothing if the tender already has events. DRY_RUN defaults to true. Idempotent.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const REF = "SIM-TND-001";
const HOUR = 3600000;

interface Fields {
  prevHash: string | null; id: string; tenderId: string; organizationId: string; counterpartyOrganizationId: string | null;
  actorOrganizationId: string; actorUserId: string | null; kind: string; summary: string; detailsJson: string | null; createdAt: Date;
}
function eventHash(e: Fields): string {
  const body = JSON.stringify([e.prevHash ?? "", e.id, e.tenderId, e.organizationId, e.counterpartyOrganizationId ?? "", e.actorOrganizationId, e.actorUserId ?? "", e.kind, e.summary, e.detailsJson ?? "", e.createdAt.toISOString()]);
  return createHash("sha256").update(body).digest("hex");
}

async function main() {
  const demo = await withPlatformStaffContext((tx) => tx.organization.findMany({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true, name: true } }));
  if (demo.length !== 1) throw new Error(`Expected one demo organisation, found ${demo.length}`);
  const bidderId = demo[0].id;
  const tender = await withPlatformStaffContext((tx) => tx.tender.findFirst({ where: { referenceNumber: REF }, select: { id: true, organizationId: true, publishedAt: true, title: true } }));
  if (!tender) throw new Error(`${REF} not found; run the simulated bid seed first.`);
  const issuerId = tender.organizationId;
  const existing = await withPlatformStaffContext((tx) => tx.tenderEvent.count({ where: { tenderId: tender.id } }));
  if (existing > 0) { console.log(`${REF} already has ${existing} events; nothing to do.`); return; }
  const published = tender.publishedAt ?? new Date(Date.now() - 48 * HOUR);
  const at = (h: number) => new Date(published.getTime() + h * HOUR);
  const issuerUser = await withTenantContext(issuerId, (tx) => tx.user.findFirst({ where: { organizationId: issuerId }, orderBy: { createdAt: "asc" }, select: { id: true } }));
  const bidderUser = await withTenantContext(bidderId, (tx) => tx.user.findFirst({ where: { organizationId: bidderId, platformStaffRole: "NONE" }, orderBy: { createdAt: "asc" }, select: { id: true } }));
  const iu = issuerUser?.id ?? null;
  const bu = bidderUser?.id ?? null;

  const plan = [
    { h: -26, org: issuerId, cp: null, actor: issuerId, user: iu, kind: "CREATED", summary: `Draft ${REF} created`, details: undefined as unknown },
    { h: -25, org: issuerId, cp: bidderId, actor: issuerId, user: iu, kind: "INVITED", summary: "An organisation was invited", details: undefined },
    { h: 0, org: issuerId, cp: null, actor: issuerId, user: iu, kind: "PUBLISHED", summary: `Published ${REF}`, details: { simulated: true, title: tender.title } },
    { h: 5, org: issuerId, cp: bidderId, actor: bidderId, user: bu, kind: "INTEREST_EXPRESSED", summary: "An organisation expressed interest", details: { integrityPledge: true, exclusionDeclared: true, exclusionGrounds: [] } },
    { h: 20, org: issuerId, cp: bidderId, actor: bidderId, user: bu, kind: "QUESTION_ASKED", summary: "A question was submitted", details: undefined },
    { h: 30, org: issuerId, cp: null, actor: issuerId, user: iu, kind: "CLARIFICATION_PUBLISHED", summary: "A clarification was published to all participants", details: undefined },
  ];
  if (dryRun) { console.log(`DRY RUN: would write ${plan.length} chained events plus one question and its published clarification for ${REF}.`); return; }

  const questionId = randomUUID();
  await withTenantContext(bidderId, (tx) => tx.tenderQuestion.create({ data: { id: questionId, organizationId: bidderId, issuerOrganizationId: issuerId, tenderId: tender.id, question: "Please confirm whether partial quantities per line are acceptable if full delivery within the stated window is not possible.", askedById: bu, askedAt: at(20) } }));
  await withTenantContext(issuerId, (tx) => tx.tenderClarification.create({ data: { organizationId: issuerId, tenderId: tender.id, question: "Are partial quantities per line acceptable if full delivery within the stated window is not possible?", answer: "Partial delivery is acceptable for lines 2 and 3 provided the balance is delivered within 30 days of the first shipment. Line 1 must be delivered in full. State any partial-delivery plan in your delivery response.", sourceQuestionId: questionId, answeredById: iu, answeredAt: at(30) } }));

  await withPlatformStaffContext(async (tx) => {
    let prev: string | null = null;
    for (const p of plan) {
      const row: Fields = { prevHash: prev, id: randomUUID(), tenderId: tender.id, organizationId: p.org, counterpartyOrganizationId: p.cp, actorOrganizationId: p.actor, actorUserId: p.user, kind: p.kind, summary: p.summary, detailsJson: p.details ? JSON.stringify(p.details) : null, createdAt: at(p.h) };
      const hash = eventHash(row);
      await tx.tenderEvent.create({ data: { ...row, hash } });
      prev = hash;
    }
  });
  console.log(`Wrote ${plan.length} chained events for ${REF}.`);
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
