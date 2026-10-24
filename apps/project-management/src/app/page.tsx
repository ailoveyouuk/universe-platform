"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PartnerOverview, ProjectCountryOverview, ProjectOverview, ProjectSummary, ProjectFinancialSummary } from "@universe/types";
import { SUPPORTED_CURRENCIES } from "@universe/types";
import {
  ActionsCard,
  Button,
  AddMenu,
  Pill,
  StatusBadge,
  ProjectsIcon,
  BuildingIcon,
  TrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertIcon,
  GlobeIcon,
  SearchIcon,
  StatTile,
} from "@universe/ui";
import { useCurrentUser } from "../lib/AuthContext";
import { apiClient } from "../lib/apiClient";
import { useCountries } from "../lib/useCountries";

// The Active / Awarded / Overdue definitions live in the API (ProjectsService.findPage/overview).

/**
 * The Project Management landing dashboard — the "nerve centre" redesign,
 * 2026-10-03, per Lewis's instruction to make it "aesthetically pleasing,
 * intuitive, informative and functional" and, specifically, to visualise
 * Awarded projects (now being worked on, post-submission) with equal
 * prominence to Active ones (not yet submitted) — previously the stat
 * tiles conflated Awarded with Completed into one count, and the single
 * "Recent projects" list below gave no separate visibility to either
 * group. Fixed both: the stat tiles now match the corrected, mutually
 * exclusive Active/Submitted/Awarded/Completed/Overdue breakdown already
 * shipped in projects/page.tsx, and the single "Recent projects" list is
 * now two equally-sized panels — Active and Awarded — side by side.
 *
 * Also adds "+ Add Product" next to "+ Add Stakeholder" (same AddMenu
 * pattern, Non-Pharmaceutical / Pharmaceutical options) routing to the
 * new contextualised /products/new screen, which writes to the same
 * shared product catalogue the Quality module's product search and every
 * project line's "Matched Product" field already read from.
 */
