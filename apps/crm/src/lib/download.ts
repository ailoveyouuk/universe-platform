import type { ProductExportFile } from "@universe/types";

/** Saves a CSV in the browser; nothing is sent anywhere beyond the API call that produced it. */
export function saveExport(f: ProductExportFile): void {
  const url = URL.createObjectURL(new Blob([f.csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = f.filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
