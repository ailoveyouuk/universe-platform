import { prisma } from "../index";
import { parseEmaMedicines, parseMhraCategory, rowHash, type PharmaRefRow } from "./parse";

export const EMA_MEDICINES_URL = "https://www.ema.europa.eu/en/documents/report/medicines-output-medicines-report_en.xlsx";
export const MHRA_PUBLICATION_API = "https://www.gov.uk/api/content/government/publications/category-lists-following-implementation-of-the-windsor-framework/category-lists-of-products";
const ALLOWED_HOSTS = new Set(["www.ema.europa.eu", "www.gov.uk", "assets.publishing.service.gov.uk"]);
const chunks = <T,>(a: T[], n: number): T[][] => { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

export type Fetcher = (url: string) => Promise<Buffer>;
/** Fixed host allow-list: only these public register hosts are ever fetched. */
export const defaultFetcher: Fetcher = async (url) => {
  const u = new URL(url);
  if (u.protocol !== "https:" || !ALLOWED_HOSTS.has(u.hostname)) throw new Error(`Host not allowed: ${u.hostname}`);
  const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": "UniverseRegisterSync/1.0 (+https://universe)" } });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
};

/** The two Windsor Framework list files are linked from the GOV.UK page body; their URLs change at each update, so they are discovered. */
export async function discoverMhraFiles(fetcher: Fetcher): Promise<{ category: string; url: string }[]> {
  const page = JSON.parse((await fetcher(MHRA_PUBLICATION_API)).toString("utf8")) as { details?: { body?: string } };
  const urls = [...(page.details?.body ?? "").matchAll(/href="([^"]+\.xlsx[^"]*)"/g)].map((m) => m[1]);
  const out: { category: string; url: string }[] = [];
  for (const [n, label] of [["1", "Category 1"], ["2", "Category 2"]] as const) {
    const u = urls.find((x) => new RegExp(`category[_ -]?${n}(?!\\d)`, "i").test(decodeURIComponent(x)));
    if (!u) throw new Error(`MHRA ${label} file link not found on the publication page. The page layout may have changed.`);
    out.push({ category: label, url: u });
  }
  return out;
}

export interface SyncResult { source: string; status: "SUCCESS" | "FAILED"; fetched: number; added: number; changed: number; removed: number; error?: string }

/** Upserts rows for one source. Nothing is deleted: rows missing from the latest file are marked removed (withdrawn or cancelled) and revived if they return. */
async function syncSource(source: "EMA" | "MHRA", rows: PharmaRefRow[], dryRun: boolean): Promise<Omit<SyncResult, "source" | "status">> {
  const existing = new Map((await prisma.pharmaReference.findMany({ where: { source }, select: { id: true, sourceKey: true, rawHash: true, removedAt: true } })).map((e) => [e.sourceKey, e]));
  const seen = new Set<string>();
  const toAdd: PharmaRefRow[] = []; const toChange: { id: string; row: PharmaRefRow; hash: string }[] = []; const touch: string[] = [];
  for (const r of rows) {
    if (seen.has(r.sourceKey)) continue;
    seen.add(r.sourceKey);
    const hash = rowHash(r), e = existing.get(r.sourceKey);
    if (!e) toAdd.push(r);
    else if (e.rawHash !== hash || e.removedAt) toChange.push({ id: e.id, row: r, hash });
    else touch.push(e.id);
  }
  const gone = [...existing.values()].filter((e) => !seen.has(e.sourceKey) && !e.removedAt).map((e) => e.id);
  // A bad file must not wipe the register: refuse to mark more than 40% of what we hold as removed in one run.
  if (existing.size > 100 && gone.length > existing.size * 0.4) throw new Error(`Refusing to mark ${gone.length} of ${existing.size} ${source} records as removed. The file looks incomplete.`);
  if (!dryRun) {
    const now = new Date();
    for (const c of chunks(toAdd, 400)) await prisma.pharmaReference.createMany({ data: c.map((r) => ({ ...r, rawHash: rowHash(r), firstSeenAt: now, lastSeenAt: now })) });
    for (const c of toChange) await prisma.pharmaReference.update({ where: { id: c.id }, data: { ...c.row, rawHash: c.hash, lastSeenAt: now, removedAt: null } });
    for (const c of chunks(touch, 1000)) await prisma.pharmaReference.updateMany({ where: { id: { in: c } }, data: { lastSeenAt: now } });
    for (const c of chunks(gone, 1000)) await prisma.pharmaReference.updateMany({ where: { id: { in: c } }, data: { removedAt: now } });
  }
  return { fetched: rows.length, added: toAdd.length, changed: toChange.length, removed: gone.length };
}

export async function runPharmaReferenceSync(opts: { dryRun: boolean; sources?: string[]; fetcher?: Fetcher }): Promise<SyncResult[]> {
  const fetcher = opts.fetcher ?? defaultFetcher;
  const want = (s: string) => !opts.sources?.length || opts.sources.includes(s);
  const results: SyncResult[] = [];
  const one = async (source: "EMA" | "MHRA", load: () => Promise<PharmaRefRow[]>) => {
    const run = opts.dryRun ? null : await prisma.pharmaReferenceRun.create({ data: { source } });
    let res: SyncResult;
    try { res = { source, status: "SUCCESS", ...(await syncSource(source, await load(), opts.dryRun)) }; }
    catch (e) { res = { source, status: "FAILED", fetched: 0, added: 0, changed: 0, removed: 0, error: e instanceof Error ? e.message : String(e) }; }
    if (run) await prisma.pharmaReferenceRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), status: res.status, fetched: res.fetched, added: res.added, changed: res.changed, removed: res.removed, error: res.error ?? null } });
    results.push(res);
  };
  if (want("EMA")) await one("EMA", async () => parseEmaMedicines(await fetcher(EMA_MEDICINES_URL)));
  if (want("MHRA")) await one("MHRA", async () => {
    const files = await discoverMhraFiles(fetcher);
    const all: PharmaRefRow[] = [];
    for (const f of files) all.push(...(await parseMhraCategory(await fetcher(f.url), f.category)));
    return all;
  });
  return results;
}
