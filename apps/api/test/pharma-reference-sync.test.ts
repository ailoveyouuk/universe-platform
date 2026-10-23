import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import { prisma, runPharmaReferenceSync, EMA_MEDICINES_URL } from "@universe/db";
import { afterAll, describe, expect, it } from "vitest";

const suffix = randomUUID().slice(0, 8);
const HDR = ["Category", "Name of medicine", "EMA product number", "Medicine status", "Active substance", "ATC code (human)"];
async function emaFile(rows: string[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("s");
  ws.addRow(HDR); for (const r of rows) ws.addRow(r);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
const fetcherFor = (file: Buffer) => async (url: string) => { if (url !== EMA_MEDICINES_URL) throw new Error("unexpected " + url); return file; };

/** The register sync: adds, detects changes, marks removals (never deletes), revives, and refuses a file that would remove most of the register. */
describe("pharma reference sync", () => {
  afterAll(async () => { await prisma.pharmaReference.deleteMany({ where: { sourceKey: { endsWith: suffix } } }); });
  const k = (n: number) => `EMEA/H/C/T${n}-${suffix}`;

  it("adds on first sight, is quiet on a repeat, updates a change, marks and revives removals", async () => {
    const base = [["Human", "Alpha", k(1), "Authorised", "alphamab", "J01CA04"], ["Human", "Beta", k(2), "Authorised", "betamab", "N02BE01"]];
    let r = (await runPharmaReferenceSync({ dryRun: false, sources: ["EMA"], fetcher: fetcherFor(await emaFile(base)) }))[0];
    expect(r.status).toBe("SUCCESS"); expect(r.added).toBeGreaterThanOrEqual(2);

    r = (await runPharmaReferenceSync({ dryRun: false, sources: ["EMA"], fetcher: fetcherFor(await emaFile(base)) }))[0];
    expect(r).toMatchObject({ added: 0, changed: 0 });

    const changed = [["Human", "Alpha", k(1), "Withdrawn", "alphamab", "J01CA04"]];
    r = (await runPharmaReferenceSync({ dryRun: false, sources: ["EMA"], fetcher: fetcherFor(await emaFile(changed)) }))[0];
    expect(r.changed).toBe(1); expect(r.removed).toBeGreaterThanOrEqual(1);
    const alpha = await prisma.pharmaReference.findUnique({ where: { source_sourceKey: { source: "EMA", sourceKey: k(1) } } });
    const beta = await prisma.pharmaReference.findUnique({ where: { source_sourceKey: { source: "EMA", sourceKey: k(2) } } });
    expect(alpha?.status).toBe("Withdrawn"); expect(alpha?.removedAt).toBeNull();
    expect(beta?.removedAt).not.toBeNull();

    await runPharmaReferenceSync({ dryRun: false, sources: ["EMA"], fetcher: fetcherFor(await emaFile(base)) });
    const back = await prisma.pharmaReference.findUnique({ where: { source_sourceKey: { source: "EMA", sourceKey: k(2) } } });
    expect(back?.removedAt).toBeNull();
  });

  it("a dry run writes nothing, and a failing source is reported, not thrown", async () => {
    const before = await prisma.pharmaReference.count({ where: { sourceKey: { endsWith: suffix } } });
    const r = (await runPharmaReferenceSync({ dryRun: true, sources: ["EMA"], fetcher: fetcherFor(await emaFile([["Human", "Gamma", k(9), "Authorised", "g", "J01"]])) }))[0];
    expect(r.added).toBeGreaterThanOrEqual(1);
    expect(await prisma.pharmaReference.count({ where: { sourceKey: { endsWith: suffix } } })).toBe(before);
    const bad = (await runPharmaReferenceSync({ dryRun: true, sources: ["EMA"], fetcher: async () => { throw new Error("network down"); } }))[0];
    expect(bad.status).toBe("FAILED"); expect(bad.error).toContain("network down");
  });
});
