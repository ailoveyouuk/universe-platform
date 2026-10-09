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
  /** Whether this app exists/is reachable at all -- NOT whether it's the
   * one currently being viewed. "current" used to be a third status value
   * baked in here (always on project-management), which meant every app's
   * switcher wrongly showed Project Management as "CURRENT" even when you
   * were standing in Product Database or Admin -- fixed 2026-10-09 by
   * computing "current" from the `currentApp` prop AppSwitcher now takes,
   * instead of baking a single app's identity into shared, static data. */
  status: "available" | "comingSoon";
  href?: string;
  envVar: string;
}

// NEXT_PUBLIC_* vars are inlined at build time by Next's static export, so
// reading them here (inside a shared packages/ui component) works exactly
// the same as reading them in the app itself, as long as each app sets
// them in its own CI build step/`.env` — see deploy-static-web-apps.yml.
// Project Management and Admin's fallbacks are their real,
// already-deployed hostnames (confirmed live 2026-09-26 — see
// azure-infra-notes.md); Product Database's is its real deployed
// hostname too (see product-catalog-build.md); the rest have no fallback
// because they don't exist anywhere yet, deployed or not.
function appUrl(envVar: string, fallback?: string): string | undefined {
  if (typeof process !== "undefined" && process.env && process.env[envVar]) return process.env[envVar];
  return fallback;
}

// Accent colours below reference the --u-module-* tokens (tokens.css,
// decided 2026-10-09 with Lewis — see claude/app-completeness-audit.md),
// NOT the six category-tag jewel tones these literal hex values used to
// duplicate (sapphire/copper/emerald/gold/wine/teal, meant for org-type
// tags, a different concern — see universe-brand-identity.md). One
// source of truth per app's identity colour, defined once in tokens.css.
export const UNIVERSE_APPS: UniverseAppEntry[] = [
  // Live and deployed (unlike CRM/Tender Issuance below). CI's
  // PROJECT_MANAGEMENT_URL repo variable (deploy-static-web-apps.yml) is
  // still only wired to NEXT_PUBLIC_REDIRECT_URI for the MSAL auth
  // redirect, not to NEXT_PUBLIC_APP_URL_PROJECT_MANAGEMENT -- so `href`
  // below falls back to the real, confirmed-live hostname from
  // claude/azure-infra-notes.md rather than relying on an env var that
  // isn't actually set yet, same as product-database/admin below.
  {
    key: "project-management",
    label: "Project Management",
    accent: "var(--u-module-project-management)",
    status: "available",
    // Real, confirmed-live hostname (see claude/azure-infra-notes.md,
    // "universe-pilot-project-management" Static Web App) — fixed
    // 2026-10-09. Previously had no `href` at all despite status
    // "available": AppRow's old locked/linkable check only looked at
    // `status`, so this row rendered as a normal, clickable-looking link
    // (full opacity, chevron, no "Coming soon") but had nothing to
    // navigate to and silently did nothing on click when viewed from
    // another app. Same `appUrl()` env-var-with-fallback pattern already
    // used for product-database/admin below.
    href: appUrl("NEXT_PUBLIC_APP_URL_PROJECT_MANAGEMENT", "https://black-island-047de4e0f.5.azurestaticapps.net"),
    envVar: "NEXT_PUBLIC_APP_URL_PROJECT_MANAGEMENT",
  },
  { key: "crm", label: "CRM", accent: "var(--u-module-crm)", status: "comingSoon", envVar: "NEXT_PUBLIC_APP_URL_CRM" },
  {
    key: "product-database",
    label: "Product Database",
    accent: "var(--u-module-product-database)",
    status: "available",
    href: appUrl("NEXT_PUBLIC_APP_URL_PRODUCT_DATABASE", "https://delightful-stone-0f4d11d0f.1.azurestaticapps.net"),
    envVar: "NEXT_PUBLIC_APP_URL_PRODUCT_DATABASE",
  },
  { key: "tender-issuance", label: "Tender Issuance", accent: "var(--u-module-tender-issuance)", status: "comingSoon", envVar: "NEXT_PUBLIC_APP_URL_TENDER_ISSUANCE" },
  {
    key: "admin",
    label: "Admin",
    accent: "var(--u-module-admin)",
    status: "available",
    href: appUrl("NEXT_PUBLIC_APP_URL_ADMIN", "https://orange-tree-06a3f710f.6.azurestaticapps.net"),
    envVar: "NEXT_PUBLIC_APP_URL_ADMIN",
  },
  { key: "insights", label: "Insights", accent: "#775C24", status: "comingSoon", envVar: "NEXT_PUBLIC_APP_URL_INSIGHTS" },
  { key: "supplier-portal", label: "Supplier Portal", accent: "var(--u-module-supplier-portal)", status: "comingSoon", envVar: "NEXT_PUBLIC_APP_URL_SUPPLIER_PORTAL" },
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
export function AppSwitcher({
  collapsed,
  inlineOnMobile = true,
  currentApp,
}: {
  collapsed: boolean;
  inlineOnMobile?: boolean;
  /** UNIVERSE_APPS[].key of the app rendering this switcher -- e.g.
   * "product-database". Drives which row shows the "CURRENT" badge and is
   * rendered as a non-link, instead of that always being
   * project-management regardless of which app you're actually in. */
  currentApp: string;
}) {
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
        <AppRow key={app.key} app={app} isCurrent={app.key === currentApp} />
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
              <span key={a.key} style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: a.accent, opacity: a.key === currentApp ? 1 : 0.55 }} />
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

function AppRow({ app, isCurrent }: { app: UniverseAppEntry; isCurrent: boolean }) {
  // The app you're standing in is never a link and never "locked" --
  // those only apply when sizing up where you could navigate TO.
  //
  // `linkable` is the single source of truth for "this row actually
  // navigates somewhere" -- status "available" alone is NOT enough, since
  // that used to be true of project-management while its `href` was
  // still unset, which rendered this row looking fully available (no
  // lock icon, no "Coming soon") but inert on click -- fixed 2026-10-09.
  // `locked` is just "not linkable", so the two can never disagree again.
  const linkable = !isCurrent && app.status === "available" && Boolean(app.href);
  const locked = !isCurrent && !linkable;
  const content = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "8px 10px",
        borderRadius: "var(--u-radius-sm)",
        cursor: isCurrent || locked ? "default" : "pointer",
        opacity: locked ? 0.6 : 1,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: app.accent, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: isCurrent ? 700 : 500, color: "var(--u-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {app.label}
        </span>
      </span>
      {isCurrent && (
        <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--u-brand-violet)", letterSpacing: 0.3 }}>CURRENT</span>
      )}
      {!isCurrent && locked && <LockIcon size={13} style={{ color: "var(--u-ink-secondary)", flexShrink: 0 }} />}
      {!isCurrent && !locked && <ChevronRightIcon size={14} style={{ color: "var(--u-ink-secondary)", flexShrink: 0 }} />}
    </div>
  );

  if (linkable) {
    return (
      <a href={app.href} style={{ textDecoration: "none", display: "block" }}>
        {content}
      </a>
    );
  }
  return <div title={locked ? "Coming soon" : undefined}>{content}</div>;
}
