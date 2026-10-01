"use client";

import { useRef, useState } from "react";
import type { ProjectDetail } from "@universe/types";
import { apiClient } from "../../../lib/apiClient";
import { Button, TextLink } from "@universe/ui";

const DOCUMENT_TYPES = ["CHECKLIST", "ISSUES", "CLOSEOUT_REPORT", "OTHER"] as const;

const inputStyle = {
  padding: 4,
  border: "1px solid var(--u-border)",
  borderRadius: 4,
  fontSize: 12,
} as const;

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Project Documents (Phase 2b, 2026-10-01) — Blob Storage, per the
 * architectural decision in architecture-decisions.md. Deliberately its
 * own top-level section (always visible, not gated behind
 * isLinesSectionRelevant like Line Items) — Lewis's 2026-10-01 field-
 * visibility feedback named specific LINE fields to defer to In Progress,
 * not documents, and a checklist/issues doc can legitimately need
 * attaching from the Identified stage onward.
 *
 * Upload is a two-step, direct-to-blob flow — see
 * UniverseApiClient.requestDocumentUploadUrl/uploadDocumentFile/
 * confirmDocumentUpload and DocumentsService's doc comment in apps/api.
 * The file's bytes never pass through this component touching any state
 * beyond the native <input type="file"> — no base64/data-URL buffering.
 */
export function ProjectDocuments({ project, onUpdated }: { project: ProjectDetail; onUpdated: (project: ProjectDetail) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [type, setType] = useState<(typeof DOCUMENT_TYPES)[number]>("OTHER");
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pickFile(file: File) {
    setPendingFile(file);
    setTitle((prev) => prev || file.name);
    setError(null);
  }

  async function upload() {
    if (!pendingFile) return;
    setUploading(true);
    setError(null);
    try {
      const { uploadUrl, blobName } = await apiClient.requestDocumentUploadUrl(project.id, {
        fileName: pendingFile.name,
        contentType: pendingFile.type || "application/octet-stream",
      });
      await apiClient.uploadDocumentFile(uploadUrl, pendingFile);
      const updated = await apiClient.confirmDocumentUpload(project.id, {
        blobName,
        fileName: pendingFile.name,
        type,
        title: title || pendingFile.name,
        fileSizeBytes: pendingFile.size,
        mimeType: pendingFile.type || undefined,
      });
      onUpdated(updated);
      setPendingFile(null);
      setTitle("");
      setType("OTHER");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setUploading(false);
    }
  }

  async function download(documentId: string) {
    try {
      const { downloadUrl } = await apiClient.getDocumentDownloadUrl(project.id, documentId);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get download link");
    }
  }

  async function removeDocument(documentId: string) {
    setDeletingId(documentId);
    setError(null);
    try {
      const updated = await apiClient.deleteDocument(project.id, documentId);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ marginTop: 40 }}>
      <h2>Documents ({project.documents.length})</h2>

      {error && <p style={{ color: "var(--u-status-critical)", fontSize: 12, marginTop: 6 }}>{error}</p>}

      {project.documents.length === 0 && <p style={{ color: "var(--u-ink-secondary)", marginTop: 8 }}>No documents uploaded yet.</p>}

      {project.documents.length > 0 && (
        <table style={{ width: "100%", marginTop: 8, fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--u-ink-secondary)" }}>
              <th style={{ fontWeight: 500, padding: "4px 8px 4px 0" }}>Title</th>
              <th style={{ fontWeight: 500, padding: "4px 8px" }}>Type</th>
              <th style={{ fontWeight: 500, padding: "4px 8px" }}>Size</th>
              <th style={{ fontWeight: 500, padding: "4px 8px" }}>Uploaded by</th>
              <th style={{ fontWeight: 500, padding: "4px 8px" }}>Date</th>
              <th style={{ fontWeight: 500, padding: "4px 8px" }} />
            </tr>
          </thead>
          <tbody>
            {project.documents.map((d) => (
              <tr key={d.id} style={{ borderTop: "1px solid var(--u-border)" }}>
                <td style={{ padding: "6px 8px 6px 0" }}>
                  <TextLink as="button" onClick={() => download(d.id)} style={{ border: "none", background: "none", fontSize: 13, padding: 0 }}>
                    {d.title}
                  </TextLink>
                </td>
                <td style={{ padding: "6px 8px" }}>{d.type.replace(/_/g, " ")}</td>
                <td style={{ padding: "6px 8px", color: "var(--u-ink-secondary)" }}>{formatBytes(d.fileSizeBytes)}</td>
                <td style={{ padding: "6px 8px", color: "var(--u-ink-secondary)" }}>{d.uploadedByName ?? "—"}</td>
                <td style={{ padding: "6px 8px", color: "var(--u-ink-secondary)" }}>{new Date(d.uploadedAt).toLocaleDateString()}</td>
                <td style={{ padding: "6px 0 6px 8px", textAlign: "right" }}>
                  <Button variant="danger" size="sm" disabled={deletingId === d.id} onClick={() => removeDocument(d.id)}>
                    {deletingId === d.id ? "Removing…" : "Remove"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 12, background: "var(--u-surface-alt)", padding: 10, borderRadius: 6, flexWrap: "wrap" }}>
        <label style={{ fontSize: 12 }}>
          File
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "block", marginTop: 2, fontSize: 12 }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
            }}
          />
        </label>
        <label style={{ fontSize: 12 }}>
          Title
          <input
            style={{ ...inputStyle, display: "block", width: 220, marginTop: 2 }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title"
          />
        </label>
        <label style={{ fontSize: 12 }}>
          Type
          <select className="u-native-select" style={{ ...inputStyle, display: "block", marginTop: 2 }} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <Button variant="primary" size="sm" onClick={upload} disabled={!pendingFile || uploading}>
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </div>
    </div>
  );
}
