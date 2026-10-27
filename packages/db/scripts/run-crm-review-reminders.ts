import { prisma, waitForDatabase } from "../src/index";
import { runCrmReviewReminders } from "../src/crm-review-reminders";
import { runCrmAlerts } from "../src/crm-alerts";

/** Daily CRM review reminders (GitHub Actions cron). DRY_RUN=true counts without writing. */
async function main() {
  await waitForDatabase("universe", () => prisma.$queryRaw`SELECT 1 AS ok`);
  const dryRun = process.env.DRY_RUN === "true";
  const r = await runCrmReviewReminders({ dryRun });
  console.log(`CRM review reminders (${dryRun ? "DRY RUN" : "LIVE"}): checked=${r.checked} notifications=${r.created} skipped=${r.skipped} opportunities=${r.opportunities ?? 0} stageSyncs=${r.stageSyncs ?? 0}`);
  const a = await runCrmAlerts({ dryRun });
  console.log(`CRM alerts (${dryRun ? "DRY RUN" : "LIVE"}): certificates=${a.certificates} opportunities=${a.opportunities} approvals=${a.approvals}`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
