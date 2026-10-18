/** Spreadsheet-safe CSV cell: quotes where needed, and a leading apostrophe on anything a spreadsheet would run as a formula. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export const csvRow = (cells: unknown[]) => cells.map(csvCell).join(",");
export const isoDate = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
/** Hard ceiling on one export, so a single request stays bounded; the file says when it was cut off. */
export const EXPORT_ROW_LIMIT = 50000;
export const EXPORT_PAGE = 500;
export function csvFile(prefix: string, header: string[], lines: string[], truncated: boolean) {
  const stamp = new Date().toISOString().slice(0, 10);
  const note = truncated ? [csvRow([`Export stopped at ${EXPORT_ROW_LIMIT} rows; narrow the filters to see the rest.`])] : [];
  return { filename: `universe-${prefix}-${stamp}.csv`, csv: "﻿" + [csvRow(header), ...lines, ...note].join("\r\n") + "\r\n", rowCount: lines.length, truncated };
}