export default function HomePage() {
  const me = useCurrentUser();
  const router = useRouter();
  const [projectOverview, setProjectOverview] = useState<ProjectOverview | null>(null);
  const [partnerOverview, setPartnerOverview] = useState<PartnerOverview | null>(null);
  // Financial Overview (added 2026-10-02, made currency-agnostic
  // 2026-10-03) — org-wide rollup across every ProjectLine's LOCKED
  // base-currency amounts. See ProjectFinancialSummary's doc comment in
  // packages/types for why this lives here rather than per-project: it's
  // a stand-in for the future "Insights" app, per Lewis's own phrasing.
  // Universe is a global, multi-tenant platform (not built around any one
  // organisation's home currency — corrected 2026-10-03, see
  // ExchangeRatesService's doc comment), so `displayCurrency` is a
  // viewer-chosen SELECTOR, not a fixed reporting currency: changing it
  // re-fetches the same rollup re-expressed live in that currency.
  // financialSummary is null while loading/on failure (e.g. no lines
  // priced yet) — the panel renders nothing rather than a misleading
  // all-zero display in that case.
  const [financialSummary, setFinancialSummary] = useState<ProjectFinancialSummary | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getProjectOverview().then(setProjectOverview).catch(() => setProjectOverview({ counts: { total: 0, active: 0, submitted: 0, awarded: 0, completed: 0, overdue: 0, fromTenders: 0 }, deliveryCountryCodes: [], recentActive: [], recentAwarded: [] }));
    apiClient.getPartnerOverview().then(setPartnerOverview).catch(() => setPartnerOverview(null));
  }, []);

  useEffect(() => {
    apiClient
      .getProjectFinancialSummary(displayCurrency ?? undefined)
      .then((summary) => {
        setFinancialSummary(summary);
        // First load: default the selector to whatever the API resolved
        // as the base currency, so the dropdown shows a real selection
        // rather than a blank placeholder.
        if (displayCurrency === null) setDisplayCurrency(summary.displayCurrencyCode);
      })
      .catch(() => setFinancialSummary(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayCurrency]);

  // Counts, recents and delivery countries come from the database (GET /projects/overview),
  // not from loading every project (2026-10-17, scale work).
  const [showCountries, setShowCountries] = useState(false);
  const [countryRows, setCountryRows] = useState<ProjectCountryOverview[] | null>(null);
  const countries = useCountries();
  const countryName = (code: string) => countries.find((c) => c.code === code)?.name ?? code;
  useEffect(() => {
    if (showCountries && countryRows === null) apiClient.getProjectCountryOverview().then(setCountryRows).catch(() => setCountryRows([]));
  }, [showCountries, countryRows]);

  const stats = projectOverview?.counts ?? { active: 0, submitted: 0, awarded: 0, overdue: 0 };
  const countryStats = { count: projectOverview?.deliveryCountryCodes.length ?? 0 };
  const activeProjects = projectOverview?.recentActive ?? [];
  const awardedProjects = projectOverview?.recentAwarded ?? [];

  const stakeholderStats = useMemo(() => {
    if (!partnerOverview) return null;
    return { clients: partnerOverview.counts.byRole.CLIENT ?? 0, qaApproved: partnerOverview.counts.approvedMfgSup };
  }, [partnerOverview]);

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: "var(--u-org-accent, var(--u-brand-violet))",
              marginBottom: 10,
            }}
          />
          <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 26, margin: 0, color: "var(--u-ink)" }}>
            Welcome back, {me?.forename}.
          </h1>
          <p style={{ color: "var(--u-ink-secondary)", fontSize: 14, marginTop: 6 }}>
            {me?.organizationWelcomeMessage || `Here's what's happening across ${me?.organizationName}'s projects.`}
          </p>
        </div>
        <div className="u-quick-actions">
          <Link href="/projects/new" style={{ textDecoration: "none", display: "block" }}>
            <Button className="u-quick-action" variant="primary" icon={<ProjectsIcon size={16} />} accent="var(--u-org-accent, var(--u-brand-violet))">
              New Project
            </Button>
          </Link>
          <AddMenu
            tone="tonal"
            block
            className="u-quick-action"
            label="Add Stakeholder"
            options={[
              { label: "Client", onSelect: () => router.push("/partners/new?role=CLIENT") },
              { label: "Manufacturer / Supplier", onSelect: () => router.push("/partners/new?role=MANUFACTURER") },
              { label: "Freight Forwarder", onSelect: () => router.push("/partners/new?role=FREIGHT_FORWARDER") },
            ]}
          />
          <AddMenu
            tone="tonal"
            block
            className="u-quick-action"
            label="Add Product"
            options={[
              { label: "Non-Pharmaceutical", onSelect: () => router.push("/products/new?context=NON_PHARMACEUTICAL") },
              { label: "Pharmaceutical", onSelect: () => router.push("/products/new?context=PHARMACEUTICAL") },
            ]}
          />
        </div>
      </div>

      <ActionsCard api={apiClient} LinkComponent={Link} />

      <div className="u-stat-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 46%), 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <Link href="/projects?status=ACTIVE" style={{ textDecoration: "none" }}>
          <StatTile label="Active (not submitted)" value={stats?.active} icon={<ClockIcon size={20} />} tone="warning" />
        </Link>
        <Link href="/projects?status=SUBMITTED" style={{ textDecoration: "none" }}>
          <StatTile label="Submitted" value={stats?.submitted} icon={<ProjectsIcon size={20} />} tone="neutral" />
        </Link>
        <Link href="/projects?status=AWARDED" style={{ textDecoration: "none" }}>
          <StatTile label="Awarded (in progress)" value={stats?.awarded} icon={<CheckCircleIcon size={20} />} tone="brand" />
        </Link>
        <Link href="/projects?status=OVERDUE" style={{ textDecoration: "none" }}>
          <StatTile label="Overdue" value={stats?.overdue} icon={<AlertIcon size={20} />} tone="critical" />
        </Link>
        <Link href="/partners?role=CLIENT" style={{ textDecoration: "none" }}>
          <StatTile label="Clients" value={stakeholderStats?.clients} icon={<BuildingIcon size={20} />} tone="neutral" />
        </Link>
        <Link href="/partners?approval=APPROVED" style={{ textDecoration: "none" }}>
          <StatTile label="QA Approved Mfg. & Suppliers" value={stakeholderStats?.qaApproved} icon={<CheckCircleIcon size={20} />} tone="good" />
        </Link>
        <StatTile
          label="Delivery countries"
          value={countryStats?.count}
          icon={<GlobeIcon size={20} />}
          tone="brand"
          active={showCountries}
          onClick={() => setShowCountries((v) => !v)}
        />
      </div>

      {showCountries && <CountryPanel rows={countryRows} countryName={countryName} onClose={() => setShowCountries(false)} />}

      {financialSummary && financialSummary.linesWithPricing > 0 && (
        <section
          style={{
            border: "1px solid var(--u-border)",
            borderRadius: "var(--u-radius-lg)",
            backgroundColor: "var(--u-surface-raised)",
            padding: "18px 20px",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUpIcon size={16} />
              Financial Overview
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
                {financialSummary.linesWithPricing} of {financialSummary.totalLines} line{financialSummary.totalLines === 1 ? "" : "s"} priced
              </span>
              {/* Currency selector — Universe is a global, multi-tenant platform,
                  not built around any one organisation's home currency, so this
                  view is re-expressed live in whatever currency the viewer picks
                  rather than being fixed. See ExchangeRatesService's doc comment. */}
              <select
                className="u-native-select"
                value={displayCurrency ?? financialSummary.displayCurrencyCode}
                onChange={(e) => setDisplayCurrency(e.target.value)}
                style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--u-border)" }}
              >
                {SUPPORTED_CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--u-ink-secondary)", margin: "0 0 14px" }}>
            Each line’s native-currency price is converted once, at the FX rate for the date it was entered, and locked — these totals will not shift as rates move. Switching currency above re-expresses them live, as a view only.
            {financialSummary.conversionUnavailable && (
              <span style={{ color: "var(--u-status-critical-text)" }}> Could not convert into {displayCurrency} right now — showing {financialSummary.baseCurrencyCode} instead.</span>
            )}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))", gap: 16 }}>
            <FinancialStat label="Product cost" value={financialSummary.totalProductCost} currency={financialSummary.displayCurrencyCode} />
            <FinancialStat label="Freight cost" value={financialSummary.totalFreightCost} currency={financialSummary.displayCurrencyCode} />
            <FinancialStat label="Margin" value={financialSummary.totalMargin} currency={financialSummary.displayCurrencyCode} tone={Number(financialSummary.totalMargin) >= 0 ? "good" : "critical"} />
            <FinancialStat label="Total invoice value" value={financialSummary.totalInvoiceValue} currency={financialSummary.displayCurrencyCode} />
          </div>
        </section>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))",
          gap: 20,
        }}
      >
        <ProjectPanel
          title="Active projects"
          subtitle="Not yet submitted"
          viewAllHref="/projects?status=ACTIVE"
          projects={activeProjects}
          loading={!projectOverview}
          emptyText="No active projects right now."
          icon={<ClockIcon size={14} />}
        />
        <ProjectPanel
          title="Awarded projects"
          subtitle="Now being worked on"
          viewAllHref="/projects?status=AWARDED"
          projects={awardedProjects}
          loading={!projectOverview}
          emptyText="No awarded projects right now."
          icon={<CheckCircleIcon size={14} />}
        />
      </div>
    </div>
  );
}

