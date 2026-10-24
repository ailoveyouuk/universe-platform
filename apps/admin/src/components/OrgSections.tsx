"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  OrganizationAccessList,
  DataInsightsUserProfileSummary,
  DataSharingConsentSummary,
  FunderProfileSummary,
  OrganizationDetail,
  OrganizationManufacturerSiteSummary,
  ProcurementAgentProfileSummary,
  TenderingBodyProfileSummary,
} from "@universe/types";
import { Button, CountrySelect, Pill, Select } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { useCountries } from "../lib/useCountries";
import { Field, FormGrid, Notice, Section, TagListInput, inputStyle } from "./form";

function errMsg(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

/** Small hook: save-state plumbing shared by every section below. */
function useSaveState() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  async function run(fn: () => Promise<void>, fallback: string) {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await fn();
      setSaved(true);
    } catch (e) {
      setError(errMsg(e, fallback));
    } finally {
      setSaving(false);
    }
  }
  return { saving, error, saved, run, setSaved };
}

// ---------------------------------------------------------------------------

export function CountryPresenceSection({ organizationId }: { organizationId: string }) {
  const countries = useCountries();
  const [codes, setCodes] = useState<string[] | null>(null);
  const [pick, setPick] = useState("");
  const { saving, error, saved, run, setSaved } = useSaveState();

  useEffect(() => {
    apiClient
      .listOrganizationCountryPresence(organizationId)
      .then((rows) => setCodes(rows.map((r) => r.countryCode)))
      .catch(() => setCodes([]));
  }, [organizationId]);

  const nameOf = (code: string) => countries.find((c) => c.code === code)?.name ?? code;

  return (
    <Section title="Countries of operation" hint="Where this organisation operates. Saved as a whole list.">
      {codes === null ? (
        <p>Loading…</p>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {codes.length === 0 && <span style={{ color: "var(--u-ink-secondary)", fontSize: 13 }}>None recorded.</span>}
            {codes.map((c) => (
              <Pill key={c} tone="brand">
                {nameOf(c)}{" "}
                <button
                  type="button"
                  aria-label={`Remove ${nameOf(c)}`}
                  onClick={() => {
                    setCodes(codes.filter((x) => x !== c));
                    setSaved(false);
                  }}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "inherit", padding: 0, marginLeft: 4 }}
                >
                  ×
                </button>
              </Pill>
            ))}
          </div>
          <div style={{ maxWidth: 320 }}>
            <CountrySelect
              value={pick}
              onChange={(code) => {
                if (code && !codes.includes(code)) {
                  setCodes([...codes, code]);
                  setSaved(false);
                }
                setPick("");
              }}
              options={countries}
              ariaLabel="Add a country"
              placeholder="Add a country…"
            />
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          {saved && <Notice tone="success">Saved.</Notice>}
          <div style={{ marginTop: 12 }}>
            <Button
              variant="primary"
              disabled={saving}
              onClick={() =>
                run(async () => {
                  const rows = await apiClient.setOrganizationCountryPresence(organizationId, codes);
                  setCodes(rows.map((r) => r.countryCode));
                }, "Failed to save countries")
              }
            >
              {saving ? "Saving…" : "Save countries"}
            </Button>
          </div>
        </>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------

function ProcurementAgentForm({ organizationId }: { organizationId: string }) {
  const [p, setP] = useState<Partial<ProcurementAgentProfileSummary> | null>(null);
  const { saving, error, saved, run, setSaved } = useSaveState();
  useEffect(() => {
    apiClient.getProcurementAgentProfile(organizationId).then((r) => setP(r ?? {})).catch(() => setP({}));
  }, [organizationId]);
  if (!p) return <p>Loading…</p>;
  const set = (patch: Partial<ProcurementAgentProfileSummary>) => {
    setP({ ...p, ...patch });
    setSaved(false);
  };
  return (
    <>
      <FormGrid>
        <Field label="Funders / programmes operated under">
          <TagListInput value={p.fundersProgramsOperatedUnder ?? []} onChange={(v) => set({ fundersProgramsOperatedUnder: v })} />
        </Field>
        <Field label="Product categories procured">
          <TagListInput value={p.productCategoriesProcured ?? []} onChange={(v) => set({ productCategoriesProcured: v })} />
        </Field>
        <Field label="Client types served">
          <TagListInput value={p.clientTypesServed ?? []} onChange={(v) => set({ clientTypesServed: v })} />
        </Field>
        <Field label="Accreditations">
          <TagListInput value={p.accreditations ?? []} onChange={(v) => set({ accreditations: v })} />
        </Field>
        <Field label="Logistics capability">
          <div style={{ marginTop: 4 }}>
            <Select
              value={p.logisticsCapability ?? ""}
              onChange={(v) => set({ logisticsCapability: (v || null) as ProcurementAgentProfileSummary["logisticsCapability"] })}
              allLabel="Not set"
              options={[
                { value: "OWN", label: "Own" },
                { value: "SUBCONTRACTED", label: "Subcontracted" },
                { value: "MIXED", label: "Mixed" },
              ]}
              ariaLabel="Logistics capability"
            />
          </div>
        </Field>
        <Field label="Years operating in role">
          <input
            type="number"
            min={0}
            style={inputStyle}
            value={p.yearsOperatingInRole ?? ""}
            onChange={(e) => set({ yearsOperatingInRole: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </Field>
        <Field label="Insurance cover summary">
          <input style={inputStyle} value={p.insuranceCoverSummary ?? ""} onChange={(e) => set({ insuranceCoverSummary: e.target.value })} />
        </Field>
        <Field label="Insurance expiry date">
          <input
            type="date"
            style={inputStyle}
            value={(p.insuranceExpiryDate ?? "").slice(0, 10)}
            onChange={(e) => set({ insuranceExpiryDate: e.target.value || null })}
          />
        </Field>
      </FormGrid>
      <div style={{ marginTop: 16 }}>
        <Field label="Track record summary">
          <textarea rows={3} style={inputStyle} value={p.trackRecordSummary ?? ""} onChange={(e) => set({ trackRecordSummary: e.target.value })} />
        </Field>
      </div>
      <SaveBar
        saving={saving}
        error={error}
        saved={saved}
        onSave={() =>
          run(async () => {
            const body = { ...p } as Record<string, unknown>;
            delete body.organizationId;
            // The API treats an omitted field as "leave alone"; null/empty values are dropped rather than sent.
            for (const k of Object.keys(body)) if (body[k] === null || body[k] === "") delete body[k];
            setP(await apiClient.upsertProcurementAgentProfile(organizationId, body as Partial<ProcurementAgentProfileSummary>));
          }, "Failed to save profile")
        }
      />
    </>
  );
}

function TenderingBodyForm({ organizationId }: { organizationId: string }) {
  const [p, setP] = useState<Partial<TenderingBodyProfileSummary> | null>(null);
  const [orgs, setOrgs] = useState<{ value: string; label: string }[]>([]);
  const { saving, error, saved, run, setSaved } = useSaveState();
  useEffect(() => {
    apiClient.getTenderingBodyProfile(organizationId).then((r) => setP(r ?? {})).catch(() => setP({}));
    apiClient
      .listOrganizations()
      .then((all) => setOrgs(all.filter((o) => o.type === "PROCUREMENT_SERVICE_AGENT").map((o) => ({ value: o.id, label: o.name }))))
      .catch(() => setOrgs([]));
  }, [organizationId]);
  if (!p) return <p>Loading…</p>;
  const set = (patch: Partial<TenderingBodyProfileSummary>) => {
    setP({ ...p, ...patch });
    setSaved(false);
  };
  return (
    <>
      <FormGrid>
        <Field label="Body type">
          <div style={{ marginTop: 4 }}>
            <Select
              value={p.bodyType ?? ""}
              onChange={(v) => set({ bodyType: (v || null) as TenderingBodyProfileSummary["bodyType"] })}
              allLabel="Not set"
              options={[
                { value: "GOVERNMENT", label: "Government" },
                { value: "FAITH_BASED_NETWORK", label: "Faith-based network" },
                { value: "NGO_IMPLEMENTING_PARTNER", label: "NGO implementing partner" },
                { value: "MULTILATERAL", label: "Multilateral" },
              ]}
              ariaLabel="Body type"
            />
          </div>
        </Field>
        <Field label="Funding sources">
          <TagListInput value={p.fundingSources ?? []} onChange={(v) => set({ fundingSources: v })} />
        </Field>
        <Field label="Disease / programme areas">
          <TagListInput value={p.diseaseProgramAreas ?? []} onChange={(v) => set({ diseaseProgramAreas: v })} />
        </Field>
        <Field label="Direct procurement authority">
          <div style={{ marginTop: 4 }}>
            <Select
              value={p.hasDirectProcurementAuthority == null ? "" : p.hasDirectProcurementAuthority ? "yes" : "no"}
              onChange={(v) => set({ hasDirectProcurementAuthority: v === "" ? null : v === "yes" })}
              allLabel="Not set"
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              ariaLabel="Direct procurement authority"
            />
          </div>
        </Field>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={!!p.usesExternalProcurementAgent}
            onChange={(e) => set({ usesExternalProcurementAgent: e.target.checked })}
          />
          Uses an external procurement agent
        </label>
        {p.usesExternalProcurementAgent && (
          <Field label="Procurement agent organisation" hint="A recorded fact only — it does not grant the agent access to this organisation's data.">
            <div style={{ marginTop: 4 }}>
              <Select
                value={p.procurementAgentOrganizationId ?? ""}
                onChange={(v) => set({ procurementAgentOrganizationId: v || null })}
                allLabel="Not set"
                options={orgs}
                ariaLabel="Procurement agent organisation"
              />
            </div>
          </Field>
        )}
      </FormGrid>
      <div style={{ marginTop: 16 }}>
        <Field label="Scale served (summary)">
          <textarea rows={3} style={inputStyle} value={p.scaleServedSummary ?? ""} onChange={(e) => set({ scaleServedSummary: e.target.value })} />
        </Field>
      </div>
      <SaveBar
        saving={saving}
        error={error}
        saved={saved}
        onSave={() =>
          run(async () => {
            const body = { ...p } as Record<string, unknown>;
            delete body.organizationId;
            delete body.procurementAgentOrganizationName;
            for (const k of Object.keys(body)) if (body[k] === null || body[k] === "") delete body[k];
            if (!p.usesExternalProcurementAgent) delete body.procurementAgentOrganizationId;
            setP(await apiClient.upsertTenderingBodyProfile(organizationId, body as Partial<TenderingBodyProfileSummary>));
          }, "Failed to save profile")
        }
      />
    </>
  );
}

function FunderForm({ organizationId }: { organizationId: string }) {
  const [p, setP] = useState<Partial<FunderProfileSummary> | null>(null);
  const { saving, error, saved, run, setSaved } = useSaveState();
  useEffect(() => {
    apiClient.getFunderProfile(organizationId).then((r) => setP(r ?? {})).catch(() => setP({}));
  }, [organizationId]);
  if (!p) return <p>Loading…</p>;
  return (
    <>
      <Field label="Funding focus areas">
        <TagListInput
          value={p.fundingFocusAreas ?? []}
          onChange={(v) => {
            setP({ ...p, fundingFocusAreas: v });
            setSaved(false);
          }}
        />
      </Field>
      <div style={{ marginTop: 16 }}>
        <Field label="Notes">
          <textarea
            rows={3}
            style={inputStyle}
            value={p.notes ?? ""}
            onChange={(e) => {
              setP({ ...p, notes: e.target.value });
              setSaved(false);
            }}
          />
        </Field>
      </div>
      <SaveBar
        saving={saving}
        error={error}
        saved={saved}
        onSave={() =>
          run(async () => {
            const body: Partial<FunderProfileSummary> = { fundingFocusAreas: p.fundingFocusAreas ?? [] };
            if (p.notes) body.notes = p.notes;
            setP(await apiClient.upsertFunderProfile(organizationId, body));
          }, "Failed to save profile")
        }
      />
    </>
  );
}

function DataInsightsForm({ organizationId }: { organizationId: string }) {
  const [p, setP] = useState<Partial<DataInsightsUserProfileSummary> | null>(null);
  const { saving, error, saved, run, setSaved } = useSaveState();
  useEffect(() => {
    apiClient.getDataInsightsUserProfile(organizationId).then((r) => setP(r ?? {})).catch(() => setP({}));
  }, [organizationId]);
  if (!p) return <p>Loading…</p>;
  const set = (patch: Partial<DataInsightsUserProfileSummary>) => {
    setP({ ...p, ...patch });
    setSaved(false);
  };
  return (
    <>
      <FormGrid>
        <Field label="Institution type">
          <div style={{ marginTop: 4 }}>
            <Select
              value={p.institutionType ?? ""}
              onChange={(v) => set({ institutionType: (v || null) as DataInsightsUserProfileSummary["institutionType"] })}
              allLabel="Not set"
              options={[
                { value: "ACADEMIC", label: "Academic" },
                { value: "NGO_NONPROFIT_RESEARCH", label: "NGO / nonprofit research" },
                { value: "MULTILATERAL_MARKET_INTELLIGENCE", label: "Multilateral market intelligence" },
                { value: "COMMERCIAL_MARKET_INTELLIGENCE", label: "Commercial market intelligence" },
                { value: "INDIVIDUAL_RESEARCHER", label: "Individual researcher" },
              ]}
              ariaLabel="Institution type"
            />
          </div>
        </Field>
        <Field label="Affiliated institution">
          <input style={inputStyle} value={p.affiliatedInstitution ?? ""} onChange={(e) => set({ affiliatedInstitution: e.target.value })} />
        </Field>
        <Field label="Purpose / intended use">
          <input style={inputStyle} value={p.purposeIntendedUse ?? ""} onChange={(e) => set({ purposeIntendedUse: e.target.value })} />
        </Field>
        <Field label="Publication intent">
          <input style={inputStyle} value={p.publicationIntent ?? ""} onChange={(e) => set({ publicationIntent: e.target.value })} />
        </Field>
        <Field label="Funding source of research">
          <input style={inputStyle} value={p.fundingSourceOfResearch ?? ""} onChange={(e) => set({ fundingSourceOfResearch: e.target.value })} />
        </Field>
        <Field label="Data use agreement version">
          <input style={inputStyle} value={p.dataUseAgreementVersion ?? ""} onChange={(e) => set({ dataUseAgreementVersion: e.target.value })} />
        </Field>
        <Field label="Data use agreement accepted on">
          <input
            type="date"
            style={inputStyle}
            value={(p.dataUseAgreementAcceptedAt ?? "").slice(0, 10)}
            onChange={(e) => set({ dataUseAgreementAcceptedAt: e.target.value || null })}
          />
        </Field>
      </FormGrid>
      <SaveBar
        saving={saving}
        error={error}
        saved={saved}
        onSave={() =>
          run(async () => {
            const body = { ...p } as Record<string, unknown>;
            delete body.organizationId;
            for (const k of Object.keys(body)) if (body[k] === null || body[k] === "") delete body[k];
            setP(await apiClient.upsertDataInsightsUserProfile(organizationId, body as Partial<DataInsightsUserProfileSummary>));
          }, "Failed to save profile")
        }
      />
    </>
  );
}

function SaveBar({ saving, error, saved, onSave }: { saving: boolean; error: string | null; saved: boolean; onSave: () => void }) {
  return (
    <div style={{ marginTop: 16 }}>
      {error && <Notice tone="error">{error}</Notice>}
      {saved && <Notice tone="success">Saved.</Notice>}
      <Button variant="primary" disabled={saving} onClick={onSave}>
        {saving ? "Saving…" : "Save profile"}
      </Button>
    </div>
  );
}

/** Category-specific profile — which form shows depends on Organization.type.
 * Suppliers manage their own public profile in the Supplier Portal (not built
 * yet), so there is nothing to edit here for SUPPLIER; MANUFACTURER's detail
 * is its sites (ManufacturerSitesSection). */
export function CategoryProfileSection({ org }: { org: OrganizationDetail }) {
  switch (org.type) {
    case "PROCUREMENT_SERVICE_AGENT":
      return (
        <Section title="Procurement agent profile">
          <ProcurementAgentForm organizationId={org.id} />
        </Section>
      );
    case "TENDERING_PURCHASING_BODY":
      return (
        <Section title="Tendering body profile">
          <TenderingBodyForm organizationId={org.id} />
        </Section>
      );
    case "FUNDER_DONOR":
      return (
        <Section title="Funder profile">
          <FunderForm organizationId={org.id} />
        </Section>
      );
    case "DATA_INSIGHTS_USER":
      return (
        <Section title="Data / insights user profile">
          <DataInsightsForm organizationId={org.id} />
        </Section>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------

export function ManufacturerSitesSection({ organizationId }: { organizationId: string }) {
  const countries = useCountries();
  const [sites, setSites] = useState<OrganizationManufacturerSiteSummary[] | null>(null);
  const [draft, setDraft] = useState({ locationCountryCode: "", locationDetail: "", gmpCertified: false, gmpCertificationDetail: "" });
  const { saving, error, run } = useSaveState();

  const load = useCallback(() => {
    apiClient.listManufacturerSites(organizationId).then(setSites).catch(() => setSites([]));
  }, [organizationId]);
  useEffect(load, [load]);

  const nameOf = (code: string | null) => (code ? countries.find((c) => c.code === code)?.name ?? code : "—");

  return (
    <Section title="Manufacturing sites" hint="A manufacturer can have several sites, each independently certified.">
      {sites === null ? (
        <p>Loading…</p>
      ) : (
        <>
          {sites.length === 0 ? (
            <p style={{ color: "var(--u-ink-secondary)", fontSize: 13 }}>No sites recorded.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "2px solid var(--u-border)" }}>
                  <th style={{ padding: 8 }}>Country</th>
                  <th style={{ padding: 8 }}>Location</th>
                  <th style={{ padding: 8 }}>GMP</th>
                  <th style={{ padding: 8 }} />
                </tr>
              </thead>
              <tbody>
                {sites.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--u-border)" }}>
                    <td style={{ padding: 8 }}>{nameOf(s.locationCountryCode)}</td>
                    <td style={{ padding: 8, color: "var(--u-ink-secondary)" }}>{s.locationDetail ?? "—"}</td>
                    <td style={{ padding: 8 }}>
                      {s.gmpCertified ? <Pill tone="good">GMP certified</Pill> : <Pill>Not certified</Pill>}
                      {s.gmpCertificationDetail && <span style={{ marginLeft: 8, fontSize: 12, color: "var(--u-ink-secondary)" }}>{s.gmpCertificationDetail}</span>}
                    </td>
                    <td style={{ padding: 8, textAlign: "right" }}>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={saving}
                        onClick={() => run(async () => { await apiClient.removeManufacturerSite(organizationId, s.id); load(); }, "Failed to remove site")}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <h3 style={{ fontSize: 14, margin: "8px 0" }}>Add a site</h3>
          <FormGrid>
            <Field label="Country">
              <div style={{ marginTop: 4 }}>
                <CountrySelect value={draft.locationCountryCode} onChange={(c) => setDraft({ ...draft, locationCountryCode: c })} options={countries} ariaLabel="Site country" />
              </div>
            </Field>
            <Field label="Location detail">
              <input style={inputStyle} value={draft.locationDetail} onChange={(e) => setDraft({ ...draft, locationDetail: e.target.value })} />
            </Field>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
              <input type="checkbox" checked={draft.gmpCertified} onChange={(e) => setDraft({ ...draft, gmpCertified: e.target.checked })} />
              GMP certified
            </label>
            <Field label="GMP certification detail">
              <input style={inputStyle} value={draft.gmpCertificationDetail} onChange={(e) => setDraft({ ...draft, gmpCertificationDetail: e.target.value })} />
            </Field>
          </FormGrid>
          {error && <Notice tone="error">{error}</Notice>}
          <div style={{ marginTop: 12 }}>
            <Button
              variant="primary"
              disabled={saving || (!draft.locationCountryCode && !draft.locationDetail)}
              onClick={() =>
                run(async () => {
                  const body: Record<string, unknown> = { gmpCertified: draft.gmpCertified };
                  if (draft.locationCountryCode) body.locationCountryCode = draft.locationCountryCode;
                  if (draft.locationDetail) body.locationDetail = draft.locationDetail;
                  if (draft.gmpCertificationDetail) body.gmpCertificationDetail = draft.gmpCertificationDetail;
                  await apiClient.addManufacturerSite(organizationId, body as never);
                  setDraft({ locationCountryCode: "", locationDetail: "", gmpCertified: false, gmpCertificationDetail: "" });
                  load();
                }, "Failed to add site")
              }
            >
              Add site
            </Button>
          </div>
        </>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------

export function ConsentSection({ organizationId }: { organizationId: string }) {
  const [c, setC] = useState<DataSharingConsentSummary | null | undefined>(undefined);
  useEffect(() => {
    apiClient.getOrganizationDataSharingConsent(organizationId).then(setC).catch(() => setC(null));
  }, [organizationId]);
  return (
    <Section title="Data sharing agreement" hint="Read-only. Consent is recorded when the organisation is provisioned.">
      {c === undefined ? (
        <p>Loading…</p>
      ) : c === null ? (
        <p style={{ color: "var(--u-ink-secondary)", fontSize: 13 }}>No agreement on file.</p>
      ) : (
        <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "6px 16px", margin: 0, fontSize: 13 }}>
          <dt style={{ color: "var(--u-ink-secondary)" }}>Terms version</dt>
          <dd style={{ margin: 0 }}>{c.termsVersion}</dd>
          <dt style={{ color: "var(--u-ink-secondary)" }}>Accepted</dt>
          <dd style={{ margin: 0 }}>
            {new Date(c.acceptedAt).toLocaleDateString()} {c.acceptedByName ? `by ${c.acceptedByName}` : ""}
          </dd>
          <dt style={{ color: "var(--u-ink-secondary)" }}>Scope</dt>
          <dd style={{ margin: 0, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {c.scope.map((s) => (
              <Pill key={s}>{s}</Pill>
            ))}
          </dd>
          {c.revokedAt && (
            <>
              <dt style={{ color: "var(--u-ink-secondary)" }}>Revoked</dt>
              <dd style={{ margin: 0 }}>{new Date(c.revokedAt).toLocaleDateString()}</dd>
            </>
          )}
        </dl>
      )}
    </Section>
  );
}

/**
 * "Share with Universe database" (2026-10-18). Everything an organisation adds goes into the pooled database and is searchable by
 * all organisations, anonymously ("A Universe member"). Turning this on makes the organisation identifiable as the contributor.
 * Suppliers, manufacturers and freight forwarders are identifiable through the supplier directory regardless.
 */
export function ContributorVisibilitySection({ org, onChanged }: { org: OrganizationDetail; onChanged: (o: OrganizationDetail) => void }) {
  const { saving, error, run } = useSaveState();
  return (
    <Section title="Share with Universe database" hint="Everything your organisation adds (products, projects, logistics) joins the pooled Universe database and can be found by every organisation, anonymously. Turn this on to be shown by name as the contributor.">
      <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13.5 }}>
        <input
          type="checkbox"
          checked={org.shareIdentityWithUniverse}
          disabled={saving}
          onChange={(e) => run(async () => onChanged(await apiClient.updateOrganization(org.id, { shareIdentityWithUniverse: e.target.checked })), "Could not save the setting.")}
        />
        Show {org.name} as the contributor of what it adds
      </label>
      <p style={{ fontSize: 12, color: "var(--u-ink-secondary)", margin: "8px 0 0" }}>
        Currently: {org.shareIdentityWithUniverse ? "identifiable to other organisations." : "anonymous (\u201cA Universe member\u201d). Platform staff and your own users always see the real name."} Individual products can override this when added.
      </p>
      {error && <Notice tone="error">{error}</Notice>}
    </Section>
  );
}

/**
 * Demo organisations only (2026-10-21): lets an administrator of this organisation add an existing user's email so that person can pick this
 * organisation after signing in. The server re-checks every rule (manage-users permission, both organisations are demo, active user).
 */
export function DemoAccessSection({ organizationId }: { organizationId: string }) {
  const [list, setList] = useState<OrganizationAccessList | null>(null);
  const [email, setEmail] = useState("");
  const { saving, error, run } = useSaveState();

  useEffect(() => {
    apiClient.listOrganizationAccess(organizationId).then(setList).catch(() => setList({ isDemo: false, items: [] }));
  }, [organizationId]);

  if (!list || !list.isDemo) return null;

  return (
    <Section
      title="People from other demo organisations"
      hint="Add the email of an existing demo user. After they sign in they can choose this organisation from the picker and work in it with their own permissions. Demo organisations only."
    >
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ minWidth: 280 }}>
          <Field label="Email address">
            <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.org" aria-label="name@example.org" />
          </Field>
        </div>
        <Button
          disabled={saving || !email.trim()}
          onClick={() => run(async () => { setList(await apiClient.addOrganizationAccess(organizationId, email.trim())); setEmail(""); }, "Could not add that email.")}
        >
          Add access
        </Button>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {list.items.length === 0 ? (
        <span style={{ color: "var(--u-ink-secondary)", fontSize: 13 }}>No one from other demo organisations has been added.</span>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
          {list.items.map((g) => (
            <li key={g.grantId} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", fontSize: 14 }}>
              <span>
                <strong>{g.name}</strong> · {g.email} <span style={{ color: "var(--u-ink-secondary)" }}>(from {g.homeOrganizationName}{g.grantedBy ? `, added by ${g.grantedBy}` : ""})</span>
              </span>
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => run(async () => setList(await apiClient.removeOrganizationAccess(organizationId, g.grantId)), "Could not remove access.")}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
