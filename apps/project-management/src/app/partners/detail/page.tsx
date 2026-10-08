"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import type {
  EvidenceStandardSummary,
  PartnerCertificationSummary,
  PartnerCompanyCheckSummary,
  PartnerSummary,
  StakeholderEvidenceRecordSummary,
  StakeholderRegistryDetail,
  StakeholderRegistryProduct,
} from "@universe/types";
import { apiClient } from "../../../lib/apiClient";
import { useCountries } from "../../../lib/useCountries";
import { Pill, TextLink, BuildingIcon, Button, Select, AlertIcon, CheckCircleIcon, ClockIcon, ShieldIcon } from "@universe/ui";
import { AuditHistory } from "../../../components/AuditHistory";
import { RiskRegister } from "../../../components/RiskRegister";
import { CertificationNotice } from "../../../components/CertificationNotice";
import { useCurrentUser } from "../../../lib/AuthContext";

const ROLE_LABELS: Record<string, string> = {
  CLIENT: "Client",
  MANUFACTURER: "Manufacturer",
  SUPPLIER: "Supplier",
  FREIGHT_FORWARDER: "Freight Forwarder",
  WAREHOUSING: "Warehousing",
};

// Same option lists as partners/new/page.tsx's New Stakeholder form (see
// CertificationType/PartnerCompanyCheckType in packages/db/src/enums.ts)
// — kept in sync by hand, same as that page, since `type`/`checkType` are
// free-text validated at the app layer rather than a real SQL enum.
const CERTIFICATION_TYPES = [
  "ISO_13485",
  "ISO_9001",
  "ISO_14001",
  "ISO_17025",
  "OTHER_ISO",
  "FDA_REGISTRATION",
  "GMP",
  "GDP",
  "MIA",
  "WDA",
  "EUDAMED_REGISTRATION",
  "CE_MDR_CERTIFICATE",
  "DECLARATION_OF_CONFORMITY",
  "DEVICE_REGISTRATION",
  "INSTRUCTIONS_FOR_USE",
  "TECHNICAL_INFORMATION_SHEET",
  "COMPANY_REGISTRATION",
  "VAT_CERTIFICATE",
  "FINANCIAL_CREDIT_STATUS",
  "BUSINESS_INSURANCE",
  "IATA_DGR_CERTIFICATION",
  "AEO_ACCREDITATION",
  "INSURANCE_CERTIFICATE",
  "TECHNICAL_AGREEMENT",
  "SERVICE_LEVEL_AGREEMENT",
  "CODE_OF_CONDUCT_ACKNOWLEDGEMENT",
  "REFERENCES",
  "BONA_FIDE_REVIEW",
  "OTHER",
] as const;
const CERTIFICATION_TYPE_LABELS: Record<string, string> = {
  ISO_13485: "ISO 13485",
  ISO_9001: "ISO 9001",
  ISO_14001: "ISO 14001",
  ISO_17025: "ISO 17025",
  OTHER_ISO: "Other ISO accreditation",
  FDA_REGISTRATION: "FDA Registration",
  GMP: "GMP Certificate",
  GDP: "GDP Certificate",
  MIA: "Manufacturer's/Importer's Authorisation (MIA)",
  WDA: "Wholesale Dealer's Authorisation (WDA)",
  EUDAMED_REGISTRATION: "EUDAMED Registration",
  CE_MDR_CERTIFICATE: "CE / MDR Certificate",
  DECLARATION_OF_CONFORMITY: "Declaration of Conformity",
  DEVICE_REGISTRATION: "In-country Device Registration",
  INSTRUCTIONS_FOR_USE: "Instructions for Use (IFU)",
  TECHNICAL_INFORMATION_SHEET: "Technical Information Sheet",
  COMPANY_REGISTRATION: "Company Registration Certificate",
  VAT_CERTIFICATE: "VAT Certificate",
  FINANCIAL_CREDIT_STATUS: "Financial Credit Check",
  BUSINESS_INSURANCE: "Business Insurance Certificate",
  IATA_DGR_CERTIFICATION: "IATA Dangerous Goods Regulations Certification",
  AEO_ACCREDITATION: "Authorised Economic Operator (AEO) Accreditation",
  INSURANCE_CERTIFICATE: "Insurance Certificate",
  TECHNICAL_AGREEMENT: "Technical Agreement",
  SERVICE_LEVEL_AGREEMENT: "Service Level Agreement",
  CODE_OF_CONDUCT_ACKNOWLEDGEMENT: "Code of Conduct Acknowledgement",
  REFERENCES: "References",
  BONA_FIDE_REVIEW: "Bona Fide Review",
  OTHER: "Other",
};

const COMPANY_CHECK_TYPES = [
  { value: "COMPANIES_HOUSE_REGISTRATION", label: "UK Companies House Registration" },
  { value: "OTHER_NATIONAL_COMPANY_REGISTRATION", label: "Other National Company Registration" },
  { value: "VAT_CERTIFICATE", label: "VAT Certificate" },
  { value: "WEBSITE", label: "Website" },
  { value: "FINANCIAL_CREDIT_STATUS", label: "Financial Credit Status" },
  { value: "LOCATION", label: "Location" },
  { value: "BUSINESS_INSURANCE", label: "Business Insurance" },
  { value: "OTHER", label: "Other…" },
] as const;
const COMPANY_CHECK_RESULTS = ["YES", "NO", "NOT_APPLICABLE"] as const;

/** Lewis, 2026-10-08: "enable me to add and verify information myself
 * (but only for me)" — purely cosmetic here (the server is the real
 * gate, via EvidenceService.canSelfServiceVerify); this just keeps the
 * one-step "log & verify" control from being shown to anyone it
 * wouldn't do anything for. Kept as its own small helper, rather than
 * inlining the email string at each call site, so there's exactly one
 * place to look when this list ever needs to change. */
