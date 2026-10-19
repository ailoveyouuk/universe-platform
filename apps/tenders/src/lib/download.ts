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

/** Saves a file the API returned as base64 (generated bid templates). */
export function saveBase64File(f: { fileName: string; contentType: string; contentBase64: string }): void {
  const bytes = Uint8Array.from(atob(f.contentBase64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: f.contentType }));
  const a = document.createElement("a");
  a.href = url; a.download = f.fileName; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The file's bytes as base64, for upload in a JSON body. */
export const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
  r.onerror = () => reject(new Error("Could not read the file."));
  r.readAsDataURL(file);
});

export const saveExport = (f: ProductExportFile): void => saveTextFile(f.filename, f.csv);
