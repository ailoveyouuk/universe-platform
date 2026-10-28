// Guards the workflows that can touch the simulated (demo) data, so a re-run can never apply by accident (2026-10-28).
// Rules: (1) anything that uses the demo database secret must never run on push or pull_request;
//        (2) every workflow with a dry_run input must default it to true;
//        (3) a manual-only workflow with a dry_run input must use the 'demo-data-apply' / 'demo-data-dryrun' environments,
//            so GitHub can ask for a reviewer before anything is applied;
//        (4) the scheduled ones are listed here on purpose (they are operational jobs, not seeds).
import { readdirSync, readFileSync } from "node:fs";
const dir = ".github/workflows";
const SCHEDULED_OPERATIONAL = new Set(["cert-expiry-reminders.yml", "crm-review-reminders.yml", "regulatory-watch.yml", "sync-pharma-reference.yml", "nightly-aggregation.yml", "daily-activity.yml"]);
const problems = [];
for (const f of readdirSync(dir).filter((x) => x.endsWith(".yml"))) {
  const s = readFileSync(`${dir}/${f}`, "utf8");
  const usesDemo = s.includes("DEMO_LOAD_DATABASE_URL");
  const hasDry = /dry_run:/.test(s);
  const onPush = /^  (push|pull_request):/m.test(s);
  const scheduled = /^  schedule:/m.test(s);
  if (usesDemo && onPush) problems.push(`${f}: uses the demo database but runs on push or pull_request`);
  if (hasDry) {
    const block = s.split("dry_run:")[1].split("\n").slice(0, 6).join("\n");
    const def = /default:\s*["']?(true|false)["']?/.exec(block)?.[1];
    if (def !== "true" && !SCHEDULED_OPERATIONAL.has(f)) problems.push(`${f}: dry_run must default to true`);
    if (!scheduled && !s.includes("demo-data-apply")) problems.push(`${f}: manual workflow with dry_run must use the demo-data-apply environment`);
  }
  if (scheduled && !SCHEDULED_OPERATIONAL.has(f)) problems.push(`${f}: scheduled but not listed as an operational job in scripts/check-workflows.mjs`);
}
if (problems.length) { console.error("Workflow check failed:\n" + problems.map((p) => " - " + p).join("\n")); process.exit(1); }
console.log("Workflow check: demo-data workflows are guarded.");
