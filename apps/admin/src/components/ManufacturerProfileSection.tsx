"use client";

import { useEffect, useState } from "react";
import type { ManufacturerProfileSummary } from "@universe/types";
import { Button, CountryMultiSelect } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { useCountries } from "../lib/useCountries";
import { Field, FormGrid, Notice, Section, TagListInput, inputStyle } from "./form";

const EMPTY: Omit<ManufacturerProfileSummary, "organizationId"> = {
  productCategoriesManufactured: [],
  whoPrequalified: false,
  sraApprovals: [],
  nationalRegistrations: [],
  otherCertifications: [],
  productionCapacitySummary: null,
  currentExportMarkets: [],
  isLocalManufacturer: false,
};

/** What the manufacturer itself holds and makes (separate from its sites): prequalification, approvals, registrations, capacity and markets. */
export function ManufacturerProfileSection({ organizationId }: { organizationId: string }) {
  const countries = useCountries();
  const [p, setP] = useState<Omit<ManufacturerProfileSummary, "organizationId"> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiClient
      .getManufacturerProfile(organizationId)
      .then((r) => setP(r ?? EMPTY))
      .catch((e) => {
        setP(EMPTY);
        setError(e instanceof Error ? e.message : "Could not load the manufacturer profile.");
      });
  }, [organizationId]);

  if (!p) return <Section title="Manufacturer profile"><p>Loading…</p></Section>;
  const set = (patch: Partial<typeof p>) => {
    setP({ ...p, ...patch });
    setSaved(false);
  };

  async function save() {
    if (!p) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const r = await apiClient.upsertManufacturerProfile(organizationId, { ...p, productionCapacitySummary: p.productionCapacitySummary?.trim() || undefined });
      setP(r);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save the profile.");
    } finally {
      setBusy(false);
    }
  }

  const check = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );

  return (
    <Section title="Manufacturer profile" hint="What this manufacturer makes, holds and exports. Its individual sites are listed separately below.">
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 14 }}>
        {check("WHO prequalified", p.whoPrequalified, (v) => set({ whoPrequalified: v }))}
        {check("Local manufacturer (local-manufacturing policy)", p.isLocalManufacturer, (v) => set({ isLocalManufacturer: v }))}
      </div>
      <FormGrid>
        <Field label="Product categories manufactured">
          <TagListInput value={p.productCategoriesManufactured} onChange={(v) => set({ productCategoriesManufactured: v })} placeholder="Add a category, press Enter" />
        </Field>
        <Field label="Stringent regulatory authority approvals" hint="e.g. EMA, US FDA, MHRA, Health Canada.">
          <TagListInput value={p.sraApprovals} onChange={(v) => set({ sraApprovals: v })} placeholder="Add an authority" />
        </Field>
        <Field label="Other certifications" hint="e.g. ISO 13485, GMP, CE marking.">
          <TagListInput value={p.otherCertifications} onChange={(v) => set({ otherCertifications: v })} placeholder="Add a certification" />
        </Field>
        <Field label="National registrations (countries)">
          <div style={{ marginTop: 4 }}>
            <CountryMultiSelect value={p.nationalRegistrations} onChange={(v) => set({ nationalRegistrations: v })} options={countries} ariaLabel="National registrations" />
          </div>
        </Field>
        <Field label="Current export markets">
          <div style={{ marginTop: 4 }}>
            <CountryMultiSelect value={p.currentExportMarkets} onChange={(v) => set({ currentExportMarkets: v })} options={countries} ariaLabel="Export markets" />
          </div>
        </Field>
      </FormGrid>
      <div style={{ marginTop: 16 }}>
        <Field label="Production capacity">
          <textarea rows={3} style={inputStyle} value={p.productionCapacitySummary ?? ""} onChange={(e) => set({ productionCapacitySummary: e.target.value })} />
        </Field>
      </div>
      <div style={{ marginTop: 16 }}>
        {error && <Notice tone="error">{error}</Notice>}
        {saved && <Notice tone="success">Saved.</Notice>}
        <Button variant="primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save profile"}</Button>
      </div>
    </Section>
  );
}