function ProjectPanel({
  title,
  subtitle,
  viewAllHref,
  projects,
  loading,
  emptyText,
  icon,
}: {
  title: string;
  subtitle: string;
  viewAllHref: string;
  projects: ProjectSummary[];
  loading: boolean;
  emptyText: string;
  icon: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid var(--u-border)",
        borderRadius: "var(--u-radius-lg)",
        backgroundColor: "var(--u-surface-raised)",
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--u-ink-secondary)", display: "flex" }}>{icon}</span>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--u-ink)", margin: 0 }}>{title}</h2>
            <span style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>{subtitle}</span>
          </div>
        </div>
        <Link href={viewAllHref} style={{ fontSize: 13, fontWeight: 600, color: "var(--u-brand-violet)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          View all <TrendingUpIcon size={13} />
        </Link>
      </div>

      {loading && <div style={{ padding: 20, color: "var(--u-ink-secondary)", fontSize: 14 }}>Loading…</div>}

      {!loading && projects.length === 0 && (
        <div style={{ padding: 20, color: "var(--u-ink-secondary)", fontSize: 13.5, textAlign: "center" }}>{emptyText}</div>
      )}

      {!loading && projects.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/detail?id=${p.id}`} style={{ textDecoration: "none", display: "block", minWidth: 0 }}>
              <div
                className="u-card-hover"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px 12px",
                  padding: "10px 14px",
                  borderRadius: "var(--u-radius-md)",
                  border: "1px solid var(--u-border)",
                  backgroundColor: "var(--u-surface-base, var(--u-surface-raised))",
                }}
              >
                <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--u-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--u-ink-secondary)", marginTop: 2 }}>
                    {p.referenceNumber} {p.clientName ? `· ${p.clientName}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
                  {p.dueDate && (
                    <Pill tone="neutral" icon={<ClockIcon size={11} />}>
                      {new Date(p.dueDate).toLocaleDateString()}
                    </Pill>
                  )}
                  <StatusBadge status={p.status} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

/** One figure inside the Financial Overview panel — formats a numeric
 * string (the API's Decimal-as-string convention) with thousands
 * separators, since this is a sum across potentially many lines. */
function FinancialStat({
  label,
  value,
  currency,
  tone,
}: {
  label: string;
  value: string;
  currency: string;
  tone?: "good" | "critical";
}) {
  const formatted = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--u-ink-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: tone === "good" ? "var(--u-status-good)" : tone === "critical" ? "var(--u-status-critical)" : "var(--u-ink)" }}>
        {currency} {formatted}
      </div>
    </div>
  );
}


