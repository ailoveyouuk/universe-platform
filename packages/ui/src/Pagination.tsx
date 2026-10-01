"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number] | "all";

/**
 * Shared list pagination — page-size toggle (10 / 25 / 50 / All) plus
 * prev/next + page indicator. Added 2026-10-01 for the Projects and
 * Stakeholders list views, both of which needed the same "first 10, 25,
 * 50, then all" behaviour Lewis asked for. Purely presentational — the
 * caller owns the actual slicing (see ProjectsPage/PartnersPage).
 */
export function Pagination({
  pageSize,
  onPageSizeChange,
  page,
  pageCount,
  onPageChange,
  totalCount,
}: {
  pageSize: PageSize;
  onPageSizeChange: (s: PageSize) => void;
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
  totalCount: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        padding: "12px 2px",
        fontSize: 13,
        color: "var(--u-ink-secondary)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span>Show</span>
        {[...PAGE_SIZE_OPTIONS, "all" as const].map((opt) => (
          <button
            key={opt}
            onClick={() => onPageSizeChange(opt)}
            style={{
              padding: "4px 10px",
              borderRadius: "var(--u-radius-pill)",
              border: "1px solid var(--u-border)",
              background: pageSize === opt ? "var(--u-brand-violet)" : "var(--u-surface)",
              color: pageSize === opt ? "var(--u-brand-violet-on)" : "var(--u-ink-secondary)",
              fontWeight: 600,
              fontSize: 12.5,
              cursor: "pointer",
              transition: "background-color 150ms ease, color 150ms ease",
            }}
          >
            {opt === "all" ? "All" : opt}
          </button>
        ))}
        <span style={{ marginLeft: 4 }}>
          · {totalCount} total
        </span>
      </div>

      {pageSize !== "all" && pageCount > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
            aria-label="Previous page"
            style={{ display: "flex", background: "none", border: "none", cursor: page === 0 ? "default" : "pointer", opacity: page === 0 ? 0.4 : 1, color: "var(--u-ink)" }}
          >
            <ChevronLeftIcon size={16} />
          </button>
          <span>
            Page {page + 1} of {pageCount}
          </span>
          <button
            onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
            disabled={page >= pageCount - 1}
            aria-label="Next page"
            style={{ display: "flex", background: "none", border: "none", cursor: page >= pageCount - 1 ? "default" : "pointer", opacity: page >= pageCount - 1 ? 0.4 : 1, color: "var(--u-ink)" }}
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