function isSelfServiceVerifyUser(email: string | null | undefined): boolean {
  return (email ?? "").toLowerCase() === "lewis.m@unimedps.com";
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: 8,
  marginTop: 4,
  border: "1px solid var(--u-border)",
  borderRadius: 6,
  fontFamily: "var(--u-font-sans)",
  fontSize: 13,
};

/**
 * Stakeholder detail — added 2026-10-01 so every place in the app that
 * names a stakeholder (a project line's manufacturer/supplier/freight
 * forwarder, a project's client, the Stakeholders list, the dashboard's
 * "recently added" panel) has somewhere real to link to, per Lewis's
 * instruction that anything tied to backend data should be interactive.
 * Query-param route (/partners/detail?id=...), same pattern as
 * projects/detail — see that file's note on why (Next static export +
 * dynamic-route limitation).
 *
 * "Compliance & Evidence" section + the Approve action added 2026-10-08
 * as the frontend half of the GDP gap-closing build (Gap 3 — see
 * EvidenceService.getGateStatus in apps/api and
 * claude/compliance-standards-gap-analysis.md). Before this, approving a
 * stakeholder wasn't wired into the UI anywhere at all — approvalStatus
 * only ever moved at creation time — so this is also the first place the
 * gate actually gets exercised by a real user action.
 */
