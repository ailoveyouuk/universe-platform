import { prisma } from "../src/index";
import { runCertExpiryReminders } from "../src/cert-expiry";

/** Daily certification expiry reminders (GitHub Actions cron). DRY_RUN=true counts without writing. */
async function main() {
  const dryRun = process.env.DRY_RUN === "true";
  const r = await runCertExpiryReminders({ dryRun });
  console.log(`Cert expiry reminders (${dryRun ? "DRY RUN" : "LIVE"}): checked=${r.checked} notifications=${r.created} skipped=${r.skipped}`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
