"use client";

import { useState, type ChangeEvent } from "react";
import { Button } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { Field, Notice, inputStyle } from "./form";

const HEX = /^#[0-9A-Fa-f]{6}$/;
export const isValidHex = (v: string) => v === "" || HEX.test(v);

/** Colour input: native picker + hex text + clear. Empty means "use the
 * Universe default". Text colour on top of it is chosen automatically. */
export function ColourField({
  label,
  hint,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const valid = HEX.test(value);
  return (
    <Field label={label} hint={hint}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="color"
          aria-label={`${label} picker`}
          value={valid ? value : placeholder}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          style={{ width: 40, height: 34, padding: 0, border: "1px solid var(--u-border)", borderRadius: 6, background: "none", cursor: "pointer", flexShrink: 0 }}
        />
        <input style={inputStyle} value={value} placeholder={placeholder} maxLength={7} onChange={(e) => onChange(e.target.value)} />
        {value && (
          <Button variant="ghost" size="sm" onClick={() => onChange("")}>
            Clear
          </Button>
        )}
      </div>
      {!isValidHex(value) && <div style={{ color: "var(--u-status-critical)", fontSize: 12, marginTop: 4 }}>Use a 6-digit hex colour, like #1B203D.</div>}
    </Field>
  );
}

/** Logo upload with preview. Uploads immediately (separate from the form's
 * Save button) and reports the new stored path via onChanged. */
export function LogoField({
  organizationId,
  logoUrl,
  onChanged,
}: {
  organizationId: string;
  logoUrl: string | null;
  onChanged: (logoUrl: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const url = apiClient.assetUrl(logoUrl);

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 512 * 1024) {
      setError("That file is over 512 KB — please use a smaller image.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await apiClient.uploadOrganizationLogo(organizationId, file);
      setBroken(false);
      onChanged(r.logoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await apiClient.removeOrganizationLogo(organizationId);
      onChanged(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the logo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Field label="Logo" hint="Shown top-left of every app in place of the Universe logo. PNG, JPEG, WebP or SVG, up to 512 KB. A wide logo around 150 × 34 px on a transparent background works best.">
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div
          style={{
            width: 180,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px dashed var(--u-border)",
            borderRadius: 8,
            background: "var(--u-surface)",
            overflow: "hidden",
          }}
        >
          {url && !broken ? (
            <img src={url} alt="Current logo" onError={() => setBroken(true)} style={{ maxWidth: 160, maxHeight: 40, objectFit: "contain" }} />
          ) : (
            <span style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>{url ? "Can't load logo" : "No logo — Universe logo shown"}</span>
          )}
        </div>
        <label style={{ display: "inline-block" }}>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={pick} disabled={busy} style={{ display: "none" }} />
          <span
            style={{
              display: "inline-block",
              padding: "7px 14px",
              borderRadius: "var(--u-radius-md)",
              border: "1px solid var(--u-border)",
              fontSize: 13,
              fontWeight: 600,
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Working…" : logoUrl ? "Replace logo" : "Upload logo"}
          </span>
        </label>
        {logoUrl && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={remove}>
            Remove
          </Button>
        )}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
    </Field>
  );
}
