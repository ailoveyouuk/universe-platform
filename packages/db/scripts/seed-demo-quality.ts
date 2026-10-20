import { prisma, withPlatformStaffContext, withTenantContext } from "../src/index";

/**
 * Simulated quality data for the DEMO organisation only (2026-10-20, agreed with Lewis):
 *  1. OTIF: fills blank delivery dates / quantity received / on-time and in-full flags on lines of delivered simulated projects,
 *     with a consistent strong / average / weak profile per supplier or manufacturer.
 *  2. ~60 complaints (both directions, every stage, 6 serious, a few overdue) tagged SIM-CMP-nnn, with timeline events,
 *     ~100+ CAPA actions, and some risk-register links.
 * DRY_RUN defaults to true. Idempotent: OTIF fills blanks only; complaints are skipped when their SIM-CMP reference exists.
 * Complainant names are fictional. Nothing is deleted or overwritten.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const DAY = 86400000;
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const pick = <T,>(l: T[], k: string): T => l[hash(k) % l.length];
const chunks = <T,>(a: T[], n: number): T[][] => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
function addWorkingDays(from: Date, n: number): Date { const d = new Date(from); let left = n; while (left > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) left--; } return d; }
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

async function demoOrgId(): Promise<string> {
  const demo = await withPlatformStaffContext((tx) => tx.organization.findMany({ where: { isDemo: true }, select: { id: true } }));
  if (demo.length !== 1) throw new Error(`Expected one demo organisation, found ${demo.length}`);
  return demo[0].id;
}

type Profile = { onTime: number; late: number; short: number };
const PROFILES: Profile[] = [{ onTime: 94, late: 5, short: 3 }, { onTime: 82, late: 12, short: 8 }, { onTime: 62, late: 20, short: 20 }];
const profileFor = (partnerId: string) => PROFILES[[0, 0, 1, 1, 1, 2][hash(partnerId + "p") % 6]];

async function seedOtif(orgId: string) {
  const projectIds = await withTenantContext(orgId, (tx) => tx.project.findMany({ where: { status: { in: ["COMPLETED", "AWARDED"] } }, select: { id: true }, orderBy: { id: "asc" } }));
  console.log(`OTIF: ${projectIds.length} delivered projects`);
  let lines = 0;
  for (const group of chunks(projectIds, 40)) {
    if (dryRun) { lines += group.length; continue; }
    await withTenantContext(orgId, async (tx) => {
      const rows = await tx.projectLine.findMany({ where: { projectId: { in: group.map((g) => g.id) }, OR: [{ supplierId: { not: null } }, { manufacturerId: { not: null } }] } });
      for (const l of rows) {
        const data: Record<string, unknown> = {};
        const delivered = l.actualDeliveryDate ?? l.goodsDeliveredToClientDate ?? new Date(Date.now() - (hash(l.id + "dd") % 200) * DAY);
        const prof = profileFor(l.supplierId ?? l.manufacturerId ?? l.id);
        const r = hash(l.id + "otif") % 100;
        const slip = r < prof.onTime ? -(hash(l.id + "e") % 6) : r < prof.onTime + prof.late ? 1 + (hash(l.id + "l") % 5) : 8 + (hash(l.id + "x") % 25);
        const projected = l.projectedDeliveryDate ?? addDays(delivered, -slip);
        if (!l.projectedDeliveryDate) data.projectedDeliveryDate = projected;
        if (!l.actualDeliveryDate) data.actualDeliveryDate = delivered;
        const collected = l.goodsCollectedDate ?? addDays(delivered, -(7 + (hash(l.id + "c") % 25)));
        if (!l.goodsCollectedDate) data.goodsCollectedDate = collected;
        const gadSlip = hash(l.id + "g") % 100 < prof.onTime ? 1 + (hash(l.id + "g2") % 4) : -(1 + (hash(l.id + "g3") % 9));
        const gad = l.supplierGad ?? addDays(collected, gadSlip);
        if (!l.supplierGad) data.supplierGad = gad;
        if (l.quantity != null && l.quantityReceived == null) {
          const short = hash(l.id + "q") % 100 < prof.short;
          data.quantityReceived = short ? Math.max(0, Math.floor(l.quantity * (0.7 + (hash(l.id + "q2") % 25) / 100))) : l.quantity;
        }
        const act = (data.actualDeliveryDate ?? l.actualDeliveryDate) as Date;
        if (l.internalOnTime == null) data.internalOnTime = act.getTime() <= projected.getTime();
        if (l.supplierOnTime == null) data.supplierOnTime = collected.getTime() <= gad.getTime();
        const rec = (data.quantityReceived ?? l.quantityReceived) as number | null | undefined;
        if (l.supplierInFull == null && l.quantity != null && rec != null) data.supplierInFull = rec >= l.quantity;
        if (Object.keys(data).length) { await tx.projectLine.update({ where: { id: l.id }, data }); lines++; }
      }
    });
  }
  console.log(`OTIF: ${dryRun ? "would touch up to" : "updated"} ${lines} ${dryRun ? "projects" : "lines"}`);
}

const STAGES: [string, number][] = [["LOGGED", 6], ["ACKNOWLEDGED", 6], ["TRIAGED", 8], ["INVESTIGATING", 14], ["RESOLVED", 8], ["CLOSED", 14], ["ON_HOLD", 2], ["WITHDRAWN", 2]];
// 61-72: complaints against freight forwarders, so every partner role shows complaints in the reporting.
const FORWARDER_STAGES = ["INVESTIGATING", "INVESTIGATING", "INVESTIGATING", "RESOLVED", "RESOLVED", "RESOLVED", "CLOSED", "CLOSED", "CLOSED", "CLOSED", "TRIAGED", "TRIAGED"];
const TITLES: Record<string, string[]> = {
  PRODUCT_QUALITY: ["Damaged packaging on arrival", "Test kits failing control line", "Gloves torn on opening", "Syringes with loose plungers", "Labels illegible on outer cartons"],
  DELIVERY: ["Delivery arrived after agreed date", "Short shipment against packing list", "Wrong item delivered", "Pallet left at wrong depot"],
  DOCUMENTATION: ["Certificate of analysis missing", "Batch numbers do not match paperwork", "Import documents incomplete"],
  COLD_CHAIN: ["Temperature logger alarm on receipt", "Cold chain break reported at airport", "Vaccine carrier warm on delivery"],
  SERVICE: ["No response to order query", "Invoice disputed after delivery"],
  SAFETY: ["Adverse event reported with product", "Suspected counterfeit packaging"],
};
const ROOT: [string, string][] = [["TRANSPORT_COLD_CHAIN", "Refrigerated container failed during transit"], ["MANUFACTURING", "Sealing machine fault on line 3"], ["DOCUMENTATION", "Wrong template used when issuing certificate"], ["HANDLING_STORAGE", "Pallets stacked above rated load at depot"], ["SUPPLIER", "Sub-supplier substituted a component without notice"], ["PROCESS", "Pick list not checked against order at dispatch"], ["HUMAN_ERROR", "Label printed from the previous batch file"]];
const FIRST = ["Amara", "Daniel", "Priya", "Tomas", "Grace", "Yusuf", "Helen", "Samuel", "Ingrid", "Kofi"];
const LAST = ["Okafor", "Whitfield", "Nair", "Lindqvist", "Mwangi", "Haddad", "Bellamy", "Osei", "Varga", "Chen"];

async function seedComplaints(orgId: string) {
  const ctx = await withTenantContext(orgId, async (tx) => {
    const users = await tx.user.findMany({ where: { organizationId: orgId, archivedAt: null, status: "ACTIVE" }, select: { id: true }, orderBy: { email: "asc" }, take: 6 });
    const existing = await tx.qualityComplaint.count({ where: { organizationId: orgId, referenceNumber: { startsWith: "SIM-CMP-" } } });
    const lines = await tx.projectLine.findMany({ where: { project: { status: { in: ["COMPLETED", "AWARDED"] } }, productMasterId: { not: null }, OR: [{ supplierId: { not: null } }, { manufacturerId: { not: null } }] }, select: { id: true, projectId: true, supplierId: true, manufacturerId: true, productMasterId: true, project: { select: { clientId: true } } }, orderBy: { id: "asc" }, take: 400 });
    const fwdLines = await tx.projectLine.findMany({ where: { project: { status: { in: ["COMPLETED", "AWARDED"] }, freightForwarderId: { not: null } }, productMasterId: { not: null } }, select: { id: true, projectId: true, supplierId: true, manufacturerId: true, productMasterId: true, project: { select: { clientId: true, freightForwarderId: true } } }, orderBy: { id: "asc" }, take: 300 });
    return { users, existing, lines, fwdLines };
  });
  console.log(`Complaints: ${ctx.users.length} users, ${ctx.lines.length} candidate lines, ${ctx.existing} SIM complaints already present`);
  if (!ctx.users.length || ctx.lines.length < 30) throw new Error("Not enough users or lines to seed from");
  const stageList = [...STAGES.flatMap(([s, n]) => Array(n).fill(s) as string[]), ...FORWARDER_STAGES];
  const serious = new Set([3, 17, 24, 31, 38, 45, 64]); // spread across stages
  const overdue = new Set([1, 8, 15, 20, 28]);
  const now = Date.now();
  if (dryRun) { console.log(`Would create up to ${stageList.length} complaints`); return; }
  let made = 0, actions = 0, risks = 0;
  await withTenantContext(orgId, async (tx) => {
    for (let i = 0; i < stageList.length; i++) {
      const ref = `SIM-CMP-${String(i + 1).padStart(3, "0")}`;
      if (await tx.qualityComplaint.findFirst({ where: { organizationId: orgId, referenceNumber: ref }, select: { id: true } })) continue;
      const stage = stageList[i];
      const key = `cmp${i}`;
      const fwd = i >= 60 && ctx.fwdLines.length > 0;
      const line = fwd ? ctx.fwdLines[hash(key) % ctx.fwdLines.length] : ctx.lines[hash(key) % ctx.lines.length];
      const inbound = fwd ? false : i % 5 < 2;
      const isSerious = serious.has(i);
      const cat = isSerious ? pick(["SAFETY", "COLD_CHAIN"], key) : fwd ? pick(["DELIVERY", "COLD_CHAIN", "DOCUMENTATION"], key) : pick(Object.keys(TITLES), key);
      const sev = isSerious ? "CRITICAL" : pick(["MINOR", "MINOR", "MAJOR", "MAJOR", "CRITICAL"], key + "s");
      const flags = isSerious ? { flagPatientSafety: i % 3 === 0, flagSuspectedFalsified: i % 3 === 1, flagTemperatureExcursion: i % 3 === 2 } : {};
      const ageDays = overdue.has(i) ? 45 + (hash(key + "a") % 40) : stage === "CLOSED" || stage === "RESOLVED" ? 40 + (hash(key + "a") % 80) : 1 + (hash(key + "a") % 12);
      const received = new Date(now - ageDays * DAY);
      const [owner, investigator, approver] = [ctx.users[hash(key + "o") % ctx.users.length].id, ctx.users[hash(key + "i") % ctx.users.length].id, ctx.users[(hash(key + "i") + 1) % ctx.users.length].id];
      const idx = ["LOGGED", "ACKNOWLEDGED", "TRIAGED", "INVESTIGATING", "RESOLVED", "CLOSED"].indexOf(stage);
      const rank = stage === "ON_HOLD" || stage === "WITHDRAWN" ? 3 : idx;
      const ackDue = addWorkingDays(received, 2);
      const triDue = addWorkingDays(received, isSerious ? 1 : 5);
      const resDays = ({ MINOR: 30, MAJOR: 15, CRITICAL: 5 } as Record<string, number>)[sev];
      const root = pick(ROOT, key + "r");
      const outcome = rank >= 4 ? pick(["UPHELD", "UPHELD", "PARTLY_UPHELD", "NOT_UPHELD"], key + "u") : null;
      const resolvedAt = rank >= 4 ? addDays(received, Math.min(ageDays - 1, 6 + (hash(key + "rs") % 20))) : null;
      const closedAt = rank >= 5 && resolvedAt ? addDays(resolvedAt, Math.min(Math.max(ageDays - 2, 1), 3 + (hash(key + "c") % 10))) : null;
      const title = `${pick(TITLES[cat], key + "t")}${inbound ? "" : " (supplier)"}`;
      const row = await tx.qualityComplaint.create({
        data: {
          organizationId: orgId, referenceNumber: ref, direction: inbound ? "INBOUND_CLIENT" : "OUTBOUND_SUPPLY_CHAIN", status: stage,
          heldFromStatus: stage === "ON_HOLD" ? "INVESTIGATING" : null, holdReason: stage === "ON_HOLD" ? "Waiting for the partner's batch records" : null,
          title, description: `Simulated complaint for the demonstration: ${title.toLowerCase()}. Raised against a delivered project line.`,
          receivedAt: received, channel: pick(["EMAIL", "PHONE", "PORTAL", "MEETING"], key + "ch"), severity: rank >= 2 || stage === "ON_HOLD" ? sev : null, category: rank >= 2 ? cat : null,
          isSerious, ...flags,
          partnerId: inbound ? line.project.clientId : fwd ? (line as { project: { freightForwarderId?: string | null } }).project.freightForwarderId ?? null : (line.supplierId ?? line.manufacturerId),
          projectId: line.projectId, projectLineId: line.id, productMasterId: line.productMasterId,
          complainantName: inbound ? `${pick(FIRST, key + "f")} ${pick(LAST, key + "l")}` : null, complainantEmail: inbound ? `sim.${i + 1}@example.invalid` : null,
          ownerId: owner, investigatorId: rank >= 3 ? investigator : null, loggedById: owner,
          acknowledgeDueAt: ackDue, acknowledgedAt: rank >= 1 ? addDays(received, 1) : null,
          triageDueAt: triDue, triagedAt: rank >= 2 ? addDays(received, 2) : null,
          resolveDueAt: rank >= 2 ? addDays(received, resDays) : null,
          investigationStartedAt: rank >= 3 ? addDays(received, 3) : null,
          investigationCompletedAt: rank >= 4 && resolvedAt ? addDays(resolvedAt, -1) : null,
          investigationScope: rank >= 3 ? "Review batch records, transport data and supplier response." : null,
          rootCauseCategory: rank >= 3 ? root[0] : null, rootCause: rank >= 4 ? root[1] : null, findings: rank >= 4 ? "Records reviewed; contributing factors confirmed." : null,
          outcome, resolvedAt, closedAt, closedById: closedAt ? approver : null,
          partnerResponseDueAt: !inbound && rank >= 3 ? addDays(received, 14) : null, partnerRespondedAt: !inbound && rank >= 4 ? addDays(received, 9) : null,
          partnerResponse: !inbound && rank >= 4 ? "Partner accepts the finding and has corrected the process." : null,
          remedyType: rank >= 4 && outcome !== "NOT_UPHELD" ? pick(["REPLACEMENT", "CREDIT", "REDELIVERY", "CORRECTED_DOCUMENTS"], key + "rm") : null,
          complainantReaction: inbound && rank >= 5 ? "SATISFIED" : null,
          regulatorDecision: isSerious ? (rank >= 4 ? (i % 2 ? "REPORTED" : "NOT_REPORTABLE") : "UNDER_CONSIDERATION") : null,
          regulatorDecisionReason: isSerious && rank >= 4 ? "Decision recorded by the Responsible Person." : null,
          regulatorDecisionById: isSerious && rank >= 4 ? approver : null, regulatorDecisionAt: isSerious && rank >= 4 ? addDays(received, 3) : null,
          closureSummary: closedAt ? "Corrective actions completed and verified." : null, lessonsLearned: closedAt ? "Add the check to the standard dispatch procedure." : null,
        },
      });
      const ev = async (kind: string, summary: string, when: Date) => { await tx.qualityComplaintEvent.create({ data: { organizationId: orgId, complaintId: row.id, kind, summary, actorUserId: owner, createdAt: when } }); };
      await ev("STAGE", "Complaint logged", received);
      if (rank >= 1) await ev("STAGE", "Acknowledged", addDays(received, 1));
      if (rank >= 2) await ev("STAGE", `Triaged as ${sev.toLowerCase()}`, addDays(received, 2));
      if (rank >= 3) await ev("STAGE", "Investigation started", addDays(received, 3));
      if (rank >= 4 && resolvedAt) await ev("STAGE", `Resolved: ${outcome?.toLowerCase().replace("_", " ")}`, resolvedAt);
      if (closedAt) await ev("STAGE", "Closed", closedAt);
      if (stage === "ON_HOLD") await ev("STAGE", "Put on hold", addDays(received, 5));
      if (stage === "WITHDRAWN") await ev("STAGE", "Withdrawn by the complainant", addDays(received, 4));
      // CAPA
      if (rank >= 3) {
        const n = isSerious || i % 2 === 0 ? 3 : 2;
        const types = ["CONTAINMENT", "CORRECTIVE", "PREVENTIVE"];
        for (let a = 0; a < n; a++) {
          const done = rank >= 5 || (rank === 4 && a < 2) || (rank === 3 && a === 0 && i % 3 === 0);
          const overdueAct = !done && (overdue.has(i) || i % 4 === 0);
          const due = overdueAct ? addDays(new Date(now), -(2 + (hash(key + a) % 12))) : addDays(received, 10 + a * 12 + (hash(key + a) % 6));
          await tx.qualityComplaintAction.create({ data: {
            organizationId: orgId, complaintId: row.id, type: types[a], description: ["Quarantine remaining stock from the affected batch", "Correct the process and retrain the staff involved", "Add a verification step to the standard procedure"][a],
            ownerId: ctx.users[hash(key + "ao" + a) % ctx.users.length].id, dueDate: done && due.getTime() > now ? addDays(new Date(now), -3) : due, status: done ? "DONE" : "OPEN",
            completedAt: done ? addDays(received, 8 + a * 6) : null, completionNotes: done ? "Completed and checked." : null, createdById: investigator,
          } });
          actions++;
        }
      }
      if (rank >= 4 && i % 6 === 0) {
        await tx.riskAssessment.create({ data: { organizationId: orgId, subjectType: "COMPLAINT", subjectId: row.id, title: `Recurrence of: ${title}`, description: `Raised from complaint ${ref}. Root cause: ${root[0]}.`, severity: isSerious ? "HIGH" : "MEDIUM", likelihood: "MEDIUM", ownerId: owner, status: "OPEN", createdById: owner } });
        await ev("LINK", "Risk raised in the risk register", addDays(received, 12));
        risks++;
      }
      made++;
    }
  });
  console.log(`Complaints: created ${made}, CAPA actions ${actions}, risks ${risks}`);
}

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "LOAD"}`);
  const orgId = await demoOrgId();
  await seedOtif(orgId);
  await seedComplaints(orgId);
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
