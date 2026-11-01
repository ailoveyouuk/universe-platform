import { EMAIL_EVENT_TYPES } from "@universe/types";

/**
 * Writes one email for its reader (2026-11-01). Pure: given what we know, returns subject, HTML and plain text.
 * Rules: never put personal data or record detail in the email beyond the notification's own title (the reader signs in to see the rest); organisation name
 * always in text beside any logo (many mail apps hide images); button and header colours are checked for contrast; plain-text copy always provided.
 */
export interface EmailContext {
  orgName: string;
  logoUrl: string | null;
  primaryColor: string | null;
  eventKey: string;
  title: string;
  body: string | null;
  link: string | null;
  actorName: string | null;
  actorTitle: string | null;
  requiresAction: boolean;
  dueDate: Date | null;
  category: string | null;
  support: { name: string; role: string; email: string } | null;
  sentAt: Date;
  legalLine: string;
}

const VIOLET = "#4A2E8C";
const GUIDE: Record<string, { app: string; ask: string }> = {
  "tender-award": { app: "Tenders", ask: "Review the award decision and approve or decline it." },
  "tender-debriefs": { app: "Tenders", ask: "Check the debriefs that have been released." },
  "tender-changes": { app: "Tenders", ask: "Check the change and tell any affected people." },
  "tender-evaluation": { app: "Tenders", ask: "Open the tender to see your part in the evaluation." },
  "complaint-logged": { app: "Quality", ask: "Acknowledge and triage the complaint within the response time." },
  "complaint-response": { app: "Quality", ask: "Open the complaint and take the next step." },
  "product-approval": { app: "Product database", ask: "Review the product or amendment and approve or return it." },
  safety: { app: "Quality", ask: "Review the notice and decide on any action needed." },
  certification: { app: "Stakeholders", ask: "Review and approve or return the request." },
  "crm-review": { app: "Relationships", ask: "Open the item and complete the follow-up or approval." },
  "data-export": { app: "Data exports", ask: "Review the request and approve or decline it." },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hex = (c: string | null) => { const m = c && /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(c.trim()); if (!m) return null; const h = m[1].length === 3 ? m[1].split("").map((x) => x + x).join("") : m[1]; return h.toUpperCase(); };
const lum = (h: string) => { const l = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * l(parseInt(h.slice(0, 2), 16)) + 0.7152 * l(parseInt(h.slice(2, 4), 16)) + 0.0722 * l(parseInt(h.slice(4, 6), 16)); };
const contrast = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const onColour = (h: string) => (contrast(lum(h), 1) >= contrast(lum(h), 0) ? "#FFFFFF" : "#111111");
const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
const fmtDateTime = (d: Date) => `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" })} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" })} (UK time)`;

export function renderEmail(c: EmailContext): { subject: string; html: string; text: string } {
  const type = EMAIL_EVENT_TYPES.find((e) => e.key === c.eventKey);
  const guide = GUIDE[c.eventKey] ?? { app: "Universe", ask: "Open the item to see what is needed." };
  const due = c.dueDate ? fmtDate(c.dueDate) : null;
  const subject = `[${c.orgName}] ${c.requiresAction ? "Action needed: " : ""}${c.title}${c.requiresAction && due ? ` (by ${due})` : ""}`.slice(0, 300);

  // Header band: the organisation's colour if it has enough contrast with its text, otherwise Universe violet.
  let band = hex(c.primaryColor) ?? VIOLET.slice(1);
  const bandText = onColour(band);
  if (contrast(lum(band), lum(bandText.slice(1))) < 4.5) band = VIOLET.slice(1);
  // Button: needs 3:1 against the white page as well as readable text.
  let btn = hex(c.primaryColor) ?? VIOLET.slice(1);
  if (contrast(lum(btn), 1) < 3) btn = "1F2937";
  const btnText = onColour(btn);

  const who = c.actorName ? `${c.actorName}${c.actorTitle ? ` (${c.actorTitle})` : ""}` : null;
  const lines: string[] = [];
  if (who) lines.push(`From: ${who}, ${c.orgName}`);
  lines.push(c.title);
  if (c.body) lines.push(c.body.slice(0, 300));
  const ask = c.requiresAction ? `Action needed${due ? ` by ${due}` : ""}: ${guide.ask}` : `For your information. ${guide.ask}`;

  const textParts = [
    `${c.orgName} · ${guide.app}`, "",
    ...lines, "",
    ask,
    ...(c.link ? ["", `Open it here: ${c.link}`] : []),
    "", "---",
    `You are receiving this because ${c.orgName} chose to email you about: ${type?.label ?? "this type of event"}.`,
    c.support ? `Questions? Contact ${c.support.name} (${c.support.role}) at ${c.support.email}.` : `Questions? Contact your organisation's administrator.`,
    "We will never ask for your password by email.",
    `Sent ${fmtDateTime(c.sentAt)} via Universe on behalf of ${c.orgName}.`,
    c.legalLine,
  ];

  const logo = c.logoUrl ? `<img src="${esc(c.logoUrl)}" alt="" height="36" style="height:36px;max-width:160px;vertical-align:middle;margin-right:12px;border:0">` : "";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#F3F1F7;font-family:Arial,Helvetica,sans-serif;color:#1B1B1F">
<div style="display:none;max-height:0;overflow:hidden">${esc(c.title)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F1F7"><tr><td align="center" style="padding:20px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:8px;overflow:hidden">
<tr><td style="background:#${band};color:${bandText};padding:16px 24px">${logo}<span style="font-size:18px;font-weight:bold;vertical-align:middle;color:${bandText}">${esc(c.orgName)}</span><br><span style="font-size:13px;color:${bandText}">${esc(guide.app)} · powered by Universe</span></td></tr>
<tr><td style="padding:24px">
${who ? `<p style="margin:0 0 6px;font-size:13px;color:#4B4B55">From ${esc(who)}</p>` : ""}
<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#1B1B1F">${esc(c.title)}</h1>
${c.body ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#1B1B1F">${esc(c.body.slice(0, 300))}</p>` : ""}
<p style="margin:0 0 20px;padding:12px 14px;border-left:4px solid #${btn};background:#F6F5FA;font-size:15px;line-height:1.5;color:#1B1B1F"><strong>${c.requiresAction ? `Action needed${due ? ` by ${esc(due)}` : ""}` : "For your information"}</strong><br>${esc(guide.ask)}</p>
${c.link ? `<p style="margin:0 0 8px"><a href="${esc(c.link)}" style="display:inline-block;background:#${btn};color:${btnText};text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px;border-radius:6px">Open it now</a></p><p style="margin:0;font-size:12px;color:#4B4B55;word-break:break-all">Or copy this address: ${esc(c.link)}</p>` : ""}
</td></tr>
<tr><td style="padding:16px 24px 22px;border-top:1px solid #E3E0EA;font-size:12px;line-height:1.55;color:#4B4B55">
<p style="margin:0 0 8px">You are receiving this because ${esc(c.orgName)} chose to email you about: ${esc(type?.label ?? "this type of event")}.</p>
<p style="margin:0 0 8px">${c.support ? `Questions? Contact <strong>${esc(c.support.name)}</strong> (${esc(c.support.role)}) at <a href="mailto:${esc(c.support.email)}" style="color:#${contrast(lum(btn), 1) >= 4.5 ? btn : "1F2937"}">${esc(c.support.email)}</a>.` : "Questions? Contact your organisation's administrator."}</p>
<p style="margin:0 0 8px">We will never ask for your password by email. Sent ${esc(fmtDateTime(c.sentAt))} via Universe on behalf of ${esc(c.orgName)}.</p>
<p style="margin:0">${esc(c.legalLine)}</p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject, html, text: textParts.join("\n") };
}
