import { createHash } from "node:crypto";
import ExcelJS from "exceljs";

/**
 * Parsers for the public medicine registers (2026-10-23): the EMA "medicines" data table (human and veterinary EU authorisations) and the
 * MHRA Windsor Framework category lists (UK marketing authorisations). Licences: MHRA lists are Open Government Licence v3.0; EMA content
 * may be reused for commercial and non-commercial purposes if EMA is acknowledged as the source (EMA legal notice). The official source
 * text prevails: these rows are reference pointers, not the authorised product information.
 */
export interface PharmaRefRow {
  source: "EMA" | "MHRA";
  sourceKey: string;
  name: string;
  activeSubstances: string | null;
  inn: string | null;
  atcCode: string | null;
  holder: string | null;
  legalStatus: string | null;
  windsorCategory: string | null;
  productType: "HUMAN" | "VETERINARY";
  status: string;
  isGeneric: boolean;
  isBiosimilar: boolean;
  isOrphan: boolean;
  therapeuticArea: string | null;
  pharmacotherapeuticGroup: string | null;
  indication: string | null;
  authorisedOn: Date | null;
  sourceUrl: string | null;
}

export function rowHash(r: PharmaRefRow): string {
  return createHash("sha256").update(JSON.stringify([r.name, r.activeSubstances, r.inn, r.atcCode, r.holder, r.legalStatus, r.windsorCategory, r.productType, r.status, r.isGeneric, r.isBiosimilar, r.isOrphan, r.therapeuticArea, r.pharmacotherapeuticGroup, r.indication, r.authorisedOn?.toISOString() ?? null, r.sourceUrl])).digest("hex");
}

function text(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "object") {
    const o = v as { text?: unknown; hyperlink?: unknown; richText?: { text: string }[]; result?: unknown };
    if (Array.isArray(o.richText)) return text(o.richText.map((t) => t.text).join(""));
    if (o.text != null) return text(o.text);
    if (o.result != null) return text(o.result);
    if (o.hyperlink != null) return text(o.hyperlink);
    if (v instanceof Date) return v.toISOString();
    return null;
  }
  const s = String(v).replace(/\s+/g, " ").trim();
  return s === "" ? null : s;
}
const yes = (v: unknown) => text(v)?.toLowerCase() === "yes";

/** dd/mm/yyyy (as EMA writes it) or an Excel date to a UTC date; null when absent or not understood. */
export function parseDate(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const s = text(v);
  const m = s?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
  return Number.isNaN(d.getTime()) ? null : d;
}

async function sheetRows(buf: Buffer | ArrayBuffer | Uint8Array): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as never);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("The workbook has no sheets.");
  const rows: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    for (let c = 1; c <= row.cellCount; c++) cells.push(text(row.getCell(c).value) ?? "");
    rows.push(cells);
  });
  return rows;
}

/** Finds the header row (the first containing every required name) and maps header text, with line breaks collapsed, to column index. */
function withHeader(rows: string[][], required: string[]): { index: Map<string, number>; data: string[][] } {
  const at = rows.findIndex((r) => required.every((h) => r.some((c) => c.toLowerCase() === h.toLowerCase())));
  if (at < 0) throw new Error(`Header row not found (expected ${required.join(", ")}). The source layout may have changed.`);
  const index = new Map<string, number>();
  rows[at].forEach((h, i) => { if (h) index.set(h.toLowerCase(), i); });
  return { index, data: rows.slice(at + 1) };
}

export async function parseEmaMedicines(buf: Buffer | ArrayBuffer | Uint8Array): Promise<PharmaRefRow[]> {
  const { index, data } = withHeader(await sheetRows(buf), ["Category", "Name of medicine", "EMA product number", "Medicine status"]);
  const col = (r: string[], name: string) => { const i = index.get(name.toLowerCase()); return i == null ? null : (r[i] || null); };
  const out: PharmaRefRow[] = [];
  for (const r of data) {
    const key = col(r, "EMA product number"), name = col(r, "Name of medicine"), category = col(r, "Category");
    if (!key || !name || !category) continue;
    const vet = category.toLowerCase().startsWith("vet");
    out.push({
      source: "EMA", sourceKey: key, name,
      activeSubstances: col(r, "Active substance"), inn: col(r, "International non-proprietary name (INN) / common name"),
      atcCode: vet ? col(r, "ATCvet code (veterinary)") : col(r, "ATC code (human)"),
      holder: col(r, "Marketing authorisation developer / applicant / holder"), legalStatus: null, windsorCategory: null,
      productType: vet ? "VETERINARY" : "HUMAN", status: col(r, "Medicine status") ?? "Unknown",
      isGeneric: yes(col(r, "Generic")), isBiosimilar: yes(col(r, "Biosimilar")), isOrphan: yes(col(r, "Orphan medicine")),
      therapeuticArea: col(r, "Therapeutic area (MeSH)"),
      pharmacotherapeuticGroup: vet ? col(r, "Pharmacotherapeutic group (veterinary)") : col(r, "Pharmacotherapeutic group (human)"),
      indication: col(r, "Therapeutic indication"), authorisedOn: parseDate(col(r, "Marketing authorisation date")), sourceUrl: col(r, "Medicine URL"),
    });
  }
  return out;
}

/** One row per authorisation number: the MHRA file repeats a licence once per active substance, so substances are joined. */
export async function parseMhraCategory(buf: Buffer | ArrayBuffer | Uint8Array, fallbackCategory: string): Promise<PharmaRefRow[]> {
  const { index, data } = withHeader(await sheetRows(buf), ["Authorisation Number", "Licensed Product Name", "Active Substance Name"]);
  const col = (r: string[], name: string) => { const i = index.get(name.toLowerCase()); return i == null ? null : (r[i] || null); };
  const byPl = new Map<string, PharmaRefRow>();
  for (const r of data) {
    const pl = col(r, "Authorisation Number"), name = col(r, "Licensed Product Name");
    if (!pl || !name) continue;
    const substance = col(r, "Active Substance Name");
    const existing = byPl.get(pl);
    if (existing) {
      if (substance && !(existing.activeSubstances ?? "").split("; ").includes(substance)) existing.activeSubstances = existing.activeSubstances ? `${existing.activeSubstances}; ${substance}` : substance;
      continue;
    }
    byPl.set(pl, {
      source: "MHRA", sourceKey: pl, name, activeSubstances: substance, inn: null, atcCode: null,
      holder: col(r, "Authorisation Holder Company Name"), legalStatus: col(r, "Legal Status Type"), windsorCategory: col(r, "Windsor Framework Classification") ?? fallbackCategory,
      productType: "HUMAN", status: "Authorised", isGeneric: false, isBiosimilar: false, isOrphan: false,
      therapeuticArea: null, pharmacotherapeuticGroup: null, indication: null, authorisedOn: null, sourceUrl: null,
    });
  }
  return [...byPl.values()];
}
