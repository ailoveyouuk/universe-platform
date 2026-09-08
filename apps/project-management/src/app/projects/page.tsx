"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@universe/ui";
import type { ProjectSummary } from "@universe/types";
import { apiClient } from "../../lib/apiClient";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .listProjects()
      .then(setProjects)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load projects"));
  }, []);

  return (
    <main style={{ padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Projects</h1>
        <Link href="/projects/new">+ New Project</Link>
      </div>

      {error && <p style={{ color: "#B91C1C" }}>{error}</p>}
      {!projects && !error && <p>Loading…</p>}

      {projects && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #E5E7EB" }}>
              <th style={{ padding: 8 }}>Reference</th>
              <th style={{ padding: 8 }}>Title</th>
              <th style={{ padding: 8 }}>Client</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }}>Due</th>
              <th style={{ padding: 8 }}>Days Left</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                <td style={{ padding: 8 }}>{p.referenceNumber}</td>
                <td style={{ padding: 8 }}>{p.title}</td>
                <td style={{ padding: 8 }}>{p.clientName ?? "—"}</td>
                <td style={{ padding: 8 }}>
                  <StatusBadge status={p.status} />
                </td>
                <td style={{ padding: 8 }}>{p.dueDate ? new Date(p.dueDate).toLocaleDateString() : "—"}</td>
                <td style={{ padding: 8 }}>{p.daysRemainingForSubmission ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