/** Palette for the country cards, all Universe tokens, cycled so neighbouring cards are easy to tell apart. */
const COUNTRY_ACCENTS = [
  "var(--u-brand-violet)",
  "var(--u-accent-magenta)",
  "var(--u-status-good)",
  "var(--u-signal-amber)",
  "var(--u-status-serious)",
  "var(--u-ink-secondary)",
];

/** Opens from the "Delivery countries" tile: filter the countries, see the five most recent/active projects for each. */
function CountryPanel({ rows, countryName, onClose }: { rows: ProjectCountryOverview[] | null; countryName: (code: string) => string; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [liveOnly, setLiveOnly] = useState(false);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? [])
      .filter((r) => (!liveOnly || r.liveCount > 0) && (!q || countryName(r.countryCode).toLowerCase().includes(q) || r.countryCode.toLowerCase() === q))
      .sort((a, b) => b.liveCount - a.liveCount || b.projectCount - a.projectCount || countryName(a.countryCode).localeCompare(countryName(b.countryCode)));
  }, [rows, query, liveOnly, countryName]);

  return (
    <section style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", backgroundColor: "var(--u-surface-raised)", padding: "18px 20px", marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <GlobeIcon size={16} />
          Delivery countries
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--u-ink-secondary)", display: "flex" }}>
              <SearchIcon size={14} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter countries…"
              aria-label="Filter countries"
              style={{ padding: "7px 10px 7px 30px", fontSize: 13, borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-border)", backgroundColor: "var(--u-surface)", color: "var(--u-ink)" }}
            />
          </div>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, color: "var(--u-ink-secondary)" }}>
            <input type="checkbox" checked={liveOnly} onChange={(e) => setLiveOnly(e.target.checked)} /> Live projects only
          </label>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
      {rows === null && <p style={{ color: "var(--u-ink-secondary)", fontSize: 13 }}>Loading…</p>}
      {rows !== null && shown.length === 0 && <p style={{ color: "var(--u-ink-secondary)", fontSize: 13 }}>No matching countries.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: 14 }}>
        {shown.map((r, i) => {
          const accent = COUNTRY_ACCENTS[i % COUNTRY_ACCENTS.length];
          return (
            <div key={r.countryCode} style={{ border: "1px solid var(--u-border)", borderLeft: `4px solid ${accent}`, borderRadius: "var(--u-radius-md)", padding: "12px 14px", backgroundColor: "var(--u-surface)", minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                <Link href={`/projects?country=${r.countryCode}`} style={{ fontWeight: 600, fontSize: 14, color: "var(--u-ink)", textDecoration: "none" }}>
                  {countryName(r.countryCode)}
                </Link>
                <span style={{ fontSize: 12, color: "var(--u-ink-secondary)", whiteSpace: "nowrap" }}>
                  {r.liveCount} live · {r.projectCount} total
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {r.projects.map((p) => (
                  <Link key={p.id} href={`/projects/detail?id=${p.id}`} style={{ textDecoration: "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, color: accent === "var(--u-signal-amber)" || accent === "var(--u-ink-secondary)" ? "var(--u-ink)" : accent }}>
                      <strong style={{ fontWeight: 600 }}>{p.referenceNumber}</strong> {p.title}
                    </span>
                    <span style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                      <StatusBadge status={p.status} />
                    </span>
                  </Link>
                ))}
              </div>
              {r.projectCount > r.projects.length && (
                <Link href={`/projects?country=${r.countryCode}`} style={{ display: "inline-block", marginTop: 8, fontSize: 12, color: "var(--u-ink-secondary)" }}>
                  View all {r.projectCount}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
