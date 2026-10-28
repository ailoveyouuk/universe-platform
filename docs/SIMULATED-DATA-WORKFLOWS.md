# Simulated-data workflows: how they are kept safe (2026-10-28)

All demo data is simulated and lives in the Universe Demo organisation, ring-fenced from real organisations. The GitHub workflows that create, fix or check it are listed here so none can be re-run by mistake once real organisations arrive.

## Safeguards now in place
1. **Dry run by default.** Every seed, fix, backfill and load workflow defaults `dry_run` to true and writes nothing until it is unticked. (Enforced by `npm run lint:workflows`, which runs in CI.)
2. **Reviewer gate on apply.** Each manual workflow with a `dry_run` input runs in the GitHub environment `demo-data-apply` when it is about to write, and `demo-data-dryrun` otherwise. **Lewis action (GitHub, Settings, Environments):** open `demo-data-apply` once it exists (it appears after the next run, or create it) and add a required reviewer. Until then nothing changes in how they behave.
3. **Never on push.** No workflow that uses the demo database secret runs on push or pull request (checked in CI). Scheduled jobs are the operational ones listed below and are named in `scripts/check-workflows.mjs`.
4. **Baseline.** Tag `demo-baseline-2026-10-26` plus the later logged seeds; nothing is hard deleted without Lewis's say-so.

## Groups
| Group | Workflows | Use |
|---|---|---|
| Read-only audits and checks | audit-demo-catalogue, audit-demo-consistency, audit-demo-coverage, audit-insights-prices, check-hs-mapping, verify-demo-chains, verify-tender-chain, diag-regulatory, scale-test | Safe any time |
| Baseline seeds (already applied) | seed-demo-* (baseline-fixes, benchmarks, bid, buyer-orgs, category-roles, certificates, competitive-tender, completed-tender, contract-lifecycle, crm, evaluation, framework, hospitality, lots, network, opportunity-participants, org-profiles, performance-history, pipeline-history, quality, service-pairs, service-tender, supplier-signals, tender-ecosystem, tender-events, tender-files, thin-areas, tidy, winloss-variety), load-demo-scale-data, enrich-demo-data, recohere-demo-data, link-demo-pharma, add-demo-groups, advance-demo-tender, flag-demo-organisation, grant-demo-organisation-access | Idempotent. Re-run only to rebuild missing demo data, dry run first, with Lewis's go-ahead |
| Fixes and clean-ups (applied) | fix-demo-catalogue, fix-demo-consistency, fix-demo-hs, fix-demo-tender-products, dedupe-demo-approvals, purge-duplicate-approvals | Applied once; keep for reference |
| Permission backfills | backfill-complaint-permissions, backfill-crm-permissions, backfill-tender-permissions | Run once per new permission, real organisations included (not simulated-only) |
| Operational jobs (scheduled, real function) | nightly-aggregation, daily-activity (keeps the demo alive), cert-expiry-reminders, crm-review-reminders, regulatory-watch, sync-pharma-reference | Leave running |

## Rules
- A real organisation's data is never touched by a seed: seeds select simulated rows only. Permission backfills are the exception and are run on purpose.
- To add a new seed workflow: copy an existing one, keep `dry_run` default true, keep the `environment:` line, run `npm run lint:workflows`.
