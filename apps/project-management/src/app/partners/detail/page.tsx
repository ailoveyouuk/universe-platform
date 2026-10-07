"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import type {
  EvidenceStandardSummary,
  PartnerSummary,
  StakeholderEvidenceRecordSummary,
  StakeholderRegistryDetail,
  StakeholderRegistryProduct,
} from "@universe/types";
import { apiClient } from "../../../lib/apiClient";
import { useCountries } from "../../../lib/useCountries";
import { Pill, TextLink, BuildingIcon, Button, AlertIcon, CheckCircleIcon, ClockIcon, ShieldIcon } from "@universe/ui";
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

      {partner.companyChecks.length > 0 && (
        <DetailSection title="Company checks">
          {partner.companyChecks.map((check) => {
            const relatedDocs = partner.certifications.filter((c) => c.relatedCompanyCheckType === check.checkType);
            const label = check.checkType === "OTHER" ? check.customLabel || "Other check" : check.checkType.replace(/_/g, " ");
            return (
              <InfoCard key={check.id} label={label}>
                {check.result.replace(/_/g, " ")}
                {check.checkedDate ? ` — checked ${new Date(check.checkedDate).toLocaleDateString()}` : ""}
                {check.referenceOrSource ? ` — ${check.referenceOrSource}` : ""}
                {relatedDocs.length > 0 ? ` — ${relatedDocs.length} document(s) attached` : ""}
              </InfoCard>
            );
          })}
        </DetailSection>
      )}

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

      {partner.certifications.length > 0 && (
        <DetailSection title="Documents & certifications">
          {partner.certifications.map((cert) => (
            <InfoCard key={cert.id} label={cert.type.replace(/_/g, " ")}>
              {[cert.referenceNumber, cert.issuingBody, cert.expiryDate ? `expires ${new Date(cert.expiryDate).toLocaleDateString()}` : null]
                .filter(Boolean)
                .join(" — ") || "—"}
              {cert.isExpired && <span style={{ color: "var(--u-status-critical)", marginLeft: 8 }}>Expired</span>}
            </InfoCard>
          ))}
        </DetailSection>
      )}

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

function LogEvidenceForm({ standardId, partnerId, onSaved }: { standardId: string; partnerId: string; onSaved: () => void }) {
  const [referenceNumber, setReferenceNumber] = useState("");
  const [issuingBody, setIssuingBody] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
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
   * added. */
  async function uploadFileAndGetDocumentId(): Promise<string | undefined> {
    if (!file) return undefined;
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

  async function handleSubmit() {
    setSubmitting(true);
    setFormError(null);
    try {
      const documentId = await uploadFileAndGetDocumentId();
      await apiClient.createEvidenceRecord({
        partnerId,
        standardId,
        referenceNumber: referenceNumber || undefined,
        issuingBody: issuingBody || undefined,
        issuedDate: issuedDate || undefined,
        expiryDate: expiryDate || undefined,
        documentId,
        notes: notes || undefined,
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
          onChange={(e) => setFile(e.target.files && e.target.files.length > 0 ? e.target.files[0] : null)}
        />
      </label>
      <label style={{ fontSize: 12, color: "var(--u-ink-secondary)" }}>
        Notes
        <input style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {formError && <div style={{ color: "var(--u-status-critical)", fontSize: 12 }}>{formError}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? uploadStage ?? "Saving…" : "Save evidence"}
        </Button>
      </div>
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
