import type { ProductExportFile } from "@universe/types";

/** Saves text as a file in the browser (no server round trip beyond the API call that produced it). */
export function saveTextFile(filename: string, text: string, mime = "text/csv;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const saveExport = (f: ProductExportFile): void => saveTextFile(f.filename, f.csv);
