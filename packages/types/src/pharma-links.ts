/**
 * Shared vocabulary for linking catalogue products to the EMA / MHRA register: leaflet (PIL) links, match scoring and
 * the "source pill" descriptors every app renders the same way. Pure functions, no I/O.
 */

export type PharmaSourceCode = "EMA" | "MHRA" | "SUPPLIER" | "UNIVERSE";
export type PharmaLinkStatus = "SUGGESTED" | "CONFIRMED" | "REJECTED";

/** A leaflet link and where it comes from. `official` is false for links a person typed in. */
export interface PilLink {
  source: PharmaSourceCode;
  kind: "PIL_PDF" | "EPAR_PAGE" | "MHRA_SEARCH" | "MANUAL";
  label: string;
  url: string;
  official: boolean;
}

export interface PilRegisterInput { source: string; sourceKey: string; sourceUrl: string | null; productType?: string | null }

const EPAR = /^https:\/\/www\.ema\.europa\.eu\/en\/medicines\/human\/EPAR\/([a-z0-9][a-z0-9-]*)\/?$/i;

/** The EMA publishes each EPAR's product information (SmPC, labelling and package leaflet) as one PDF at a predictable address. */
export function emaProductInformationPdf(sourceUrl: string | null | undefined): string | null {
  const m = sourceUrl ? EPAR.exec(sourceUrl.trim()) : null;
  return m ? `https://www.ema.europa.eu/en/documents/product-information/${m[1].toLowerCase()}-epar-product-information_en.pdf` : null;
}

/** MHRA's products site is script-rendered, so this is a search link-out on the PL number, not a direct document link. */
export function mhraSearchUrl(plNumber: string): string {
  return `https://products.mhra.gov.uk/search/?search=${encodeURIComponent(plNumber.trim())}`;
}

/** Leaflet links for one register entry. Always official; the official text prevails. */
export function pilLinksForReference(r: PilRegisterInput): PilLink[] {
  if (r.source === "EMA") {
    const out: PilLink[] = [];
    const pdf = emaProductInformationPdf(r.sourceUrl);
    if (pdf) out.push({ source: "EMA", kind: "PIL_PDF", label: "EU leaflet (EMA)", url: pdf, official: true });
    if (r.sourceUrl) out.push({ source: "EMA", kind: "EPAR_PAGE", label: "EMA product page", url: r.sourceUrl, official: true });
    return out;
  }
  if (r.source === "MHRA") return [{ source: "MHRA", kind: "MHRA_SEARCH", label: "UK leaflet (MHRA)", url: mhraSearchUrl(r.sourceKey), official: true }];
  return [];
}

/** Only https links are accepted for a hand-entered leaflet. */
export function cleanManualPilUrl(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v || v.length > 1000) return null;
  try { const u = new URL(v); return u.protocol === "https:" ? u.toString() : null; } catch { return null; }
}

export function manualPilLink(url: string | null | undefined): PilLink | null {
  const clean = cleanManualPilUrl(url);
  return clean ? { source: "SUPPLIER", kind: "MANUAL", label: "Leaflet (supplied)", url: clean, official: false } : null;
}

/** Display descriptor for a source or match-state pill, so every app labels and tones them identically. */
export interface SourcePillSpec { label: string; tone: "brand" | "accent" | "good" | "warning" | "critical" | "neutral"; title: string }
export function sourcePill(code: PharmaSourceCode): SourcePillSpec {
  switch (code) {
    case "EMA": return { label: "EMA", tone: "brand", title: "European Medicines Agency register" };
    case "MHRA": return { label: "MHRA", tone: "accent", title: "UK MHRA register" };
    case "SUPPLIER": return { label: "Supplied", tone: "neutral", title: "Entered by a person, not an official source" };
    default: return { label: "Universe", tone: "neutral", title: "Universe catalogue" };
  }
}
export function matchPill(status: PharmaLinkStatus | "NONE"): SourcePillSpec {
  switch (status) {
    case "CONFIRMED": return { label: "Verified", tone: "good", title: "Confirmed against an official register entry" };
    case "SUGGESTED": return { label: "Suggested match", tone: "warning", title: "Possible register match awaiting confirmation" };
    case "REJECTED": return { label: "Rejected", tone: "critical", title: "Match rejected" };
    default: return { label: "Not linked", tone: "neutral", title: "No register entry linked" };
  }
}

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export interface MatchProduct { name: string; inn?: string | null; brand?: string | null; atcCode?: string | null }
export interface MatchReference { name: string; inn?: string | null; activeSubstances?: string | null; atcCode?: string | null }

/** Score a candidate register entry against a product. 0-100; 40+ is worth suggesting. Basis lists the fields that agreed. */
export function scorePharmaMatch(p: MatchProduct, r: MatchReference): { score: number; basis: string[] } {
  let score = 0; const basis: string[] = [];
  const rName = norm(r.name), brand = norm(p.brand), pName = norm(p.name);
  if (brand && rName && (rName === brand || rName.startsWith(brand + " "))) { score += 45; basis.push("brand"); }
  else if (rName && pName && (pName === rName || pName.startsWith(rName + " "))) { score += 35; basis.push("name"); }
  const inn = norm(p.inn);
  if (inn) {
    const subs = norm(`${r.inn ?? ""} ${r.activeSubstances ?? ""}`);
    if (norm(r.inn) === inn) { score += 40; basis.push("inn"); }
    else if (subs && (` ${subs} `).includes(` ${inn} `)) { score += 30; basis.push("active substance"); }
  }
  if (p.atcCode && r.atcCode && p.atcCode.toUpperCase() === r.atcCode.toUpperCase()) { score += 15; basis.push("atc"); }
  return { score: Math.min(score, 100), basis };
}
export const PHARMA_SUGGEST_MIN_SCORE = 40;

/** What the product page and list rows need to render the pills and leaflet panel. */
export interface ProductPharmaLinkView {
  id: string;
  status: PharmaLinkStatus;
  score: number;
  basis: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  reference: {
    id: string; source: "EMA" | "MHRA"; sourceKey: string; name: string; activeSubstances: string | null; inn: string | null; atcCode: string | null;
    holder: string | null; status: string; legalStatus: string | null; windsorCategory: string | null; isGeneric: boolean; isBiosimilar: boolean; isOrphan: boolean;
    sourceUrl: string | null;
  };
  pilLinks: PilLink[];
}
export interface ProductPharmaPanel {
  /** True for simulated demo products: their links are demo data, visible only inside demo organisations. */
  simulated?: boolean;
  atcCode: string | null;
  verified: boolean;
  links: ProductPharmaLinkView[];
  /** Confirmed-link leaflets plus any hand-entered one. */
  pil: PilLink[];
  manualPilUrl: string | null;
  attribution: string;
}
export const PHARMA_ATTRIBUTION = "Source: EMA medicines data and UK MHRA Windsor Framework lists (Open Government Licence v3.0). The official leaflet and register entry prevail.";
