"use client";

import { useEffect, useState } from "react";
import type { OrgDirectoryProfile } from "@universe/types";
import { Button, Pill, Select } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { Field, FormGrid, Notice, Section, inputStyle } from "./form";

const WAREHOUSING = [
  { value: "OWN", label: "Own warehouses" },
  { value: "THIRD_PARTY", label: "Third-party warehouses" },
  { value: "MIXED", label: "Own and third-party" },
];

type Draft = {
  description: string;
  website: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  manufacturers: string;
  wholesaleDistributionLicense: string;
  warehousingCapability: string;
  yearsInOperation: string;
};

const toDraft = (p: OrgDirectoryProfile): Draft => ({
  description: p.description ?? "",
  website: p.website ?? "",
  contactName: p.contactName ?? "",
  contactEmail: p.contactEmail ?? "",
  contactPhone: p.contactPhone ?? "",
  manufacturers: p.principalManufacturersRepresented.join("\n"),
  wholesaleDistributionLicense: p.wholesaleDistributionLicense ?? "",
  warehousingCapability: p.warehousingCapability ?? "",
  yearsInOperation: p.yearsInOperation === null ? "" : String(p.yearsInOperation),
});

/**
 * The organisation's public supplier-directory profile: what other organisations see once it is published. Saving is a draft; publishing is
 * a separate, deliberate step (and can be reversed). Reuses the supplier-directory profile table; edited here rather than in a work app.
 */
export function DirectoryProfileSection({ organizationId }: { organizationId: string }) {
  const [profile, setProfile] = useState<OrgDirectoryProfile | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProfile(null);
    apiClient
      .getOrgDirectoryProfile(organizationId)
      .then((p) => {
        setProfile(p);
        setDraft(toDraft(p));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the directory profile."));
  }, [organizationId]);

  if (!profile || !draft) {
    return <Section title="Directory profile">{error ? <Notice tone="error">{error}</Notice> : <p>Loading…</p>}</Section>;
  }
  const set = (p: Partial<Draft>) => {
    setDraft({ ...draft, ...p });
    setSaved(false);
  };
  const orNull = (v: string) => (v.trim() === "" ? null : v.trim());

  async function run(fn: () => Promise<OrgDirectoryProfile>, savedFlag: boolean) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const p = await fn();
      setProfile(p);
      setDraft(toDraft(p));
      setSaved(savedFlag);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(
      () =>
        apiClient.saveOrgDirectoryProfile(organizationId, {
          description: orNull(draft.description),
          website: orNull(draft.website),
          contactName: orNull(draft.contactName),
          contactEmail: orNull(draft.contactEmail),
          contactPhone: orNull(draft.contactPhone),
          principalManufacturersRepresented: draft.manufacturers.split("\n").map((m) => m.trim()).filter(Boolean),
          wholesaleDistributionLicense: orNull(draft.wholesaleDistributionLicense),
          warehousingCapability: (orNull(draft.warehousingCapability) as OrgDirectoryProfile["warehousingCapability"]) ?? null,
          yearsInOperation: draft.yearsInOperation.trim() === "" ? null : Number(draft.yearsInOperation),
        }),
      true,
    );

  const published = !!profile.publishedAt;
  return (
    <Section
      title="Directory profile"
      hint="What other organisations see about you in the network directory once published. Saving keeps a private draft; publishing is a separate step you can undo."
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <Pill tone={published ? "good" : "neutral"}>{published ? "Published" : "Draft, not visible to others"}</Pill>
        {published && <span style={{ fontSize: 12.5, color: "var(--u-ink-secondary)" }}>since {new Date(profile.publishedAt!).toLocaleDateString("en-GB")}</span>}
      </div>
      <FormGrid>
        <div style={{ gridColumn: "1 / -1" }}><Field label="About">
          <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} maxLength={4000} value={draft.description} onChange={(e) => set({ description: e.target.value })} />
        </Field></div>
        <Field label="Website">
          <input style={inputStyle} placeholder="https://" aria-label="https://" value={draft.website} onChange={(e) => set({ website: e.target.value })} />
        </Field>
        <Field label="Years in operation">
          <input style={inputStyle} inputMode="numeric" value={draft.yearsInOperation} onChange={(e) => set({ yearsInOperation: e.target.value.replace(/[^0-9]/g, "") })} />
        </Field>
        <Field label="Contact name">
          <input style={inputStyle} value={draft.contactName} onChange={(e) => set({ contactName: e.target.value })} />
        </Field>
        <Field label="Contact email">
          <input style={inputStyle} type="email" value={draft.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} />
        </Field>
        <Field label="Contact phone">
          <input style={inputStyle} value={draft.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} />
        </Field>
        <Field label="Wholesale distribution licence">
          <input style={inputStyle} value={draft.wholesaleDistributionLicense} onChange={(e) => set({ wholesaleDistributionLicense: e.target.value })} />
        </Field>
        <Field label="Warehousing">
          <div style={{ marginTop: 4 }}>
            <Select value={draft.warehousingCapability} onChange={(v) => set({ warehousingCapability: v })} allLabel="Not stated" options={WAREHOUSING} ariaLabel="Warehousing" />
          </div>
        </Field>
        <div style={{ gridColumn: "1 / -1" }}><Field label="Principal manufacturers represented" hint="One per line.">
          <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={draft.manufacturers} onChange={(e) => set({ manufacturers: e.target.value })} />
        </Field></div>
      </FormGrid>
      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <Button variant="primary" disabled={busy} onClick={save}>{busy ? "Working…" : "Save draft"}</Button>
        <Button variant="secondary" disabled={busy} onClick={() => run(() => apiClient.setOrgDirectoryPublished(organizationId, !published), false)}>
          {published ? "Unpublish" : "Publish to directory"}
        </Button>
      </div>
      {error && <div style={{ marginTop: 10 }}><Notice tone="error">{error}</Notice></div>}
      {saved && <div style={{ marginTop: 10 }}><Notice tone="success">Saved.</Notice></div>}
    </Section>
  );
}
