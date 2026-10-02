"use client";

import { useEffect, useRef, useState } from "react";
import { GridIcon, LockIcon, ChevronRightIcon } from "./icons";

/**
 * The Universe platform's app registry — one entry per app in the build
 * order from architecture-decisions.md. Each gets a distinct accent colour
 * drawn from the SAME six colour-blindness-validated jewel tones the brand
 * system already uses for the six organization-category tags (see
 * universe-brand-identity.md's 2026-09-28 revalidation) — reusing that set
 * here means a new app's identity colour is never an arbitrary pick, and
 * the set is already proven to stay distinguishable pairwise under every
 * colour-blindness type. Project Management keeps Universe's own
 * brand-violet, since it isn't "one app among several" from its own
 * perspective — it's the one you're standing in.
 *
 * `envVar` names the NEXT_PUBLIC_* variable each app's real deployed URL
 * will come from once it exists — see the "Wiring this up" note on
 * AppSwitcher.tsx below for what actually has to happen before `status`
 * can flip from "comingSoon" to "available": none of this is guesswork,
 * it's the concrete next step, just not something a UI-only pass can do.
 */
export interface UniverseAppEntry {
  key: string;
  label: string;
  accent: string;
  status: "current" | "available" | "comingSoon";
  href?: string;
  envVar: string;
}

// NEXT_PUBLIC_* vars are inlined at build time by Next's static export, so
// reading them here (inside a shared packages/ui component) works exactly
// the same as reading them in the app itself, as long as each app sets
// them in its own CI build step/`.env` — see deploy-static-web-apps.yml.
// Admin's fallback is its real, already-deployed hostname (confirmed live
// 2026-09-26 — see azure-infra-notes.md); the rest have no fallback
// because they don't exist anywhere yet, deployed or not.
function appUrl(envVar: string, fallback?: string): string | undefined {
  if (typeof process !== "undefined" && process.env && process.env[envVar]) return process.env[envVar];
  return fallback;
}

export const UNIVERSE_APPS: UniverseAppEntry[] = [
  { key: "project-management", label: "Project Management", accent: "var(--u-brand-violet)", status: "current", envVar: "NEXT_PUBLIC_APP_URL_PROJECT_MANAGEMENT" },
  { key: "crm", label: "CRM", accent: "#336497", status: "comingSoon", envVar: "NEXT_PUBLIC_APP_URL_CRM" },
  {
    key: "product-database",
    label: "Product Database",
    accent: "#2A704C",
    status: "available",
    href: appUrl("NEXT_PUBLIC_APP_URL_PRODUCT_DATABASE", "https://delightful-stone-0f4d11d0f.1.azurestaticapps.net"),
    envVar: "NEXT_PUBLIC_APP_URL_PRODUCT_DATABASE",
  },
  { key: "tender-issuance", label: "Tender Issuance", accent: "#B85D23", status: "comingSoon", envVar: "NEXT_PUBLIC_APP_URL_TENDER_ISSUANCE" },
  {
    key: "admin",
    label: "Admin",
    accent: "#317B87",
    status: "available",
    href: appUrl("NEXT_PUBLIC_APP_URL_ADMIN", "https://orange-tree-06a3f710f.6.azurestaticapps.net"),
    envVar: "NEXT_PUBLIC_APP_URL_ADMIN",
  },
  { key: "insights", label: "Insights", accent: "#775C24", status: "comingSoon", envVar: "NEXT_PUBLIC_APP_URL_INSIGHTS" },
  { key: "supplier-portal", label: "Supplier Portal", accent: "#C32260", status: "comingSoon", envVar: "NEXT_PUBLIC_APP_URL_SUPPLIER_PORTAL" },
];

