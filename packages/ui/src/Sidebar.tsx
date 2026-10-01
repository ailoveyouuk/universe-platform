"use client";

import type { ReactNode } from "react";
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
  footer,
}: {
  items: NavItem[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  LinkComponent: any;
  orgName: string;
  orgLogoUrl: string | null;
  footer?: ReactNode;
}) {
  const Link = LinkComponent;
  const theme = useOrgTheme();
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
            <Logo variant={collapsed ? "mark" : "lockup"} size={26} />
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
          <AppSwitcher collapsed={collapsed} />
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {orgLogoUrl ? (
              <img src={orgLogoUrl} alt={orgName} style={{ height: 18, width: "auto" }} />
            ) : (
              !collapsed && (
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--u-ink)" }}>{orgName}</span>
              )
            )}
          </div>
          {!collapsed && (
            <span style={{ fontSize: 10, color: "var(--u-ink-secondary)", letterSpacing: 0.3 }}>
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
