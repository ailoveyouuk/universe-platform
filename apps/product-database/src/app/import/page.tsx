"use client";

import { useState, type ChangeEvent } from "react";
import type { ImportProductMasterResult, ProductSourceStandardForImport } from "@universe/types";
import { apiClient } from "../../lib/apiClient";
import { AlertIcon, Button, Select } from "@universe/ui";

/**
 * Product Database Management — reference-data importer. Added
 * 2026-10-03. See ImportProductMasterDto's doc comment in apps/api for the
 * full rationale: HS codes and the WHO Essential Medicines List are
 * licensed and unblocked to seed ProductMaster from today (see
 * architecture-decisions.md, "Commodity/product classification
 * strategy"); UNSPSC needs a signed UNDP terms addendum first
 * (info.unspsc@undp.org) and GS1 GTIN import means a procurement agent's own already-
 * assigned GTIN export, neither of which exist in this environment and
 * neither of which this sandbox has network access to fetch even if they
 * were publicly hosted (confirmed: who.int and trademap.org both return
 * blocked-by-allowlist from here). So rather than hand-typing a partial
 * code list and presenting it as "the HS code importer", this screen is
 * the re-runnable mechanism itself — paste rows as CSV (sourced from the
 * real WCO/WHO export, however it's obtained), pick the standard once, and
 * every row is upserted idempotently (see importBatch's doc comment — safe
 * to re-run the same or an expanded file later).
 *
 * CSV format: name,category,hsCode,unspscCode,gtin,standardUnit — first
 * row may be a header (auto-detected: skipped if it doesn't look like
 * data, e.g. its first cell is literally "name"). Only name and category
 * are required per row; the other four are typically only sourced from one
 * particular standard; leave them blank where not applicable.
 *
 * Delimiter auto-detection added 2026-10-14 (Lewis: pasting straight from
 * Excel/Google Sheets — the realistic way anyone actually copies rows in —
 * produced nothing, because the parser only ever split on commas and a
 * sheet copy/paste is tab-separated, not comma-separated; every cell
 * landed in a single undefined "name" with no way to tell it apart from a
 * genuinely malformed paste). parseCsv now picks whichever of comma/tab
 * appears more often across the pasted text and splits every row on that,
 * so both a hand-written CSV and a direct spreadsheet paste work from the
 * same textarea. Same change adds a file-attach option below the textarea
 * (plain FileReader read of a .csv/.txt/.tsv file into the same textarea
 * state) — there was previously no way to bring in rows except typing or
 * pasting into the box by hand.
 */
const STANDARD_OPTIONS: { value: ProductSourceStandardForImport; label: string; blocked?: string }[] = [
  { value: "HS_CODE", label: "HS Code (WCO / WTO Medical Goods List)" },
  { value: "WHO_EML", label: "WHO Essential Medicines List" },
  { value: "UNSPSC", label: "UNSPSC", blocked: "Needs a signed UNDP terms addendum first — email info.unspsc@undp.org before importing." },
  { value: "GS1_GTIN", label: "GS1 GTIN (a procurement agent's own export)" },
];

// Picks comma or tab, whichever actually splits the pasted text into more
// than one cell more often — a direct spreadsheet copy/paste is
// tab-separated; a hand-written or exported CSV is comma-separated. Falls
// back to comma (the original, documented format) when neither delimiter
// appears at all, e.g. a single-column paste.
function detectDelimiter(lines: string[]): "," | "\t" {
  const tabLines = lines.filter((l) => l.includes("\t")).length;
  const commaLines = lines.filter((l) => l.includes(",")).length;
  return tabLines > commaLines ? "\t" : ",";
}

function parseCsv(text: string): { name: string; category: string; hsCode?: string; unspscCode?: string; gtin?: string; standardUnit?: string }[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const delimiter = detectDelimiter(lines);
  const rows: ReturnType<typeof parseCsv> = [];
  for (const line of lines) {
    const cells = line.split(delimiter).map((c) => c.trim());
    if (cells[0]?.toLowerCase() === "name" && cells[1]?.toLowerCase() === "category") continue; // header row
    const [name, category, hsCode, unspscCode, gtin, standardUnit] = cells;
    if (!name || !category) continue;
    rows.push({
      name,
      category,
      hsCode: hsCode || undefined,
      unspscCode: unspscCode || undefined,
      gtin: gtin || undefined,
      standardUnit: standardUnit || undefined,
    });
  }
  return rows;
}

