import { createHash } from "node:crypto";
import { prisma } from "../index";
import { CONNECTORS, defaultFetch } from "./connectors";
import { buildProductIndex, matchItem, type MatchableProduct } from "./matching";
import type { Connector, FetchLike, WatchItemInput } from "./types";

const chunks = <T,>(a: T[], n: number): T[][] => { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
const DAY = 86400000;

export const hashItem = (i: WatchItemInput) => createHash("sha256").update(JSON.stringify([i.title, i.summary, i.severity, i.status, i.affectedText, i.issueDate.toISOString()])).digest("hex");

/** Real (non-simulated, non-archived) catalogue variants with every identifier, for matching. Paged by id. */
export async function loadMatchableProducts(): Promise<MatchableProduct[]> {
  const out: MatchableProduct[] = [];
  let cursor: string | undefined;
  for (;;) {
    const rows = await prisma.productMaster.findMany({
      where: { isSimulated: false, isArchived: false },
      select: { id: true, name: true, inn: true, brand: true, strength: true, gtin: true, canonicalManufacturerPartNumber: true },
      orderBy: { id: "asc" }, take: 500, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (rows.length === 0) break;
    const ids = await prisma.productIdentifier.findMany({ where: { productMasterId: { in: rows.map((r) => r.id) } }, select: { productMasterId: true, value: true } });
    const byProduct = new Map<string, string[]>();
    for (const i of ids) byProduct.set(i.productMasterId, [...(byProduct.get(i.productMasterId) ?? []), i.value]);
    for (const r of rows) out.push({ id: r.id, name: r.name, inn: r.inn, brand: r.brand, strength: r.strength, identifiers: [r.gtin, r.canonicalManufacturerPartNumber, ...(byProduct.get(r.id) ?? [])].filter((v): v is string => !!v) });
    cursor = rows[rows.length - 1].id;
    if (rows.length < 500) break;
  }
  return out;
}

export interface RunResult { source: string; status: "SUCCESS" | "FAILED"; fetched: number; newItems: number; changedItems: number; newMatches: number; error?: string }

/**
 * Runs the daily watch: for each connector, fetch recent items, upsert them idempotently (nothing deleted), match new or changed
 * items to real catalogue products, and write an auditable run record. A failing source is recorded and does not stop the others.
 */
export async function runRegulatoryWatch(opts: { sources?: string[]; fetchFn?: FetchLike; now?: Date; dryRun?: boolean; connectors?: Connector[] } = {}): Promise<RunResult[]> {
  const fetchFn = opts.fetchFn ?? defaultFetch;
  const now = opts.now ?? new Date();
  const connectors = (opts.connectors ?? CONNECTORS).filter((c) => !opts.sources || opts.sources.includes(c.source));
  const index = buildProductIndex(await loadMatchableProducts());
  const results: RunResult[] = [];
  for (const c of connectors) {
    const last = await prisma.regulatoryWatchRun.findFirst({ where: { source: c.source, status: "SUCCESS", isSimulated: false }, orderBy: { startedAt: "desc" }, select: { startedAt: true } });
    // Overlap by two days so a late-published or edited notice is never missed; first run looks back 45 days.
    const since = new Date((last ? last.startedAt.getTime() - 2 * DAY : now.getTime() - 45 * DAY));
    const run = opts.dryRun ? null : await prisma.regulatoryWatchRun.create({ data: { source: c.source, startedAt: now } });
    const res: RunResult = { source: c.source, status: "SUCCESS", fetched: 0, newItems: 0, changedItems: 0, newMatches: 0 };
    try {
      const items = await c.fetchItems(since, fetchFn);
      res.fetched = items.length;
      for (const group of chunks(items, 200)) {
        const existing = await prisma.regulatoryWatchItem.findMany({ where: { source: c.source, sourceReference: { in: group.map((g) => g.sourceReference) } }, select: { id: true, sourceReference: true, rawHash: true } });
        const have = new Map(existing.map((e) => [e.sourceReference, e]));
        for (const item of group) {
          const hash = hashItem(item);
          const prev = have.get(item.sourceReference);
          if (prev && prev.rawHash === hash) continue;
          if (opts.dryRun) { if (prev) res.changedItems++; else res.newItems++; continue; }
          const data = { ...item, rawHash: hash, lastSeenAt: now };
          let id: string;
          if (prev) { await prisma.regulatoryWatchItem.update({ where: { id: prev.id }, data }); id = prev.id; res.changedItems++; }
          else { id = (await prisma.regulatoryWatchItem.create({ data })).id; res.newItems++; }
          const cands = matchItem(item, index);
          if (cands.length === 0) continue;
          const already = new Set((await prisma.regulatoryWatchMatch.findMany({ where: { itemId: id }, select: { productMasterId: true } })).map((m) => m.productMasterId));
          const fresh = cands.filter((m) => !already.has(m.productMasterId));
          if (fresh.length) { await prisma.regulatoryWatchMatch.createMany({ data: fresh.map((m) => ({ itemId: id, ...m })) }); res.newMatches += fresh.length; }
        }
      }
    } catch (e) {
      res.status = "FAILED";
      res.error = e instanceof Error ? e.message : String(e);
    }
    if (run) await prisma.regulatoryWatchRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), status: res.status, fetched: res.fetched, newItems: res.newItems, changedItems: res.changedItems, newMatches: res.newMatches, error: res.error ? res.error.slice(0, 3900) : null } });
    results.push(res);
  }
  return results;
}
