"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "./Logo";
import { ChevronLeftIcon, ChevronRightIcon, MenuIcon } from "./icons";
import { useOrgTheme } from "./OrgTheme";
import { AppSwitcher } from "./AppSwitcher";

export interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  active: boolean;
}

/**
 * The app-wide side navigation — collapsible (slides between a full 232px
 * rail and a 72px icon-only rail) and, below the `mobileBreakpoint`,
 * presented as an overlay drawer that slides in/out from the left over the
 * page content. Houses the Universe mark (top-left, per Lewis's 2026-10-01
 * instruction) above the nav items, and the org's own identity
 * (OrgHeader-style logo/name) pinned at the bottom above sign-out — kept
 * visually secondary to the Universe mark, consistent with
 * universe-brand-identity.md's "Universe provides the room, a tenant hangs
 * one picture in it" framing.
 *
 * `LinkComponent` is passed in (next/link) rather than imported directly so
 * this stays a framework-agnostic @universe/ui component other apps can
 * reuse with their own router, same pattern as Breadcrumbs.tsx.
 */
export function Sidebar({
  items,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
  LinkComponent,
  orgName,
  orgLogoUrl,
  orgIconUrl,
  footer,
  currentApp,
  support,
}: {
  items: NavItem[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  LinkComponent: any;
  orgName: string;
  orgLogoUrl: string | null;
  /** Optional square variant, preferred when the sidebar is collapsed. */
  orgIconUrl?: string | null;
  footer?: ReactNode;
  /** Who to contact for help (name, role, email) — shown as a small "Need help?" link. */
  support?: { name: string; role: string; email: string }[];
  /** UNIVERSE_APPS[].key of the app this Sidebar belongs to (e.g.
   * "product-database") -- passed straight through to AppSwitcher so it
   * can show the right app as "CURRENT". Required: every app wiring up
   * this shared Sidebar must say which one it is, same as it already
   * supplies its own `items`/`orgName`. */
  currentApp: string;
}) {
  const Link = LinkComponent;
  const theme = useOrgTheme();
  const [logoFailed, setLogoFailed] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  useEffect(() => setLogoFailed(false), [orgLogoUrl]);
  const [iconFailed, setIconFailed] = useState(false);
  useEffect(() => setIconFailed(false), [orgIconUrl]);
  // The organisation's own logo takes the top-left slot (expanded rail only);
  // the Universe mark stays when collapsed, when no logo is set, or if the
  // image fails to load. "Powered by Universe" moves to the footer.
  const showOrgLogo = !!orgLogoUrl && !logoFailed;
  const width = collapsed ? 72 : 232;

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="u-sidebar-scrim"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20,18,31,0.35)",
            zIndex: 30,
          }}
        />
      )}
      <aside
        className={`u-sidebar${mobileOpen ? " u-sidebar-open" : ""}`}
        style={{
          width,
          minWidth: width,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--u-surface)",
          borderRight: "1px solid var(--u-border)",
          transition: "width 220ms cubic-bezier(0.4,0,0.2,1), transform 220ms cubic-bezier(0.4,0,0.2,1)",
          height: "100vh",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            padding: collapsed ? "20px 0" : "20px 20px 16px",
          }}
        >
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            {collapsed && orgIconUrl && !iconFailed ? (
              <img src={orgIconUrl} alt={orgName} onError={() => setIconFailed(true)} style={{ height: 30, width: 30, objectFit: "contain", display: "block" }} />
            ) : showOrgLogo && !collapsed ? (
              <img
                src={orgLogoUrl!}
                alt={orgName}
                onError={() => setLogoFailed(true)}
                style={{ height: 34, width: "auto", maxWidth: 150, objectFit: "contain", objectPosition: "left center", display: "block" }}
              />
            ) : (
              <Logo variant={collapsed ? "mark" : "lockup"} size={26} />
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={onToggleCollapsed}
              aria-label="Collapse navigation"
              style={{
                display: "none",
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "var(--u-ink-secondary)",
                padding: 4,
              }}
              className="u-sidebar-collapse-btn"
            >
              <ChevronLeftIcon size={18} />
            </button>
          )}
        </div>

        <nav style={{ flex: 1, padding: "4px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              onClick={onCloseMobile}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: collapsed ? "11px 0" : "10px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: "var(--u-radius-md)",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 600,
                color: item.active ? "var(--u-org-accent, var(--u-brand-violet))" : "var(--u-ink-secondary)",
                backgroundColor: item.active ? "var(--u-accent-magenta-tint)" : "transparent",
                transition: "background-color 150ms ease, color 150ms ease",
              }}
            >
              <span style={{ display: "flex", flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <button
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          className="u-sidebar-collapse-btn-bottom"
          style={{
            margin: "0 12px 8px",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: 10,
            padding: "9px 12px",
            border: "none",
            background: "none",
            borderRadius: "var(--u-radius-md)",
            color: "var(--u-ink-secondary)",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {collapsed ? <ChevronRightIcon size={16} /> : <ChevronLeftIcon size={16} />}
          {!collapsed && <span>Collapse</span>}
        </button>

        <div style={{ padding: collapsed ? "0 10px" : "0 12px", marginBottom: 10 }}>
          <AppSwitcher collapsed={collapsed} currentApp={currentApp} />
        </div>

        <div
          style={{
            borderTop: "1px solid var(--u-border)",
            padding: collapsed ? "14px 0" : "14px 20px",
            display: "flex",
            flexDirection: "column",
            alignItems: collapsed ? "center" : "flex-start",
            gap: 8,
          }}
        >
          {!showOrgLogo && !collapsed && (
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--u-ink)" }}>{orgName}</span>
          )}
          {!collapsed && (
            <div style={{ width: "100%" }}>
              <button
                type="button"
                onClick={() => setSupportOpen((o) => !o)}
                aria-expanded={supportOpen}
                style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--u-org-accent, var(--u-brand-violet))" }}
              >
                Need help? {supportOpen ? "▾" : "▸"}
              </button>
              {supportOpen && (
                <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {(!support || support.length === 0) && (
                    <li style={{ fontSize: 12, lineHeight: 1.35, color: "var(--u-ink-secondary)" }}>Please contact your organisation&apos;s administrator.</li>
                  )}
                  {(support ?? []).map((c) => (
                    <li key={c.email} style={{ fontSize: 12, lineHeight: 1.35, color: "var(--u-ink-secondary)" }}>
                      <span style={{ color: "var(--u-ink)", fontWeight: 600 }}>{c.name}</span>
                      <br />
                      {c.role}
                      <br />
                      <a href={`mailto:${c.email}`} style={{ color: "var(--u-org-accent, var(--u-brand-violet))", wordBreak: "break-all" }}>
                        {c.email}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {!collapsed && (
            <span style={{ fontSize: 10, color: "var(--u-ink-secondary)", letterSpacing: 0.3, display: "inline-flex", alignItems: "center", gap: 5 }}>
              {showOrgLogo && <Logo variant="mark" size={12} />}
              Powered by Universe
            </span>
          )}
          {footer}
        </div>
      </aside>
    </>
  );
}

export { MenuIcon as SidebarMenuIcon };