export default function ImportPage() {
  const [standard, setStandard] = useState<ProductSourceStandardForImport>("HS_CODE");
  const [csvText, setCsvText] = useState("");
  const [result, setResult] = useState<ImportProductMasterResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  // Added 2026-10-14 alongside the delimiter fix above — reads a plain
  // text file (.csv/.tsv/.txt — whatever a spreadsheet export or a
  // document attachment actually is here, there's no binary .xlsx
  // parsing in this screen) straight into the same textarea state, so the
  // existing parseCsv/detectDelimiter logic handles it exactly like a
  // paste. FileReader only, no upload to the server — the file never
  // leaves the browser until Import is clicked, same as a paste never did.
  function handleFileAttach(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(typeof reader.result === "string" ? reader.result : "");
      setError(null);
      setResult(null);
    };
    reader.onerror = () => setError(`Couldn't read "${file.name}" — try pasting its contents instead.`);
    reader.readAsText(file);
    e.target.value = ""; // allow re-attaching the same file name after a fix
  }

  const selected = STANDARD_OPTIONS.find((s) => s.value === standard);
  const parsedRows = parseCsv(csvText);

  async function runImport() {
    if (parsedRows.length > 5000) {
      setError(`This file has ${parsedRows.length.toLocaleString()} rows. Import at most 5,000 at a time: split the file and import the parts one after another.`);
      return;
    }
    if (parsedRows.length === 0) {
      setError("No valid rows found — each line needs at least name,category.");
      return;
    }
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiClient.importProductCatalogRows(standard, parsedRows);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 22, color: "var(--u-ink)", margin: 0 }}>Reference-Data Import</h1>
      <p style={{ color: "var(--u-ink-secondary)", marginTop: 6, fontSize: 14, lineHeight: 1.5 }}>
        Bulk-seed or enrich the shared product catalogue from a structured reference-data source. Safe to re-run: matching rows
        (by code, or by name for WHO EML) are updated in place rather than duplicated.
      </p>

      <div
        style={{
          marginTop: 20,
          padding: 14,
          borderRadius: "var(--u-radius-lg)",
          border: "1px solid var(--u-border)",
          backgroundColor: "var(--u-surface-alt)",
          fontSize: 13,
          color: "var(--u-ink-secondary)",
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: "var(--u-ink)" }}>Licensing status, per architecture-decisions.md:</strong> HS codes and the WHO
        Essential Medicines List are confirmed open and safe to import today. UNSPSC needs a signed terms addendum from UNDP
        first — do not bulk-import UNSPSC codes until that's in place. GS1 GTIN import means a procurement agent's own already-assigned GTIN
        export, not a public dataset. This screen cannot fetch any of these sources itself (no outbound network access from
        this environment) — paste rows from your own sourced CSV export below.
      </div>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 6, maxWidth: 420 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>Source standard</span>
        <Select
          value={standard}
          onChange={(v) => setStandard(v as ProductSourceStandardForImport)}
          options={STANDARD_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
          ariaLabel="Source standard"
        />
        {selected?.blocked && (
          <p style={{ color: "var(--u-status-warning-text)", fontSize: 12.5, margin: "4px 0 0", display: "flex", alignItems: "center", gap: 6 }}><AlertIcon size={14} /> {selected.blocked}</p>
        )}
      </div>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>
            CSV rows — name,category,hsCode,unspscCode,gtin,standardUnit (only name and category required per row).
            Paste directly from a spreadsheet or type a comma-separated file's contents below.
          </span>
          <label style={{ fontSize: 12.5, color: "var(--u-ink-secondary)", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileAttach} style={{ display: "none" }} />
            <Button type="button" variant="secondary" size="sm" onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.click()}>
              Attach file…
            </Button>
            {fileName && <span>{fileName}</span>}
          </label>
        </div>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder={"name,category,hsCode,unspscCode,gtin,standardUnit\nDisposable nitrile gloves,CONSUMABLES,4015.19,,,BOX"} aria-label={"name,category,hsCode,unspscCode,gtin,standardUnit\nDisposable nitrile gloves,CONSUMABLES,4015.19,,,BOX"}
          style={{
            minHeight: 220,
            padding: 12,
            borderRadius: "var(--u-radius-md)",
            border: "1px solid var(--u-border)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 12.5,
            resize: "vertical",
          }}
        />
        <span style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>{parsedRows.length} row(s) parsed.</span>
      </div>

      {error && <p style={{ color: "var(--u-status-critical-text)", marginTop: 12 }}>{error}</p>}

      <div style={{ marginTop: 16 }}>
        <Button variant="primary" onClick={runImport} disabled={running || parsedRows.length === 0}>
          {running ? "Importing…" : `Import ${parsedRows.length || ""} row(s)`}
        </Button>
      </div>

      {result && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: "var(--u-radius-lg)",
            border: "1px solid var(--u-border)",
            backgroundColor: "var(--u-surface-raised)",
          }}
        >
          <div style={{ display: "flex", gap: 24, fontSize: 14 }}>
            <span><strong style={{ color: "var(--u-status-good-text)" }}>{result.created}</strong> created</span>
            <span><strong style={{ color: "var(--u-brand-violet)" }}>{result.updated}</strong> updated</span>
            <span><strong style={{ color: result.skipped > 0 ? "var(--u-status-critical-text)" : "var(--u-ink-secondary)" }}>{result.skipped}</strong> skipped</span>
          </div>
          {result.errors.length > 0 && (
            <ul style={{ marginTop: 10, paddingLeft: 18, fontSize: 12.5, color: "var(--u-ink-secondary)" }}>
              {result.errors.map((e, i) => (
                <li key={i}>Row {e.row + 1}: {e.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
