"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StatusBadge } from "@universe/ui";
import type { ProjectSummary } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";

/**
 * MVP detail view. Line item management (batch/expiry/storage for pharma
 * projects), procurement, financials, and logistics tabs are the next
 * build-out once the core intake flow is validated.
 *
 * Reworked 2026-09-24: this used to be a dynamic route (/projects/[id]),
 * but Next's `output: "export"` (required for Azure Static Web Apps)
 * rejects any dynamic route whose generateStaticParams() returns an empty
 * array — and project IDs are tenant data, never known at build time, so
 * an empty array is the only honest answer. Next's own docs recommend a
 * query param instead for exactly this case (static export + entirely
 * client-fetched dynamic content), so this is now a plain static page at
 * /projects/detail reading ?id= via useSearchParams(). Nothing about the
 * actual fetch/render logic changed otherwise.
 */
export function ProjectDetailView() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiClient
      .getProject(id)
      .then(setProject)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load project"));
  }, [id]);

  if (!id) return <main style={{ padding: 32, color: "#B91C1C" }}>No project specified.</main>;
  if (error) return <main style={{ padding: 32, color: "#B91C1C" }}>{error}</main>;
  if (!project) return <main style={{ padding: 32 }}>Loading…</main>;

  return (
    <main style={{ padding: 32 }}>
      <h1>{project.title}</h1>
      <p style={{ color: "#6B7280" }}>{project.referenceNumber}</p>
      <StatusBadge status={project.status} />

      <dl style={{ marginTop: 24 }}>
        <dt style={{ fontWeight: 600 }}>Client</dt>
        <dd>{project.clientName ?? "—"}</dd>
        <dt style={{ fontWeight: 600, marginTop: 12 }}>Project Type</dt>
        <dd>{project.projectType === "PHARMACEUTICAL" ? "Pharmaceutical" : "Non-Pharmaceutical"}</dd>
        <dt style={{ fontWeight: 600, marginTop: 12 }}>Due Date</dt>
        <dd>{project.dueDate ? new Date(project.dueDate).toLocaleDateString() : "—"}</dd>
        <dt style={{ fontWeight: 600, marginTop: 12 }}>Days Remaining for Submission</dt>
        <dd>{project.daysRemainingForSubmission ?? "—"}</dd>
      </dl>

      {project.projectType === "PHARMACEUTICAL" && (
        <p style={{ background: "#EFF6FF", padding: 12, borderRadius: 8, fontSize: 13, marginTop: 16 }}>
          Line items (batch, expiry, storage conditions, MA/PL) — coming in the next build pass.
        </p>
      )}
    </main>
  );
}
