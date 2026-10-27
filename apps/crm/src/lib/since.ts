/** "2 years 3 months", "5 months", "Less than a month": how long ago a date was, in whole months, for the CRM's dates and logic data. */
export function since(iso: string | null | undefined, now = new Date()): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months -= 1;
  if (months < 1) return now.getTime() - d.getTime() < 86400000 ? "today" : "less than a month";
  const y = Math.floor(months / 12); const m = months % 12;
  const part = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  return [y ? part(y, "year") : "", m ? part(m, "month") : ""].filter(Boolean).join(" ");
}
/** "3 months ago" style phrase; "today" stays as is. */
export const sinceAgo = (iso: string | null | undefined) => { const s = since(iso); return s === null ? null : s === "today" ? "today" : `${s} ago`; };

export const WORK_STATUS_TONE: Record<string, "good" | "neutral" | "warning" | "critical" | "brand"> = { IN_PROGRESS: "brand", SUBMITTED: "warning", AWARDED: "good", COMPLETED: "good", UNAWARDED: "critical", DECLINED: "critical", IDENTIFIED: "neutral" };
