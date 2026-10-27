"use client";

import { DataHealthNote } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";

/**
 * Data health (2026-10-27, Lewis: "make this richer" across the platform). One place that lists, for the signed-in organisation, where each app it uses is being fed
 * less than it could be, what filling it in would improve and a link straight to the fix. Each app also shows its own note on its Overview.
 */
export default function DataHealthPage() {
  return (
    <div style={{ display: "grid", gap: 14, padding: "8px 0 32px" }}>
      <h1 style={{ margin: 0, fontFamily: "var(--u-font-display)", fontSize: 24 }}>Data health</h1>
      <p style={{ margin: 0, color: "var(--u-ink-secondary)", maxWidth: 720 }}>
        Where your organisation&rsquo;s records are missing something that would make the platform more useful. Open an app below to see what is missing, what it would improve and where to fix it. The CRM keeps its own, more detailed notes on its Overview, Pipeline and Portfolio.
      </p>
      <DataHealthNote all currentApp="admin" load={() => apiClient.dataHealth()} />
      <p style={{ margin: 0, fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Nothing listed means nothing is missing for the apps you can use. Source: counts of your organisation&rsquo;s own records as they stand now.</p>
    </div>
  );
}
