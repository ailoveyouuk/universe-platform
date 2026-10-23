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
  variant = "logo",
}: {
  organizationId: string;
  logoUrl: string | null;
  onChanged: (logoUrl: string | null) => void;
  variant?: "logo" | "icon";
}) {
  const isIcon = variant === "icon";
  const noun = isIcon ? "icon" : "logo";
  const maxKb = isIcon ? 256 : 512;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const url = apiClient.assetUrl(logoUrl);

  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > maxKb * 1024) {
      setError(`That file is over ${maxKb} KB — please use a smaller image.`);
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const dims = await imageSize(file);
      if (dims) {
        if (dims.w > 2000 || dims.h > 2000) throw new Error(`That image is ${dims.w} × ${dims.h} px, which is larger than needed. Please resize it to ${isIcon ? "128 × 128" : "around 300 × 68"} px or smaller.`);
        const ratio = dims.w / dims.h;
        if (isIcon && (ratio > 1.3 || ratio < 0.77)) setNote(`Uploaded, but the icon is ${dims.w} × ${dims.h} px and not square, so it will be cropped or shrunk in small spaces. A square mark works best.`);
        else if (!isIcon && ratio < 1.5) setNote(`Uploaded, but the logo is ${dims.w} × ${dims.h} px and fairly square. A wide logo (about 4:1) fits the menu header best; consider also adding a square icon.`);
        else if (Math.min(dims.w, dims.h) < (isIcon ? 48 : 24)) setNote(`Uploaded, but at ${dims.w} × ${dims.h} px it may look blurry. A larger image is safer.`);
      }
      const r = await apiClient.uploadOrganizationLogo(organizationId, file, variant);
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
      await apiClient.removeOrganizationLogo(organizationId, variant);
      onChanged(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not remove the ${noun}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Field
      label={isIcon ? "Square icon (optional)" : "Logo"}
      hint={isIcon ? "Used where space is tight — the phone and tablet header and the collapsed menu. A simple square mark, ideally 128 × 128 px. PNG, JPEG, WebP or SVG, up to 256 KB. If you skip it, the main logo is scaled down instead." : "Shown top-left of every app in place of the Universe logo. PNG, JPEG, WebP or SVG, up to 512 KB. A wide logo around 150 × 34 px on a transparent background works best."}
    >
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div
          style={{
            width: isIcon ? 56 : 180,
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
            <img src={url} alt={`Current ${noun}`} onError={() => setBroken(true)} style={{ height: isIcon ? 40 : 40, width: "auto", maxWidth: isIcon ? 48 : 160, objectFit: "contain" }} />
          ) : (
            <span style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>{url ? `Can't load ${noun}` : isIcon ? "None" : "No logo — Universe logo shown"}</span>
          )}
        </div>
        <label style={{ display: "inline-block", position: "relative" }}>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={pick} disabled={busy} aria-label={`Choose ${noun} image`} style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }} />
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
            {busy ? "Working…" : logoUrl ? `Replace ${noun}` : `Upload ${noun}`}
          </span>
        </label>
        {logoUrl && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={remove}>
            Remove
          </Button>
        )}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {note && !error && <Notice tone="info">{note}</Notice>}
    </Field>
  );
}

/** Pixel size of a raster image, or null when it cannot be read (SVG scales, so it is skipped). */
function imageSize(file: File): Promise<{ w: number; h: number } | null> {
  if (file.type === "image/svg+xml") return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
