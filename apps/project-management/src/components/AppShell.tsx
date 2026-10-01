"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  Logo,
  OrgThemeProvider,
  Button,
  Breadcrumbs,
  DashboardIcon,
  ProjectsIcon,
  PartnersIcon,
  ShieldIcon,
  LogoutIcon,
  UserIcon,
  BellIcon,
  SearchIcon,
} from "@universe/ui";
import type { NavItem } from "@universe/ui";
import { AuthContext } from "../lib/AuthContext";
import { useAuth } from "../lib/useAuth";

/** Route → nav + breadcrumb metadata, in one place so adding a page means
 * adding one line here rather than touching the shell itself. */
const ROUTES: { href: string; label: string; icon: (active: boolean) => ReactNode; inNav: boolean }[] = [
  { href: "/", label: "Dashboard", icon: () => <DashboardIcon size={19} />, inNav: true },
  { href: "/projects", label: "Projects", icon: () => <ProjectsIcon size={19} />, inNav: true },
  { href: "/partners", label: "Stakeholders", icon: () => <PartnersIcon size={19} />, inNav: true },
  { href: "/quality", label: "Quality", icon: () => <ShieldIcon size={19} />, inNav: true },
];

function crumbsFor(pathname: string) {
  if (pathname === "/") return [{ label: "Dashboard" }];
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = [{ label: "Dashboard", href: "/" }];
  let acc = "";
  for (const seg of segments) {
    acc += `/${seg}`;
    const match = ROUTES.find((r) => r.href === acc);
    const label = match?.label ?? (seg === "new" ? "New" : seg === "detail" ? "Detail" : seg[0].toUpperCase() + seg.slice(1));
    crumbs.push({ label, href: acc });
  }
  return crumbs;
}

/**
 * App shell v2 — 2026-10-01 comprehensive UI build-out. Replaces the plain
 * top-bar-only shell with: the Universe mark pinned top-left inside a
 * collapsible/slide-in side navigation rail (Sidebar, @universe/ui),
 * breadcrumbs under the top bar on every page, and a subtle per-org colour
 * wash (OrgThemeProvider) carried from the same /me call AppShell already
 * had — the only new data dependency here is reading
 * organizationPrimaryColor/organizationSecondaryColor through the theme
 * provider instead of ad-hoc inline styles. See
 * claude/universe-brand-identity.md for the token rationale and
 * project-stage-navigation-plan.md for why breadcrumbs and the
 * StageTracker stay conceptually separate.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { status, me, error, signIn, signOut } = useAuth();
  const pathname = usePathname() ?? "/";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: NavItem[] = ROUTES.filter((r) => r.inNav).map((r) => ({
    label: r.label,
    href: r.href,
    icon: r.icon(pathname === r.href),
    active: r.href === "/" ? pathname === "/" : pathname.startsWith(r.href),
  }));

  if (status !== "signedIn" || !me) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--u-surface)" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 32px",
            borderBottom: "1px solid var(--u-border)",
          }}
        >
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <Logo />
          </Link>
          {status === "signedOut" && (
            <Button variant="primary" onClick={signIn}>
              Sign in
            </Button>
          )}
        </header>
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {status === "initializing" && <p style={{ color: "var(--u-ink-secondary)" }}>Loading…</p>}
          {status === "unauthorized" && <p style={{ color: "var(--u-status-critical)" }}>{error}</p>}
          {status === "signedOut" && <p style={{ color: "var(--u-ink-secondary)" }}>Please sign in to continue.</p>}
        </main>
      </div>
    );
  }

  return (
    <OrgThemeProvider primary={me.organizationPrimaryColor} secondary={me.organizationSecondaryColor}>
      <AuthContext.Provider value={me}>
        <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--u-surface-alt)" }}>
          <Sidebar
            items={navItems}
            collapsed={collapsed}
            onToggleCollapsed={() => setCollapsed((c) => !c)}
            mobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
            LinkComponent={Link}
            orgName={me.organizationName}
            orgLogoUrl={me.organizationLogoUrl}
          />

          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 28px",
                borderBottom: "1px solid var(--u-border)",
                backgroundColor: "var(--u-surface)",
                position: "sticky",
                top: 0,
                zIndex: 20,
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0 }}>
                <button
                  className="u-mobile-menu-btn"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open navigation"
                  style={{ border: "none", background: "none", cursor: "pointer", color: "var(--u-ink)", padding: 4 }}
                >
                  <DashboardIcon size={20} />
                </button>
                <Breadcrumbs items={crumbsFor(pathname)} LinkComponent={Link} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ color: "var(--u-ink-secondary)", display: "flex", cursor: "pointer" }} title="Search">
                  <SearchIcon size={18} />
                </span>
                <span style={{ color: "var(--u-ink-secondary)", display: "flex", cursor: "pointer" }} title="Notifications">
                  <BellIcon size={18} />
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    paddingLeft: 14,
                    borderLeft: "1px solid var(--u-border)",
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      backgroundColor: "var(--u-org-accent, var(--u-brand-violet))",
                      color: "var(--u-brand-violet-on)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <UserIcon size={15} />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--u-ink)" }}>{me.forename}</span>
                  <button
                    onClick={signOut}
                    aria-label="Sign out"
                    title="Sign out"
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      color: "var(--u-ink-secondary)",
                      display: "flex",
                      padding: 4,
                    }}
                  >
                    <LogoutIcon size={17} />
                  </button>
                </div>
              </div>
            </header>

            <main key={pathname} className="u-page-enter" style={{ flex: 1 }}>
              {children}
            </main>
          </div>
        </div>
      </AuthContext.Provider>
    </OrgThemeProvider>
  );
}