export default function PartnerDetailPage() {
  const me = useCurrentUser();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [partner, setPartner] = useState<PartnerSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registryDetail, setRegistryDetail] = useState<StakeholderRegistryDetail | null>(null);
  const [registryProducts, setRegistryProducts] = useState<StakeholderRegistryProduct[]>([]);
  const [standards, setStandards] = useState<EvidenceStandardSummary[]>([]);
  const [records, setRecords] = useState<StakeholderEvidenceRecordSummary[]>([]);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [openStandardId, setOpenStandardId] = useState<string | null>(null);
  // Remove/reinstate — Partner.approvalStatus's REMOVED state (see
  // PartnersService.update), surfaced here with a confirmation step since
  // removing a stakeholder is a destructive-feeling action, same reasoning
  // as Project archive. The actual removal (approvalStatus write +
  // PartnerApprovalHistory row) was already fully wired server-side before
  // this — this is purely the frontend half.
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [removeReason, setRemoveReason] = useState("");
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [showAddCertForm, setShowAddCertForm] = useState(false);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [showAddCheckForm, setShowAddCheckForm] = useState(false);
  const [editingCheckId, setEditingCheckId] = useState<string | null>(null);
  const countries = useCountries();

  function loadPartner() {
    if (!id) return;
    apiClient
      .getPartner(id)
      .then(setPartner)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load stakeholder"));
  }

  function loadEvidence() {
    if (!id) return;
    apiClient.listEvidenceStandards().then(setStandards).catch(() => setStandards([]));
    apiClient.listEvidenceRecordsForPartner(id).then(setRecords).catch(() => setRecords([]));
  }

  useEffect(() => {
    loadPartner();
    loadEvidence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Stakeholder registry linking — see claude/sop-driven-quality-roadmap.md
  // Section B3/C. Only fetched when this Partner was matched/linked at
  // creation; "products from this manufacturer" only ever populates once
  // the linked entry's identity is public (StakeholderRegistryService.
  // isIdentityPublic) — the linked organisation's own published catalogue.
  useEffect(() => {
    if (!partner?.registryEntryId) {
      setRegistryDetail(null);
      setRegistryProducts([]);
      return;
    }
    const entryId = partner.registryEntryId;
    apiClient.getStakeholderRegistryEntry(entryId).then(setRegistryDetail).catch(() => setRegistryDetail(null));
    apiClient.getStakeholderRegistryProducts(entryId).then(setRegistryProducts).catch(() => setRegistryProducts([]));
  }, [partner?.registryEntryId]);

  async function handleApprove() {
    if (!id) return;
    setApproving(true);
    setApproveError(null);
    try {
      await apiClient.updatePartner(id, { approvalStatus: "APPROVED" });
      loadPartner();
    } catch (err) {
      // On the gate failing (EvidenceService.gateFailureMessage), this is
      // already the exact human-readable sentence naming the missing
      // standards — see apiClient's request() helper, updated 2026-10-08
      // specifically so this message doesn't need re-parsing here.
      setApproveError(err instanceof Error ? err.message : "Failed to approve this stakeholder");
    } finally {
      setApproving(false);
    }
  }

  async function handleRemove() {
    if (!id) return;
    if (!removeReason.trim()) {
      setRemoveError("A reason is required to remove this stakeholder.");
      return;
    }
    setRemoving(true);
    setRemoveError(null);
    try {
      await apiClient.updatePartner(id, { approvalStatus: "REMOVED", approvalReason: removeReason.trim() });
      setConfirmingRemove(false);
      setRemoveReason("");
      loadPartner();
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Failed to remove this stakeholder");
    } finally {
      setRemoving(false);
    }
  }

  async function handleReinstate() {
    if (!id) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await apiClient.updatePartner(id, { approvalStatus: "PENDING", approvalReason: "Reinstated" });
      loadPartner();
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Failed to reinstate this stakeholder");
    } finally {
      setRemoving(false);
    }
  }

  if (!id) return <main style={{ padding: 32, color: "var(--u-status-critical)" }}>No stakeholder specified.</main>;
  if (error) return <main style={{ padding: 32, color: "var(--u-status-critical)" }}>{error}</main>;
  if (!partner) return <main style={{ padding: 32, color: "var(--u-ink-secondary)" }}>Loading…</main>;

  const activeRoleTypes = partner.roles.filter((r) => r.isActive).map((r) => r.roleType);
  const applicableStandards = standards.filter((s) => s.appliesToStakeholderTypes.some((t) => activeRoleTypes.includes(t)));
  // QA/procurement segregation of duties (Lewis, 2026-10-08) — the server
  // already enforces partners.approve (PartnersService.update), but a
  // procurement-only user clicking a button that's always going to 403
  // is a bad UX, not a security boundary — hiding it here is purely
  // cosmetic, not the actual control.
  const canApprove =
    partner.approvalStatus !== "APPROVED" &&
    partner.approvalStatus !== "REMOVED" &&
    (me?.permissions.includes("partners.approve") ?? false);

  return (
    <main style={{ padding: "28px 32px 48px", maxWidth: 860, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--u-radius-md)",
              backgroundColor: "var(--u-accent-magenta-tint)",
              color: "var(--u-brand-violet)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BuildingIcon size={22} />
          </span>
          <div>
            <h1 style={{ fontFamily: "var(--u-font-display)", fontSize: 22, color: "var(--u-ink)", margin: 0 }}>{partner.name}</h1>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {partner.roles.map((r) => (
                <Pill key={r.roleType} tone="neutral">
                  {ROLE_LABELS[r.roleType] ?? r.roleType.replace(/_/g, " ")}
                </Pill>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Pill tone={partner.approvalStatus === "APPROVED" ? "good" : partner.approvalStatus === "REMOVED" ? "neutral" : "warning"}>
            {partner.approvalStatus}
          </Pill>
          {canApprove && (
            <Button variant="primary" onClick={handleApprove} disabled={approving}>
              {approving ? "Approving…" : "Approve stakeholder"}
            </Button>
          )}
          {partner.approvalStatus === "REMOVED" ? (
            <Button variant="secondary" onClick={handleReinstate} disabled={removing}>
              {removing ? "Reinstating…" : "Reinstate"}
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setConfirmingRemove(!confirmingRemove)} disabled={removing}>
              {confirmingRemove ? "Cancel" : "Remove stakeholder"}
            </Button>
          )}
        </div>
      </div>

      {canApprove && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <CertificationNotice statement="PARTNER_APPROVAL_V1" />
        </div>
      )}

      {approveError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            marginTop: 16,
            borderRadius: "var(--u-radius-md)",
            border: "1px solid var(--u-status-critical)",
            backgroundColor: "rgba(220,38,38,0.08)",
            fontSize: 13,
            color: "var(--u-ink)",
          }}
        >
          <AlertIcon size={16} />
          {approveError}
        </div>
      )}

      {/* Remove — a destructive-feeling action, same confirm-with-reason
          pattern as the Risk Register's "Close" action (components/
          RiskRegister.tsx) and Project archive (projects/detail/
          ProjectDetailView.tsx): never fires on a bare click. The partner
          is never hard-deleted — this is Partner.approvalStatus moving to
          REMOVED, same soft-retirement posture as everything else in this
          build. */}
      {confirmingRemove && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: "var(--u-radius-md)",
            border: "1px solid var(--u-status-critical)",
            backgroundColor: "rgba(220,38,38,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--u-ink)" }}>
            Remove {partner.name} as a stakeholder?
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--u-ink-secondary)" }}>
            This sets their status to REMOVED and records it in the approval history — the record itself is kept,
            never deleted, and can be reinstated later.
          </p>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>
            Reason (required)
            <input style={inputStyle} value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} autoFocus />
          </label>
          {removeError && <div style={{ color: "var(--u-status-critical)", fontSize: 12 }}>{removeError}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Button variant="danger" onClick={handleRemove} disabled={removing}>
              {removing ? "Removing…" : "Confirm removal"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => { setConfirmingRemove(false); setRemoveReason(""); setRemoveError(null); }}
              disabled={removing}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="u-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 28 }}>
        <InfoCard label="Country">{countries.find((c) => c.code === partner.countryCode)?.name ?? partner.countryCode ?? "—"}</InfoCard>
        <InfoCard label="Website">
          {partner.website ? (
            <TextLink href={partner.website} target="_blank" rel="noreferrer">
              {partner.website.replace(/^https?:\/\//, "")}
            </TextLink>
          ) : (
            "—"
          )}
        </InfoCard>
        <InfoCard label="Added">{new Date(partner.createdAt).toLocaleDateString()}</InfoCard>
      </div>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--u-ink)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldIcon size={16} /> Compliance &amp; evidence
        </h2>
        {applicableStandards.length === 0 ? (
          <div style={{ padding: "12px 16px", borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-border)", fontSize: 13, color: "var(--u-ink-secondary)" }}>
            No evidence standards apply to this stakeholder&apos;s current role(s) yet. Standards are managed under Quality → Evidence Standards.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {applicableStandards.map((standard) => (
              <EvidenceStandardRow
                key={standard.id}
                standard={standard}
                record={records.find((r) => r.standardId === standard.id) ?? null}
                partnerId={partner.id}
                open={openStandardId === standard.id}
                onToggleOpen={() => setOpenStandardId(openStandardId === standard.id ? null : standard.id)}
                onChanged={loadEvidence}
                canVerify={me?.permissions.includes("evidence.verify") ?? false}
                canSelfVerify={isSelfServiceVerifyUser(me?.email)}
              />
            ))}
          </div>
        )}
      </section>

      {partner.clientDetail && (
        <DetailSection title="Client details">
          <InfoCard label="Billing address">
            {formatAddress(
              {
                line1: partner.clientDetail.billingAddressLine1,
                line2: partner.clientDetail.billingAddressLine2,
                city: partner.clientDetail.billingCity,
                region: partner.clientDetail.billingRegion,
                postcode: partner.clientDetail.billingPostcode,
                countryCode: partner.clientDetail.billingCountryCode,
              },
              countries
            )}
          </InfoCard>
          <InfoCard label="Delivery address">
            {formatAddress(
              {
                line1: partner.clientDetail.deliveryAddressLine1,
                line2: partner.clientDetail.deliveryAddressLine2,
                city: partner.clientDetail.deliveryCity,
                region: partner.clientDetail.deliveryRegion,
                postcode: partner.clientDetail.deliveryPostcode,
                countryCode: partner.clientDetail.deliveryCountryCode,
              },
              countries
            )}
          </InfoCard>
          <InfoCard label="Payment terms">{partner.clientDetail.paymentTerms ?? "—"}</InfoCard>
        </DetailSection>
      )}

      {partner.manufacturerDetail && (
        <DetailSection title="Manufacturer details">
          <InfoCard label="Scope of supply">{partner.manufacturerDetail.scopeOfSupply || "—"}</InfoCard>
          <InfoCard label="Scope of services">{partner.manufacturerDetail.scopeOfServicesDescription || "—"}</InfoCard>
        </DetailSection>
      )}

      {partner.manufacturerSites.length > 0 && (
        <DetailSection title="Manufacturing sites">
          {partner.manufacturerSites.map((site) => (
            <InfoCard key={site.id} label={site.isPrimary ? `${site.siteName || "Site"} (Primary)` : site.siteName || "Site"}>
              {[countries.find((c) => c.code === site.countryCode)?.name ?? site.countryCode, site.address].filter(Boolean).join(" — ") || "—"}
            </InfoCard>
          ))}
        </DetailSection>
      )}

      <section style={{ marginTop: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--u-ink)", margin: 0 }}>Company checks</h2>
          <Button variant="secondary" onClick={() => setShowAddCheckForm((v) => !v)}>
            {showAddCheckForm ? "Cancel" : "Add check"}
          </Button>
        </div>

        {showAddCheckForm && (
          <AddCompanyCheckForm
            partnerId={partner.id}
            onSaved={() => {
              setShowAddCheckForm(false);
              loadPartner();
            }}
          />
        )}

        {partner.companyChecks.length === 0 ? (
          <div style={{ padding: "12px 16px", borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-border)", fontSize: 13, color: "var(--u-ink-secondary)" }}>
            No company checks logged yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {partner.companyChecks.map((check) => (
              <CompanyCheckRow
                key={check.id}
                check={check}
                partnerId={partner.id}
                relatedDocCount={partner.certifications.filter((c) => c.relatedCompanyCheckType === check.checkType).length}
                editing={editingCheckId === check.id}
                onToggleEdit={() => setEditingCheckId(editingCheckId === check.id ? null : check.id)}
                onSaved={() => {
                  setEditingCheckId(null);
                  loadPartner();
                }}
              />
            ))}
          </div>
        )}
      </section>

      {partner.financialDetail && (
        <DetailSection title="Financial information">
          <InfoCard label="Bank name">{partner.financialDetail.bankName ?? "—"}</InfoCard>
          <InfoCard label="Account holder">{partner.financialDetail.accountHolderName ?? "—"}</InfoCard>
          <InfoCard label="Account number">{partner.financialDetail.accountNumber ?? "—"}</InfoCard>
          <InfoCard label="Sort code">{partner.financialDetail.sortCode ?? "—"}</InfoCard>
          <InfoCard label="IBAN">{partner.financialDetail.iban ?? "—"}</InfoCard>
          <InfoCard label="SWIFT / BIC">{partner.financialDetail.swiftBic ?? "—"}</InfoCard>
          <InfoCard label="Branch address">{partner.financialDetail.branchAddress ?? "—"}</InfoCard>
          <InfoCard label="Currency">{partner.financialDetail.currencyCode ?? "—"}</InfoCard>
        </DetailSection>
      )}

      <section style={{ marginTop: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--u-ink)", margin: 0 }}>Documents &amp; certifications</h2>
          <Button variant="secondary" onClick={() => setShowAddCertForm((v) => !v)}>
            {showAddCertForm ? "Cancel" : "Add document"}
          </Button>
        </div>

        {showAddCertForm && (
          <AddCertificationForm
            partnerId={partner.id}
            manufacturerSites={partner.manufacturerSites}
            onSaved={() => {
              setShowAddCertForm(false);
              loadPartner();
            }}
          />
        )}

        {partner.certifications.length === 0 ? (
          <div style={{ padding: "12px 16px", borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-border)", fontSize: 13, color: "var(--u-ink-secondary)" }}>
            No documents or certifications logged yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {partner.certifications.map((cert) => (
              <CertificationRow
                key={cert.id}
                cert={cert}
                partnerId={partner.id}
                manufacturerSites={partner.manufacturerSites}
                editing={editingCertId === cert.id}
                onToggleEdit={() => setEditingCertId(editingCertId === cert.id ? null : cert.id)}
                onSaved={() => {
                  setEditingCertId(null);
                  loadPartner();
                }}
              />
            ))}
          </div>
        )}
      </section>

      {partner.supplierDetail && (
        <DetailSection title="Supplier details">
          <InfoCard label="Supplier code">{partner.supplierDetail.supplierCode ?? "—"}</InfoCard>
          <InfoCard label="Product category">{partner.supplierDetail.productCategory ?? "—"}</InfoCard>
          <InfoCard label="FDA registration number">{partner.supplierDetail.fdaRegistrationNumber ?? "—"}</InfoCard>
        </DetailSection>
      )}

      {partner.freightForwarderDetail && (
        <DetailSection title="Freight forwarder details">
          <InfoCard label="Modes of transport">
            {partner.freightForwarderDetail.modesOfTransport
              ? partner.freightForwarderDetail.modesOfTransport.split(",").join(", ")
              : "—"}
          </InfoCard>
        </DetailSection>
      )}

      <DetailSection title="Universe registry sharing">
        <InfoCard label="Shared with Universe registry">{partner.sharedWithUniverseRegistry ? "Yes" : "No"}</InfoCard>
      </DetailSection>

      {registryDetail && (
        <DetailSection title="Universe registry">
          <InfoCard label="Status">
            {registryDetail.isLinkedToPublishedOrganization
              ? `Registered on Universe as ${registryDetail.linkedOrganizationName}`
              : "Known to Universe (not yet registered)"}
          </InfoCard>
          {registryDetail.countryPresence.length > 0 && (
            <InfoCard label="Operates in">{registryDetail.countryPresence.join(", ")}</InfoCard>
          )}
        </DetailSection>
      )}

      {registryProducts.length > 0 && (
        <DetailSection title="Products from this manufacturer">
          {registryProducts.map((p) => (
            <InfoCard key={p.id} label={p.category ?? "Product"}>
              {p.name}
              {p.description ? ` — ${p.description}` : ""}
            </InfoCard>
          ))}
        </DetailSection>
      )}

      <RiskRegister subjectType="PARTNER" subjectId={partner.id} />
      <AuditHistory tableName="partners" recordId={partner.id} />
    </main>
  );
}

/** One row of the Compliance & evidence section — a standard plus
 * whatever evidence record (if any) currently exists against it for this
 * partner, with the one action that's actually valid for its current
 * state: log evidence (none yet), verify/reject (PENDING), or just the
 * result (VERIFIED/REJECTED/expired). */
function EvidenceStandardRow({
  standard,
  record,
  partnerId,
  open,
  onToggleOpen,
  onChanged,
  canVerify,
  canSelfVerify,
}: {
  standard: EvidenceStandardSummary;
  record: StakeholderEvidenceRecordSummary | null;
  partnerId: string;
  open: boolean;
  onToggleOpen: () => void;
  onChanged: () => void;
  /** QA/procurement segregation of duties (Lewis, 2026-10-08) — purely
   * cosmetic, same reasoning as canApprove above; evidence.verify is
   * enforced server-side regardless. */
  canVerify: boolean;
  /** Added 2026-10-08 — see isSelfServiceVerifyUser's doc comment. Also
   * purely cosmetic; EvidenceService.canSelfServiceVerify is the real
   * gate. */
  canSelfVerify: boolean;
}) {
  const [verifying, setVerifying] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isExpired = Boolean(record?.expiryDate && standard.requiresExpiry && new Date(record.expiryDate) < new Date());
  const effectiveStatus = record ? (isExpired && record.status === "VERIFIED" ? "EXPIRED" : record.status) : "MISSING";

  const tone: "good" | "warning" | "critical" | "neutral" =
    effectiveStatus === "VERIFIED" ? "good" : effectiveStatus === "PENDING" ? "neutral" : effectiveStatus === "MISSING" ? "warning" : "critical";
  const icon =
    effectiveStatus === "VERIFIED" ? <CheckCircleIcon size={16} /> : effectiveStatus === "PENDING" ? <ClockIcon size={16} /> : <AlertIcon size={16} />;
  const toneColor =
    tone === "good" ? "var(--u-status-good, #16a34a)" : tone === "critical" ? "var(--u-status-critical)" : tone === "warning" ? "#946014" : "var(--u-ink-secondary)";

  async function handleVerify(approve: boolean) {
    if (!record) return;
    setVerifying(true);
    setActionError(null);
    try {
      await apiClient.verifyEvidenceRecord(record.id, { approve });
      onChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update this record");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div style={{ borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-border)", backgroundColor: "var(--u-surface-raised)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--u-ink)" }}>
            {standard.name}
            {standard.isMandatory && <span style={{ color: "var(--u-status-critical)", marginLeft: 4 }}>*</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--u-ink-secondary)", marginTop: 2 }}>
            {standard.category.replace(/_/g, " ")}
            {record?.referenceNumber ? ` — ${record.referenceNumber}` : ""}
            {record?.expiryDate ? ` — expires ${new Date(record.expiryDate).toLocaleDateString()}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {record?.documentId && <DocumentLink documentId={record.documentId} />}
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: toneColor }}>
            {icon}
            {effectiveStatus.charAt(0) + effectiveStatus.slice(1).toLowerCase()}
          </span>
          {effectiveStatus === "PENDING" && canVerify && (
            <>
              <Button variant="secondary" onClick={() => handleVerify(true)} disabled={verifying}>
                Verify
              </Button>
              <Button variant="secondary" onClick={() => handleVerify(false)} disabled={verifying}>
                Reject
              </Button>
            </>
          )}
          {effectiveStatus === "PENDING" && !canVerify && (
            <span style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>Awaiting QA review</span>
          )}
          {(effectiveStatus === "MISSING" || effectiveStatus === "REJECTED" || effectiveStatus === "EXPIRED") && (
            <Button variant="secondary" onClick={onToggleOpen}>
              {open ? "Cancel" : "Log evidence"}
            </Button>
          )}
        </div>
      </div>
      {actionError && <div style={{ padding: "0 16px 12px", color: "var(--u-status-critical)", fontSize: 12 }}>{actionError}</div>}
      {effectiveStatus === "PENDING" && (
        <div style={{ padding: "0 16px 12px" }}>
          <CertificationNotice statement="EVIDENCE_VERIFICATION_V1" />
        </div>
      )}
      {open && (
        <LogEvidenceForm
          standardId={standard.id}
          partnerId={partnerId}
          canSelfVerify={canSelfVerify}
          onSaved={() => {
            onChanged();
            onToggleOpen();
          }}
        />
      )}
    </div>
  );
}

/** Added 2026-10-08 alongside the standalone document upload — a record
 * with a documentId gets a small link that mints a fresh, short-lived
 * download SAS on click (same "never store the SAS, mint on demand"
 * posture as BlobStorageService.getDownloadUrl) and opens it in a new
 * tab. Loading/error state is intentionally minimal — this is a single
 * link, not a form. */
function DocumentLink({ documentId }: { documentId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const { downloadUrl } = await apiClient.getStandaloneDocumentDownloadUrl(documentId);
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch {
      // A broken/expired link here is a minor inconvenience, not worth a
      // full error banner on the row — the user can just try again.
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      style={{
        fontSize: 12,
        color: "var(--u-brand-violet)",
        background: "none",
        border: "none",
        padding: 0,
        cursor: loading ? "default" : "pointer",
        textDecoration: "underline",
      }}
    >
      {loading ? "Opening…" : "View document"}
    </button>
  );
}

function LogEvidenceForm({
  standardId,
  partnerId,
  canSelfVerify,
  onSaved,
}: {
  standardId: string;
  partnerId: string;
  /** Added 2026-10-08 — see isSelfServiceVerifyUser's doc comment at the
   * top of this file. */
  canSelfVerify: boolean;
  onSaved: () => void;
}) {
  const [referenceNumber, setReferenceNumber] = useState("");
  const [issuingBody, setIssuingBody] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [documentUrl, setDocumentUrl] = useState("");
  const [verifyImmediately, setVerifyImmediately] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStage, setUploadStage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  /** Added 2026-10-08 — same two-step SAS flow as the Project documents
   * feature (requestDocumentUploadUrl/uploadDocumentFile/confirmDocumentUpload),
   * just using the standalone (non-project) endpoints, since a stakeholder
   * evidence record isn't attached to a Project. See
   * DocumentsStandaloneController / documents.service.ts's "Standalone
   * documents" section in apps/api. Attaching a file is optional — a
   * record can still be logged as metadata-only, same as before this was
   * added.
   *
   * A pasted URL (e.g. a cloud storage share link) takes the file's
   * place when no file was chosen — added same day per Lewis ("in
   * addition to uploading files, can we also have a field to paste in a
   * url"). The two are mutually exclusive in this form (a file, if
   * chosen, wins) since a record only ever carries one documentId. */
  async function resolveDocumentId(): Promise<string | undefined> {
    if (file) {
      setUploadStage("Requesting upload URL…");
      const { uploadUrl, blobName } = await apiClient.requestStandaloneDocumentUploadUrl({
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      });
      setUploadStage("Uploading file…");
      await apiClient.uploadDocumentFile(uploadUrl, file);
      setUploadStage("Confirming upload…");
      const doc = await apiClient.confirmStandaloneDocumentUpload({
        blobName,
        fileName: file.name,
        type: "EVIDENCE",
        title: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type || undefined,
      });
      setUploadStage(null);
      return doc.id;
    }
    if (documentUrl.trim()) {
      setUploadStage("Saving link…");
      const doc = await apiClient.linkStandaloneDocument({
        url: documentUrl.trim(),
        title: documentUrl.trim(),
        type: "EVIDENCE",
      });
      setUploadStage(null);
      return doc.id;
    }
    return undefined;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setFormError(null);
    try {
      const documentId = await resolveDocumentId();
      await apiClient.createEvidenceRecord({
        partnerId,
        standardId,
        referenceNumber: referenceNumber || undefined,
        issuingBody: issuingBody || undefined,
        issuedDate: issuedDate || undefined,
        expiryDate: expiryDate || undefined,
        documentId,
        notes: notes || undefined,
        ...(canSelfVerify && verifyImmediately ? { verifyImmediately: true } : {}),
      });
      onSaved();
    } catch (err) {
      setUploadStage(null);
      setFormError(err instanceof Error ? err.message : "Failed to log evidence");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
          Reference number
          <input style={inputStyle} value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
        </label>
        <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
          Issuing body
          <input style={inputStyle} value={issuingBody} onChange={(e) => setIssuingBody(e.target.value)} />
        </label>
        <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
          Issued date
          <input type="date" style={inputStyle} value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} />
        </label>
        <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
          Expiry date
          <input type="date" style={inputStyle} value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </label>
      </div>
      <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
        Supporting document (optional)
        <input
          type="file"
          style={{ ...inputStyle, padding: "6px 8px" }}
          onChange={(e) => {
            setFile(e.target.files && e.target.files.length > 0 ? e.target.files[0] : null);
            if (e.target.files && e.target.files.length > 0) setDocumentUrl("");
          }}
        />
      </label>
      <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
        Or paste a document URL (e.g. a cloud storage link)
        <input
          style={inputStyle}
          placeholder="https://…"
          value={documentUrl}
          disabled={Boolean(file)}
          onChange={(e) => setDocumentUrl(e.target.value)}
        />
      </label>
      <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
        Notes
        <input style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {canSelfVerify && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--u-ink)" }}>
          <input type="checkbox" checked={verifyImmediately} onChange={(e) => setVerifyImmediately(e.target.checked)} />
          Verify immediately (admin — logs and verifies this evidence in one step, for your account only)
        </label>
      )}
      {formError && <div style={{ color: "var(--u-status-critical)", fontSize: 12 }}>{formError}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? uploadStage ?? "Saving…" : "Save evidence"}
        </Button>
      </div>
    </div>
  );
}

/** Inline "Add document" form for the Documents & certifications section
 * — same pattern as batches/detail's AddTemperatureLogForm (a single
 * record added to a child list without leaving the page). Added
 * 2026-10-08 to close the gap flagged in
 * compliance-standards-gap-analysis.md: before this, a single
 * certification could only be added by going through the big Partner
 * update DTO's addCertifications array (effectively unreachable from the
 * UI), or at creation time on the New Stakeholder form. */
function AddCertificationForm({
  partnerId,
  manufacturerSites,
  onSaved,
}: {
  partnerId: string;
  manufacturerSites: PartnerSummary["manufacturerSites"];
  onSaved: () => void;
}) {
  const [type, setType] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [issuingBody, setIssuingBody] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [manufacturerSiteId, setManufacturerSiteId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!type) {
      setFormError("Choose a document type.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await apiClient.addPartnerCertification(partnerId, {
        type,
        referenceNumber: referenceNumber || undefined,
        issuingBody: issuingBody || undefined,
        issuedDate: issuedDate || undefined,
        expiryDate: expiryDate || undefined,
        notes: notes || undefined,
        manufacturerSiteId: manufacturerSiteId || undefined,
      });
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add this document");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        padding: 16,
        borderRadius: "var(--u-radius-md)",
        border: "1px solid var(--u-border)",
        backgroundColor: "var(--u-surface-raised)",
        marginBottom: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
          Document type
          <Select
            value={type}
            onChange={setType}
            ariaLabel="Document type"
            options={CERTIFICATION_TYPES.map((t) => ({ value: t, label: CERTIFICATION_TYPE_LABELS[t] }))}
          />
        </label>
        <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
          Reference number
          <input style={inputStyle} value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
        </label>
        <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
          Issuing body
          <input style={inputStyle} value={issuingBody} onChange={(e) => setIssuingBody(e.target.value)} />
        </label>
        <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
          Issued date
          <input type="date" style={inputStyle} value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} />
        </label>
        <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
          Expiry date
          <input type="date" style={inputStyle} value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </label>
        {manufacturerSites.length > 0 && (
          <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
            Manufacturing site
            <Select
              value={manufacturerSiteId}
              onChange={setManufacturerSiteId}
              allLabel="Company-wide (not site-specific)"
              ariaLabel="Manufacturing site"
              options={manufacturerSites.map((s) => ({ value: s.id, label: s.siteName || "Site" }))}
            />
          </label>
        )}
      </div>
      <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
        Notes
        <input style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {formError && <div style={{ color: "var(--u-status-critical)", fontSize: 12 }}>{formError}</div>}
      <div>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving…" : "Save document"}
        </Button>
      </div>
    </div>
  );
}

/** One certification row, with an inline "Edit" toggle (same shape as
 * AddCertificationForm) and a "Retire" action for a CURRENT document —
 * never a hard delete, since compliance history must be retained (see
 * PartnerCertification.status's doc comment in schema.prisma). Retiring
 * just PATCHes { status: "ARCHIVED" }. */
function CertificationRow({
  cert,
  partnerId,
  manufacturerSites,
  editing,
  onToggleEdit,
  onSaved,
}: {
  cert: PartnerCertificationSummary;
  partnerId: string;
  manufacturerSites: PartnerSummary["manufacturerSites"];
  editing: boolean;
  onToggleEdit: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState(cert.type);
  const [referenceNumber, setReferenceNumber] = useState(cert.referenceNumber ?? "");
  const [issuingBody, setIssuingBody] = useState(cert.issuingBody ?? "");
  const [issuedDate, setIssuedDate] = useState(cert.issuedDate ? cert.issuedDate.slice(0, 10) : "");
  const [expiryDate, setExpiryDate] = useState(cert.expiryDate ? cert.expiryDate.slice(0, 10) : "");
  const [notes, setNotes] = useState(cert.notes ?? "");
  const [manufacturerSiteId, setManufacturerSiteId] = useState(cert.manufacturerSiteId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [retiring, setRetiring] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSave() {
    setSubmitting(true);
    setFormError(null);
    try {
      await apiClient.updatePartnerCertification(partnerId, cert.id, {
        type,
        referenceNumber: referenceNumber || undefined,
        issuingBody: issuingBody || undefined,
        issuedDate: issuedDate || undefined,
        expiryDate: expiryDate || undefined,
        notes: notes || undefined,
        manufacturerSiteId: manufacturerSiteId || undefined,
      });
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save this document");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetire() {
    setRetiring(true);
    setFormError(null);
    try {
      await apiClient.updatePartnerCertification(partnerId, cert.id, { status: "ARCHIVED" });
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to retire this document");
    } finally {
      setRetiring(false);
    }
  }

  return (
    <div style={{ borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-border)", backgroundColor: "var(--u-surface-raised)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--u-ink)" }}>
            {CERTIFICATION_TYPE_LABELS[cert.type] ?? cert.type.replace(/_/g, " ")}
            {cert.status === "ARCHIVED" && <Pill tone="neutral">Retired</Pill>}
          </div>
          <div style={{ fontSize: 12, color: "var(--u-ink-secondary)", marginTop: 2 }}>
            {[cert.referenceNumber, cert.issuingBody, cert.expiryDate ? `expires ${new Date(cert.expiryDate).toLocaleDateString()}` : null]
              .filter(Boolean)
              .join(" — ") || "—"}
            {cert.isExpired && <span style={{ color: "var(--u-status-critical)", marginLeft: 8 }}>Expired</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <Button variant="secondary" onClick={onToggleEdit}>
            {editing ? "Cancel" : "Edit"}
          </Button>
          {cert.status !== "ARCHIVED" && (
            <Button variant="secondary" onClick={handleRetire} disabled={retiring}>
              {retiring ? "Retiring…" : "Retire"}
            </Button>
          )}
        </div>
      </div>
      {formError && <div style={{ padding: "0 16px 12px", color: "var(--u-status-critical)", fontSize: 12 }}>{formError}</div>}
      {editing && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
              Document type
              <Select
                value={type}
                onChange={setType}
                ariaLabel="Document type"
                options={CERTIFICATION_TYPES.map((t) => ({ value: t, label: CERTIFICATION_TYPE_LABELS[t] }))}
              />
            </label>
            <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
              Reference number
              <input style={inputStyle} value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
            </label>
            <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
              Issuing body
              <input style={inputStyle} value={issuingBody} onChange={(e) => setIssuingBody(e.target.value)} />
            </label>
            <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
              Issued date
              <input type="date" style={inputStyle} value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} />
            </label>
            <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
              Expiry date
              <input type="date" style={inputStyle} value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </label>
            {manufacturerSites.length > 0 && (
              <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
                Manufacturing site
                <Select
                  value={manufacturerSiteId}
                  onChange={setManufacturerSiteId}
                  allLabel="Company-wide (not site-specific)"
                  ariaLabel="Manufacturing site"
                  options={manufacturerSites.map((s) => ({ value: s.id, label: s.siteName || "Site" }))}
                />
              </label>
            )}
          </div>
          <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
            Notes
            <input style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <div>
            <Button variant="primary" onClick={handleSave} disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Inline "Add check" form for the Company checks section — same pattern
 * as AddCertificationForm above. */
function AddCompanyCheckForm({ partnerId, onSaved }: { partnerId: string; onSaved: () => void }) {
  const [checkType, setCheckType] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [result, setResult] = useState("");
  const [checkedDate, setCheckedDate] = useState("");
  const [referenceOrSource, setReferenceOrSource] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!checkType || !result) {
      setFormError("Choose a check type and result.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await apiClient.addPartnerCompanyCheck(partnerId, {
        checkType,
        customLabel: checkType === "OTHER" ? customLabel || undefined : undefined,
        result,
        checkedDate: checkedDate || undefined,
        referenceOrSource: referenceOrSource || undefined,
        comment: comment || undefined,
      });
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add this check");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        padding: 16,
        borderRadius: "var(--u-radius-md)",
        border: "1px solid var(--u-border)",
        backgroundColor: "var(--u-surface-raised)",
        marginBottom: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
          Check type
          <Select value={checkType} onChange={setCheckType} ariaLabel="Check type" options={[...COMPANY_CHECK_TYPES]} />
        </label>
        {checkType === "OTHER" && (
          <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
            Custom label
            <input style={inputStyle} value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} />
          </label>
        )}
        <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
          Result
          <Select
            value={result}
            onChange={setResult}
            ariaLabel="Result"
            options={COMPANY_CHECK_RESULTS.map((r) => ({ value: r, label: r.replace(/_/g, " ") }))}
          />
        </label>
        <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
          Checked date
          <input type="date" style={inputStyle} value={checkedDate} onChange={(e) => setCheckedDate(e.target.value)} />
        </label>
        <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
          Reference / source
          <input style={inputStyle} value={referenceOrSource} onChange={(e) => setReferenceOrSource(e.target.value)} />
        </label>
      </div>
      <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
        Comment
        <input style={inputStyle} value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
      {formError && <div style={{ color: "var(--u-status-critical)", fontSize: 12 }}>{formError}</div>}
      <div>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving…" : "Save check"}
        </Button>
      </div>
    </div>
  );
}

/** One company-check row, with an inline "Edit" toggle. No retire/delete
 * action — PartnerCompanyCheck is a verification result, not a document
 * with its own lifecycle (see partner-company-check.dto.ts's doc
 * comment). */
function CompanyCheckRow({
  check,
  partnerId,
  relatedDocCount,
  editing,
  onToggleEdit,
  onSaved,
}: {
  check: PartnerCompanyCheckSummary;
  partnerId: string;
  relatedDocCount: number;
  editing: boolean;
  onToggleEdit: () => void;
  onSaved: () => void;
}) {
  const [customLabel, setCustomLabel] = useState(check.customLabel ?? "");
  const [result, setResult] = useState(check.result);
  const [checkedDate, setCheckedDate] = useState(check.checkedDate ? check.checkedDate.slice(0, 10) : "");
  const [referenceOrSource, setReferenceOrSource] = useState(check.referenceOrSource ?? "");
  const [comment, setComment] = useState(check.comment ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSave() {
    setSubmitting(true);
    setFormError(null);
    try {
      await apiClient.updatePartnerCompanyCheck(partnerId, check.id, {
        customLabel: check.checkType === "OTHER" ? customLabel || undefined : undefined,
        result,
        checkedDate: checkedDate || undefined,
        referenceOrSource: referenceOrSource || undefined,
        comment: comment || undefined,
      });
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save this check");
    } finally {
      setSubmitting(false);
    }
  }

  const label = check.checkType === "OTHER" ? check.customLabel || "Other check" : check.checkType.replace(/_/g, " ");

  return (
    <div style={{ borderRadius: "var(--u-radius-md)", border: "1px solid var(--u-border)", backgroundColor: "var(--u-surface-raised)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--u-ink)" }}>{label}</div>
          <div style={{ fontSize: 12, color: "var(--u-ink-secondary)", marginTop: 2 }}>
            {check.result.replace(/_/g, " ")}
            {check.checkedDate ? ` — checked ${new Date(check.checkedDate).toLocaleDateString()}` : ""}
            {check.referenceOrSource ? ` — ${check.referenceOrSource}` : ""}
            {relatedDocCount > 0 ? ` — ${relatedDocCount} document(s) attached` : ""}
          </div>
        </div>
        <Button variant="secondary" onClick={onToggleEdit}>
          {editing ? "Cancel" : "Edit"}
        </Button>
      </div>
      {formError && <div style={{ padding: "0 16px 12px", color: "var(--u-status-critical)", fontSize: 12 }}>{formError}</div>}
      {editing && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {check.checkType === "OTHER" && (
              <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
                Custom label
                <input style={inputStyle} value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} />
              </label>
            )}
            <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
              Result
              <Select
                value={result}
                onChange={setResult}
                ariaLabel="Result"
                options={COMPANY_CHECK_RESULTS.map((r) => ({ value: r, label: r.replace(/_/g, " ") }))}
              />
            </label>
            <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
              Checked date
              <input type="date" style={inputStyle} value={checkedDate} onChange={(e) => setCheckedDate(e.target.value)} />
            </label>
            <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
              Reference / source
              <input style={inputStyle} value={referenceOrSource} onChange={(e) => setReferenceOrSource(e.target.value)} />
            </label>
          </div>
          <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
            Comment
            <input style={inputStyle} value={comment} onChange={(e) => setComment(e.target.value)} />
          </label>
          <div>
            <Button variant="primary" onClick={handleSave} disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Joins a structured address (added 2026-10-03, replacing the old
 * single free-text billing/delivery address block) into one readable
 * line for display — "—" when nothing is set at all. */
function formatAddress(
  address: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    region?: string | null;
    postcode?: string | null;
    countryCode?: string | null;
  },
  countries: { code: string; name: string }[]
): string {
  const countryName = address.countryCode
    ? countries.find((c) => c.code === address.countryCode)?.name ?? address.countryCode
    : null;
  const parts = [address.line1, address.line2, address.city, address.region, address.postcode, countryName].filter(
    (p): p is string => Boolean(p && p.trim())
  );
  return parts.length > 0 ? parts.join(", ") : "—";
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--u-ink)", marginBottom: 10 }}>{title}</h2>
      <div className="u-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>{children}</div>
    </section>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: "var(--u-radius-md)",
        border: "1px solid var(--u-border)",
        backgroundColor: "var(--u-surface-raised)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--u-ink-secondary)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: "var(--u-ink)" }}>{children}</div>
    </div>
  );
}
