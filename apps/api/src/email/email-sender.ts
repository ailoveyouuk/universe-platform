import { createHash, createHmac } from "crypto";

/**
 * Sends one email through Azure Communication Services (REST, HMAC signed). It only works when ACS_ENDPOINT, ACS_ACCESS_KEY and EMAIL_SENDER are set
 * (the sender address must belong to a verified domain in Azure). Without them nothing is sent and emails wait in the outbox.
 */
export const emailConfigured = () => !!(process.env.ACS_ENDPOINT && process.env.ACS_ACCESS_KEY && process.env.EMAIL_SENDER);

export async function sendEmail(to: string, subject: string, text: string, html?: string, replyTo?: string): Promise<void> {
  const endpoint = new URL(process.env.ACS_ENDPOINT as string);
  const path = "/emails:send?api-version=2023-03-31";
  const body = JSON.stringify({
    senderAddress: process.env.EMAIL_SENDER,
    content: { subject, plainText: text, ...(html ? { html } : {}) },
    recipients: { to: [{ address: to }] },
    ...(replyTo ? { replyTo: [{ address: replyTo }] } : {}),
  });
  const date = new Date().toUTCString();
  const hash = createHash("sha256").update(body).digest("base64");
  const toSign = `POST\n${path}\n${date};${endpoint.host};${hash}`;
  const sig = createHmac("sha256", Buffer.from(process.env.ACS_ACCESS_KEY as string, "base64")).update(toSign).digest("base64");
  const res = await fetch(`${endpoint.origin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ms-date": date, "x-ms-content-sha256": hash, Authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${sig}` },
    body,
  });
  if (!res.ok) throw new Error(`Mail provider answered ${res.status}`);
}
