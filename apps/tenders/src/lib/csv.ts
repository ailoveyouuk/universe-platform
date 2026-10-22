/** Client-side CSV download. Cells that a spreadsheet could read as a formula are prefixed with an apostrophe, and the file opens correctly in Excel (UTF-8 BOM, CRLF). */
const cell = (v: unknown): string => {
  let s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (header: string[], rows: unknown[][]): string => [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
export function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const blob = new Blob(["﻿", toCsv(header, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const stamp = () => new Date().toISOString().slice(0, 10);
