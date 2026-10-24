"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { QaQueueItem, QaQueuePage } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";
import { Button, TextLink, ShieldIcon, ClockIcon, AlertIcon, ChevronLeftIcon, Pagination, type PageSize } from "@universe/ui";

/**
 * QA Queue — added 2026-10-08, Lewis's QA/procurement segregation-of-
 * duties request: everywhere a stakeholder, piece of evidence, or
 * product source is currently sitting PENDING, waiting on a Quality
 * Assurance / Responsible Person review, in one place — not scattered
 * across each partner's own detail page. Gated server-side on
 * qa.queue.view (only Quality Assurance / Responsible Person / Organization
 * Admin hold it by default — see DEFAULT_ROLE_TEMPLATE in
 * packages/db/src/organizations.ts).
 *
 * Deliberately NOT one flat list — Lewis asked for "a dashboard view,
 * categorised, and then the concatenated view grouped by QA approval
 * type." The categories (Manufacturers, Suppliers, Clients, Products,
 * etc.) ARE the grouped/concatenated view; the summary row above them is
 * the dashboard. A toggle switches to a single chronological list across
 * every category for anyone who just wants "what's been waiting
 * longest" without category boundaries.
 */
export default function QaQueuePage() {
  // Server-paged (2026-10-17, scale work): category counts come from the database and only one
  // page of the oldest-first list is loaded. The category buttons filter the list server-side.
  const [queue, setQueue] = useState<QaQueuePage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getQaQueuePage({ category: category || undefined, page: page + 1, pageSize: pageSize === "all" ? 100 : pageSize })
      .then((data) => {
        if (cancelled) return;
        setQueue(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to load QA queue:", err);
        setQueue(null);
        setError(
          err instanceof Error && err.message.includes("qa.queue.view")
            ? "You don't have the Quality Assurance / Responsible Person permission needed to view this queue."
            : "Couldn't load the QA queue. This is usually temporary — try again in a moment.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [category, page, pageSize]);

  const totalItems = queue?.total ?? 0;
  const oldestAgeDays = queue?.oldestAgeDays ?? 0;
  const effectivePageSize = pageSize === "all" ? 100 : pageSize;
  const pageCount = Math.max(1, Math.ceil((queue?.filteredTotal ?? 0) / effectivePageSize));
  const pick = (key: string) => {
    setCategory(key);
    setPage(0);
  };

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1100, margin: "0 auto" }}>
      <Link href="/quality" style={{ textDecoration: "none" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--u-ink-secondary)", marginBottom: 14 }}>
          <ChevronLeftIcon size={14} /> Back to Quality Assurance
        </span>
      </Link>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 24, margin: 0, color: "var(--u-ink)", display: "flex", alignItems: "center", gap: 10 }}>
          <ShieldIcon size={22} /> QA Queue
        </h1>
        <p style={{ color: "var(--u-ink-secondary)", fontSize: 14, marginTop: 6, maxWidth: 620 }}>
          Every stakeholder, piece of evidence, and product source currently waiting on a Quality Assurance /
          Responsible Person review — longest-waiting first. Pick a category to narrow the list.
        </p>
      </div>

      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            marginBottom: 20,
            borderRadius: "var(--u-radius-md)",
            border: "1px solid var(--u-status-critical)",
            backgroundColor: "var(--u-status-critical-tint)",
            fontSize: 13,
            color: "var(--u-ink)",
          }}
        >
          <AlertIcon size={16} />
          {error}
        </div>
      )}

      {!error && !queue && <div style={{ padding: 24, color: "var(--u-ink-secondary)", fontSize: 14 }}>Loading…</div>}

      {queue && (
        <>
          <div className="u-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 46%), 1fr))", gap: 16, marginBottom: 24 }}>
            <SummaryTile label="Total awaiting QA" value={totalItems} icon={<ShieldIcon size={20} />} tone="brand" />
            <SummaryTile label="Categories affected" value={queue.categories.length} icon={<ClockIcon size={20} />} tone="neutral" />
            <SummaryTile
              label="Longest time in queue"
              value={totalItems ? `${oldestAgeDays}d` : "—"}
              icon={<AlertIcon size={20} />}
              tone={oldestAgeDays > 14 ? "warning" : "good"}
            />
          </div>

          {totalItems === 0 ? (
            <div
              style={{
                padding: 28,
                borderRadius: "var(--u-radius-lg)",
                border: "1px solid var(--u-border)",
                backgroundColor: "var(--u-surface-raised)",
                textAlign: "center",
                color: "var(--u-ink-secondary)",
                fontSize: 14,
              }}
            >
              Nothing is waiting on QA review right now.
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <Button variant={category === "" ? "primary" : "secondary"} onClick={() => pick("")}>
                  All ({totalItems})
                </Button>
                {queue.categories.map((c) => (
                  <Button key={c.key} variant={category === c.key ? "primary" : "secondary"} onClick={() => pick(c.key)}>
                    {c.label} ({c.count ?? 0})
                  </Button>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {queue.items.map((item) => (
                  <QueueRow key={`${item.kind}-${item.id}`} item={item} showCategories={category === ""} />
                ))}
              </div>
              <Pagination
                pageSize={pageSize}
                onPageSizeChange={(sz) => { setPageSize(sz); setPage(0); }}
                page={page}
                pageCount={pageCount}
                onPageChange={setPage}
                totalCount={queue.filteredTotal}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

const KIND_LABELS: Record<QaQueueItem["kind"], string> = {
  PARTNER_APPROVAL: "Stakeholder approval",
  EVIDENCE_VERIFICATION: "Evidence verification",
  PRODUCT_APPROVAL: "Product sourcing",
  // Added 2026-10-09 — catalogue edit-rights + ratification workflow.
  PRODUCT_AMENDMENT: "Catalogue amendment",
};

function QueueRow({ item, showCategories }: { item: QaQueueItem; showCategories?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        padding: "12px 16px",
        borderRadius: "var(--u-radius-md)",
        border: "1px solid var(--u-border)",
        backgroundColor: "var(--u-surface-raised)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--u-ink)" }}>{item.title}</div>
        <div style={{ fontSize: 12, color: "var(--u-ink-secondary)", marginTop: 2 }}>
          {KIND_LABELS[item.kind]} · {item.detail}
          {showCategories && item.categories.length > 0 ? ` · ${item.categories.join(", ")}` : ""}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
          {item.links.map((link) => (
            <Link key={link.path} href={link.path} style={{ textDecoration: "none" }}>
              <TextLink as="span">{link.label}</TextLink>
            </Link>
          ))}
        </div>
      </div>
      <div
        style={{
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 600,
          color: item.ageDays > 14 ? "var(--u-status-critical-text)" : "var(--u-ink-secondary)",
          whiteSpace: "nowrap",
        }}
      >
        {item.ageDays === 0 ? "Today" : `${item.ageDays}d in queue`}
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: "brand" | "warning" | "good" | "neutral";
}) {
  const toneColors: Record<string, string> = {
    brand: "var(--u-org-accent, var(--u-brand-violet))",
    warning: "var(--u-status-warning)",
    good: "var(--u-status-good)",
    neutral: "var(--u-ink-secondary)",
  };
  return (
    <div
      style={{
        padding: "18px 20px",
        borderRadius: "var(--u-radius-lg)",
        border: "1px solid var(--u-border)",
        backgroundColor: "var(--u-surface-raised)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>{label}</span>
        <span style={{ color: toneColors[tone], display: "flex" }}>{icon}</span>
      </div>
      <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--u-font-display)", color: "var(--u-ink)" }}>{value}</span>
    </div>
  );
}
