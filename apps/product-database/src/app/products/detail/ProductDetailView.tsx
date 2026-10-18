"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type {
  ProductCatalogDetail,
  ProductAmendmentSummary,
  ProductBatchSummary,
  ProductChangeEntry,
  ProductRegistrationSummary,
  ProductSafetyNoticeSummary,
  WatchMatchSummary,
  ProductExportRestrictionMatch,
  ProductDocumentSummary,
  ProductPriceHistoryPoint,
  ProductSourceApprovalSummary,
  ProductUsageSummary,
  UpdateProductMasterInput,
} from "@universe/types";
import { Button, CalendarIcon, ExternalLinkIcon, HourglassIcon, Pill, StatTile, ThermometerIcon } from "@universe/ui";
import { apiClient } from "../../../lib/apiClient";
import { useCurrentUser } from "../../../lib/AuthContext";
import { useCountries } from "../../../lib/useCountries";

/**
 * Full product page (added 2026-10-18, Product Database completion step 1 — docs/PRODUCT-DATABASE-GAP-ANALYSIS.md).
 * One shareable URL per catalogue entry, with tabs: Record (identity, classification, storage, lifecycle, identifiers,
 * specification), Regulatory (lifecycle and class now; registrations, documents and safety notices arrive in steps 2–4),
 * Sourcing & batches (this organisation's own), Usage (this organisation's own) and History (shared change history plus
 * amendments). Editing follows the catalogue's existing rule: platform staff apply directly; the organisation that added
 * the product proposes an amendment that QA ratifies.
 */

const TABS = ["Record", "Regulatory", "Documents", "Sourcing & batches", "Usage", "History"] as const;
type Tab = (typeof TABS)[number];

const LIFECYCLE: { value: string; label: string; tone: "good" | "neutral" | "warning" | "critical" | "brand" }[] = [
  { value: "DRAFT", label: "Draft", tone: "neutral" },
  { value: "ACTIVE", label: "Active", tone: "good" },
  { value: "RESTRICTED", label: "Restricted", tone: "warning" },
  { value: "DISCONTINUED", label: "Discontinued", tone: "neutral" },
  { value: "WITHDRAWN", label: "Withdrawn", tone: "critical" },
  { value: "RECALLED", label: "Recalled", tone: "critical" },
];
const STORAGE: { value: string; label: string }[] = [
  { value: "AMBIENT", label: "Ambient" },
  { value: "CRT", label: "Controlled room temperature (15–25 °C)" },
  { value: "COOL", label: "Cool (8–15 °C)" },
  { value: "REFRIGERATED", label: "Refrigerated (2–8 °C)" },
  { value: "FROZEN", label: "Frozen (−25 to −15 °C)" },
  { value: "DEEP_FROZEN", label: "Deep frozen (below −60 °C)" },
  { value: "OTHER", label: "Other (see notes)" },
];

export const lifecycleMeta = (v: string) => LIFECYCLE.find((l) => l.value === v) ?? { value: v, label: v, tone: "neutral" as const };
const storageLabel = (v: string | null) => (v ? STORAGE.find((s) => s.value === v)?.label ?? v : null);
export const dateOnly = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB") : null);
const FIELD_LABELS: Record<string, string> = {
  name: "Name", category: "Category", hsCode: "HS code", unspscCode: "UNSPSC code", gtin: "GTIN", standardUnit: "Standard unit",
  canonicalManufacturerPartNumber: "Manufacturer part number", expectedQualityDocumentation: "Expected quality documentation",
  isArchived: "Archived", lifecycleStatus: "Lifecycle status", lifecycleReason: "Lifecycle reason", storageClass: "Storage class",
  coldChain: "Cold chain", shelfLifeMonths: "Shelf life (months)", hazardClass: "Hazard class", controlledSubstance: "Controlled substance",
  inn: "INN", strength: "Strength", dosageForm: "Dosage form", brand: "Brand", packSize: "Pack size", regulatoryClass: "Regulatory class",
  intendedUse: "Intended use", nextReviewDue: "Next review due", "(created)": "Created",
};
const SOURCE_LABELS: Record<string, string> = { CREATE: "Created", STAFF_EDIT: "Platform edit", AMENDMENT_RATIFIED: "Amendment ratified", IMPORT: "Import", SYSTEM: "System" };

const inputStyle: CSSProperties = { padding: "8px 10px", borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-border)", fontSize: 13.5, width: "100%", background: "var(--u-surface-raised)", color: "var(--u-ink)", font: "inherit" };

