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
  { href: "/", label: "Catalogue", icon: () => <DashboardIcon size={19} />, inNav: true },
  { href: "/import", label: "Import", icon: () => <ShieldIcon size={19} />, inNav: true },
];

function crumbsFor(pathname: string) {
  if (pathname === "/") return [{ label: "Catalogue" }];
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = [{ label: "Catalogue", href: "/" }];
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
 * StageTracker stay conceptually separate. Reused verbatim (same
 * Sidebar/AppSwitcher/OrgThemeProvider pattern as Project Management and
 * Admin) for the Product Database Management app, 2026-10-03 — only the
 * ROUTES table and sign-in copy differ.
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
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "var(--u-surface)",
          backgroundImage:
            "radial-gradient(circle at 12% 8%, color-mix(in srgb, var(--u-accent-magenta) 10%, transparent), transparent 42%), " +
            "radial-gradient(circle at 88% 92%, color-mix(in srgb, var(--u-brand-violet) 12%, transparent), transparent 46%)",
        }}
      >
        {/* Decorative orbit motif — echoes the Universe mark (ring + satellite
           + core) at large scale, very low opacity, purely atmospheric. Added
           2026-10-01 so the pre-auth screen carries the brand's own visual
           language instead of being a bare text-on-white placeholder. */}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "min(140vmin, 1100px)",
            height: "min(140vmin, 1100px)",
            transform: "translate(-50%, -50%)",
            opacity: 0.5,
            pointerEvents: "none",
          }}
        >
          <circle cx="50" cy="50" r="38" fill="none" stroke="var(--u-accent-magenta)" strokeWidth="0.3" opacity="0.35" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="var(--u-brand-violet)" strokeWidth="0.25" opacity="0.25" />
          <circle cx="84.44" cy="33.94" r="1.4" fill="var(--u-accent-magenta)" opacity="0.5" />
        </svg>

        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 32px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <Logo />
          </Link>
        </header>

        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", zIndex: 1 }}>
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              padding: "40px 36px",
              borderRadius: "var(--u-radius-lg)",
              border: "1px solid var(--u-border)",
              backgroundColor: "var(--u-surface-raised)",
              boxShadow: "var(--u-shadow-card)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Logo variant="mark" size={44} />
            <h1
              style={{
                fontFamily: "var(--u-font-display)",
                fontSize: 21,
                color: "var(--u-ink)",
                margin: "14px 0 0",
              }}
            >
              {status === "unauthorized" ? "Access restricted" : "Welcome to Universe"}
            </h1>
            <p style={{ color: "var(--u-ink-secondary)", fontSize: 14, margin: "6px 0 10px", lineHeight: 1.5 }}>
              {status === "initializing" && "Loading your workspace…"}
              {status === "unauthorized" && (error || "Your account isn't recognised on this platform yet.")}
              {status === "signedOut" && "Sign in with your organisation's Microsoft account to continue to Product Database."}
            </p>
            {status === "signedOut" && (
              <Button variant="primary" onClick={signIn} style={{ marginTop: 8 }}>
                Sign in
              </Button>
            )}
          </div>
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
