import type { FetchLike } from "./types";

/**
 * Export / hoarding restrictions (2026-10-18). The UK's list of medicines that cannot be exported or hoarded is published by DHSC
 * and the MHRA as a small CSV whose file name changes with each update, so the connector first asks the GOV.UK content API for the
 * current attachment. Other countries have no feed; their restrictions are curated by platform staff.
 */
export const UK_RESTRICTION_PAGE_API = "https://www.gov.uk/api/content/government/publications/medicines-that-cannot-be-parallel-exported-from-the-uk";
export const UK_RESTRICTION_PAGE = "https://www.gov.uk/government/publications/medicines-that-cannot-be-parallel-exported-from-the-uk";

export interface RestrictionInput {
  restrictingCountryCode: string;
  medicineName: string;
  strength: string | null;
  form: string | null;
  restrictionDate: Date | null;
  sourceKey: string;
}

export const restrictionKey = (name: string, strength: string | null, form: string | null) =>
  [name, strength ?? "", form ?? ""].map((s) => s.trim().toLowerCase().replace(/\s+/g, " ")).join("|");

/** Minimal RFC-4180 style CSV parser (quotes, doubled quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

function ukDate(v: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(v.trim());
  return m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])) : null;
}

/** Parses the DHSC CSV (Name, Strength, Pharmaceutical form, Date of restriction). Throws if the header is not as expected. */
export function parseUkRestrictionCsv(text: string): RestrictionInput[] {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("UK restricted-medicines CSV is empty");
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const iName = head.indexOf("name");
  const iStrength = head.findIndex((h) => h.startsWith("strength"));
  const iForm = head.findIndex((h) => h.includes("form"));
  const iDate = head.findIndex((h) => h.includes("date"));
  if (iName < 0 || iStrength < 0 || iForm < 0) throw new Error(`UK restricted-medicines CSV header not recognised: ${rows[0].join(" | ")}`);
  const out = new Map<string, RestrictionInput>();
  for (const r of rows.slice(1)) {
    const name = (r[iName] ?? "").trim();
    if (!name) continue;
    const strength = (r[iStrength] ?? "").trim() || null;
    const form = (r[iForm] ?? "").trim() || null;
    const key = restrictionKey(name, strength, form);
    out.set(key, { restrictingCountryCode: "GB", medicineName: name, strength, form, restrictionDate: iDate >= 0 ? ukDate(r[iDate] ?? "") : null, sourceKey: key });
  }
  if (out.size === 0) throw new Error("UK restricted-medicines CSV contained no medicines");
  return [...out.values()];
}

/** Finds the current CSV attachment on the GOV.UK page and downloads it. */
export async function fetchUkRestrictions(fetchFn: FetchLike): Promise<{ items: RestrictionInput[]; csvUrl: string }> {
  const meta = await fetchFn(UK_RESTRICTION_PAGE_API);
  if (!meta.ok) throw new Error(`GOV.UK content API returned HTTP ${meta.status}`);
  const body = (await meta.json()) as { details?: { attachments?: { url?: string; content_type?: string }[] } };
  const csv = (body.details?.attachments ?? []).find((a) => a.url && (a.content_type === "text/csv" || a.url.toLowerCase().endsWith(".csv")));
  if (!csv?.url) throw new Error("No CSV attachment found on the GOV.UK restricted-medicines page");
  const res = await fetchFn(csv.url);
  if (!res.ok) throw new Error(`Restricted-medicines CSV returned HTTP ${res.status}`);
  if (!res.text) throw new Error("Fetch implementation cannot read text");
  const text = await res.text();
  return { items: parseUkRestrictionCsv(text), csvUrl: csv.url };
}

export interface RestrictableProduct { name: string; inn: string | null; strength: string | null; dosageForm: string | null }
export interface RestrictionLike { medicineName: string; strength: string | null; form: string | null }
export interface RestrictionMatch { certainty: "MATCH" | "CHECK"; detail: string }

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, "");
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const STOP = new Set(["for", "with", "and", "vial", "vials", "the", "of"]);
const formTokens = (s: string) => s.toLowerCase().split(/[^a-z]+/).filter((t) => t.length >= 4 && !STOP.has(t)).map((t) => t.replace(/s$/, ""));
const isAll = (v: string | null) => !v || v.trim() === "" || v.trim().toLowerCase() === "all";

/**
 * Does a catalogue product fall under a restriction? The generic name must appear (word-bounded) in the product's INN or name.
 * A named strength must match one of the listed strengths, and a named form must share a key word with the product's dosage form.
 * Where the product record lacks a strength or form that the restriction names, the answer is CHECK (needs a human), not a match.
 */
export function matchRestriction(p: RestrictableProduct, r: RestrictionLike): RestrictionMatch | null {
  const term = r.medicineName.trim().toLowerCase();
  if (term.length < 4) return null;
  const re = new RegExp(`\\b${escapeRe(term)}\\b`);
  if (!re.test((p.inn ?? "").toLowerCase()) && !re.test(p.name.toLowerCase())) return null;
  let check: string | null = null;
  if (!isAll(r.strength)) {
    if (!p.strength) check = "product strength not recorded";
    else {
      const have = squash(p.strength);
      if (!(r.strength as string).split("/").map(squash).some((t) => t && (have.includes(t) || t.includes(have)))) return null;
    }
  }
  if (!isAll(r.form)) {
    if (!p.dosageForm) check = check ?? "product dosage form not recorded";
    else {
      const want = formTokens(r.form as string);
      const have = formTokens(p.dosageForm);
      if (want.length > 0 && !want.some((t) => have.includes(t))) return null;
    }
  }
  return check ? { certainty: "CHECK", detail: `Name matches; ${check}` } : { certainty: "MATCH", detail: "Generic name, strength and form match" };
}

/** Origin / destination rule: restricted when the goods come from the restricting country and are going somewhere else. */
export function appliesToRoute(restrictingCountryCode: string, originCountryCode: string | null, destinationCountryCode: string | null): "APPLIES" | "DESTINATION_UNKNOWN" | "NO" {
  if (!originCountryCode || originCountryCode.toUpperCase() !== restrictingCountryCode.toUpperCase()) return "NO";
  if (!destinationCountryCode) return "DESTINATION_UNKNOWN";
  return destinationCountryCode.toUpperCase() === restrictingCountryCode.toUpperCase() ? "NO" : "APPLIES";
}
