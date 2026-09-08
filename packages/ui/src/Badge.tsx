import type { ReactNode } from "react";

const STATUS_COLORS: Record<string, string> = {
  IDENTIFIED: "#6B7280",
  IN_PROGRESS: "#2563EB",
  SUBMITTED: "#7C3AED",
  AWARDED: "#059669",
  COMPLETED: "#059669",
  UNAWARDED: "#B91C1C",
  DECLINED: "#B91C1C",
  CANCELLED: "#374151",
};

/** Shared status badge — used identically across every Universe app so a
 * project's status reads the same whether you're in Project Management,
 * the Tender app, or the Admin dashboard. */
export function StatusBadge({ status }: { status: string }): ReactNode {
  const color = STATUS_COLORS[status] ?? "#6B7280";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        color: "#fff",
        backgroundColor: color,
      }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