export function ProductDetailView() {
  const id = useSearchParams()?.get("id") ?? "";
  const me = useCurrentUser();
  const [detail, setDetail] = useState<ProductCatalogDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Record");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateProductMasterInput>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    apiClient.getProductCatalogEntry(id).then(setDetail).catch((e) => setError(e instanceof Error ? e.message : "Failed to load product"));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const isStaff = (me?.platformStaffRole ?? "NONE") !== "NONE";
  const isOwnOrg = Boolean(me && detail && detail.addedByOrganizationId === me.organizationId);
  const canPropose = Boolean(isOwnOrg && me && (me.permissions.includes("projects.edit") || me.permissions.includes("products.approve")));
  const canEdit = isStaff || canPropose;

  function startEdit() {
    if (!detail) return;
    setForm({
      name: detail.name, category: detail.category, brand: detail.brand ?? "", inn: detail.inn ?? "", strength: detail.strength ?? "",
      dosageForm: detail.dosageForm ?? "", packSize: detail.packSize ?? "", standardUnit: detail.standardUnit ?? "",
      intendedUse: detail.intendedUse ?? "", hsCode: detail.hsCode ?? "", unspscCode: detail.unspscCode ?? "", gtin: detail.gtin ?? "",
      canonicalManufacturerPartNumber: detail.canonicalManufacturerPartNumber ?? "", regulatoryClass: detail.regulatoryClass ?? "",
      storageClass: detail.storageClass ?? "", coldChain: detail.coldChain, shelfLifeMonths: detail.shelfLifeMonths ?? undefined,
      hazardClass: detail.hazardClass ?? "", controlledSubstance: detail.controlledSubstance, lifecycleStatus: detail.lifecycleStatus,
      lifecycleReason: detail.lifecycleReason ?? "", nextReviewDue: detail.nextReviewDue ? detail.nextReviewDue.slice(0, 10) : "",
      expectedQualityDocumentation: detail.expectedQualityDocumentation ?? "",
    });
    setEditing(true);
    setNotice(null);
    setError(null);
    setTab("Record");
  }

  /** Only fields that actually changed are sent, so the history and any amendment stay minimal. */
  function changedFields(): UpdateProductMasterInput {
    if (!detail) return {};
    const original: Record<string, unknown> = {
      name: detail.name, category: detail.category, brand: detail.brand ?? "", inn: detail.inn ?? "", strength: detail.strength ?? "",
      dosageForm: detail.dosageForm ?? "", packSize: detail.packSize ?? "", standardUnit: detail.standardUnit ?? "",
      intendedUse: detail.intendedUse ?? "", hsCode: detail.hsCode ?? "", unspscCode: detail.unspscCode ?? "", gtin: detail.gtin ?? "",
      canonicalManufacturerPartNumber: detail.canonicalManufacturerPartNumber ?? "", regulatoryClass: detail.regulatoryClass ?? "",
      storageClass: detail.storageClass ?? "", coldChain: detail.coldChain, shelfLifeMonths: detail.shelfLifeMonths ?? undefined,
      hazardClass: detail.hazardClass ?? "", controlledSubstance: detail.controlledSubstance, lifecycleStatus: detail.lifecycleStatus,
      lifecycleReason: detail.lifecycleReason ?? "", nextReviewDue: detail.nextReviewDue ? detail.nextReviewDue.slice(0, 10) : "",
      expectedQualityDocumentation: detail.expectedQualityDocumentation ?? "",
    };
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v !== original[k]) out[k] = v;
    }
    return out as UpdateProductMasterInput;
  }

  async function save(extra?: UpdateProductMasterInput) {
    if (!detail) return;
    const changes = { ...changedFields(), ...extra };
    if (Object.keys(changes).length === 0) { setEditing(false); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await apiClient.updateProductCatalogEntry(detail.id, changes);
      if (res.status === "PENDING_AMENDMENT") {
        setNotice("Change submitted for QA/RP ratification — the shared record is unchanged until it is reviewed.");
      } else {
        setNotice("Saved. The change is recorded in the history.");
      }
      setEditing(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!id) return <main style={{ padding: 32 }}>No product selected.</main>;
  if (!detail) return <main style={{ padding: 32, color: "var(--u-ink-secondary)" }}>{error ?? "Loading…"}</main>;

  const lc = lifecycleMeta(detail.lifecycleStatus);
  const setF = (k: keyof UpdateProductMasterInput, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <main style={{ padding: "28px 32px 48px", maxWidth: 1180, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 24, color: "var(--u-ink)", margin: 0, overflowWrap: "anywhere" }}>{detail.name}</h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, alignItems: "center" }}>
            <Pill tone="neutral">{detail.category}</Pill>
            <Pill tone={lc.tone}>{lc.label}</Pill>
            {detail.isArchived && <Pill tone="neutral">Archived</Pill>}
            {detail.hasPendingAmendment && <Pill tone="warning">Pending amendment</Pill>}
            {detail.coldChain && <Pill tone="brand">Cold chain</Pill>}
            {detail.controlledSubstance && <Pill tone="warning">Controlled substance</Pill>}
          </div>
          {detail.family && (
            <p style={{ margin: "8px 0 0", fontSize: 13 }}>
              Variant of <Link href={`/families/detail?id=${detail.family.id}`} style={{ fontWeight: 600 }}>{detail.family.name}</Link>
              {detail.variantLabel ? ` — ${detail.variantLabel}` : ""} · {detail.family.variantCount} variant{detail.family.variantCount === 1 ? "" : "s"} in family
            </p>
          )}
          <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--u-ink-secondary)" }}>
            Added by {detail.addedByOrganizationName ?? "Universe reference data"} · version {detail.version} · updated {dateOnly(detail.updatedAt)}
            {detail.sourceStandard ? ` · source ${detail.sourceStandard}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canEdit && !editing && <Button variant="primary" size="sm" onClick={startEdit}>{isStaff ? "Edit record" : "Propose changes"}</Button>}
          {canEdit && !editing && !detail.isArchived && (detail.lifecycleStatus === "ACTIVE" || detail.lifecycleStatus === "DRAFT") && (
            <Button variant="secondary" size="sm" disabled={saving} onClick={() => save({ lifecycleStatus: "DISCONTINUED" })}>
              Mark discontinued
            </Button>
          )}
          {canEdit && !editing && detail.lifecycleStatus === "DISCONTINUED" && (
            <Button variant="secondary" size="sm" disabled={saving} onClick={() => save({ lifecycleStatus: "ACTIVE" })}>
              Reinstate
            </Button>
          )}
          {/* Legacy only: products archived before lifecycle status existed can still be restored. Nothing is ever deleted. */}
          {isStaff && !editing && !detail.family && (
            <Button variant="secondary" size="sm" disabled={saving} onClick={async () => {
              setSaving(true); setError(null);
              try { const f = await apiClient.createFamilyFromProduct(detail.id); window.location.href = `/families/detail?id=${f.id}`; }
              catch (e) { setError(e instanceof Error ? e.message : "Could not create the family."); setSaving(false); }
            }}>Create family from this product</Button>
          )}
          {canEdit && !editing && detail.isArchived && (
            <Button variant="secondary" size="sm" disabled={saving} onClick={() => save({ isArchived: false })}>
              Restore
            </Button>
          )}
        </div>
      </div>

      {notice && <p style={{ color: "var(--u-status-good)", fontWeight: 600, fontSize: 13, margin: "12px 0 0" }}>{notice}</p>}
      {error && <p style={{ color: "var(--u-status-critical)", fontSize: 13, margin: "12px 0 0" }}>{error}</p>}
      {!canEdit && (
        <p style={{ fontSize: 12.5, color: "var(--u-ink-secondary)", margin: "10px 0 0" }}>
          Read-only — only the contributing organisation (or a platform admin) can change this record.
        </p>
      )}
      {detail.lifecycleStatus === "RECALLED" || detail.lifecycleStatus === "WITHDRAWN" ? (
        <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-status-critical)", background: "rgba(208,59,59,0.08)", fontSize: 13 }}>
          <strong style={{ color: "var(--u-status-critical)" }}>{lc.label}</strong>
          {detail.lifecycleReason ? ` — ${detail.lifecycleReason}` : ""}
          {detail.lifecycleChangedAt ? ` (since ${dateOnly(detail.lifecycleChangedAt)})` : ""}
        </div>
      ) : null}

      {/* Key tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginTop: 18 }}>
        <CompletenessTile score={detail.completeness.score} filled={detail.completeness.filled} total={detail.completeness.total} />
        <StatTile label="Storage" value={storageLabel(detail.storageClass)?.split(" (")[0] ?? "Not set"} icon={<ThermometerIcon size={20} />} tone={detail.coldChain ? "brand" : "neutral"} />
        <StatTile label="Shelf life" value={detail.shelfLifeMonths ? `${detail.shelfLifeMonths} months` : "Not set"} icon={<HourglassIcon size={20} />} tone="neutral" />
        <StatTile label="Next review" value={dateOnly(detail.nextReviewDue) ?? "Not scheduled"} icon={<CalendarIcon size={20} />} tone={detail.nextReviewDue && new Date(detail.nextReviewDue) < new Date() ? "warning" : "neutral"} />
      </div>

      {/* Tabs */}
      <div role="tablist" style={{ display: "flex", gap: 4, flexWrap: "wrap", borderBottom: "1px solid var(--u-border)", marginTop: 22 }}>
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            style={{
              padding: "9px 14px", background: "none", border: "none", font: "inherit", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
              color: tab === t ? "var(--u-brand-violet)" : "var(--u-ink-secondary)",
              borderBottom: tab === t ? "2px solid var(--u-brand-violet)" : "2px solid transparent", marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        {tab === "Record" && (editing ? (
          <EditForm form={form} setF={setF} saving={saving} isStaff={isStaff} onSave={() => save()} onCancel={() => setEditing(false)} />
        ) : (
          <RecordTab detail={detail} />
        ))}
        {tab === "Regulatory" && <RegulatoryTab detail={detail} />}
        {tab === "Documents" && <DocumentsTab productId={detail.id} />}
        {tab === "Sourcing & batches" && <SourcingTab productId={detail.id} />}
        {tab === "Usage" && <UsageTab productId={detail.id} />}
        {tab === "History" && <HistoryTab productId={detail.id} />}
      </div>
    </main>
  );
}

/* ---------- small pieces ---------- */

export function Card({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <section style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", background: "var(--u-surface-raised)", padding: "16px 18px" }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "var(--u-ink)" }}>{title}</h3>
      {note && <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--u-ink-secondary)" }}>{note}</p>}
      <div style={{ marginTop: note ? 0 : 10 }}>{children}</div>
    </section>
  );
}

export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "12px 20px" }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ minWidth: 0 }}>
          <dt style={{ fontSize: 11.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>{k}</dt>
          <dd style={{ margin: "2px 0 0", fontSize: 13.5, color: v ? "var(--u-ink)" : "var(--u-ink-secondary)", overflowWrap: "anywhere" }}>{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function CompletenessTile({ score, filled, total }: { score: number; filled: number; total: number }) {
  const color = score >= 80 ? "var(--u-status-good)" : score >= 50 ? "var(--u-status-warning)" : "var(--u-status-critical)";
  return (
    <div style={{ padding: "18px 20px", borderRadius: "var(--u-radius-lg)", border: "1px solid var(--u-border)", background: "var(--u-surface-raised)", display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>Record completeness</span>
      <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--u-font-display)", color: "var(--u-ink)" }}>{score}%</span>
      <span aria-hidden style={{ display: "block", height: 6, borderRadius: 999, background: "var(--u-surface-alt)", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${Math.max(4, score)}%`, background: color, borderRadius: 999 }} />
      </span>
      <span style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>{filled} of {total} fields</span>
    </div>
  );
}

