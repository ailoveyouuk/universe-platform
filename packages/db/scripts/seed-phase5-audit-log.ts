/**
 * Phase 5 of the comprehensive demo-data build (2026-10-08) — see
 * claude/demo-data-build.md for full context. This phase does NOT add
 * new business data; it backfills realistic FieldChangeLog rows for
 * changes that already happened to Phase 1-4 demo data but were never
 * logged (because they were inserted directly by seed scripts, not
 * through the real service layer's recordFieldChanges() calls).
 *
 * This closes the gap for the PM app's audit-log API (apps/api/src/
 * audit-log) which has real data to read from today for only the
 * handful of changes made through the live UI during smoke-testing —
 * everything else shows an empty/thin trail. It makes three kinds of
 * backfilled entries, each mirroring a real row that already exists:
 *
 *   1. Partner approvals — one FieldChangeLog ("approvalStatus":
 *      PENDING -> APPROVED/REMOVED) per existing PartnerApprovalHistory
 *      row, same actionDate/actionById/certificationStatement.
 *   2. Project status transitions — one FieldChangeLog ("status": prev
 *      -> this) per existing ProjectStatusHistory row (skipping the
 *      first row per project, which has no "prev" to diff against).
 *   3. ControlledDocument supersede events — one FieldChangeLog
 *      ("status": DRAFT -> EFFECTIVE, approved at creation) per
 *      ControlledDocument, using its own effectiveDate/approvedById.
 *
 * All rows are written with source: "MIGRATION" (the schema's own
 * reserved value for "a backfill that changes data without a human
 * request behind it") and a reason tag ("[phase5-audit-backfill]") so
 * this script can detect its own prior rows and is safe to re-run.
 *
 * Usage (from packages/db), AFTER Phase 1-4:
 *   npx tsx scripts/seed-phase5-audit-log.ts
 */
import { prisma, withTenantContext } from "../src/index";

const ORG_NAME = "Universe Demo";
const BACKFILL_TAG = "[phase5-audit-backfill]";

async function alreadyLogged(
  tx: any,
  organizationId: string,
  tableName: string,
  recordId: string,
  fieldName: string,
): Promise<boolean> {
  const existing = await tx.fieldChangeLog.findFirst({
    where: {
      organizationId,
      tableName,
      recordId,
      fieldName,
      reason: { contains: BACKFILL_TAG },
    },
    select: { id: true },
  });
  return existing !== null;
}

async function main() {
  const org = await prisma.organization.findFirst({
    where: { name: ORG_NAME },
    select: { id: true },
  });
  if (!org) {
    throw new Error(`No organization found matching name "${ORG_NAME}"`);
  }

  let partnerRows = 0;
  let projectRows = 0;
  let docRows = 0;

  await withTenantContext(org.id, async (tx) => {
    // -----------------------------------------------------------------
    // 1. Partner approvals
    // -----------------------------------------------------------------
    const approvalHistory = await tx.partnerApprovalHistory.findMany({
      where: { organizationId: org.id },
      orderBy: { actionDate: "asc" },
    });

    for (const row of approvalHistory) {
      if (await alreadyLogged(tx, org.id, "partners", row.partnerId, "approvalStatus")) {
        continue;
      }
      const newValue =
        row.action === "APPROVED" ? "APPROVED" : row.action === "REMOVED" ? "REMOVED" : row.action;
      await tx.fieldChangeLog.create({
        data: {
          organizationId: org.id,
          tableName: "partners",
          recordId: row.partnerId,
          fieldName: "approvalStatus",
          oldValue: "PENDING",
          newValue,
          changedById: row.actionById ?? null,
          changedAt: row.actionDate,
          reason: `${BACKFILL_TAG} mirrors partner_approval_history row ${row.id}`,
          source: "MIGRATION",
          certificationStatement: row.certificationStatement ?? null,
        },
      });
      partnerRows++;
    }

    // -----------------------------------------------------------------
    // 2. Project status transitions
    // -----------------------------------------------------------------
    const projects = await tx.project.findMany({
      where: { organizationId: org.id },
      select: { id: true },
    });

    for (const project of projects) {
      const history = await tx.projectStatusHistory.findMany({
        where: { organizationId: org.id, projectId: project.id },
        orderBy: { enteredAt: "asc" },
      });
      for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1];
        const curr = history[i];
        if (await alreadyLogged(tx, org.id, "projects", project.id, `status@${curr.id}`)) {
          continue;
        }
        await tx.fieldChangeLog.create({
          data: {
            organizationId: org.id,
            tableName: "projects",
            recordId: project.id,
            // fieldName carries the history row's own id so each
            // transition is distinct (a project can revisit the same
            // status more than once) while alreadyLogged() can still
            // detect and skip an exact prior backfill on re-run.
            fieldName: `status@${curr.id}`,
            oldValue: prev.status,
            newValue: curr.status,
            changedById: curr.changedById ?? null,
            changedAt: curr.enteredAt,
            reason: `${BACKFILL_TAG} mirrors project_status_history row ${curr.id}`,
            source: "MIGRATION",
          },
        });
        projectRows++;
      }
    }

    // -----------------------------------------------------------------
    // 3. ControlledDocument effective/approval events
    // -----------------------------------------------------------------
    const controlledDocs = await tx.controlledDocument.findMany({
      where: { organizationId: org.id },
    });

    for (const doc of controlledDocs) {
      if (await alreadyLogged(tx, org.id, "controlled_documents", doc.id, "status")) {
        continue;
      }
      await tx.fieldChangeLog.create({
        data: {
          organizationId: org.id,
          tableName: "controlled_documents",
          recordId: doc.id,
          fieldName: "status",
          oldValue: "DRAFT",
          newValue: "EFFECTIVE",
          changedById: doc.approvedById ?? null,
          changedAt: doc.effectiveDate ?? doc.createdAt,
          reason: `${BACKFILL_TAG} initial approval of controlled document ${doc.id}`,
          source: "MIGRATION",
        },
      });
      docRows++;
    }
  });

  console.log(`Phase 5 audit-log backfill complete.`);
  console.log(`  Partner approval entries logged: ${partnerRows}`);
  console.log(`  Project status-transition entries logged: ${projectRows}`);
  console.log(`  Controlled-document approval entries logged: ${docRows}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
