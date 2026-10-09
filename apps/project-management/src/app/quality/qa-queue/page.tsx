"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { QaQueueItem, QaQueueSummary } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";
import { Button, TextLink, ShieldIcon, ClockIcon, AlertIcon, ChevronLeftIcon } from "@universe/ui";

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
  const [queue, setQueue] = useState<QaQueueSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"categorised" | "all">("categorised");

  useEffect(() => {
    apiClient
      .getQaQueue()
      .then((data) => {
        setQueue(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load QA queue:", err);
        setQueue(null);
        setError(
          err instanceof Error && err.message.includes("qa.queue.view")
            ? "You don't have the Quality Assurance / Responsible Person permission needed to view this queue."
            : "Couldn't load the QA queue. This is usually temporary — try again in a moment.",
        );
      });
  }, []);

  const totalItems = queue?.all.length ?? 0;
  const oldestAgeDays = useMemo(() => (queue?.all.length ? Math.max(...queue.all.map((i) => i.ageDays)) : 0), [queue]);

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1100, margin: "0 auto" }}>
      <Link href="/quality" style={{ textDecoration: "none" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--u-ink-secondary)", marginBottom: 14 }}>
          <ChevronLeftIcon size={14} /> Back to Quality Assurance
        </span>
      </Link>

      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 24, margin: 0, color: "var(--u-ink)", display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldIcon size={22} /> QA Queue
          </h1>
          <p style={{ color: "var(--u-ink-secondary)", fontSize: 14, marginTop: 6, maxWidth: 620 }}>
            Every stakeholder, piece of evidence, and product source currently waiting on a Quality Assurance /
            Responsible Person review — not just what's sitting on each partner's own page.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant={view === "categorised" ? "primary" : "secondary"} onClick={() => setView("categorised")}>
            Categorised
          </Button>
          <Button variant={view === "all" ? "primary" : "secondary"} onClick={() => setView("all")}>
            All (by time in queue)
          </Button>
        </div>
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
            backgroundColor: "rgba(220,38,38,0.08)",
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16, marginBottom: 32 }}>
            <SummaryTile label="Total awaiting QA" value={totalItems} icon={<ShieldIcon size={20} />} tone="brand" />
            <SummaryTile label="Categories affected" value={queue.categories.length} icon={<ClockIcon size={20} />} tone="neutral" />
            <SummaryTile
              label="Longest time in queue"
              value={totalItems ? `${oldestAgeDays}d` : "—"}
              icon={<AlertIcon size={20} />}
              tone={oldestAgeDays > 14 ? "warning" : "good"}
            />
          </div>

          {totalItems === 0 && (
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
          )}

          {totalItems > 0 && view === "categorised" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {queue.categories.map((cat) => (
                <section key={cat.key}>
                  <h2
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--u-ink)",
                      margin: "0 0 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {cat.label}
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>({cat.items.length})</span>
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {cat.items.map((item) => (
                      <QueueRow key={`${cat.key}-${item.kind}-${item.id}`} item={item} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {totalItems > 0 && view === "all" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {queue.all.map((item) => (
                <QueueRow key={`${item.kind}-${item.id}`} item={item} showCategories />
              ))}
            </div>
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
          color: item.ageDays > 14 ? "var(--u-status-critical)" : "var(--u-ink-secondary)",
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