/* ---------- Record tab ---------- */

function RecordTab({ detail }: { detail: ProductCatalogDetail }) {
  const activeIds = detail.identifiers.filter((i) => i.isActive);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card title="Identity">
        <Facts rows={[["Variant", detail.variantLabel], ["Brand", detail.brand], ["INN (generic name)", detail.inn], ["Strength", detail.strength], ["Dosage form", detail.dosageForm], ["Pack size", detail.packSize], ["Standard unit", detail.standardUnit], ["Intended use", detail.intendedUse]]} />
      </Card>
      <Card title="Classification and identifiers">
        <Facts rows={[["HS code", detail.hsCode], ["UNSPSC code", detail.unspscCode], ["GTIN", detail.gtin], ["Manufacturer part number", detail.canonicalManufacturerPartNumber], ["Regulatory class", detail.regulatoryClass]]} />
        {activeIds.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>Other identifiers</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
              {activeIds.map((i) => (<Pill key={i.id} tone="neutral">{i.identifierType.replace("_", "-")}: {i.value}{i.packagingLevel ? ` (${i.packagingLevel.toLowerCase()}${i.unitsPerPack && i.unitsPerPack > 1 ? `, ${i.unitsPerPack} units` : ""})` : i.label ? ` (${i.label})` : ""}</Pill>))}
            </div>
          </div>
        )}
      </Card>
      {detail.family && detail.siblings.length > 0 && (
        <Card title="Other variants in this family" note={`Part of ${detail.family.name}. Registrations and documents held by the family apply to every variant.`}>
          <SimpleTable
            head={["Variant", "Pack size", "GTIN", "Status"]}
            loading={false}
            empty="No other variants."
            rows={detail.siblings.map((v) => [
              <Link key={v.id} href={`/products/detail?id=${v.id}`}>{v.variantLabel ?? v.name}</Link>,
              v.packSize ?? "—",
              v.gtin ?? "—",
              <Pill key={`${v.id}s`} tone={lifecycleMeta(v.lifecycleStatus).tone}>{lifecycleMeta(v.lifecycleStatus).label}</Pill>,
            ])}
          />
        </Card>
      )}
      <Card title="Storage and handling">
        <Facts rows={[["Storage class", storageLabel(detail.storageClass)], ["Cold chain", detail.coldChain ? "Required" : "Not required"], ["Shelf life", detail.shelfLifeMonths ? `${detail.shelfLifeMonths} months` : null], ["Hazard class", detail.hazardClass], ["Controlled substance", detail.controlledSubstance ? "Yes" : "No"]]} />
      </Card>
      <Card title="Quality">
        <Facts rows={[["Expected quality documentation", detail.expectedQualityDocumentation]]} />
        {detail.attributeDefinitions.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>Category specification fields</span>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13 }}>
              {detail.attributeDefinitions.map((a) => (<li key={a.attributeKey}>{a.label} <span style={{ color: "var(--u-ink-secondary)" }}>({a.dataType}{a.required ? ", required" : ""})</span></li>))}
            </ul>
          </div>
        )}
      </Card>
      {detail.completeness.missing.length > 0 && (
        <Card title="Still to complete" note="Fields that apply to this product and are empty.">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{detail.completeness.missing.map((m) => <Pill key={m} tone="warning">{m}</Pill>)}</div>
        </Card>
      )}
    </div>
  );
}

/* ---------- Edit form ---------- */

function EditForm({ form, setF, saving, isStaff, onSave, onCancel }: {
  form: UpdateProductMasterInput; setF: (k: keyof UpdateProductMasterInput, v: unknown) => void; saving: boolean; isStaff: boolean; onSave: () => void; onCancel: () => void;
}) {
  const text = (k: keyof UpdateProductMasterInput, label: string, span?: boolean) => (
    <Field label={label} span={span}><input style={inputStyle} value={(form[k] as string | undefined) ?? ""} onChange={(e) => setF(k, e.target.value)} /></Field>
  );
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <p style={{ margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" }}>
        {isStaff ? "Changes apply immediately and are recorded in the history." : "Your changes are submitted for QA/RP ratification before they take effect on the shared record."} Leave a text field empty to clear it.
      </p>
      <Card title="Identity">
        <FieldGrid>
          {text("name", "Name")}{text("category", "Category")}{text("brand", "Brand")}{text("inn", "INN (generic name)")}{text("strength", "Strength")}{text("dosageForm", "Dosage form")}{text("packSize", "Pack size")}{text("standardUnit", "Standard unit")}
          <Field label="Intended use" span><textarea style={{ ...inputStyle, minHeight: 60 }} value={form.intendedUse ?? ""} onChange={(e) => setF("intendedUse", e.target.value)} /></Field>
        </FieldGrid>
      </Card>
      <Card title="Classification and identifiers">
        <FieldGrid>{text("hsCode", "HS code")}{text("unspscCode", "UNSPSC code")}{text("gtin", "GTIN")}{text("canonicalManufacturerPartNumber", "Manufacturer part number")}{text("regulatoryClass", "Regulatory class")}</FieldGrid>
      </Card>
      <Card title="Storage and handling">
        <FieldGrid>
          <Field label="Storage class">
            <select style={inputStyle} value={form.storageClass ?? ""} onChange={(e) => setF("storageClass", e.target.value)}>
              <option value="">Not set</option>{STORAGE.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Shelf life (months)"><input type="number" min={1} max={600} style={inputStyle} value={form.shelfLifeMonths ?? ""} onChange={(e) => setF("shelfLifeMonths", e.target.value === "" ? undefined : Number(e.target.value))} /></Field>
          {text("hazardClass", "Hazard class (e.g. UN3373 Cat. B)")}
          <Check label="Cold chain required" checked={Boolean(form.coldChain)} onChange={(v) => setF("coldChain", v)} />
          <Check label="Controlled substance" checked={Boolean(form.controlledSubstance)} onChange={(v) => setF("controlledSubstance", v)} />
        </FieldGrid>
      </Card>
      <Card title="Lifecycle and review">
        <FieldGrid>
          <Field label="Lifecycle status">
            <select style={inputStyle} value={form.lifecycleStatus ?? "ACTIVE"} onChange={(e) => setF("lifecycleStatus", e.target.value)}>
              {LIFECYCLE.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </Field>
          {text("lifecycleReason", "Reason for status")}
          <Field label="Next review due"><input type="date" style={inputStyle} value={form.nextReviewDue ?? ""} onChange={(e) => setF("nextReviewDue", e.target.value)} /></Field>
        </FieldGrid>
      </Card>
      <Card title="Quality">
        <Field label="Expected quality documentation" span><textarea style={{ ...inputStyle, minHeight: 80 }} value={form.expectedQualityDocumentation ?? ""} onChange={(e) => setF("expectedQualityDocumentation", e.target.value)} /></Field>
      </Card>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={onSave} disabled={saving}>{saving ? "Saving…" : isStaff ? "Save changes" : "Submit for ratification"}</Button>
      </div>
    </div>
  );
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(230px, 100%), 1fr))", gap: 12 }}>{children}</div>;
}
function Field({ label, span, children }: { label: string; span?: boolean; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: span ? "1 / -1" : undefined }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--u-ink-secondary)" }}>{label}</span>
      {children}
    </label>
  );
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, paddingTop: 18 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}

