import { UNIVERSE_APPS } from "@universe/ui";

/** Base URL of the Tenders app, where the supplier acts on bids, call-offs, variations and contracts. */
export function tendersUrl(path: string): string {
  const base = UNIVERSE_APPS.find((a) => a.key === "tender-issuance")?.href ?? "";
  return `${base.replace(/\/$/, "")}${path}`;
}
