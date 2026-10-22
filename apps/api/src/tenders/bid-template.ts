import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import { Document, HeightRule, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import JSZip from "jszip";

/**
 * Locked bid templates (2026-10-20). The platform generates a financial offer workbook (.xlsx) and a technical offer document (.docx)
 * from the tender's own items and criteria; the bidder completes the open cells and uploads them, and the platform reads them into
 * the same bid record the online form uses. A hidden stamp ties each file to its tender so a pack for another tender is refused.
 * Sheet protection is a convenience only; every value is validated again on upload.
 */
export interface TemplateTender { id: string; referenceNumber: string; title: string; issuerName: string; currency: string; bidValidityDays: number | null; closingText: string }
export interface TemplateLine { id: string; lineNumber: number; description: string; quantity: string | null; unit: string | null; lotNumber?: number | null; lotTitle?: string | null }
export interface TemplateCriterion { id: string; title: string; description: string | null; kind: string; weight: string | null; isMandatory: boolean; responseFormat: string }
export interface TemplateCountry { code: string; name: string }

const VERSION = "UBT1";
export const stampFor = (tenderId: string, lines: { id: string }[], criteria: { id: string }[]) =>
  createHash("sha256").update([tenderId, ...lines.map((l) => l.id), "|", ...criteria.map((c) => c.id)].join(",")).digest("hex").slice(0, 16);

const HDR_ROW = 7; const FIRST = 8;

export async function buildFinancialTemplate(t: TemplateTender, lines: TemplateLine[], criteria: { id: string }[], countries: TemplateCountry[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Financial offer");
  const lists = wb.addWorksheet("Lists");
  countries.forEach((c, i) => { lists.getCell(i + 1, 1).value = `${c.code} - ${c.name}`; });
  lists.state = "hidden";
  const meta = wb.addWorksheet("Meta");
  [VERSION, t.id, stampFor(t.id, lines, criteria), "financial"].forEach((v, i) => { meta.getCell(i + 1, 1).value = v; });
  meta.state = "veryHidden";

  ws.getCell("B1").value = `Financial offer · ${t.referenceNumber}`; ws.getCell("B1").font = { bold: true, size: 14 };
  ws.getCell("B2").value = `${t.title} · ${t.issuerName} · closes ${t.closingText}`;
  ws.getCell("B3").value = "Currency of all prices"; ws.getCell("C3").value = t.currency; ws.getCell("C3").font = { bold: true };
  ws.getCell("B4").value = `Bid valid for ${t.bidValidityDays ?? "the required number of"} days after closing? (Yes / No)`;
  ws.getCell("B5").value = "Notes (optional)";
  ws.getCell("B6").value = "Complete only the shaded cells. Do not add, remove or reorder rows. Prices are per unit in the currency above."+(lines.some((l) => l.lotNumber) ? " Bid for a lot in full (price every item in it) or mark every item in it \"Yes\" under Not bidding." : "");
  ws.getCell("B6").font = { italic: true, color: { argb: "FF666666" } };
  const hdr = ["", "Item", "Description", "Quantity", "Unit", "Not bidding? (Yes / No)", "Unit price", "Lead time (days)", "Country of origin", "Manufacturer (optional)", "Remarks (optional)", "Line total", "Lot"];
  hdr.forEach((h, i) => { const c = ws.getCell(HDR_ROW, i + 1); c.value = h; c.font = { bold: true }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E8E8" } }; });
  const input = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFFFF4CC" } };
  const open = (addr: string) => { const c = ws.getCell(addr); c.protection = { locked: false }; c.fill = input; return c; };
  open("C4").dataValidation = { type: "list", allowBlank: true, formulae: ['"Yes,No"'] };
  open("C5");
  lines.forEach((l, i) => {
    const r = FIRST + i;
    ws.getCell(r, 1).value = l.id;
    ws.getCell(r, 2).value = l.lineNumber; ws.getCell(r, 3).value = l.description;
    ws.getCell(r, 4).value = l.quantity === null ? null : Number(l.quantity); ws.getCell(r, 5).value = l.unit ?? "";
    open(`F${r}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"Yes,No"'] };
    open(`G${r}`).dataValidation = { type: "decimal", operator: "greaterThanOrEqual", allowBlank: true, formulae: [0], showErrorMessage: true, errorTitle: "Unit price", error: "Enter a number, 0 or more." };
    open(`H${r}`).dataValidation = { type: "whole", operator: "between", allowBlank: true, formulae: [0, 3650], showErrorMessage: true, errorTitle: "Lead time", error: "Enter whole days, 0 to 3650." };
    open(`I${r}`).dataValidation = { type: "list", allowBlank: true, formulae: [`Lists!$A$1:$A$${Math.max(countries.length, 1)}`], showErrorMessage: true, errorTitle: "Country", error: "Choose a country from the list." };
    open(`J${r}`); open(`K${r}`);
    ws.getCell(r, 13).value = l.lotNumber ? `Lot ${l.lotNumber}${l.lotTitle ? ` · ${l.lotTitle}` : ""}` : "";
    ws.getCell(r, 12).value = { formula: `IF(F${r}="Yes",0,IF(ISNUMBER(G${r}),G${r}*D${r},0))` } as ExcelJS.CellFormulaValue;
  });
  const last = FIRST + lines.length;
  ws.getCell(last, 11).value = "Total"; ws.getCell(last, 11).font = { bold: true };
  ws.getCell(last, 12).value = { formula: `SUM(L${FIRST}:L${last - 1})` } as ExcelJS.CellFormulaValue; ws.getCell(last, 12).font = { bold: true };
  ws.getColumn(1).hidden = true;
  [[2, 7], [3, 46], [4, 11], [5, 10], [6, 16], [7, 13], [8, 14], [9, 24], [10, 24], [11, 28], [12, 14], [13, 30]].forEach(([c, w]) => { ws.getColumn(c!).width = w!; });
  await ws.protect("", { selectLockedCells: true, selectUnlockedCells: true, formatColumns: true });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export interface ParsedFinancial {
  validityConfirmed: boolean; notes: string | null;
  lines: { tenderLineId: string; noBid: boolean; unitPrice: number | null; leadTimeDays: number | null; countryOfOrigin: string | null; manufacturerName: string | null; remarks: string | null }[];
}
const cellVal = (c: ExcelJS.Cell): unknown => {
  const v = c.value as unknown;
  if (v && typeof v === "object") { const o = v as { result?: unknown; richText?: { text: string }[]; text?: unknown }; if ("result" in o) return o.result; if (o.richText) return o.richText.map((x) => x.text).join(""); if ("text" in o) return o.text; }
  return v;
};
const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v).trim());
const toNum = (v: unknown): number | null | "bad" => { if (v === null || v === undefined || str(v) === "") return null; const n = typeof v === "number" ? v : Number(str(v).replace(/,/g, "")); return Number.isFinite(n) ? n : "bad"; };
const yesNo = (v: unknown): boolean | null | "bad" => { const s = str(v).toLowerCase(); if (!s) return null; if (s === "yes") return true; if (s === "no") return false; return "bad"; };

export async function parseFinancialTemplate(buf: Buffer, tenderId: string, expectedStamp: string, lineIds: string[], countryCodes: Set<string>): Promise<{ problems: string[]; data: ParsedFinancial | null }> {
  const wb = new ExcelJS.Workbook();
  try { await wb.xlsx.load(buf as unknown as ArrayBuffer); } catch { return { problems: ["This is not a readable Excel (.xlsx) file."], data: null }; }
  const meta = wb.getWorksheet("Meta"); const ws = wb.getWorksheet("Financial offer");
  if (!meta || !ws || str(cellVal(meta.getCell(1, 1))) !== VERSION || str(cellVal(meta.getCell(4, 1))) !== "financial") return { problems: ["This is not a Universe financial offer template. Download the template from this tender and use that file."], data: null };
  if (str(cellVal(meta.getCell(2, 1))) !== tenderId) return { problems: ["This template was generated for a different tender."], data: null };
  if (str(cellVal(meta.getCell(3, 1))) !== expectedStamp) return { problems: ["This template no longer matches the tender's items. Download a fresh template."], data: null };

  const problems: string[] = [];
  const vc = yesNo(cellVal(ws.getCell("C4")));
  if (vc === "bad") problems.push("Bid validity (cell C4) must be Yes or No.");
  const notes = str(cellVal(ws.getCell("C5"))) || null;
  const out: ParsedFinancial["lines"] = [];
  const seen = new Set<string>();
  for (let i = 0; i < lineIds.length; i++) {
    const r = FIRST + i;
    const id = str(cellVal(ws.getCell(r, 1)));
    const item = str(cellVal(ws.getCell(r, 2))) || String(i + 1);
    if (id !== lineIds[i]) { problems.push(`Row ${r}: the item rows have been changed. Download a fresh template.`); continue; }
    seen.add(id);
    const nb = yesNo(cellVal(ws.getCell(r, 6)));
    if (nb === "bad") problems.push(`Item ${item}: "Not bidding" must be Yes or No.`);
    const price = toNum(cellVal(ws.getCell(r, 7))); const lead = toNum(cellVal(ws.getCell(r, 8)));
    if (price === "bad" || (typeof price === "number" && price < 0)) problems.push(`Item ${item}: the unit price must be a number, 0 or more.`);
    if (lead === "bad" || (typeof lead === "number" && (!Number.isInteger(lead) || lead < 0 || lead > 3650))) problems.push(`Item ${item}: the lead time must be whole days, 0 to 3650.`);
    const rawC = str(cellVal(ws.getCell(r, 9)));
    let code: string | null = null;
    if (rawC) { code = rawC.slice(0, 2).toUpperCase(); if (!countryCodes.has(code) || (rawC.length > 2 && !/^[A-Za-z]{2}\s*-/.test(rawC))) { problems.push(`Item ${item}: choose the country of origin from the list.`); code = null; } }
    const noBid = nb === true;
    out.push({
      tenderLineId: id, noBid,
      unitPrice: noBid || typeof price !== "number" ? null : Math.round(price * 10000) / 10000,
      leadTimeDays: noBid || typeof lead !== "number" ? null : lead, countryOfOrigin: noBid ? null : code,
      manufacturerName: str(cellVal(ws.getCell(r, 10))).slice(0, 300) || null, remarks: str(cellVal(ws.getCell(r, 11))).slice(0, 1000) || null,
    });
  }
  if (problems.length) return { problems, data: null };
  return { problems: [], data: { validityConfirmed: vc === true, notes, lines: out } };
}

// ------------------------------------------------------------------ technical offer (Word)

const textCapable = (c: TemplateCriterion) => c.responseFormat !== "UPLOAD";

export async function buildTechnicalTemplate(t: TemplateTender, lines: { id: string }[], criteria: TemplateCriterion[]): Promise<Buffer> {
  const stamp = stampFor(t.id, lines, criteria);
  const grey = { color: "888888", size: 14 };
  const kids: (Paragraph | Table)[] = [
    new Paragraph({ children: [new TextRun({ text: `Technical offer · ${t.referenceNumber}`, bold: true, size: 32 })] }),
    new Paragraph({ children: [new TextRun({ text: `${t.title} · ${t.issuerName} · closes ${t.closingText}`, size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: "Type your answer in the empty box under each criterion. Do not edit the grey reference lines or add, remove or reorder boxes. Documents such as certificates are uploaded separately on the bid page.", italics: true, size: 20 })], spacing: { before: 200, after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: `UNI-TENDER:${t.id}:${stamp}:technical`, ...grey })] }),
  ];
  for (const c of criteria) {
    kids.push(new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: `${c.title}`, bold: true, size: 24 }), new TextRun({ text: `   ${c.isMandatory ? "Required" : "Optional"} · ${c.kind === "GATE" ? "Pass or fail" : `${c.weight}%`}`, size: 18, color: "666666" })] }));
    if (c.description) kids.push(new Paragraph({ children: [new TextRun({ text: c.description, size: 20 })] }));
    if (!textCapable(c)) { kids.push(new Paragraph({ children: [new TextRun({ text: "Answer by uploading a file on the bid page; nothing to type here.", italics: true, size: 20 })] })); continue; }
    kids.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `UNI-CRIT:${c.id}`, ...grey })] })] })] }),
        new TableRow({ height: { value: 3000, rule: HeightRule.ATLEAST }, children: [new TableCell({ children: [new Paragraph("")] })] }),
      ],
    }));
  }
  return Buffer.from(await Packer.toBuffer(new Document({ sections: [{ children: kids }] })));
}

const unxml = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const paraText = (p: string) => unxml([...p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:br\s*\/>|<w:tab\s*\/>/g)].map((m) => (m[1] !== undefined ? m[1] : "\n")).join(""));
const cellText = (cell: string) => [...cell.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((m) => paraText(m[0])).join("\n").trim();

export async function parseTechnicalTemplate(buf: Buffer, tenderId: string, expectedStamp: string, criterionIds: Set<string>): Promise<{ problems: string[]; data: { criterionId: string; text: string | null }[] | null }> {
  let xml: string;
  try { const zip = await JSZip.loadAsync(buf); const f = zip.file("word/document.xml"); if (!f) throw new Error("x"); xml = await f.async("string"); }
  catch { return { problems: ["This is not a readable Word (.docx) file."], data: null }; }
  const all = [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((m) => paraText(m[0])).join("\n");
  const m = /UNI-TENDER:([^:\s]+):([0-9a-f]+):technical/.exec(all);
  if (!m) return { problems: ["This is not a Universe technical offer template. Download the template from this tender and use that file."], data: null };
  if (m[1] !== tenderId) return { problems: ["This template was generated for a different tender."], data: null };
  if (m[2] !== expectedStamp) return { problems: ["This template no longer matches the tender's criteria. Download a fresh template."], data: null };
  const problems: string[] = []; const out: { criterionId: string; text: string | null }[] = [];
  for (const tbl of xml.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>/g)) {
    const rows = [...tbl[0].matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)].map((r) => cellText(r[0]));
    const ref = /^UNI-CRIT:(\S+)$/.exec(rows[0] ?? "");
    if (!ref) continue;
    if (!criterionIds.has(ref[1]!)) { problems.push("A criterion reference in the document is not on this tender. Download a fresh template."); continue; }
    out.push({ criterionId: ref[1]!, text: (rows.slice(1).join("\n").trim().slice(0, 20000)) || null });
  }
  if (out.length === 0 && problems.length === 0) problems.push("No answer boxes were found. Do not delete the tables in the template.");
  return problems.length ? { problems, data: null } : { problems: [], data: out };
}