/**
 * Bottom-of-sidebar app switcher. Lewis's instruction (2026-10-01): build
 * the UI now, even though only Project Management (and Admin, server-side,
 * with no public URL yet either — see deploy-static-web-apps.yml's own
 * "Not runnable yet" note) actually exist, "with a view to remembering in
 * the project notes to wire these up to the app url tied in with the
 * authentication" once each app ships. So every non-current app renders
 * disabled with a small lock icon and "Coming soon", not a dead/broken
 * link — nothing here pretends an app exists that doesn't.
 *
 * Wiring this up for real, once an app has a deployed URL: (1) that app's
 * NEXT_PUBLIC_APP_URL_* env var gets set at build time (see `envVar`
 * above) and its UNIVERSE_APPS entry's `status` becomes "available" with
 * `href` set from it; (2) cross-app navigation needs the signed-in session
 * to carry over, which means either a shared MSAL cache scoped to the
 * platform's own top-level domain (all apps on *.universe.<tld> so
 * sessionStorage/cookies are readable across them) or an explicit
 * silent-SSO handoff on landing — worth deciding deliberately rather than
 * discovering which one works after the fact. See
 * claude/architecture-decisions.md for where to record that decision.
 *
 * Same open/close/outside-click pattern as AddMenu.tsx. Desktop (expanded
 * rail): a labelled list in a popover above the trigger. Collapsed rail:
 * same popover, trigger is icon-only. Mobile (sidebar becomes an overlay
 * drawer below 900px): renders inline in the drawer instead of a popover,
 * since there's no room for a floating panel — same list markup either
 * way, just not hidden behind a click.
 */
export function AppSwitcher({ collapsed, inlineOnMobile = true }: { collapsed: boolean; inlineOnMobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const panel = (
    <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 1 }}>
      {UNIVERSE_APPS.map((app) => (
        <AppRow key={app.key} app={app} />
      ))}
    </div>
  );

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="u-app-switcher-trigger"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          width: "100%",
          gap: 8,
          padding: collapsed ? "9px 0" : "9px 10px",
          borderRadius: "var(--u-radius-md)",
          border: "1px solid var(--u-border)",
          background: "var(--u-surface)",
          cursor: "pointer",
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--u-ink-secondary)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <GridIcon size={16} />
          {!collapsed && <span>Universe apps</span>}
        </span>
        {!collapsed && (
          <span style={{ display: "flex", gap: 3 }}>
            {UNIVERSE_APPS.slice(0, 4).map((a) => (
              <span key={a.key} style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: a.accent, opacity: a.status === "current" ? 1 : 0.55 }} />
            ))}
          </span>
        )}
      </button>

      {/* Desktop/tablet: a floating concertina panel above the trigger. */}
      <div
        className="u-app-switcher-popover"
        style={{
          position: "absolute",
          bottom: "calc(100% + 6px)",
          left: 0,
          width: 240,
          backgroundColor: "var(--u-surface-raised)",
          backgroundImage:
            "linear-gradient(color-mix(in srgb, var(--u-org-accent, var(--u-brand-violet)) 6%, transparent), color-mix(in srgb, var(--u-org-accent, var(--u-brand-violet)) 6%, transparent))",
          border: "1px solid var(--u-border)",
          borderRadius: "var(--u-radius-lg)",
          boxShadow: "var(--u-shadow-card)",
          overflow: "hidden",
          maxHeight: open ? UNIVERSE_APPS.length * 46 + 12 : 0,
          opacity: open ? 1 : 0,
          transition: "max-height 260ms cubic-bezier(0.4,0,0.2,1), opacity 180ms ease",
          zIndex: 60,
        }}
      >
        {panel}
      </div>

      {/* Mobile overlay drawer: no room to float a popover, so show the
          list inline once opened, in normal document flow. */}
      {inlineOnMobile && open && (
        <div
          className="u-app-switcher-inline"
          style={{
            marginTop: 6,
            backgroundColor: "var(--u-surface-raised)",
            border: "1px solid var(--u-border)",
            borderRadius: "var(--u-radius-lg)",
          }}
        >
          {panel}
        </div>
      )}
    </div>
  );
}

function AppRow({ app }: { app: UniverseAppEntry }) {
  const disabled = app.status !== "available";
  const content = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "8px 10px",
        borderRadius: "var(--u-radius-sm)",
        cursor: disabled ? "default" : "pointer",
        opacity: app.status === "comingSoon" ? 0.6 : 1,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: app.accent, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: app.status === "current" ? 700 : 500, color: "var(--u-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {app.label}
        </span>
      </span>
      {app.status === "current" && (
        <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--u-brand-violet)", letterSpacing: 0.3 }}>CURRENT</span>
      )}
      {app.status === "comingSoon" && <LockIcon size={13} style={{ color: "var(--u-ink-secondary)", flexShrink: 0 }} />}
      {app.status === "available" && <ChevronRightIcon size={14} style={{ color: "var(--u-ink-secondary)", flexShrink: 0 }} />}
    </div>
  );

  if (app.status === "available" && app.href) {
    return (
      <a href={app.href} style={{ textDecoration: "none", display: "block" }}>
        {content}
      </a>
    );
  }
  return <div title={app.status === "comingSoon" ? "Coming soon" : undefined}>{content}</div>;
}
