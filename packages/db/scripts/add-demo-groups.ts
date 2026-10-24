import { randomUUID } from "node:crypto";
import { prisma, withPlatformStaffContext } from "../src/index";
import { GROUP_ITEMS } from "./_group-items";

/**
 * Adds simulated catalogue products for the eight product groups added on 2026-10-24. Names, specs, HS codes, units and pack sizes
 * come from the noun-specific tables in _group-items.ts, so every product is internally coherent. Logistics and Services holds
 * packaging goods only (pallets, cases, cartons); services are not catalogue items. Shared simulated products only: sourceStandard SIM-SCALE, isSimulated true.
 *
 * Idempotent: a group that already has PER_GROUP products is skipped. RESET=true first removes this script's earlier products in
 * these groups, together with everything that hangs off them (families, registrations, documents, identifiers), found by following the
 * foreign keys; it refuses if any other table (projects, tenders, batches) points at them. DRY_RUN defaults to true and prints the plan.
 * Afterwards run "Enrich demo data" (catalogue) to fill identifiers, records and product families.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const reset = (process.env.RESET ?? "false") === "true";
// REASSIGN=true re-picks the adding organisation of this script's existing products (no products are added or removed).
const reassign = (process.env.REASSIGN ?? "false") === "true";
const PER_GROUP = Number(process.env.PER_GROUP ?? 150);
const GROUPS = Object.keys(GROUP_ITEMS);
// Tables that may legitimately hold rows hanging off a new product: created only by the enrichment steps.
const OK_TO_DELETE = /famil|registration|document|identifier|source_approval|safety_notice|product_.*(link|alias|note)|^product_master$/i;

type Fk = { t: string; c: string; rc: string };
const fkCache = new Map<string, Fk[]>();
async function children(tx: any, table: string): Promise<Fk[]> {
  if (!fkCache.has(table)) {
    fkCache.set(table, await tx.$queryRawUnsafe(
      `SELECT OBJECT_NAME(fk.parent_object_id) AS t, COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS c, COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS rc
       FROM sys.foreign_keys fk JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
       WHERE OBJECT_NAME(fk.referenced_object_id) = '${table.replace(/'/g, "''")}'`));
  }
  return fkCache.get(table)!;
}
let execute = false;
const plan = new Map<string, number>();
const blocked = new Set<string>();
/** Depth-first: purge every row that references the selected rows, then the rows themselves. `where` selects rows of `table`. */
async function purge(tx: any, table: string, where: string, depth = 0): Promise<void> {
  if (depth > 6) throw new Error(`FK chain too deep at ${table}`);
  const [{ n }] = await tx.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM [${table}] WHERE ${where}`);
  const count = Number(n);
  if (count === 0) return;
  if (!OK_TO_DELETE.test(table)) blocked.add(`${table} (${count})`);
  plan.set(table, (plan.get(table) ?? 0) + count);
  for (const fk of await children(tx, table)) {
    const sub = `[${fk.c}] IN (SELECT [${fk.rc}] FROM [${table}] WHERE ${where})`;
    if (fk.t === table) { if (execute) await tx.$executeRawUnsafe(`UPDATE [${table}] SET [${fk.c}] = NULL WHERE ${sub}`); continue; }
    await purge(tx, fk.t, sub, depth + 1);
  }
  if (execute) await tx.$executeRawUnsafe(`DELETE FROM [${table}] WHERE ${where}`);
}

async function main() {
  const groupList = GROUPS.map((g) => `N'${g.replace(/'/g, "''")}'`).join(",");
  if (reset) {
    await withPlatformStaffContext(async (tx: any) => {
      const where = `isSimulated = 1 AND sourceStandard = 'SIM-SCALE' AND category IN (${groupList})`;
      const famWhere = `isSimulated = 1 AND category IN (${groupList})`;
      await purge(tx, "product_master", where); // pass 1: plan only
      await purge(tx, "product_families", famWhere);
      console.log("Reset plan (rows that would be removed):", Object.fromEntries(plan));
      if (blocked.size) throw new Error(`Refusing to reset: other tables reference these products: ${[...blocked].join(", ")}`);
      if (dryRun) { console.log("DRY RUN: nothing removed"); return; }
      plan.clear(); execute = true;
      await purge(tx, "product_master", where); // pass 2: delete, children first
      await purge(tx, "product_families", famWhere);
      console.log("Reset: removed", Object.fromEntries(plan));
    });
  }
  const orgs = await prisma.organization.findMany({ where: { isSimulated: true, isDemo: false }, select: { id: true, name: true }, take: 400, orderBy: { id: "asc" } });
  if (orgs.length === 0) throw new Error("No simulated organisations found to own the new products.");
  // Packaging goods read oddly from a laboratory or diagnostics business, so those products are credited to supply, logistics or distribution organisations.
  const poolFor = (group: string) => {
    const logistic = orgs.filter((o) => /supply|logistic|procurement|distribution|trading|freight/i.test(o.name));
    return group === "Logistics and Services" && logistic.length >= 5 ? logistic.slice(0, 60) : orgs.slice(0, 60);
  };
  if (reassign) {
    for (const group of GROUPS) {
      const pool = poolFor(group);
      const ids = await prisma.productMaster.findMany({ where: { isSimulated: true, sourceStandard: "SIM-SCALE", category: group }, select: { id: true }, orderBy: { id: "asc" } });
      console.log(`${group}: ${ids.length} products, ${pool.length} candidate organisations${dryRun ? " (dry run)" : ""}`);
      if (dryRun) continue;
      await withPlatformStaffContext(async (tx: any) => { for (let i = 0; i < ids.length; i++) await tx.productMaster.update({ where: { id: ids[i].id }, data: { addedByOrganizationId: pool[i % pool.length].id } }); });
    }
    console.log(dryRun ? "DRY RUN: nothing changed" : "Reassigned adding organisations");
    return;
  }
  let total = 0;
  for (const group of GROUPS) {
    const items = GROUP_ITEMS[group];
    const have = reset && dryRun ? 0 : await prisma.productMaster.count({ where: { isSimulated: true, sourceStandard: "SIM-SCALE", category: group } });
    const need = Math.max(0, PER_GROUP - have);
    console.log(`${group}: ${have} existing, adding ${need}`);
    if (need === 0 || dryRun) { total += need; continue; }
    const rows = Array.from({ length: need }, (_, i) => {
      const n = have + i + 1;
      const item = items[n % items.length];
      const k = Math.floor(n / items.length);
      const a = item.a[k % item.a.length];
      const b = item.b[(k + Math.floor(k / item.a.length)) % item.b.length];
      return { id: randomUUID(), name: `${item.noun}, ${a}, ${b} #${n}`, category: group, sourceStandard: "SIM-SCALE", isSimulated: true, addedByOrganizationId: poolFor(group)[n % poolFor(group).length].id };
    });
    await withPlatformStaffContext(async (tx: any) => { for (let j = 0; j < rows.length; j += 100) await tx.productMaster.createMany({ data: rows.slice(j, j + 100) }); });
    total += need;
  }
  console.log(`${dryRun ? "DRY RUN: would add" : "Added"} ${total} simulated products`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