/* ---------- Regulatory tab ---------- */

const AUTHORITIES: [string, string][] = [
  ["WHO_PQ", "WHO prequalification"], ["WHO_EUL", "WHO emergency use listing"], ["FDA", "US FDA"], ["EU_CE", "EU CE mark"],
  ["EU_MDR", "EU MDR"], ["EU_IVDR", "EU IVDR"], ["EMA", "EMA"], ["MHRA", "UK MHRA"], ["SRA", "Stringent regulatory authority"],
  ["NATIONAL", "National registration"], ["OTHER", "Other"],
];
const authorityLabel = (a: string) => AUTHORITIES.find(([k]) => k === a)?.[1] ?? a;
const regTone = (s: string): "good" | "warning" | "critical" | "neutral" =>
  s === "ACTIVE" ? "good" : s === "PENDING" ? "neutral" : s === "EXPIRED" || s === "SUSPENDED" || s === "WITHDRAWN" || s === "REFUSED" ? "critical" : "neutral";

/* ---------- Safety notices (step 4) ---------- */

const NOTICE_TYPES: [string, string][] = [["RECALL", "Recall"], ["FIELD_SAFETY_NOTICE", "Field safety notice"], ["SAFETY_ALERT", "Safety alert"], ["FALSIFIED_ALERT", "Falsified / substandard alert"], ["SUPPLY_ALERT", "Supply alert"]];
const SEVERITIES: [string, string][] = [["CRITICAL", "Critical (class I)"], ["HIGH", "High (class II)"], ["MEDIUM", "Medium (class III)"], ["LOW", "Advisory"]];
const noticeTypeLabel = (t: string) => NOTICE_TYPES.find(([k]) => k === t)?.[1] ?? t;
const severityTone = (s: string): "critical" | "warning" | "neutral" => (s === "CRITICAL" ? "critical" : s === "HIGH" || s === "MEDIUM" ? "warning" : "neutral");
const REVIEW_LABELS: Record<string, string> = { CHECKED_NO_IMPACT: "Checked, no impact", NOT_APPLICABLE: "Not applicable to us", ACTION_TAKEN: "Action taken", AFFECTED: "We are affected" };
const NOTICE_AUTHORITIES: [string, string][] = [...AUTHORITIES.filter(([k]) => k !== "OTHER"), ["MANUFACTURER", "Manufacturer"], ["OTHER", "Other"]];

