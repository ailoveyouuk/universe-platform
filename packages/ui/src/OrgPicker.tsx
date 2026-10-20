import type { ReactNode } from "react";

/**
 * Full-screen "which organisation do you want to see?" chooser shown once per browser session after sign-in, to users who can
 * act inside more than one organisation (2026-10-20: demo users with access to several demo organisations). Purely presentational.
 */
export function OrgPicker({
  organizations,
  currentId,
  userName,
  onChoose,
}: {
  organizations: { id: string; name: string; isDemo?: boolean }[];
  currentId: string;
  userName?: string;
  onChoose: (organizationId: string) => void;
}): ReactNode {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose an organisation"
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "color-mix(in srgb, var(--u-ink) 55%, transparent)", overflowY: "auto" }}
    >
      <div style={{ width: "100%", maxWidth: 460, background: "var(--u-surface-raised)", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", boxShadow: "var(--u-shadow-card)", padding: "28px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ margin: 0, fontFamily: "var(--u-font-display)", fontSize: 20, color: "var(--u-ink)" }}>{userName ? `Welcome, ${userName}` : "Welcome"}</h2>
        <p style={{ margin: "0 0 6px", fontSize: 14, color: "var(--u-ink-secondary)", lineHeight: 1.5 }}>Which organisation would you like to see? You can switch at any time from the header.</p>
        {organizations.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChoose(o.id)}
            style={{ font: "inherit", textAlign: "left", cursor: "pointer", padding: "12px 14px", borderRadius: 8, border: `1px solid ${o.id === currentId ? "var(--u-brand-violet)" : "var(--u-border)"}`, background: "var(--u-surface)", color: "var(--u-ink)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, minHeight: 44 }}
          >
            <span style={{ fontWeight: 600, fontSize: 15 }}>{o.name}</span>
            <span style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>{o.id === currentId ? "Current" : o.isDemo ? "Demo" : ""}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
