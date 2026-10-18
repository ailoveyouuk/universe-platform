import type { Connector, FetchLike, WatchItemInput } from "./types";
import { RegulatoryWatchSource } from "./types";

/**
 * Public-feed connectors for the regulatory watch (Product Database step 4b, 2026-10-18). Outbound read-only requests to a fixed
 * allow-list of hosts (api.fda.gov, www.gov.uk); responses are parsed as JSON and never executed. Each connector caps pages and
 * response volume. Feeds can change without notice, so every field is read defensively.
 */
const MAX_PAGES = 20;
const PAGE = 100;
const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const compactDate = (v: string): Date | null => {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
};
const yyyymmdd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function fdaSeverity(classification: string): WatchItemInput["severity"] {
  const c = classification.toLowerCase();
  if (c.includes("class iii")) return "MEDIUM";
  if (c.includes("class ii")) return "HIGH";
  if (c.includes("class i")) return "CRITICAL";
  return "MEDIUM";
}

function openFdaConnector(kind: "device" | "drug", source: RegulatoryWatchSource): Connector {
  return {
    source,
    async fetchItems(since, fetchFn) {
      const out: WatchItemInput[] = [];
      const key = process.env.OPENFDA_API_KEY ? `&api_key=${encodeURIComponent(process.env.OPENFDA_API_KEY)}` : "";
      const range = `report_date:[${yyyymmdd(since)}+TO+${yyyymmdd(new Date())}]`;
      for (let page = 0; page < MAX_PAGES; page++) {
        const res = await fetchFn(`https://api.fda.gov/${kind}/enforcement.json?search=${range}&limit=${PAGE}&skip=${page * PAGE}${key}`);
        if (res.status === 404) break; // openFDA answers 404 when there are no results
        if (!res.ok) throw new Error(`openFDA ${kind} returned HTTP ${res.status}`);
        const body = (await res.json()) as { results?: Record<string, unknown>[] };
        const rows = body.results ?? [];
        for (const r of rows) {
          const ref = str(r.recall_number);
          const issue = compactDate(str(r.report_date)) ?? compactDate(str(r.center_classification_date));
          if (!ref || !issue) continue;
          const desc = str(r.product_description);
          const firm = str(r.recalling_firm);
          const status = /terminated|completed/i.test(str(r.status)) ? "CLOSED" : "OPEN";
          out.push({
            source, sourceReference: ref, authority: "FDA", noticeType: "RECALL", severity: fdaSeverity(str(r.classification)),
            title: clip(`${firm}: ${desc}`, 280), summary: clip(str(r.reason_for_recall) || "No reason published.", 4000),
            actionRequired: null, affectedText: clip([desc, str(r.code_info), str(r.more_code_info)].filter(Boolean).join(" "), 8000),
            firmName: firm || null, countryCodes: null, issueDate: issue, status,
            url: `https://www.accessdata.fda.gov/scripts/ires/index.cfm?Event=${encodeURIComponent(str(r.event_id))}`,
          });
        }
        if (rows.length < PAGE) break;
      }
      return out;
    },
  };
}

export function mhraClassify(alertTypes: string[], title: string): Pick<WatchItemInput, "noticeType" | "severity"> {
  const t = alertTypes.join(" ").toLowerCase();
  const ti = title.toLowerCase();
  const severity: WatchItemInput["severity"] = /class-?1\b|class 1/.test(t + " " + ti) ? "CRITICAL" : /class-?2\b|class 2/.test(t + " " + ti) ? "HIGH" : /class-?3\b|class 3/.test(t + " " + ti) ? "MEDIUM" : /recall/.test(ti) ? "HIGH" : "LOW";
  const noticeType: WatchItemInput["noticeType"] = /drug-alert|recall/.test(t + " " + ti) ? "RECALL" : /field-safety|field safety/.test(t + " " + ti) ? "FIELD_SAFETY_NOTICE" : "SAFETY_ALERT";
  return { noticeType, severity };
}

const mhra: Connector = {
  source: RegulatoryWatchSource.MHRA_ALERTS,
  async fetchItems(since, fetchFn) {
    const out: WatchItemInput[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await fetchFn(`https://www.gov.uk/api/search.json?filter_format=medical_safety_alert&count=${PAGE}&start=${page * PAGE}&order=-public_timestamp&fields=title,description,link,public_timestamp,alert_type,issued_date`);
      if (!res.ok) throw new Error(`GOV.UK search returned HTTP ${res.status}`);
      const body = (await res.json()) as { results?: Record<string, unknown>[] };
      const rows = body.results ?? [];
      let reachedOld = false;
      for (const r of rows) {
        const updated = new Date(str(r.public_timestamp));
        if (Number.isNaN(updated.getTime())) continue;
        if (updated < since) { reachedOld = true; continue; }
        const link = str(r.link);
        if (!link) continue;
        const types = Array.isArray(r.alert_type) ? (r.alert_type as unknown[]).map(str) : [];
        const title = str(r.title);
        const issued = new Date(str(r.issued_date) || str(r.public_timestamp));
        out.push({
          source: RegulatoryWatchSource.MHRA_ALERTS, sourceReference: link, authority: "MHRA", ...mhraClassify(types, title),
          title: clip(title, 290), summary: clip(str(r.description).trim() || title, 4000), actionRequired: null,
          affectedText: clip(`${title} ${str(r.description)}`, 8000), firmName: null, countryCodes: "GB",
          issueDate: Number.isNaN(issued.getTime()) ? updated : issued, status: "OPEN", url: `https://www.gov.uk${link}`,
        });
      }
      if (rows.length < PAGE || reachedOld) break;
    }
    return out;
  },
};

export const CONNECTORS: Connector[] = [
  openFdaConnector("device", RegulatoryWatchSource.OPENFDA_DEVICE),
  openFdaConnector("drug", RegulatoryWatchSource.OPENFDA_DRUG),
  mhra,
];

export const defaultFetch: FetchLike = async (url) => {
  const u = new URL(url);
  if (u.hostname !== "api.fda.gov" && u.hostname !== "www.gov.uk") throw new Error(`Host not on the regulatory-watch allow-list: ${u.hostname}`);
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 30000);
  try {
    return await fetch(url, { signal: ctl.signal, headers: { accept: "application/json", "user-agent": "universe-regulatory-watch/1.0" } });
  } finally {
    clearTimeout(t);
  }
};