export function SafetyNoticesCard({ detail, familyId }: { detail?: ProductCatalogDetail; familyId?: string }) {
  const user = useCurrentUser();
  const [items, setItems] = useState<ProductSafetyNoticeSummary[] | null>(null);
  const [watch, setWatch] = useState<WatchMatchSummary[]>([]);
  const [restrictions, setRestrictions] = useState<ProductExportRestrictionMatch[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [closing, setClosing] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ noticeType: "RECALL", severity: "HIGH", authority: "FDA" });
  const [rform, setRform] = useState<Record<string, string>>({ outcome: "CHECKED_NO_IMPACT" });
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const perms: string[] = ((user as unknown as { permissions?: string[] })?.permissions) ?? [];
  const isStaff = !!(user as unknown as { platformStaffRole?: string })?.platformStaffRole && (user as unknown as { platformStaffRole?: string }).platformStaffRole !== "NONE";
  const canManage = isStaff || perms.includes("products.approve");
  const load = useCallback(() => {
    (familyId ? apiClient.listFamilySafetyNotices(familyId, true) : apiClient.listProductSafetyNotices(detail!.id, true)).then(setItems).catch((e) => setErr(e instanceof Error ? e.message : "Could not load safety notices."));
  }, [detail, familyId]);
  useEffect(load, [load]);
  useEffect(() => { if (detail && !familyId) apiClient.listProductWatchMatches(detail.id).then(setWatch).catch(() => setWatch([])); }, [detail, familyId]);
  useEffect(() => { if (detail && !familyId) apiClient.listProductExportRestrictions(detail.id).then(setRestrictions).catch(() => setRestrictions([])); }, [detail, familyId]);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); load(); setAdding(false); setReviewing(null); setClosing(null); setReason(""); } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(false); }
  };
  const input: CSSProperties = { padding: "6px 8px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-sm)", fontSize: 13, width: "100%", boxSizing: "border-box" };
  const f = (k: string, label: string, type = "text") => (
    <label key={k} style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>{label}
      <input type={type} style={input} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </label>
  );
  const openCount = items?.filter((n) => n.status === "OPEN" && !n.isArchived).length ?? 0;

  return (
    <Card title="Safety notices and recalls" note="The notice is shared, so every organisation sees the same record. Your review below is private to your organisation. Saving a notice alerts the QA team of every organisation that uses the product.">
      {err && <p style={{ color: "var(--u-status-critical)", fontSize: 13 }}>{err}</p>}
      {restrictions.length > 0 && (
        <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-status-critical)", fontSize: 13 }}>
          <strong>Export and hoarding restriction applies to this medicine</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {restrictions.map((m) => (
              <li key={m.restriction.id}>
                {m.restriction.restrictingCountryCode}: {m.restriction.medicineName}{m.restriction.strength && m.restriction.strength !== "All" ? ` ${m.restriction.strength}` : ""}{m.restriction.form && m.restriction.form !== "All" ? `, ${m.restriction.form}` : ""}
                {m.restriction.restrictionDate ? ` — listed ${dateOnly(m.restriction.restrictionDate)}` : ""}{" "}
                {m.certainty === "CHECK" ? <Pill tone="warning">check: {m.detail}</Pill> : null}
                {m.restriction.sourceUrl ? <> — <a href={m.restriction.sourceUrl} target="_blank" rel="noopener noreferrer">source</a></> : null}
              </li>
            ))}
          </ul>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--u-ink-secondary)" }}>An initial check only. Goods supplied from the restricting country cannot be exported or hoarded; the legal duty stays with the licence holder. Project lines sourced from that country and delivered elsewhere are flagged.</p>
        </div>
      )}
      {watch.filter((w) => w.status === "PENDING").length > 0 && (
        <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-status-warning, #b7791f)", fontSize: 13 }}>
          <strong>Potential alert from the regulatory watch (advisory, awaiting platform review)</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {watch.filter((w) => w.status === "PENDING").map((w) => (
              <li key={w.id}>{w.item.authority}: {w.item.title}{w.item.url ? <> — <a href={w.item.url} target="_blank" rel="noopener noreferrer">source</a></> : null} <span style={{ color: "var(--u-ink-secondary)" }}>({w.matchDetail})</span></li>
            ))}
          </ul>
        </div>
      )}
      {items === null ? <p style={{ fontSize: 13 }}>Loading…</p> : items.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--u-ink-secondary)", margin: 0 }}>
          No safety notices or recalls recorded for this product. The regulatory watch checks openFDA and MHRA daily, but it is advisory and covers only those sources, so an empty list is not a clearance.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {openCount === 0 && <p style={{ fontSize: 13, color: "var(--u-ink-secondary)", margin: 0 }}>No open notices. Closed and archived notices are shown below.</p>}
          {items.map((n) => (
            <div key={n.id} style={{ border: `1px solid ${n.status === "OPEN" && n.severity === "CRITICAL" ? "var(--u-status-critical)" : "var(--u-border)"}`, borderRadius: "var(--u-radius-md)", padding: 12, opacity: n.isArchived || n.status === "CLOSED" ? 0.7 : 1 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <strong style={{ fontSize: 14 }}>{n.title}</strong>
                  <Pill tone={severityTone(n.severity)}>{SEVERITIES.find(([k]) => k === n.severity)?.[1] ?? n.severity}</Pill>
                  <Pill tone="neutral">{noticeTypeLabel(n.noticeType)}</Pill>
                  <Pill tone={n.status === "OPEN" ? "warning" : "good"}>{n.status === "OPEN" ? "Open" : "Closed"}</Pill>
                  {n.isArchived && <Pill tone="neutral">Archived</Pill>}
                  {n.inherited && <Pill tone="brand">Applies via family</Pill>}
                  {!n.inherited && familyId && n.productMasterId && <Pill tone="brand">{n.productName}</Pill>}
                </div>
                {n.sourceUrl && <a href={n.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>View source <ExternalLinkIcon size={13} /></span></a>}
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--u-ink-secondary)" }}>
                {[n.authority === "MANUFACTURER" ? "Manufacturer" : authorityLabel(n.authority), n.referenceNumber, `Issued ${dateOnly(n.issueDate)}`, n.countryCodes ? `Countries: ${n.countryCodes.split(",").join(", ")}` : "Worldwide / not stated"].filter(Boolean).join(" · ")}
                {n.contributedByOrganizationName ? ` · Recorded by ${n.contributedByOrganizationName}` : ""}
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 13 }}>{n.summary}</p>
              {n.actionRequired && <p style={{ margin: "6px 0 0", fontSize: 13 }}><strong>Action required:</strong> {n.actionRequired}</p>}
              {n.affectedBatches && <p style={{ margin: "6px 0 0", fontSize: 13 }}><strong>Affected batches:</strong> {n.affectedBatches}</p>}
              {n.status === "CLOSED" && <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Closed {dateOnly(n.closedDate)}{n.closedReason ? ` — ${n.closedReason}` : ""}</p>}
              <div style={{ marginTop: 8, fontSize: 12.5, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {n.myReview ? (
                  <span>
                    <Pill tone={n.myReview.outcome === "AFFECTED" ? "critical" : n.myReview.outcome === "ACTION_TAKEN" ? "warning" : n.myReview.outcome === "CHECKED_NO_IMPACT" ? "good" : "neutral"}>{REVIEW_LABELS[n.myReview.outcome] ?? n.myReview.outcome}</Pill>{" "}
                    by {n.myReview.reviewedByName} on {dateOnly(n.myReview.reviewedAt)}{n.myReview.notes ? ` — ${n.myReview.notes}` : ""}
                  </span>
                ) : n.status === "OPEN" ? <span style={{ color: "var(--u-status-critical)" }}>Not yet reviewed by your organisation.</span> : <span style={{ color: "var(--u-ink-secondary)" }}>Not reviewed by your organisation.</span>}
                {canManage && !n.isArchived && n.status === "OPEN" && <Button variant="secondary" size="sm" onClick={() => { setReviewing(n.id); setRform({ outcome: "CHECKED_NO_IMPACT" }); }}>Record our review</Button>}
                {isStaff && !n.isArchived && n.status === "OPEN" && <Button variant="secondary" size="sm" onClick={() => setClosing(n.id)}>Close notice</Button>}
                {isStaff && n.status === "CLOSED" && !n.isArchived && <Button variant="secondary" size="sm" disabled={busy} onClick={() => run(() => apiClient.updateSafetyNotice(n.id, { status: "OPEN" }))}>Reopen</Button>}
                {isStaff && <Button variant="secondary" size="sm" disabled={busy} onClick={() => run(() => apiClient.updateSafetyNotice(n.id, { isArchived: !n.isArchived }))}>{n.isArchived ? "Restore" : "Archive"}</Button>}
              </div>
              {reviewing === n.id && (
                <div style={{ marginTop: 10, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                  <label style={{ fontSize: 12 }}>Outcome
                    <select style={input} value={rform.outcome} onChange={(e) => setRform({ ...rform, outcome: e.target.value })}>
                      {Object.entries(REVIEW_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 12, gridColumn: "1 / -1" }}>Notes {rform.outcome !== "CHECKED_NO_IMPACT" ? "(required)" : ""}
                    <input style={input} value={rform.notes ?? ""} onChange={(e) => setRform({ ...rform, notes: e.target.value })} />
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button variant="primary" size="sm" disabled={busy} onClick={() => run(() => apiClient.reviewSafetyNotice(n.id, rform as never))}>Save review</Button>
                    <Button variant="secondary" size="sm" onClick={() => setReviewing(null)}>Cancel</Button>
                  </div>
                </div>
              )}
              {closing === n.id && (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  <label style={{ fontSize: 12 }}>Reason for closing (required)
                    <input style={input} value={reason} onChange={(e) => setReason(e.target.value)} />
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button variant="primary" size="sm" disabled={busy || !reason.trim()} onClick={() => run(() => apiClient.updateSafetyNotice(n.id, { status: "CLOSED", closedReason: reason }))}>Close notice</Button>
                    <Button variant="secondary" size="sm" onClick={() => setClosing(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {canManage && !adding && <div style={{ marginTop: 12 }}><Button variant="primary" size="sm" onClick={() => setAdding(true)}>Record safety notice</Button></div>}
      {adding && (
        <div style={{ marginTop: 12, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <label style={{ fontSize: 12 }}>Type
            <select style={input} value={form.noticeType} onChange={(e) => setForm({ ...form, noticeType: e.target.value })}>{NOTICE_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </label>
          <label style={{ fontSize: 12 }}>Severity
            <select style={input} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>{SEVERITIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </label>
          <label style={{ fontSize: 12 }}>Issued by
            <select style={input} value={form.authority} onChange={(e) => setForm({ ...form, authority: e.target.value })}>{NOTICE_AUTHORITIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </label>
          {f("referenceNumber", "Reference number")}{f("issueDate", "Issue date", "date")}{f("countryCodes", "Countries (e.g. GB, KE) — blank = worldwide")}
          {f("title", "Title")}{f("sourceUrl", "Source link")}
          <label style={{ fontSize: 12, gridColumn: "1 / -1" }}>Summary
            <textarea style={{ ...input, minHeight: 64 }} value={form.summary ?? ""} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          </label>
          <label style={{ fontSize: 12, gridColumn: "1 / -1" }}>Action required
            <textarea style={{ ...input, minHeight: 48 }} value={form.actionRequired ?? ""} onChange={(e) => setForm({ ...form, actionRequired: e.target.value })} />
          </label>
          <label style={{ fontSize: 12, gridColumn: "1 / -1" }}>Affected batches
            <input style={input} value={form.affectedBatches ?? ""} onChange={(e) => setForm({ ...form, affectedBatches: e.target.value })} />
          </label>
          <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
            <Button variant="primary" size="sm" disabled={busy || !form.title || !form.summary || !form.issueDate} onClick={() => run(() => (familyId ? apiClient.createFamilySafetyNotice(familyId, form as never) : apiClient.createProductSafetyNotice(detail!.id, form as never)))}>Save notice</Button>
            <Button variant="secondary" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function RegulatoryTab({ detail, familyId }: { detail?: ProductCatalogDetail; familyId?: string }) {
  const user = useCurrentUser();
  const lc = detail ? lifecycleMeta(detail.lifecycleStatus) : null;
  const [regs, setRegs] = useState<ProductRegistrationSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ authority: "WHO_PQ" });
  const [vform, setVform] = useState<Record<string, string>>({ outcome: "VERIFIED" });
  const [busy, setBusy] = useState(false);
  const perms: string[] = ((user as unknown as { permissions?: string[] })?.permissions) ?? [];
  const isStaff = !!(user as unknown as { platformStaffRole?: string })?.platformStaffRole && (user as unknown as { platformStaffRole?: string }).platformStaffRole !== "NONE";
  const canAdd = isStaff || perms.includes("projects.edit") || perms.includes("products.approve");
  const canVerify = isStaff || perms.includes("products.approve");

  const load = useCallback(() => {
    (familyId ? apiClient.listFamilyRegistrations(familyId, true) : apiClient.listProductRegistrations(detail!.id, true)).then(setRegs).catch((e) => setErr(e instanceof Error ? e.message : "Could not load registrations."));
  }, [detail, familyId]);
  useEffect(load, [load]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); load(); setAdding(false); setVerifying(null); } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(false); }
  };
  const input: CSSProperties = { padding: "6px 8px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-sm)", fontSize: 13, width: "100%", boxSizing: "border-box" };
  const f = (k: string, label: string, type = "text") => (
    <label key={k} style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>{label}
      <input type={type} style={input} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </label>
  );
  const comp = detail?.compliance;
  const compColor = !comp ? "var(--u-border)" : comp.status === "BLOCKED" ? "var(--u-status-critical)" : comp.status === "WARNING" ? "var(--u-status-warning, #b7791f)" : "var(--u-status-good)";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {comp && <div style={{ padding: "10px 14px", borderRadius: "var(--u-radius-md)", border: `1px solid ${compColor}`, fontSize: 13 }}>
        <strong style={{ color: compColor }}>{comp.status === "OK" ? "Active registration on record" : comp.status === "WARNING" ? "Attention needed" : "Blocked pending review"}</strong>
        {comp.reasons.length > 0 && <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{comp.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--u-ink-secondary)" }}>
          Based on recorded registrations, lifecycle and open safety notices. The daily regulatory watch covers openFDA and MHRA only and is advisory, so this is not a clearance.
        </p>
      </div>}

      <Card title="Registrations" note={familyId ? "Apply to every variant in this family. Shared facts, visible to every organisation. Your verification below is private to your organisation." : "Shared facts, visible to every organisation. Your verification below is private to your organisation. Registrations held by the product family also apply here."}>
        {err && <p style={{ color: "var(--u-status-critical)", fontSize: 13 }}>{err}</p>}
        {regs === null ? <p style={{ fontSize: 13 }}>Loading…</p> : regs.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--u-ink-secondary)", margin: 0 }}>No registrations recorded for this product yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {regs.map((r) => (
              <div key={r.id} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 12, opacity: r.isArchived ? 0.6 : 1 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    <strong style={{ fontSize: 14 }}>{authorityLabel(r.authority)}</strong>
                    <span style={{ fontSize: 13 }}>{r.referenceNumber}</span>
                    <Pill tone={regTone(r.effectiveStatus)}>{r.effectiveStatus.toLowerCase()}</Pill>
                    {r.verificationLevel === "SOURCE_VERIFIED" && <Pill tone="brand">Source verified</Pill>}
                    {r.isArchived && <Pill tone="neutral">Archived</Pill>}
                    {r.inherited && <Pill tone="brand">Applies via family</Pill>}
                  </div>
                  {r.sourceUrl && <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>View source <ExternalLinkIcon size={13} /></span></a>}
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--u-ink-secondary)" }}>
                  {[r.scheme, r.regulatoryClass && `Class ${r.regulatoryClass}`, r.countryCode, r.holderName && `Holder: ${r.holderName}`].filter(Boolean).join(" · ") || "—"}
                  {" · "}Issued {dateOnly(r.issueDate)} · Expires {r.expiryDate ? `${dateOnly(r.expiryDate)}${r.daysToExpiry !== null && r.daysToExpiry >= 0 && r.daysToExpiry <= 90 ? ` (${r.daysToExpiry} days)` : ""}` : "no expiry recorded"}
                  {r.contributedByOrganizationName ? ` · Added by ${r.contributedByOrganizationName}` : ""}
                </p>
                <div style={{ marginTop: 8, fontSize: 12.5, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  {r.myVerification ? (
                    <span>
                      <Pill tone={r.myVerification.outcome === "VERIFIED" ? "good" : r.myVerification.outcome === "ISSUE_FOUND" ? "critical" : "neutral"}>
                        {r.myVerification.outcome === "VERIFIED" ? "Checked and verified" : r.myVerification.outcome === "ISSUE_FOUND" ? "Issue found" : "Not applicable"}
                      </Pill>{" "}
                      by {r.myVerification.verifiedByName} on {dateOnly(r.myVerification.verifiedAt)}
                      {r.myVerification.jurisdiction ? ` (${r.myVerification.jurisdiction})` : ""}
                      {r.myVerification.notes ? ` — ${r.myVerification.notes}` : ""}
                    </span>
                  ) : <span style={{ color: "var(--u-ink-secondary)" }}>Not yet verified by your organisation.</span>}
                  {canVerify && !r.isArchived && <Button variant="secondary" size="sm" onClick={() => { setVerifying(r.id); setVform({ outcome: "VERIFIED" }); }}>Record verification</Button>}
                  {isStaff && !r.inherited && (
                    <Button variant="secondary" size="sm" disabled={busy} onClick={() => run(() => apiClient.updateProductRegistration(r.id, { isArchived: !r.isArchived }))}>
                      {r.isArchived ? "Restore" : "Retire"}
                    </Button>
                  )}
                </div>
                {verifying === r.id && (
                  <div style={{ marginTop: 10, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                    <label style={{ fontSize: 12 }}>Outcome
                      <select style={input} value={vform.outcome} onChange={(e) => setVform({ ...vform, outcome: e.target.value })}>
                        <option value="VERIFIED">Checked and verified</option>
                        <option value="NOT_APPLICABLE">Not applicable to us</option>
                        <option value="ISSUE_FOUND">Issue found / action taken</option>
                      </select>
                    </label>
                    <label style={{ fontSize: 12 }}>Jurisdiction
                      <input style={input} value={vform.jurisdiction ?? ""} onChange={(e) => setVform({ ...vform, jurisdiction: e.target.value })} />
                    </label>
                    <label style={{ fontSize: 12 }}>Re-verify by
                      <input type="date" style={input} value={vform.nextReverificationDue ?? ""} onChange={(e) => setVform({ ...vform, nextReverificationDue: e.target.value })} />
                    </label>
                    <label style={{ fontSize: 12, gridColumn: "1 / -1" }}>Notes {vform.outcome !== "VERIFIED" ? "(required)" : ""}
                      <input style={input} value={vform.notes ?? ""} onChange={(e) => setVform({ ...vform, notes: e.target.value })} />
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button variant="primary" size="sm" disabled={busy} onClick={() => run(() => apiClient.verifyProductRegistration(r.id, vform as never))}>Save verification</Button>
                      <Button variant="secondary" size="sm" onClick={() => setVerifying(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {canAdd && !adding && <div style={{ marginTop: 12 }}><Button variant="primary" size="sm" onClick={() => setAdding(true)}>Add registration</Button></div>}
        {adding && (
          <div style={{ marginTop: 12, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <label style={{ fontSize: 12 }}>Authority
              <select style={input} value={form.authority} onChange={(e) => setForm({ ...form, authority: e.target.value })}>
                {AUTHORITIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            {f("referenceNumber", "Reference number")}{f("scheme", "Scheme / pathway")}{f("regulatoryClass", "Class")}
            {f("countryCode", "Country (2-letter)")}{f("holderName", "Holder")}{f("issueDate", "Issue date", "date")}{f("expiryDate", "Expiry date", "date")}
            {f("sourceUrl", "Source link")}
            <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
              <Button variant="primary" size="sm" disabled={busy || !form.referenceNumber} onClick={() => run(() => (familyId ? apiClient.createFamilyRegistration(familyId, form as never) : apiClient.createProductRegistration(detail!.id, form as never)))}>Save registration</Button>
              <Button variant="secondary" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </Card>

      <SafetyNoticesCard detail={detail} familyId={familyId} />

      {detail && lc && (<>
      <Card title="Current status">
        <Facts rows={[
          ["Lifecycle status", <Pill key="l" tone={lc.tone}>{lc.label}</Pill>],
          ["Reason", detail.lifecycleReason],
          ["Status changed", dateOnly(detail.lifecycleChangedAt)],
          ["Regulatory class", detail.regulatoryClass],
          ["Controlled substance", detail.controlledSubstance ? "Yes" : "No"],
          ["Hazard class", detail.hazardClass],
        ]} />
      </Card>

      </>)}
    </div>
  );
}

const DOC_TYPES: [string, string][] = [
  ["CERTIFICATE", "Certificate"], ["IFU", "Instructions for use"], ["LABELLING", "Labelling"], ["SDS", "Safety data sheet"], ["SPECIFICATION", "Specification"],
  ["COA_TEMPLATE", "CoA template"], ["TEST_REPORT", "Test report"], ["TECHNICAL_FILE", "Technical file"], ["OTHER", "Other"],
];
const ACCEPT = ".pdf,.png,.jpg,.jpeg,.txt,.csv,.docx,.xlsx";

export function DocumentsTab({ productId, familyId }: { productId?: string; familyId?: string }) {
  const user = useCurrentUser();
  const [docs, setDocs] = useState<ProductDocumentSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<Record<string, string>>({ docType: "CERTIFICATE", version: "1.0" });
  const [busy, setBusy] = useState(false);
  const perms: string[] = user?.permissions ?? [];
  const staff = !!user && user.platformStaffRole !== "NONE";
  const canWrite = staff || perms.includes("projects.edit") || perms.includes("products.approve");
  const canApprove = staff || perms.includes("products.approve");
  const load = useCallback(() => { (familyId ? apiClient.listFamilyDocuments(familyId) : apiClient.listProductDocuments(productId!)).then(setDocs).catch((e) => setErr(e instanceof Error ? e.message : "Could not load documents.")); }, [productId, familyId]);
  useEffect(load, [load]);
  const input: CSSProperties = { padding: "6px 8px", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-sm)", fontSize: 13, width: "100%", boxSizing: "border-box" };
  const f = (k: string, label: string, type = "text") => (
    <label key={k} style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>{label}
      <input type={type} style={input} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </label>
  );
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setErr(null);
    try { await fn(); load(); } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(false); }
  };
  const save = () => run(async () => {
    let blobName: string | undefined;
    if (file) {
      const upload = { fileName: file.name, contentType: file.type, fileSizeBytes: file.size };
      const { uploadUrl, blobName: bn } = await (familyId ? apiClient.requestFamilyDocumentUpload(familyId, upload) : apiClient.requestProductDocumentUpload(productId!, upload));
      await apiClient.uploadDocumentFile(uploadUrl, file);
      blobName = bn;
    }
    const body = { ...form, docType: form.docType, title: form.title, blobName, fileName: file?.name } as never;
    await (familyId ? apiClient.createFamilyDocument(familyId, body) : apiClient.createProductDocument(productId!, body));
    setAdding(false); setFile(null); setForm({ docType: "CERTIFICATE", version: "1.0" });
  });
  const open = (id: string) => run(async () => { const { downloadUrl } = await apiClient.getProductDocumentDownloadUrl(id); window.open(downloadUrl, "_blank", "noopener,noreferrer"); });
  const typeLabel = (t: string) => DOC_TYPES.find(([k]) => k === t)?.[1] ?? t;
  const size = (b: number | null) => (b === null ? "" : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card title="Controlled documents" note="Private to your organisation. Approval needs a second person (QA). New versions supersede older ones; nothing is deleted.">
        {err && <p style={{ color: "var(--u-status-critical)", fontSize: 13 }}>{err}</p>}
        {docs === null ? <p style={{ fontSize: 13 }}>Loading…</p> : docs.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--u-ink-secondary)", margin: 0 }}>No documents recorded for this product by your organisation yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {docs.map((d) => (
              <div key={d.id} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 12, opacity: d.status === "SUPERSEDED" ? 0.65 : 1 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <strong style={{ fontSize: 14 }}>{d.title}</strong>
                  <Pill tone="neutral">{typeLabel(d.docType)}</Pill>
                  <span style={{ fontSize: 12.5 }}>v{d.version}</span>
                  <Pill tone={d.status === "APPROVED" ? "good" : d.status === "DRAFT" ? "warning" : "neutral"}>{d.status.toLowerCase()}</Pill>
                  {d.inherited && <Pill tone="brand">Applies via family</Pill>}
                  {d.isExpired && <Pill tone="critical">expired</Pill>}
                  {!d.isExpired && d.daysToExpiry !== null && d.daysToExpiry <= 90 && d.status === "APPROVED" && <Pill tone="warning">expires in {d.daysToExpiry} days</Pill>}
                  {d.hasFile && d.scanStatus === "CLEAN" && <Pill tone="good">Scanned: clear</Pill>}
                  {d.hasFile && d.scanStatus === "NOT_SCANNED" && <Pill tone="neutral">Not scanned</Pill>}
                  {d.scanStatus === "INFECTED" && <Pill tone="critical">Failed malware scan</Pill>}
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--u-ink-secondary)" }}>
                  Effective {dateOnly(d.effectiveDate)} · Expires {d.expiryDate ? dateOnly(d.expiryDate) : "no expiry"} · Review due {dateOnly(d.reviewDueDate)}
                  {" · "}Uploaded by {d.uploadedByName} on {dateOnly(d.uploadedAt)}{d.approvedByName ? ` · Approved by ${d.approvedByName} on ${dateOnly(d.approvedAt)}` : ""}
                  {d.fileName ? ` · ${d.fileName} ${size(d.fileSizeBytes)}` : " · no file stored"}
                </p>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {d.hasFile && d.scanStatus !== "INFECTED" && <Button variant="secondary" size="sm" disabled={busy} onClick={() => open(d.id)}>Open file</Button>}
                  {canApprove && d.status === "DRAFT" && <Button variant="primary" size="sm" disabled={busy} onClick={() => run(() => apiClient.approveProductDocument(d.id))}>Approve</Button>}
                  {canWrite && d.status === "APPROVED" && <Button variant="secondary" size="sm" disabled={busy} onClick={() => { setAdding(true); setForm({ docType: d.docType, title: d.title, version: "", supersedesId: d.id, registrationId: d.registrationId ?? "" }); }}>New version</Button>}
                  {canWrite && <Button variant="secondary" size="sm" disabled={busy} onClick={() => run(() => apiClient.archiveProductDocument(d.id))}>Archive</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
        {canWrite && !adding && <div style={{ marginTop: 12 }}><Button variant="primary" size="sm" onClick={() => setAdding(true)}>Add document</Button></div>}
        {adding && (
          <div style={{ marginTop: 12, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <label style={{ fontSize: 12 }}>Type
              <select style={input} value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value })}>
                {DOC_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            {f("title", "Title")}{f("version", "Version")}{f("effectiveDate", "Effective date", "date")}{f("expiryDate", "Expiry date", "date")}{f("reviewDueDate", "Review due", "date")}
            <label style={{ fontSize: 12, gridColumn: "1 / -1" }}>File (PDF, image, Word, Excel, text or CSV; up to 25 MB)
              <input type="file" accept={ACCEPT} style={input} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
              <Button variant="primary" size="sm" disabled={busy || !form.title} onClick={save}>Save as draft</Button>
              <Button variant="secondary" size="sm" onClick={() => { setAdding(false); setFile(null); }}>Cancel</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------- Sourcing & batches tab ---------- */

function SourcingTab({ productId }: { productId: string }) {
  const countries = useCountries();
  const [sourcing, setSourcing] = useState<ProductSourceApprovalSummary[] | null>(null);
  const [batches, setBatches] = useState<ProductBatchSummary[] | null>(null);
  const [prices, setPrices] = useState<ProductPriceHistoryPoint[] | null>(null);
  useEffect(() => {
    apiClient.listProductSourceApprovals(undefined, productId).then(setSourcing).catch(() => setSourcing([]));
    apiClient.searchProductBatchesPage({ productMasterId: productId, page: 1, pageSize: 25 }).then((r) => setBatches(r.items)).catch(() => setBatches([]));
    apiClient.getProductPriceHistory(productId).then(setPrices).catch(() => setPrices([]));
  }, [productId]);
  const cname = (code: string | null) => (code ? countries.find((c) => c.code === code)?.name ?? code : null);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card title="Your organisation's sourcing" note="Manufacturer and supplier approvals recorded by your organisation.">
        <SimpleTable
          empty="No approved sources recorded for this product yet."
          head={["Manufacturer", "Supplier", "Status", "Review due"]}
          rows={(sourcing ?? []).map((s) => [
            <>{s.manufacturerName}{s.manufacturerCountryCode ? <span style={{ color: "var(--u-ink-secondary)" }}> — {cname(s.manufacturerCountryCode)}</span> : null}</>,
            s.supplierName ? <>{s.supplierName}{s.supplierCountryCode ? ` — ${cname(s.supplierCountryCode)}` : ""}</> : "—",
            s.status,
            dateOnly(s.nextReviewDue) ?? "—",
          ])}
          loading={sourcing === null}
        />
      </Card>
      <Card title="Your organisation's batches">
        <SimpleTable
          empty="No batches recorded for this product."
          head={["Batch", "Manufacturer", "Expiry", "Status"]}
          rows={(batches ?? []).map((b) => [b.batchNumber, b.manufacturerName ?? "—", dateOnly(b.expiryDate) ?? "—", b.status])}
          loading={batches === null}
        />
      </Card>
      <Card title="Price history" note="Your organisation's recorded prices only.">
        <SimpleTable
          empty="No prices recorded."
          head={["Date", "Unit price", "Currency", "Recorded by"]}
          rows={[...(prices ?? [])].reverse().map((p) => [dateOnly(p.effectiveDate) ?? "—", String(p.unitPrice), p.currency, p.recordedByName ?? "—"])}
          loading={prices === null}
        />
      </Card>
    </div>
  );
}

/* ---------- Usage tab ---------- */

function UsageTab({ productId }: { productId: string }) {
  const [usage, setUsage] = useState<ProductUsageSummary | null>(null);
  useEffect(() => { apiClient.getProductUsage(productId).then(setUsage).catch(() => setUsage({ lineCount: 0, projectCount: 0, recentProjects: [] })); }, [productId]);
  if (!usage) return <p style={{ color: "var(--u-ink-secondary)" }}>Loading…</p>;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
        <StatTile label="Project lines" value={usage.lineCount} icon={<span>▤</span>} tone="brand" />
        <StatTile label="Projects" value={usage.projectCount} icon={<span>▦</span>} tone="neutral" />
      </div>
      <Card title="Recent projects using this product" note="Your organisation only.">
        <SimpleTable
          empty="This product is not used in any of your projects."
          head={["Reference", "Project", "Status", "Lines"]}
          rows={usage.recentProjects.map((p) => [p.reference, p.name, p.status, String(p.lineCount)])}
          loading={false}
        />
      </Card>
    </div>
  );
}

/* ---------- History tab ---------- */

function HistoryTab({ productId }: { productId: string }) {
  const [history, setHistory] = useState<ProductChangeEntry[] | null>(null);
  const [amendments, setAmendments] = useState<ProductAmendmentSummary[] | null>(null);
  useEffect(() => {
    apiClient.getProductHistory(productId).then(setHistory).catch(() => setHistory([]));
    apiClient.getProductAmendments(productId).then(setAmendments).catch(() => setAmendments([]));
  }, [productId]);
  const grouped = useMemo(() => {
    const m = new Map<number, ProductChangeEntry[]>();
    for (const h of history ?? []) m.set(h.version, [...(m.get(h.version) ?? []), h]);
    return [...m.entries()].sort((a, b) => b[0] - a[0]);
  }, [history]);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Card title="Change history" note="Every applied change to this shared record: who, when, from which organisation, and the old and new values. Entries are never edited or removed.">
        {history === null ? <p style={{ color: "var(--u-ink-secondary)", fontSize: 13 }}>Loading…</p> : grouped.length === 0 ? (
          <p style={{ color: "var(--u-ink-secondary)", fontSize: 13, margin: 0 }}>No changes recorded yet — changes made before this history was introduced are not included.</p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {grouped.map(([version, rows]) => (
              <div key={version} style={{ borderLeft: "3px solid var(--u-brand-violet)", paddingLeft: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  Version {version} <span style={{ fontWeight: 500, color: "var(--u-ink-secondary)" }}>· {SOURCE_LABELS[rows[0].source] ?? rows[0].source} · {new Date(rows[0].changedAt).toLocaleString("en-GB")} · {rows[0].changedByName ?? "System"}{rows[0].changedByOrganizationName ? `, ${rows[0].changedByOrganizationName}` : ""}</span>
                </div>
                {rows[0].reason && <div style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>{rows[0].reason}</div>}
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13 }}>
                  {rows.map((r) => (
                    <li key={r.id}>
                      <strong>{FIELD_LABELS[r.fieldName] ?? r.fieldName}</strong>
                      {r.fieldName === "(created)" ? ` — ${r.newValue}` : <>: <span style={{ color: "var(--u-ink-secondary)" }}>{r.oldValue || "—"}</span> → {r.newValue || "—"}</>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title="Amendments" note="Proposed changes from the contributing organisation (shown to that organisation only).">
        <SimpleTable
          empty="No amendments."
          head={["Submitted", "Status", "Submitted by", "Reviewed"]}
          rows={(amendments ?? []).map((a) => [dateOnly(a.submittedAt) ?? "—", a.status, a.submittedByName ?? "—", dateOnly(a.reviewedAt) ?? "—"])}
          loading={amendments === null}
        />
      </Card>
    </div>
  );
}

export function SimpleTable({ head, rows, empty, loading }: { head: string[]; rows: ReactNode[][]; empty: string; loading: boolean }) {
  if (loading) return <p style={{ color: "var(--u-ink-secondary)", fontSize: 13, margin: 0 }}>Loading…</p>;
  if (rows.length === 0) return <p style={{ color: "var(--u-ink-secondary)", fontSize: 13, margin: 0 }}>{empty}</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--u-border)" }}>
            {head.map((h) => (<th key={h} style={{ padding: "6px 8px", textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--u-ink-secondary)", whiteSpace: "nowrap" }}>{h}</th>))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--u-border)" }}>
              {r.map((c, j) => (<td key={j} style={{ padding: "7px 8px", fontSize: 13 }}>{c}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
