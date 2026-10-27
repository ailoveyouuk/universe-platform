"use client";

import { ORG_TYPE_LABELS } from "@universe/types";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { UNIVERSE_APPS } from "./AppSwitcher";
import { Pill } from "./Pill";

/** Structural copy of OrganizationCard from @universe/types, so this package needs no dependency on it. */
export interface OrgCardData {
  id: string;
  name: string;
  type: string;
  detailVisible: boolean;
  canEdit: boolean;
  description: string | null;
  website: string | null;
  contactName: string | null;
  contactEmail: string | null;
  yearsInOperation: number | null;
  scope: string[];
  certifications: { type: string; title: string | null; issuingBody: string | null; expiresOn: string | null; status: string }[];
}

const TYPE_LABELS: Record<string, string> = ORG_TYPE_LABELS;
const CERT_TONE: Record<string, "good" | "warning" | "critical" | "neutral"> = { VALID: "good", EXPIRING: "warning", EXPIRED: "critical", NO_EXPIRY: "neutral" };
const CERT_STATUS: Record<string, string> = { VALID: "Valid", EXPIRING: "Expiring soon", EXPIRED: "Expired", NO_EXPIRY: "No expiry" };

/** Where an organisation's profile is edited: its page in Admin. */
export function organizationEditHref(organizationId: string): string {
  const admin = UNIVERSE_APPS.find((a) => a.key === "admin")?.href ?? "";
  return `${admin.replace(/\/$/, "")}/organizations/detail?id=${organizationId}`;
}

/**
 * The one read-only picture of an organisation used across Universe. The profile itself is edited only in Admin;
 * people who may edit it get an "Edit profile" link there. Presentational: the caller supplies the data and display labels.
 */
export function OrganizationCard({ card, scopeLabels, certLabels }: { card: OrgCardData; scopeLabels?: Record<string, string>; certLabels?: Record<string, string> }) {
  const muted = { color: "var(--u-ink-secondary)", fontSize: 13 } as const;
  const label = (t: string) => <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--u-ink-secondary)", margin: "14px 0 6px" }}>{t}</div>;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{card.name}</div>
          <div style={muted}>{TYPE_LABELS[card.type] ?? card.type}{card.yearsInOperation ? ` · ${card.yearsInOperation} years in operation` : ""}</div>
        </div>
        {card.canEdit && (
          <a href={organizationEditHref(card.id)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13.5, fontWeight: 600 }}>Edit profile</a>
        )}
      </div>
      {!card.detailVisible ? (
        <p style={{ ...muted, marginTop: 14 }}>This organisation has not published a profile.</p>
      ) : (
        <>
          {card.description && <p style={{ fontSize: 14, margin: "14px 0 0", whiteSpace: "pre-wrap" }}>{card.description}</p>}
          {(card.website || card.contactName || card.contactEmail) && (
            <>
              {label("Contact")}
              <div style={{ fontSize: 14, display: "flex", flexDirection: "column", gap: 2 }}>
                {card.contactName && <span>{card.contactName}</span>}
                {card.contactEmail && <a href={`mailto:${card.contactEmail}`}>{card.contactEmail}</a>}
                {card.website && <a href={/^https?:\/\//.test(card.website) ? card.website : `https://${card.website}`} target="_blank" rel="noopener noreferrer">{card.website}</a>}
              </div>
            </>
          )}
          {card.scope.length > 0 && (
            <>
              {label("Scope of supply")}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{card.scope.map((id) => <Pill key={id}>{scopeLabels?.[id] ?? id}</Pill>)}</div>
            </>
          )}
          {card.certifications.length > 0 && (
            <>
              {label("Certifications")}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {card.certifications.map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: 14 }}>
                    <span>{certLabels?.[c.type] ?? c.type.replace(/_/g, " ")}{c.title ? `, ${c.title}` : ""}{c.issuingBody ? <span style={muted}> · {c.issuingBody}</span> : null}</span>
                    <Pill tone={CERT_TONE[c.status] ?? "neutral"}>{CERT_STATUS[c.status] ?? c.status}{c.expiresOn ? ` · ${c.expiresOn.slice(0, 10)}` : ""}</Pill>
                  </div>
                ))}
              </div>
            </>
          )}
          {!card.description && card.scope.length === 0 && card.certifications.length === 0 && <p style={{ ...muted, marginTop: 14 }}>The profile is published but has no details yet.</p>}
        </>
      )}
    </div>
  );
}

/** An organisation's name that opens its card in a dialog. `load` fetches the card (each app passes its own API client). */
export function OrganizationCardLink({
  organizationId,
  name,
  load,
  scopeLabels,
  certLabels,
  children,
}: {
  organizationId: string;
  name: string;
  load: (organizationId: string) => Promise<OrgCardData>;
  scopeLabels?: Record<string, string>;
  certLabels?: Record<string, string>;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState<OrgCardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    if (!card) load(organizationId).then(setCard).catch((e) => setError(e instanceof Error ? e.message : "Could not load the organisation."));
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button type="button" className="u-touch" onClick={() => setOpen(true)} style={{ all: "unset", cursor: "pointer", color: "var(--u-link)", fontWeight: "inherit", textDecoration: "none" }} title="View organisation profile">
        {children ?? name}
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={name} onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(20,18,31,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--u-surface-raised)", borderRadius: "var(--u-radius-lg, 14px)", boxShadow: "var(--u-shadow-card)", padding: 22, width: "min(520px, 100%)", maxHeight: "85vh", overflowY: "auto", boxSizing: "border-box" }}>
            {error ? <p style={{ color: "var(--u-status-critical-text)" }}>{error}</p> : card ? <OrganizationCard card={card} scopeLabels={scopeLabels} certLabels={certLabels} /> : <p>Loading…</p>}
            <div style={{ marginTop: 18, textAlign: "right" }}>
              <button type="button" onClick={() => setOpen(false)} style={{ padding: "8px 16px", borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-border)", background: "var(--u-surface-raised)", cursor: "pointer", fontFamily: "inherit", fontSize: 13.5 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
