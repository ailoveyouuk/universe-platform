import type { CrmOverview, CrmPeopleOption, CrmRelationshipDetail, CrmRelationshipPage, CrmRelationshipRow, CrmRelationshipUpdate } from "@universe/types";
import type { InsightsOverview, InsightsPricedCategory, InsightsPriceTrendPoint, InsightsPriceMovement, InsightsFreightRate, InsightsActivity, InsightsLogisticsTrendPoint, InsightsSourcingTrendPoint, InsightsReferenceCountry, InsightsFxSeries, InsightsServicePrice, InsightsPriceBreakdownRow, InsightsPriceDimension, InsightsUserItem, SaveInsightsUserItemInput } from "@universe/types";
import type {
  ScorecardSettings, UpdateScorecardSettingsInput, PartnerScorecard, ScorecardRecordSet, ComplaintDashboard, ComplaintDetail, ComplaintListItem, CreateComplaintInput,
  TenderDashboard, SupplierPortalDashboard, TenderListItem, TenderDetailForIssuer, TenderRecord, TenderLineRecord, TenderCriterionRecord, TenderRuleRecord, TenderOrganisationOption, TenderChainCheck, PublicNoticeRecord, TenderAvailableItem, TenderAvailableResult, TenderSavedSearchCriteria, TenderSavedSearchRecord, NetworkSavedSearchRecord, NetworkSearchCriteria, TenderParticipantView, TenderBidWorkspace, TenderBidSaveInput, BidTemplateKind, BidTemplateFile, BidTemplateResult, EvaluationOverview, TenderStatusView, MyBidItem, IssuerBidRecord,
  StakeholderAccessOverview,
  PagedResult,
  RiskRegisterCounts,
  ProjectCountryOverview,
  OrganisationExportEntity,
  ProjectOverview,
  UserCounts,
  UserOption,
  PartnerListItem,
  PartnerOverview,
  PartnerOption,
  GrantStakeholderAccessInput,
  AuthenticatedUser,
  ConfirmDocumentUploadInput,
  StandaloneDocumentSummary,
  LinkStandaloneDocumentInput,
  CountryOption,
  RegionSummary,
  CreateOrganizationInput,
  CreatePartnerInput,
  AddPartnerCertificationInput,
  UpdatePartnerCertificationInput,
  AddPartnerCompanyCheckInput,
  UpdatePartnerCompanyCheckInput,
  PartnerCertificationSummary,
  PartnerCompanyCheckSummary,
  PartnerApprovalHistorySummary,
  PartnerFinancialDetailSummary,
  CreateProductMasterInput,
  ImportProductMasterResult,
  ImportProductMasterRow,
  CreateProductSourceApprovalInput,
  CreateProjectInput,
  CreateSupplierEnquiryInput,
  CreateSupplierProductInput,
  InviteUserInput,
  OrganizationSummary,
  OrganizationAccessList,
  TenderContractsForTender, MyPerformanceItem, QualityEvidence, StaffPerformanceRow, StaffPerformanceDetail, SupplierPerformanceSummary, PaymentPracticeSummary,
  OrganizationDetail,
  FieldChangeFeedPage,
  PermissionSummary,
  RoleDetail,
  CreateRoleInput,
  UpdateRoleInput,
  UserDetail,
  UpdateUserInput,
  UpdateOrganizationInput,
  PartnerPerformanceMetric,
  PartnerSummary,
  ProductAmendmentSummary,
  ProductCatalogDetail,
  ProductChangeEntry,
  ProductUsageSummary,
  ProductRegistrationSummary,
  ProductSafetyNoticeSummary,
  CreateSafetyNoticeInput,
  UpdateSafetyNoticeInput,
  ReviewSafetyNoticeInput,
  ProductSafetyFlag,
  RegulatoryWatchDashboard,
  ExportRestrictionSummary,
  ProductExportRestrictionMatch,
  ProductExportFile,
  ExportCapabilities,
  DataExportRequestSummary,
  CreateDataExportRequestInput,
  DecideDataExportRequestInput,
  ProductDossier,
  CreateExportRestrictionInput,
  UpdateExportRestrictionInput,
  ProjectExportCheckItem,
  WatchMatchSummary,
  ProductPharmaPanel,
  ServiceCatalogueRow,
  ServiceCostRange,
  PilLink,
  SafetyNoticeDashboard,
  CreateRegistrationInput,
  UpdateRegistrationInput,
  VerifyRegistrationInput,
  RegulatoryDashboard,
  RegulatoryRegisterPage,
  ProductDocumentSummary,
  ProductFamilyDetail,
  ProductSearchResult,
  ProductSearchScope,
  ProductFamilyListResult,
  ProductFamilySummary,
  CreateProductFamilyInput,
  UpdateProductFamilyInput,
  RequestProductDocumentUploadInput,
  CreateProductDocumentInput,
  ProductCatalogListResult,
  ProductCatalogMatch,
  ProductCatalogCompletenessStats,
  ProductCatalogDashboardStats,
  ProductPriceHistoryPoint,
  RejectProductAmendmentInput,
  ProductSourceApprovalSummary,
  AddProjectContactInput,
  AddProjectLeadInput,
  ContactSummary,
  ProjectDetail,
  ProjectFinancialSummary,
  ProjectLineInput,
  ProjectSummary,
  QualityDashboardSummary,
  QaQueueSummary,
  QaQueuePage,
  LogisticsLinesPage,
  RequestDocumentUploadInput,
  RequestDocumentUploadResult,
  RoleSummary,
  DataSharingConsentSummary,
  OrganizationCountryPresenceSummary,
  ProcurementAgentProfileSummary,
  TenderingBodyProfileSummary,
  OrganizationManufacturerSiteSummary,
  FunderProfileSummary,
  ManufacturerProfileSummary,
  OrganizationScopeSummary,
  OrganizationCard,
  NetworkSearchResult,
  OrganizationCertificationSummary,
  SaveOrganizationCertificationInput,
  DataInsightsUserProfileSummary,
  SupplierLead,
  SupplierProduct,
  SupplierProfile,
  StakeholderRegistryDetail,
  StakeholderRegistryMatch,
  StakeholderRegistryProduct,
  SupplierSearchResult,
  UpdatePartnerInput,
  UpdateProductMasterInput,
  UpdateProductMasterResult,
  UpdateProductSourceApprovalInput,
  UpdateProjectInput,
  UpdateSupplierEnquiryInput,
  UpdateSupplierProductInput,
  UpsertSupplierProfileInput,
  OrgDirectoryProfile,
  UpsertOrgDirectoryProfileInput,
  UserSummary,
  EvidenceStandardSummary,
  StakeholderEvidenceRecordSummary,
  CreateEvidenceStandardInput,
  UpdateEvidenceStandardInput,
  CreateEvidenceRecordInput,
  UpdateEvidenceRecordInput,
  VerifyEvidenceRecordInput,
  ProductBatchSummary,
  ProductBatchDetail,
  BatchTemperatureLogSummary,
  CreateProductBatchInput,
  UpdateProductBatchInput,
  SearchProductBatchesInput,
  CreateTemperatureLogInput,
  ReviewTemperatureLogInput,
  FieldChangeLogEntry,
  RiskAssessmentSummary,
  RiskAssessmentListItem,
  CreateRiskAssessmentInput,
  UpdateRiskAssessmentInput,
  CloseRiskAssessmentInput,
  EvidenceDueForReviewSummary,
  ControlledDocumentSummary,
  CreateControlledDocumentInput,
  UpdateControlledDocumentInput,
  LogisticsFilters,
  OrgLogisticsLineSummary,
  LogisticsRouteSummary,
  ProductSourcingSummary,
  StakeholderRatingSummary,
  SupportContact,
  NotificationItem,
  SearchResponse,
  NotificationSummary,
  AssignProjectActionInput,
  ApprovalSettingsView, ContractListItem, FrameworkView, QuoteManualKey, QuoteResponses, QuoteScheme,
} from "@universe/types";

/**
 * Thin typed wrapper around the shared API service. Every app in the
 * platform uses this instead of calling the database directly, and instead
 * of hand-rolling fetch calls — this is the ONE client all frontends share,
 * so an API contract change only needs updating in one place.
 */
export class UniverseApiClient {
  constructor(
    private baseUrl: string,
    private getAccessToken: () => Promise<string>,
    /** Platform staff only: the organisation chosen in the header switcher.
     * Sent on every request; the API ignores it for everyone else. */
    private getActiveOrganizationId?: () => string | null,
  ) {}

  /** Turns a stored asset path (e.g. an uploaded logo's "/branding/…") into a
   * full URL on the API; absolute URLs pass through unchanged. */
  assetUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    return path.startsWith("/") ? `${this.baseUrl}${path}` : path;
  }

  searchEverything(q: string): Promise<SearchResponse> {
    return this.request(`/search?q=${encodeURIComponent(q)}`);
  }

  // --- Notifications & actions (2026-10-16) ---
  getNotificationSummary(): Promise<NotificationSummary> {
    return this.request("/notifications/summary");
  }
  listNotifications(filter: "all" | "unread" | "actions" | "done" = "all"): Promise<NotificationItem[]> {
    return this.request(`/notifications?filter=${filter}`);
  }
  markNotificationRead(id: string): Promise<NotificationItem> {
    return this.request(`/notifications/${id}/read`, { method: "POST" });
  }
  markAllNotificationsRead(): Promise<{ ok: true }> {
    return this.request("/notifications/read-all", { method: "POST" });
  }
  completeNotification(id: string): Promise<NotificationItem> {
    return this.request(`/notifications/${id}/complete`, { method: "POST" });
  }
  reopenNotification(id: string): Promise<NotificationItem> {
    return this.request(`/notifications/${id}/reopen`, { method: "POST" });
  }
  assignProjectAction(projectId: string, input: AssignProjectActionInput): Promise<{ ok: true }> {
    return this.request(`/projects/${projectId}/actions`, { method: "POST", body: JSON.stringify(input) });
  }

  getSupportContacts(): Promise<SupportContact[]> {
    return this.request("/organizations/current/support-contacts");
  }

  /** Uploads an organisation's logo (PNG/JPEG/WebP/SVG, max 512 KB). */
  async uploadOrganizationLogo(organizationId: string, file: File, variant: "logo" | "icon" = "logo"): Promise<{ logoUrl: string }> {
    const token = await this.getAccessToken();
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(`${this.baseUrl}/organizations/${organizationId}/logo?variant=${variant}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    if (!res.ok) {
      let message = await res.text();
      try {
        const parsed = JSON.parse(message);
        if (typeof parsed?.message === "string") message = parsed.message;
      } catch {
        /* keep raw text */
      }
      throw new Error(message || `Upload failed (${res.status})`);
    }
    return res.json();
  }

  async removeOrganizationLogo(organizationId: string, variant: "logo" | "icon" = "logo"): Promise<void> {
    await this.request<void>(`/organizations/${organizationId}/logo?variant=${variant}`, { method: "DELETE" });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await this.getAccessToken();
    const activeOrg = this.getActiveOrganizationId?.();
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(activeOrg ? { "X-Universe-Organization": activeOrg } : {}),
        ...init?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      // A remembered organisation that no longer exists would otherwise break
      // every request — forget it and fall back to the user's own.
      if (res.status === 400 && activeOrg && body.includes("selected organisation does not exist")) {
        setStoredActiveOrganizationId(null);
        if (typeof window !== "undefined") window.location.reload();
      }
      // Nest's default error body is {"statusCode":...,"message":"...","error":"..."}
      // — surface just the human-readable message when the body parses as
      // that shape (e.g. EvidenceService.gateFailureMessage's text on a
      // blocked partner approval), falling back to the raw body for
      // anything else so nothing silently disappears. Added 2026-10-08
      // alongside the evidence-gating UI, which needs this exact message.
      let message = body;
      let existingProductId: string | undefined;
      try {
        const parsed = JSON.parse(body) as { message?: string | string[]; existingProductId?: string };
        if (typeof parsed.message === "string") message = parsed.message;
        else if (Array.isArray(parsed.message)) message = parsed.message.join(" ");
        if (typeof parsed.existingProductId === "string") existingProductId = parsed.existingProductId;
      } catch {
        // body wasn't JSON — use it as-is
      }
      // A duplicate refusal names the product that already exists so the UI can offer to select it instead.
      throw Object.assign(new Error(message || `API request failed: ${res.status} ${res.statusText}`), existingProductId ? { existingProductId } : {});
    }

    return (await res.json()) as T;
  }

  // ---- Tender Issuance & Management (issuer side, 2026-10-19)
  supplierPortalDashboard(): Promise<SupplierPortalDashboard> { return this.request("/supplier-portal/dashboard"); }
  tenderDashboard(): Promise<TenderDashboard> { return this.request("/tenders/dashboard"); }
  listMyTenders(status?: string): Promise<TenderListItem[]> { return this.request(`/tenders/mine${status ? `?status=${encodeURIComponent(status)}` : ""}`); }
  getMyTender(id: string): Promise<TenderDetailForIssuer> { return this.request(`/tenders/mine/${id}`); }
  createTender(body: Partial<TenderRecord> & { title: string }): Promise<TenderRecord> { return this.request("/tenders", { method: "POST", body: JSON.stringify(body) }); }
  updateTender(id: string, body: Partial<TenderRecord>): Promise<TenderRecord> { return this.request(`/tenders/${id}`, { method: "PATCH", body: JSON.stringify(body) }); }
  setTenderLines(id: string, lines: TenderLineRecord[]): Promise<TenderLineRecord[]> { return this.request(`/tenders/${id}/lines`, { method: "PUT", body: JSON.stringify({ lines }) }); }
  setTenderCriteria(id: string, criteria: TenderCriterionRecord[]): Promise<TenderCriterionRecord[]> { return this.request(`/tenders/${id}/criteria`, { method: "PUT", body: JSON.stringify({ criteria }) }); }
  setTenderRules(id: string, rules: TenderRuleRecord[]): Promise<TenderRuleRecord[]> { return this.request(`/tenders/${id}/rules`, { method: "PUT", body: JSON.stringify({ rules }) }); }
  inviteToTender(id: string, organizationIds: string[]): Promise<{ invited: number }> { return this.request(`/tenders/${id}/invitations`, { method: "POST", body: JSON.stringify({ organizationIds }) }); }
  publishTender(id: string): Promise<TenderRecord> { return this.request(`/tenders/${id}/publish`, { method: "POST" }); }
  cancelTender(id: string, reason: string): Promise<TenderRecord> { return this.request(`/tenders/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }); }
  answerTenderQuestion(id: string, questionId: string, body: { answer: string; publishedQuestion?: string }): Promise<{ answered: boolean }> { return this.request(`/tenders/${id}/questions/${questionId}/answer`, { method: "POST", body: JSON.stringify(body) }); }
  postTenderClarification(id: string, body: { question: string; answer: string }): Promise<{ published: boolean }> { return this.request(`/tenders/${id}/clarifications`, { method: "POST", body: JSON.stringify(body) }); }
  createTenderAddendum(id: string, body: { title: string; body: string; requiresAcknowledgement?: boolean; newClosingAt?: string }): Promise<unknown> { return this.request(`/tenders/${id}/addenda`, { method: "POST", body: JSON.stringify(body) }); }
  recordTenderScreening(id: string, body: { organisationId: string; lists: string[]; outcome: string; notes?: string; screenedOn: string }): Promise<unknown> { return this.request(`/tenders/${id}/screenings`, { method: "POST", body: JSON.stringify(body) }); }
  // ---- participant side and bids (step 3, 2026-10-19)
  listAvailableTenders(q: { chip?: string; type?: string; country?: string; category?: string; keyword?: string; sort?: string; shortlisted?: boolean; status?: string; closingWithinDays?: number; publishedWithinDays?: number; issuer?: string; currency?: string; scopeMatch?: boolean } = {}): Promise<TenderAvailableResult> {
    const p = new URLSearchParams(); for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "" && v !== false) p.set(k, String(v));
    return this.request(`/tenders/available${p.toString() ? `?${p}` : ""}`);
  }
  tendersForYou(): Promise<{ tenders: TenderAvailableItem[]; savedSearches: number }> { return this.request("/tenders/for-you"); }
  listTenderSavedSearches(): Promise<TenderSavedSearchRecord[]> { return this.request("/tenders/saved-searches"); }
  saveTenderSearch(body: TenderSavedSearchCriteria & { name: string; alertsEnabled?: boolean }): Promise<unknown> { return this.request("/tenders/saved-searches", { method: "POST", body: JSON.stringify(body) }); }
  trackTenderAsProject(tenderId: string): Promise<{ projectId: string; created: boolean }> { return this.request(`/tenders/${tenderId}/track-project`, { method: "POST" }); }
  getMyTenderProject(tenderId: string): Promise<{ projectId: string; referenceNumber: string; status: string } | null> { return this.request(`/tenders/${tenderId}/my-project`); }
  updateTenderSavedSearch(id: string, body: { name?: string; alertsEnabled?: boolean }): Promise<unknown> { return this.request(`/tenders/saved-searches/${id}`, { method: "PATCH", body: JSON.stringify(body) }); }
  deleteTenderSavedSearch(id: string): Promise<unknown> { return this.request(`/tenders/saved-searches/${id}`, { method: "DELETE" }); }
  viewTender(id: string): Promise<TenderParticipantView> { return this.request(`/tenders/${id}/view`); }
  expressTenderInterest(id: string, body: { integrityPledge?: boolean; exclusion?: { noGrounds: boolean; grounds?: string[]; explanation?: string } }): Promise<unknown> { return this.request(`/tenders/${id}/interest`, { method: "POST", body: JSON.stringify(body) }); }
  withdrawTenderInterest(id: string): Promise<unknown> { return this.request(`/tenders/${id}/interest`, { method: "DELETE" }); }
  shortlistTender(id: string, note?: string): Promise<unknown> { return this.request(`/tenders/${id}/shortlist`, { method: "PUT", body: JSON.stringify({ note }) }); }
  unshortlistTender(id: string): Promise<unknown> { return this.request(`/tenders/${id}/shortlist`, { method: "DELETE" }); }
  askTenderQuestion(id: string, question: string): Promise<unknown> { return this.request(`/tenders/${id}/questions`, { method: "POST", body: JSON.stringify({ question }) }); }
  acknowledgeTenderAddendum(id: string, addendumId: string): Promise<unknown> { return this.request(`/tenders/${id}/addenda/${addendumId}/acknowledge`, { method: "POST" }); }
  myTenderBids(): Promise<MyBidItem[]> { return this.request("/tenders/bids/mine"); }
  getTenderBid(id: string): Promise<TenderBidWorkspace> { return this.request(`/tenders/${id}/bid`); }
  saveTenderBid(id: string, body: TenderBidSaveInput): Promise<TenderBidWorkspace> { return this.request(`/tenders/${id}/bid`, { method: "PUT", body: JSON.stringify(body) }); }
  downloadTenderBidTemplate(id: string, kind: BidTemplateKind): Promise<BidTemplateFile> { return this.request(`/tenders/${id}/bid/template/${kind}`); }
  uploadTenderBidTemplate(id: string, kind: BidTemplateKind, fileName: string, contentBase64: string): Promise<BidTemplateResult> { return this.request(`/tenders/${id}/bid/template/${kind}`, { method: "POST", body: JSON.stringify({ fileName, contentBase64 }) }); }
  // ---- evaluation, award, status (step 4)
  openTenderBids(id: string): Promise<{ openedAt: string }> { return this.request(`/tenders/${id}/bids/open`, { method: "POST" }); }
  tenderEvaluation(id: string): Promise<EvaluationOverview> { return this.request(`/tenders/${id}/evaluation`); }
  /** OCDS 1.1 release package for a tender the caller owns. */
  tenderOcds(id: string): Promise<Record<string, unknown>> { return this.request(`/tenders/${id}/ocds`); }
  evaluatorCandidates(id: string, q = ""): Promise<{ id: string; name: string; email: string }[]> { return this.request(`/tenders/${id}/evaluation/candidates?q=${encodeURIComponent(q)}`); }
  getScorecardRecords(partnerId: string, key: string): Promise<ScorecardRecordSet> { return this.request(`/quality/partner-scorecard/${partnerId}/records/${key}`); }
  getScorecardSettings(): Promise<ScorecardSettings> { return this.request("/quality/partner-scorecard/settings"); }
  updateScorecardSettings(body: UpdateScorecardSettingsInput): Promise<ScorecardSettings> { return this.request("/quality/partner-scorecard/settings", { method: "PUT", body: JSON.stringify(body) }); }
  resetScorecardSettings(): Promise<ScorecardSettings> { return this.request("/quality/partner-scorecard/settings/reset", { method: "POST", body: "{}" }); }
  getPartnerScorecard(partnerId: string): Promise<PartnerScorecard> { return this.request(`/quality/partner-scorecard/${partnerId}`); }
  // ---- Quality complaints (2026-10-20) ----
  complaintDashboard(): Promise<ComplaintDashboard> { return this.request("/quality/complaints/dashboard"); }
  complaintsPage(params: { q?: string; status?: string; direction?: string; severity?: string; category?: string; partnerId?: string; projectId?: string; overdue?: boolean; serious?: boolean; open?: boolean; triage?: boolean; actions?: boolean; page?: number; pageSize?: number }): Promise<PagedResult<ComplaintListItem>> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && v !== false) qs.set(k, String(v));
    return this.request(`/quality/complaints/page?${qs.toString()}`);
  }
  getComplaint(id: string): Promise<ComplaintDetail> { return this.request(`/quality/complaints/${id}`); }
  createComplaint(body: CreateComplaintInput): Promise<ComplaintDetail> { return this.request("/quality/complaints", { method: "POST", body: JSON.stringify(body) }); }
  updateComplaint(id: string, body: Partial<CreateComplaintInput>): Promise<ComplaintDetail> { return this.request(`/quality/complaints/${id}`, { method: "PATCH", body: JSON.stringify(body) }); }
  /** One call for every stage action: acknowledge, triage, investigation, partner-response, resolve, regulator, close, effectiveness, hold, resume, withdraw, reopen, notes, actions, risk, source-review. */
  complaintStage(id: string, stage: string, body?: object): Promise<ComplaintDetail> { return this.request(`/quality/complaints/${id}/${stage}`, { method: "POST", body: JSON.stringify(body ?? {}) }); }
  getPartnerScorecardScores(ids: string[]): Promise<{ partnerId: string; overallScore: number | null; band: string; attention: number }[]> { return this.request(`/quality/partner-scorecard/scores?ids=${encodeURIComponent(ids.join(","))}`); }
  addComplaintAttachment(id: string, body: { documentId: string; note?: string }): Promise<ComplaintDetail> { return this.request(`/quality/complaints/${id}/attachments`, { method: "POST", body: JSON.stringify(body) }); }
  removeComplaintAttachment(id: string, attachmentId: string): Promise<ComplaintDetail> { return this.request(`/quality/complaints/${id}/attachments/${attachmentId}`, { method: "DELETE" }); }
  updateComplaintAction(id: string, actionId: string, body: { status?: string; completionNotes?: string; dueDate?: string; ownerId?: string }): Promise<ComplaintDetail> { return this.request(`/quality/complaints/${id}/actions/${actionId}`, { method: "PATCH", body: JSON.stringify(body) }); }
  evaluationBidders(id: string): Promise<{ id: string; name: string }[]> { return this.request(`/tenders/${id}/evaluation/bidders`); }
  setTenderEvaluators(id: string, evaluators: { userId: string; role: "CHAIR" | "EVALUATOR" }[]): Promise<EvaluationOverview> { return this.request(`/tenders/${id}/evaluation/evaluators`, { method: "PUT", body: JSON.stringify({ evaluators }) }); }
  declareEvaluatorConflict(id: string, body: { noConflict: boolean; conflictedOrganisationIds?: string[]; notes?: string }): Promise<EvaluationOverview> { return this.request(`/tenders/${id}/evaluation/conflict`, { method: "PUT", body: JSON.stringify(body) }); }
  startTenderEvaluation(id: string): Promise<EvaluationOverview> { return this.request(`/tenders/${id}/evaluation/start`, { method: "POST" }); }
  recordTenderGate(id: string, body: { bidId: string; criterionId: string; passed: boolean; notes?: string }): Promise<EvaluationOverview> { return this.request(`/tenders/${id}/evaluation/gates`, { method: "PUT", body: JSON.stringify(body) }); }
  saveTenderScores(id: string, body: { bidId: string; scores: { criterionId: string; score: number; rationale?: string }[]; submit?: boolean }): Promise<EvaluationOverview> { return this.request(`/tenders/${id}/evaluation/scores`, { method: "PUT", body: JSON.stringify(body) }); }
  moderateTenderScore(id: string, body: { bidId: string; criterionId: string; score: number; rationale?: string }): Promise<EvaluationOverview> { return this.request(`/tenders/${id}/evaluation/moderation`, { method: "PUT", body: JSON.stringify(body) }); }
  finaliseTenderScoring(id: string): Promise<EvaluationOverview> { return this.request(`/tenders/${id}/evaluation/finalise`, { method: "POST" }); }
  awardTender(id: string, body: { awards: { bidId: string; reason: string; lines?: { tenderLineId: string; sharePercent: number }[] }[]; feedback?: { bidId: string; text: string }[]; waiveStandstill?: boolean }): Promise<EvaluationOverview> { return this.request(`/tenders/${id}/award`, { method: "POST", body: JSON.stringify(body) }); }
  approveTenderAward(id: string): Promise<EvaluationOverview> { return this.request(`/tenders/${id}/award/approve`, { method: "POST" }); }
  rejectTenderAward(id: string, reason: string): Promise<EvaluationOverview> { return this.request(`/tenders/${id}/award/reject`, { method: "POST", body: JSON.stringify({ reason }) }); }
  updateTenderDebrief(id: string, bidId: string, feedback: string): Promise<unknown> { return this.request(`/tenders/${id}/debriefs/${bidId}`, { method: "PUT", body: JSON.stringify({ feedback }) }); }
  respondTenderComplaint(id: string, complaintId: string, body: { status: "UPHELD" | "REJECTED" | "RESOLVED"; response: string }): Promise<unknown> { return this.request(`/tenders/${id}/complaints/${complaintId}/respond`, { method: "POST", body: JSON.stringify(body) }); }
  tenderStatus(id: string): Promise<TenderStatusView> { return this.request(`/tenders/${id}/status`); }
  lodgeTenderComplaint(id: string, body: string): Promise<unknown> { return this.request(`/tenders/${id}/complaints`, { method: "POST", body: JSON.stringify({ body }) }); }
  submitTenderBid(id: string): Promise<{ submitted: boolean; totalTenderCurrency: string | null; fxRate: string | null; fxRateDate: string | null }> { return this.request(`/tenders/${id}/bid/submit`, { method: "POST" }); }
  withdrawTenderBid(id: string): Promise<unknown> { return this.request(`/tenders/${id}/bid/withdraw`, { method: "POST" }); }
  /** Uploads one file for a bid: asks for a write link, puts the file straight to storage, then records it. */
  async uploadTenderBidFile(id: string, file: File, criterionId: string | null): Promise<TenderBidWorkspace> {
    const up = await this.request<{ uploadUrl: string; blobName: string }>(`/tenders/${id}/bid/files/upload-url`, { method: "POST", body: JSON.stringify({ fileName: file.name, contentType: file.type || "application/octet-stream", fileSizeBytes: file.size }) });
    await this.uploadDocumentFile(up.uploadUrl, file);
    return this.request(`/tenders/${id}/bid/files`, { method: "POST", body: JSON.stringify({ blobName: up.blobName, fileName: file.name, mimeType: file.type || undefined, fileSizeBytes: file.size, criterionId }) });
  }
  async uploadTenderDocument(id: string, file: File, meta: { title: string; docType: string; description?: string; replacesDocumentId?: string }): Promise<{ id: string; version: number }> {
    const up = await this.request<{ uploadUrl: string; blobName: string }>(`/tenders/${id}/documents/upload-url`, { method: "POST", body: JSON.stringify({ fileName: file.name, contentType: file.type || "application/octet-stream", fileSizeBytes: file.size }) });
    await this.uploadDocumentFile(up.uploadUrl, file);
    return this.request(`/tenders/${id}/documents`, { method: "POST", body: JSON.stringify({ blobName: up.blobName, fileName: file.name, mimeType: file.type || undefined, fileSizeBytes: file.size, ...meta }) });
  }
  removeTenderDocument(id: string, docId: string): Promise<{ removed: boolean }> { return this.request(`/tenders/${id}/documents/${docId}`, { method: "DELETE" }); }
  tenderDocumentUrl(id: string, docId: string): Promise<{ downloadUrl: string; fileName: string | null }> { return this.request(`/tenders/${id}/documents/${docId}/download-url`); }
  tenderContracts(id: string): Promise<TenderContractsForTender> { return this.request(`/tenders/${id}/contracts`); }
  createTenderContract(id: string, awardId: string): Promise<TenderContractsForTender> { return this.request(`/tenders/${id}/contracts/${awardId}`, { method: "POST" }); }
  updateTenderContract(cid: string, body: { title?: string; totalValue?: number; startDate?: string; endDate?: string; terms?: string }): Promise<TenderContractsForTender> { return this.request(`/tenders/contracts/${cid}`, { method: "PATCH", body: JSON.stringify(body) }); }
  addContractMilestone(cid: string, body: { title: string; dueDate?: string }): Promise<TenderContractsForTender> { return this.request(`/tenders/contracts/${cid}/milestones`, { method: "POST", body: JSON.stringify(body) }); }
  updateContractMilestone(cid: string, mid: string, body: { status?: string; notes?: string }): Promise<TenderContractsForTender> { return this.request(`/tenders/contracts/${cid}/milestones/${mid}`, { method: "PATCH", body: JSON.stringify(body) }); }
  sendTenderContract(cid: string): Promise<TenderContractsForTender> { return this.request(`/tenders/contracts/${cid}/send`, { method: "POST" }); }
  closeTenderContract(cid: string, body: { outcome: string; note: string; qualityChecked?: boolean; feedback?: { quality: number; communication: number; documentation: number; flexibility: number; wouldUseAgain: number; reasons?: Record<string, string>; comment?: string } }): Promise<TenderContractsForTender> { return this.request(`/tenders/contracts/${cid}/close`, { method: "POST", body: JSON.stringify(body) }); }
  contractQualityEvidence(cid: string): Promise<QualityEvidence> { return this.request(`/tenders/contracts/${cid}/quality`); }
  setContractQualityLinks(cid: string, body: { complaintIds: string[]; temperatureLogIds: string[] }): Promise<QualityEvidence> { return this.request(`/tenders/contracts/${cid}/quality`, { method: "PUT", body: JSON.stringify(body) }); }
  staffPerformanceDetail(rid: string): Promise<StaffPerformanceDetail> { return this.request(`/tenders/performance/${rid}/staff`); }
  staffPerformanceRecords(): Promise<StaffPerformanceRow[]> { return this.request(`/tenders/performance/staff`); }
  withdrawPerformanceRecord(rid: string, reason: string): Promise<{ ok: boolean }> { return this.request(`/tenders/performance/${rid}/withdraw`, { method: "POST", body: JSON.stringify({ body: reason }) }); }
  restorePerformanceRecord(rid: string): Promise<{ ok: boolean }> { return this.request(`/tenders/performance/${rid}/restore`, { method: "POST" }); }
  frameworkView(id: string): Promise<FrameworkView> { return this.request(`/tenders/${id}/framework`); }
  frameworkSettings(): Promise<ApprovalSettingsView> { return this.request(`/tenders/framework/settings`); }
  saveFrameworkSettings(body: { individualLimit: number; splitWindowDays: number; limitCurrency?: string; roleLimits?: { roleId: string; limit: number }[] }): Promise<ApprovalSettingsView> { return this.request(`/tenders/framework/settings`, { method: "PUT", body: JSON.stringify(body) }); }
  raiseCallOff(id: string, body: { lines: { tenderLineId: string; quantity: number }[]; deliveryCountryCode?: string; requiredBy?: string; notes?: string }): Promise<{ id: string; status: string; warnings: string[] }> { return this.request(`/tenders/${id}/call-offs`, { method: "POST", body: JSON.stringify(body) }); }
  approveCallOff(cid: string): Promise<FrameworkView> { return this.request(`/tenders/call-offs/${cid}/approve`, { method: "POST" }); }
  rejectCallOff(cid: string, reason: string): Promise<FrameworkView> { return this.request(`/tenders/call-offs/${cid}/reject`, { method: "POST", body: JSON.stringify({ reason }) }); }
  cancelCallOff(cid: string, reason: string): Promise<FrameworkView> { return this.request(`/tenders/call-offs/${cid}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }); }
  respondCallOff(cid: string, accept: boolean, reason?: string): Promise<FrameworkView> { return this.request(`/tenders/call-offs/${cid}/respond`, { method: "POST", body: JSON.stringify({ accept, reason }) }); }
  openMiniCompetition(id: string, body: { lines: { tenderLineId: string; quantity: number }[]; closesAt: string; deliveryCountryCode?: string; requiredBy?: string; notes?: string; scheme?: QuoteScheme }): Promise<FrameworkView> { return this.request(`/tenders/${id}/mini-competitions`, { method: "POST", body: JSON.stringify(body) }); }
  closeMiniCompetition(mid: string): Promise<FrameworkView> { return this.request(`/tenders/mini-competitions/${mid}/close`, { method: "POST" }); }
  cancelMiniCompetition(mid: string, reason: string): Promise<FrameworkView> { return this.request(`/tenders/mini-competitions/${mid}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }); }
  awardMiniCompetition(mid: string, body: { quoteId: string; reason: string }): Promise<{ id: string; status: string; warnings: string[] }> { return this.request(`/tenders/mini-competitions/${mid}/award`, { method: "POST", body: JSON.stringify(body) }); }
  scoreMiniQuote(qid: string, body: { criterion: QuoteManualKey; score: number; reason: string }): Promise<FrameworkView> { return this.request(`/tenders/mini-quotes/${qid}/score`, { method: "POST", body: JSON.stringify(body) }); }
  submitMiniQuote(qid: string, body: { lines: { tenderLineId: string; quotedPrice: number; leadTimeDays?: number }[]; notes?: string; responses?: Omit<QuoteResponses, "requirements"> & { requirements: Record<string, { met: boolean; note?: string | null }> } }): Promise<FrameworkView> { return this.request(`/tenders/mini-quotes/${qid}/quote`, { method: "POST", body: JSON.stringify(body) }); }
  declineMiniQuote(qid: string, reason: string): Promise<FrameworkView> { return this.request(`/tenders/mini-quotes/${qid}/decline`, { method: "POST", body: JSON.stringify({ reason }) }); }
  createCallOffProject(cid: string): Promise<{ projectId: string }> { return this.request(`/tenders/call-offs/${cid}/project`, { method: "POST" }); }
  proposePriceReview(contractId: string, body: { tenderLineId: string; proposedPrice: number; reason: string }): Promise<FrameworkView> { return this.request(`/tenders/contracts/${contractId}/price-reviews`, { method: "POST", body: JSON.stringify(body) }); }
  respondPriceReview(rid: string, accept: boolean, note?: string): Promise<FrameworkView> { return this.request(`/tenders/price-reviews/${rid}/respond`, { method: "POST", body: JSON.stringify({ accept, note }) }); }
  myPerformance(): Promise<MyPerformanceItem[]> { return this.request(`/tenders/performance/mine`); }
  supplierPerformance(orgId: string): Promise<SupplierPerformanceSummary> { return this.request(`/tenders/performance/supplier/${orgId}`); }
  ownerPaymentPractice(orgId: string): Promise<PaymentPracticeSummary> { return this.request(`/tenders/performance/owner/${orgId}/payments`); }
  respondToPerformance(rid: string, body: { kind: "REPLY" | "DISPUTE"; measureKey?: string; body: string }): Promise<{ ok: boolean; tenderId: string }> { return this.request(`/tenders/performance/${rid}/respond`, { method: "POST", body: JSON.stringify(body) }); }
  answerPerformanceDispute(rid: string, body: string): Promise<{ ok: boolean; tenderId: string }> { return this.request(`/tenders/performance/${rid}/answer`, { method: "POST", body: JSON.stringify({ body }) }); }
  addContractPayment(cid: string, body: { reference: string; description?: string; amount: number; currency?: string; invoiceDate?: string; dueDate: string; paidDate?: string }): Promise<{ tenderId: string }> { return this.request(`/tenders/contracts/${cid}/payments`, { method: "POST", body: JSON.stringify(body) }); }
  updateContractPayment(cid: string, pid: string, body: { dueDate?: string; paidDate?: string | null; description?: string }): Promise<{ tenderId: string }> { return this.request(`/tenders/contracts/${cid}/payments/${pid}`, { method: "PATCH", body: JSON.stringify(body) }); }
  async uploadContractFile(cid: string, file: File, meta: { kind: string; title: string; note?: string }): Promise<TenderContractsForTender> {
    const up = await this.request<{ uploadUrl: string; blobName: string }>(`/tenders/contracts/${cid}/files/upload-url`, { method: "POST", body: JSON.stringify({ fileName: file.name, contentType: file.type || "application/octet-stream", fileSizeBytes: file.size }) });
    await this.uploadDocumentFile(up.uploadUrl, file);
    return this.request(`/tenders/contracts/${cid}/files`, { method: "POST", body: JSON.stringify({ blobName: up.blobName, fileName: file.name, mimeType: file.type || undefined, fileSizeBytes: file.size, ...meta }) });
  }
  contractFileUrl(cid: string, fid: string): Promise<{ downloadUrl: string; fileName: string }> { return this.request(`/tenders/contracts/${cid}/files/${fid}/download-url`); }
  async addContractEvidence(cid: string, file: File | null, meta: { kind: string; title: string; description?: string; reference?: string; evidenceDate: string; linkType?: string; linkId?: string }): Promise<{ tenderId: string }> {
    let upload: { blobName?: string; fileName?: string; mimeType?: string; fileSizeBytes?: number; sha256?: string } = {};
    if (file) {
      const up = await this.request<{ uploadUrl: string; blobName: string }>(`/tenders/contracts/${cid}/evidence/upload-url`, { method: "POST", body: JSON.stringify({ fileName: file.name, contentType: file.type || "application/octet-stream", fileSizeBytes: file.size }) });
      await this.uploadDocumentFile(up.uploadUrl, file);
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      upload = { blobName: up.blobName, fileName: file.name, mimeType: file.type || undefined, fileSizeBytes: file.size, sha256: Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("") };
    }
    return this.request(`/tenders/contracts/${cid}/evidence`, { method: "POST", body: JSON.stringify({ ...meta, ...upload }) });
  }
  acknowledgeEvidence(eid: string): Promise<{ tenderId: string }> { return this.request(`/tenders/evidence/${eid}/acknowledge`, { method: "POST" }); }
  withdrawEvidence(eid: string, reason: string): Promise<{ tenderId: string }> { return this.request(`/tenders/evidence/${eid}/withdraw`, { method: "POST", body: JSON.stringify({ reason }) }); }
  evidenceFileUrl(eid: string): Promise<{ downloadUrl: string; fileName: string }> { return this.request(`/tenders/evidence/${eid}/download-url`); }
  contractList(): Promise<ContractListItem[]> { return this.request(`/tenders/contracts-overview`); }
  proposeContractVariation(cid: string, body: { title: string; reason: string; newTotalValue?: number; newEndDate?: string; termsAmendment?: string }): Promise<{ tenderId: string }> { return this.request(`/tenders/contracts/${cid}/variations`, { method: "POST", body: JSON.stringify(body) }); }
  respondContractVariation(vid: string, accept: boolean, note?: string): Promise<{ tenderId: string }> { return this.request(`/tenders/variations/${vid}/respond`, { method: "POST", body: JSON.stringify({ accept, note }) }); }
  withdrawContractVariation(vid: string, reason: string): Promise<{ tenderId: string }> { return this.request(`/tenders/variations/${vid}/withdraw`, { method: "POST", body: JSON.stringify({ reason }) }); }
  addContractSignatory(cid: string, body: { signerName: string; signerRole?: string; signedOn: string }): Promise<TenderContractsForTender> { return this.request(`/tenders/contracts/${cid}/signatories`, { method: "POST", body: JSON.stringify(body) }); }
  removeContractSignatory(cid: string, sid: string): Promise<TenderContractsForTender> { return this.request(`/tenders/contracts/${cid}/signatories/${sid}`, { method: "DELETE" }); }
  createContractProject(cid: string): Promise<{ projectId: string }> { return this.request(`/tenders/contracts/${cid}/project`, { method: "POST" }); }
  removeTenderBidFile(id: string, fileId: string): Promise<TenderBidWorkspace> { return this.request(`/tenders/${id}/bid/files/${fileId}`, { method: "DELETE" }); }
  tenderBidFileUrl(id: string, fileId: string): Promise<{ downloadUrl: string }> { return this.request(`/tenders/${id}/bid/files/${fileId}/download-url`); }
  listTenderBids(id: string): Promise<IssuerBidRecord[]> { return this.request(`/tenders/${id}/bids`); }
  tenderBidCount(id: string): Promise<number> { return this.request(`/tenders/${id}/bids/count`); }
  issuerTenderBidFileUrl(id: string, fileId: string): Promise<{ downloadUrl: string }> { return this.request(`/tenders/${id}/bids/files/${fileId}/download-url`); }
  verifyTenderTimeline(id: string): Promise<TenderChainCheck> { return this.request(`/tenders/${id}/timeline/verify`); }
  /** Public notices need no sign-in, so this bypasses the token. */
  async listPublicNotices(): Promise<PublicNoticeRecord[]> { const r = await fetch(`${this.baseUrl}/public/notices`); if (!r.ok) throw new Error("Could not load notices."); return r.json(); }
  async getPublicNotice(id: string): Promise<PublicNoticeRecord | null> { const r = await fetch(`${this.baseUrl}/public/notices/${encodeURIComponent(id)}`); if (!r.ok) throw new Error("Could not load the notice."); const t = await r.text(); return t ? JSON.parse(t) : null; }
  searchTenderOrganisations(q: string): Promise<TenderOrganisationOption[]> { return this.request(`/tenders/organisations?q=${encodeURIComponent(q)}`); }

  me(): Promise<AuthenticatedUser> {
    return this.request("/me");
  }

  /** Server-paged, filtered, sorted project list. */
  listProjectsPage(params: { page?: number; pageSize?: number; q?: string; status?: string; type?: string; country?: string; source?: string; archived?: boolean; sort?: string; dir?: string }): Promise<PagedResult<ProjectSummary>> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && v !== false) qs.set(k, String(v));
    return this.request(`/projects/page?${qs.toString()}`);
  }

  getProjectOverview(): Promise<ProjectOverview> {
    return this.request("/projects/overview");
  }

  getProjectCountryOverview(): Promise<ProjectCountryOverview[]> {
    return this.request("/projects/country-overview");
  }

  /** @deprecated Capped at 500 — use listProjectsPage / getProjectOverview. */
  listProjects(): Promise<ProjectSummary[]> {
    return this.request("/projects");
  }

  getProject(id: string): Promise<ProjectDetail> {
    return this.request(`/projects/${id}`);
  }

  getProjectFinancialSummary(currency?: string): Promise<ProjectFinancialSummary> {
    return this.request(`/projects/financial-summary${currency ? `?currency=${currency}` : ""}`);
  }

  getSingleProjectFinancialSummary(projectId: string, currency?: string): Promise<ProjectFinancialSummary> {
    return this.request(`/projects/${projectId}/financial-summary${currency ? `?currency=${currency}` : ""}`);
  }

  createProject(input: CreateProjectInput): Promise<ProjectSummary> {
    return this.request("/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateProject(id: string, input: UpdateProjectInput): Promise<ProjectDetail> {
    return this.request(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  /** Soft-delete/retirement — see Project.isArchived's doc comment in
   * schema.prisma. Never a hard delete — see ProjectsService.archive. */
  archiveProject(id: string): Promise<ProjectDetail> {
    return this.request(`/projects/${id}/archive`, { method: "PATCH" });
  }

  unarchiveProject(id: string): Promise<ProjectDetail> {
    return this.request(`/projects/${id}/unarchive`, { method: "PATCH" });
  }

  addProjectLine(projectId: string, input: ProjectLineInput): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/lines`, { method: "POST", body: JSON.stringify(input) });
  }

  updateProjectLine(projectId: string, lineId: string, input: ProjectLineInput): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/lines/${lineId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  archiveProjectLine(projectId: string, lineId: string): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/lines/${lineId}`, { method: "DELETE" });
  }

  // --- Supplier Enquiries (added 2026-09-30, Phase 2) ---
  // Every call returns the full ProjectDetail (same shape GET /projects/:id
  // already returns) — see SupplierEnquiriesService's doc comment. There is
  // deliberately no standalone listSupplierEnquiries(): the enquiries for a
  // line are always already present on ProjectDetail.lines[n].enquiries.

  createSupplierEnquiry(projectId: string, lineId: string, input: CreateSupplierEnquiryInput): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/lines/${lineId}/enquiries`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateSupplierEnquiry(
    projectId: string,
    lineId: string,
    enquiryId: string,
    input: UpdateSupplierEnquiryInput,
  ): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/lines/${lineId}/enquiries/${enquiryId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  // --- Documents (added 2026-10-01, Phase 2b — Blob Storage) ---
  // Two-step upload: request a short-lived SAS upload URL, PUT the file
  // bytes straight to Blob Storage with it, then confirm with the
  // metadata. See DocumentsService's doc comment in apps/api for the full
  // design. Every call that touches a project's document list returns the
  // full ProjectDetail, same convention as Supplier Enquiries above.

  requestDocumentUploadUrl(projectId: string, input: RequestDocumentUploadInput): Promise<RequestDocumentUploadResult> {
    return this.request(`/projects/${projectId}/documents/upload-url`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  /** Not routed through `request()` — this goes straight to Blob Storage
   * using the SAS-bearing uploadUrl from requestDocumentUploadUrl(), not
   * this API, and must NOT carry an Authorization/Bearer header (Blob
   * Storage would reject a request bearing an unrelated auth scheme
   * alongside its own SAS query-string auth). */
  async uploadDocumentFile(uploadUrl: string, file: File): Promise<void> {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Document upload failed: ${res.status} ${res.statusText} — ${body}`);
    }
  }

  confirmDocumentUpload(projectId: string, input: ConfirmDocumentUploadInput): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/documents`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  getDocumentDownloadUrl(projectId: string, documentId: string): Promise<{ downloadUrl: string }> {
    return this.request(`/projects/${projectId}/documents/${documentId}/download-url`);
  }

  deleteDocument(projectId: string, documentId: string): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/documents/${documentId}`, { method: "DELETE" });
  }

  // --- Standalone documents (added 2026-10-08, stakeholder-evidence
  // document upload). Same two-step SAS flow as the project-scoped
  // methods above, just without a projectId — see
  // DocumentsStandaloneController in apps/api. ---

  requestStandaloneDocumentUploadUrl(input: RequestDocumentUploadInput): Promise<RequestDocumentUploadResult> {
    return this.request(`/documents/upload-url`, { method: "POST", body: JSON.stringify(input) });
  }

  confirmStandaloneDocumentUpload(input: ConfirmDocumentUploadInput): Promise<StandaloneDocumentSummary> {
    return this.request(`/documents`, { method: "POST", body: JSON.stringify(input) });
  }

  linkStandaloneDocument(input: LinkStandaloneDocumentInput): Promise<StandaloneDocumentSummary> {
    return this.request(`/documents/link`, { method: "POST", body: JSON.stringify(input) });
  }

  getStandaloneDocumentDownloadUrl(documentId: string): Promise<{ downloadUrl: string }> {
    return this.request(`/documents/${documentId}/download-url`);
  }

  deleteStandaloneDocument(documentId: string): Promise<void> {
    return this.request(`/documents/${documentId}`, { method: "DELETE" });
  }

  // --- Project status history / Leads / Contacts (added 2026-10-08) ---
  // Leads/Contacts calls return the full ProjectDetail, same convention as
  // addProjectLine/documents above — the caller just swaps project state
  // in on every mutation rather than re-fetching separately.

  addProjectLead(projectId: string, input: AddProjectLeadInput): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/leads`, { method: "POST", body: JSON.stringify(input) });
  }

  removeProjectLead(projectId: string, userId: string): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/leads/${userId}`, { method: "DELETE" });
  }

  addProjectContact(projectId: string, input: AddProjectContactInput): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/contacts`, { method: "POST", body: JSON.stringify(input) });
  }

  removeProjectContact(projectId: string, contactId: string): Promise<ProjectDetail> {
    return this.request(`/projects/${projectId}/contacts/${contactId}`, { method: "DELETE" });
  }

  // --- Contacts (added 2026-10-08) — read-only finder backing the Team &
  // Contacts picker above. See ContactsService's doc comment in apps/api. ---

  /** Search-driven contact finder (max 100 per call) — an organisation can hold thousands. */
  listContacts(q?: string, limit?: number): Promise<ContactSummary[]> {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (limit) qs.set("limit", String(limit));
    return this.request(`/contacts${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  // --- Partners (added 2026-09-27) ---

  /** Server-paged, filtered, sorted stakeholder list (slim rows). */
  listPartnersPage(params: { page?: number; pageSize?: number; q?: string; roleType?: string; approval?: string; country?: string; risk?: string; sort?: string; dir?: string }): Promise<PagedResult<PartnerListItem>> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
    return this.request(`/partners/page?${qs.toString()}`);
  }

  getPartnerOverview(): Promise<PartnerOverview> {
    return this.request("/partners/overview");
  }

  /** Slim id/name list for dropdown pickers. */
  listPartnerOptions(roleType?: string): Promise<PartnerOption[]> {
    return this.request(`/partners/options${roleType ? `?roleType=${encodeURIComponent(roleType)}` : ""}`);
  }

  /** @deprecated Unpaged, heavy and capped at 500 — use listPartnersPage / getPartnerOverview / listPartnerOptions. */
  listPartners(roleType?: string): Promise<PartnerSummary[]> {
    const query = roleType ? `?roleType=${encodeURIComponent(roleType)}` : "";
    return this.request(`/partners${query}`);
  }

  getPartner(id: string): Promise<PartnerSummary> {
    return this.request(`/partners/${id}`);
  }

  createPartner(input: CreatePartnerInput): Promise<PartnerSummary> {
    return this.request("/partners", { method: "POST", body: JSON.stringify(input) });
  }

  updatePartner(id: string, input: UpdatePartnerInput): Promise<PartnerSummary> {
    return this.request(`/partners/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  // --- Partner certifications / company checks / approval history
  // (added 2026-10-08) — single-record add/edit, filling the gap
  // updatePartner's addCertifications/addCompanyChecks left open (whole-
  // Partner-object, add-only). See AddPartnerCertificationInput's doc
  // comment in @universe/types.

  addPartnerCertification(partnerId: string, input: AddPartnerCertificationInput): Promise<PartnerCertificationSummary> {
    return this.request(`/partners/${partnerId}/certifications`, { method: "POST", body: JSON.stringify(input) });
  }

  updatePartnerCertification(
    partnerId: string,
    certId: string,
    input: UpdatePartnerCertificationInput,
  ): Promise<PartnerCertificationSummary> {
    return this.request(`/partners/${partnerId}/certifications/${certId}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  addPartnerCompanyCheck(partnerId: string, input: AddPartnerCompanyCheckInput): Promise<PartnerCompanyCheckSummary> {
    return this.request(`/partners/${partnerId}/company-checks`, { method: "POST", body: JSON.stringify(input) });
  }

  updatePartnerCompanyCheck(
    partnerId: string,
    checkId: string,
    input: UpdatePartnerCompanyCheckInput,
  ): Promise<PartnerCompanyCheckSummary> {
    return this.request(`/partners/${partnerId}/company-checks/${checkId}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  listPartnerApprovalHistory(partnerId: string): Promise<PartnerApprovalHistorySummary[]> {
    return this.request(`/partners/${partnerId}/approval-history`);
  }

  /** PartnerFinancialDetail is one-to-one with Partner — see
   * partner-financial-detail.dto.ts's doc comment — so this returns null
   * (not a 404) when no row has been entered yet. Added 2026-10-14. */
  getPartnerFinancialDetail(partnerId: string): Promise<PartnerFinancialDetailSummary | null> {
    return this.request(`/partners/${partnerId}/financial-detail`);
  }

  upsertPartnerFinancialDetail(
    partnerId: string,
    input: Partial<Omit<PartnerFinancialDetailSummary, "partnerId">>,
  ): Promise<PartnerFinancialDetailSummary> {
    return this.request(`/partners/${partnerId}/financial-detail`, { method: "PUT", body: JSON.stringify(input) });
  }

  // --- Stakeholder registry (added 2026-10-02) — duplicate-prevention +
  // identity-consent gating, see StakeholderRegistryEntry in schema.prisma
  // and claude/sop-driven-quality-roadmap.md Section B3/C. ---

  searchStakeholderRegistry(
    type: string,
    q: string,
    field?: "name" | "registrationNumber" | "vatNumber",
  ): Promise<StakeholderRegistryMatch[]> {
    const query = `?type=${encodeURIComponent(type)}&q=${encodeURIComponent(q)}${
      field ? `&field=${encodeURIComponent(field)}` : ""
    }`;
    return this.request(`/stakeholder-registry/search${query}`);
  }

  getStakeholderRegistryEntry(id: string): Promise<StakeholderRegistryDetail> {
    return this.request(`/stakeholder-registry/${id}`);
  }

  getStakeholderRegistryProducts(id: string): Promise<StakeholderRegistryProduct[]> {
    return this.request(`/stakeholder-registry/${id}/products`);
  }

  // --- Product catalog (added 2026-10-02) — the shared, central
  // ProductMaster search-or-create flow. See ProductCatalogService's doc
  // comment in apps/api and claude/product-catalog-build.md: CRM and the
  // future Supplier Portal app should call these same three methods rather
  // than rebuilding product search/creation. ---

  /** Scoped project-line search: shared catalogue plus this organisation's own approvals, tagged (2026-10-18). */
  searchProductCatalogScoped(q: string | undefined, category: string | undefined, scope: ProductSearchScope = "ALL"): Promise<ProductSearchResult[]> {
    const params = new URLSearchParams({ scope });
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    return this.request(`/product-catalog/search-scoped?${params.toString()}`);
  }
  searchProductCatalog(q?: string, category?: string): Promise<ProductCatalogMatch[]> {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/product-catalog/search${query}`);
  }

  getProductCatalogEntry(id: string): Promise<ProductCatalogDetail> {
    return this.request(`/product-catalog/${id}`);
  }

  /** GET /product-catalog/:id/price-history — ProductPriceHistory rows for
   * this catalogue entry. Added 2026-10-09. */
  getProductPriceHistory(productMasterId: string): Promise<ProductPriceHistoryPoint[]> {
    return this.request(`/product-catalog/${productMasterId}/price-history`);
  }

  /** GET /product-catalog/:id/history — shared change history (added 2026-10-18). */
  getProductHistory(productMasterId: string): Promise<ProductChangeEntry[]> {
    return this.request(`/product-catalog/${productMasterId}/history`);
  }

  /** GET /product-catalog/:id/usage — this organisation's own use of the product (added 2026-10-18). */
  getProductUsage(productMasterId: string): Promise<ProductUsageSummary> {
    return this.request(`/product-catalog/${productMasterId}/usage`);
  }

  /** Regulatory registrations (Product Database step 2, 2026-10-18). Shared facts; the caller's own verification is private. */
  listProductRegistrations(productMasterId: string, includeArchived = false): Promise<ProductRegistrationSummary[]> {
    return this.request(`/product-catalog/${productMasterId}/registrations${includeArchived ? "?includeArchived=true" : ""}`);
  }
  createProductRegistration(productMasterId: string, input: CreateRegistrationInput): Promise<ProductRegistrationSummary> {
    return this.request(`/product-catalog/${productMasterId}/registrations`, { method: "POST", body: JSON.stringify(input) });
  }
  updateProductRegistration(registrationId: string, input: UpdateRegistrationInput): Promise<ProductRegistrationSummary> {
    return this.request(`/product-catalog/registrations/${registrationId}`, { method: "PATCH", body: JSON.stringify(input) });
  }
  /** Safety notices and recalls (Product Database step 4, 2026-10-18). Notices are shared; the review is the caller's organisation's own. */
  listProductSafetyNotices(productMasterId: string, includeArchived = false): Promise<ProductSafetyNoticeSummary[]> {
    return this.request(`/product-catalog/${productMasterId}/safety-notices${includeArchived ? "?includeArchived=true" : ""}`);
  }
  createProductSafetyNotice(productMasterId: string, input: CreateSafetyNoticeInput): Promise<ProductSafetyNoticeSummary> {
    return this.request(`/product-catalog/${productMasterId}/safety-notices`, { method: "POST", body: JSON.stringify(input) });
  }
  listFamilySafetyNotices(familyId: string, includeArchived = false): Promise<ProductSafetyNoticeSummary[]> {
    return this.request(`/product-catalog/families/${familyId}/safety-notices${includeArchived ? "?includeArchived=true" : ""}`);
  }
  createFamilySafetyNotice(familyId: string, input: CreateSafetyNoticeInput): Promise<ProductSafetyNoticeSummary> {
    return this.request(`/product-catalog/families/${familyId}/safety-notices`, { method: "POST", body: JSON.stringify(input) });
  }
  updateSafetyNotice(noticeId: string, input: UpdateSafetyNoticeInput): Promise<ProductSafetyNoticeSummary> {
    return this.request(`/product-catalog/safety-notices/${noticeId}`, { method: "PATCH", body: JSON.stringify(input) });
  }
  reviewSafetyNotice(noticeId: string, input: ReviewSafetyNoticeInput): Promise<ProductSafetyNoticeSummary> {
    return this.request(`/product-catalog/safety-notices/${noticeId}/review`, { method: "POST", body: JSON.stringify(input) });
  }
  getSafetyNoticeDashboard(): Promise<SafetyNoticeDashboard> {
    return this.request(`/product-catalog/safety-notices/dashboard`);
  }
  /** Regulatory watch (step 4b): advisory matches of public regulator recalls to catalogue products; platform staff confirm or dismiss. */
  /** Export / hoarding restrictions: the UK list is fetched daily; other countries are curated by platform staff. */
  listExportRestrictions(includeRemoved = false): Promise<ExportRestrictionSummary[]> {
    return this.request(`/product-catalog/export-restrictions${includeRemoved ? "?includeRemoved=true" : ""}`);
  }
  createExportRestriction(input: CreateExportRestrictionInput): Promise<ExportRestrictionSummary> {
    return this.request(`/product-catalog/export-restrictions`, { method: "POST", body: JSON.stringify(input) });
  }
  updateExportRestriction(id: string, input: UpdateExportRestrictionInput): Promise<ExportRestrictionSummary> {
    return this.request(`/product-catalog/export-restrictions/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }
  getProjectExportChecks(projectId: string): Promise<ProjectExportCheckItem[]> {
    return this.request(`/product-catalog/export-restrictions/project/${projectId}`);
  }
  listProductExportRestrictions(productMasterId: string): Promise<ProductExportRestrictionMatch[]> {
    return this.request(`/product-catalog/${productMasterId}/export-restrictions`);
  }
  exportCatalogueCsv(filters: { q?: string; category?: string; sourceStandard?: string; includeArchived?: boolean; atc?: string; inn?: string; hsCode?: string; register?: string; hasSuggestions?: boolean; missingField?: string; recent?: boolean } = {}): Promise<ProductExportFile> {
    const qs = new URLSearchParams();
    for (const k of ["atc", "inn", "hsCode", "register", "missingField"] as const) if (filters[k]) qs.set(k, filters[k]!);
    if (filters.hasSuggestions) qs.set("hasSuggestions", "true");
    if (filters.recent) qs.set("recent", "true");
    if (filters.q) qs.set("q", filters.q);
    if (filters.category) qs.set("category", filters.category);
    if (filters.sourceStandard) qs.set("sourceStandard", filters.sourceStandard);
    if (filters.includeArchived) qs.set("includeArchived", "true");
    return this.request(`/product-catalog/exports/catalogue${qs.toString() ? `?${qs}` : ""}`);
  }
  exportRegistrationsCsv(filters: { status?: string; includeArchived?: boolean } = {}): Promise<ProductExportFile> {
    const qs = new URLSearchParams();
    if (filters.status) qs.set("status", filters.status);
    if (filters.includeArchived) qs.set("includeArchived", "true");
    return this.request(`/product-catalog/exports/registrations${qs.toString() ? `?${qs}` : ""}`);
  }
  getExportCapabilities(): Promise<ExportCapabilities> {
    return this.request(`/product-catalog/exports/capabilities`);
  }
  listExportRequests(): Promise<DataExportRequestSummary[]> {
    return this.request(`/product-catalog/exports/requests`);
  }
  createExportRequest(input: CreateDataExportRequestInput): Promise<DataExportRequestSummary> {
    return this.request(`/product-catalog/exports/requests`, { method: "POST", body: JSON.stringify(input) });
  }
  decideExportRequest(id: string, input: DecideDataExportRequestInput): Promise<DataExportRequestSummary> {
    return this.request(`/product-catalog/exports/requests/${id}/decision`, { method: "POST", body: JSON.stringify(input) });
  }
  downloadExportRequest(id: string): Promise<ProductExportFile> {
    return this.request(`/product-catalog/exports/requests/${id}/download`);
  }
  /** CSV of the caller's own organisation's records. */
  exportOrganisationCsv(entity: OrganisationExportEntity, includeArchived = false): Promise<ProductExportFile> {
    return this.request(`/exports/organisation/${entity}${includeArchived ? "?includeArchived=true" : ""}`);
  }
  getProductDossier(productMasterId: string): Promise<ProductDossier> {
    return this.request(`/product-catalog/${productMasterId}/dossier`);
  }
  getRegulatoryWatchDashboard(): Promise<RegulatoryWatchDashboard> {
    return this.request(`/product-catalog/regulatory-watch/dashboard`);
  }
  getWatchMatches(status: string): Promise<WatchMatchSummary[]> {
    return this.request(`/product-catalog/regulatory-watch/matches?status=${encodeURIComponent(status)}`);
  }
  listProductWatchMatches(productMasterId: string): Promise<WatchMatchSummary[]> {
    return this.request(`/product-catalog/${productMasterId}/watch-matches`);
  }
  confirmWatchMatch(matchId: string, notes?: string): Promise<WatchMatchSummary> {
    return this.request(`/product-catalog/regulatory-watch/matches/${matchId}/confirm`, { method: "POST", body: JSON.stringify({ notes }) });
  }
  dismissWatchMatch(matchId: string, notes: string): Promise<WatchMatchSummary> {
    return this.request(`/product-catalog/regulatory-watch/matches/${matchId}/dismiss`, { method: "POST", body: JSON.stringify({ notes }) });
  }
  getProductSafetyFlags(productMasterIds: string[]): Promise<ProductSafetyFlag[]> {
    return this.request(`/product-catalog/safety-notices/flags?ids=${encodeURIComponent(productMasterIds.join(","))}`);
  }
  verifyProductRegistration(registrationId: string, input: VerifyRegistrationInput): Promise<ProductRegistrationSummary> {
    return this.request(`/product-catalog/registrations/${registrationId}/verify`, { method: "POST", body: JSON.stringify(input) });
  }
  getRegulatoryRegister(view: string, page = 1, pageSize = 25): Promise<RegulatoryRegisterPage> {
    return this.request(`/product-catalog/regulatory/register?view=${encodeURIComponent(view)}&page=${page}&pageSize=${pageSize}`);
  }
  getSafetyNoticeRegister(view: string, page = 1, pageSize = 25): Promise<RegulatoryRegisterPage> {
    return this.request(`/product-catalog/safety-notices/register?view=${encodeURIComponent(view)}&page=${page}&pageSize=${pageSize}`);
  }
  getRegulatoryDashboard(): Promise<RegulatoryDashboard> {
    return this.request("/product-catalog/regulatory/dashboard");
  }

  /** Controlled product documents (step 3, 2026-10-18): private to the caller's organisation. */
  listProductDocuments(productMasterId: string, includeArchived = false): Promise<ProductDocumentSummary[]> {
    return this.request(`/product-catalog/${productMasterId}/documents${includeArchived ? "?includeArchived=true" : ""}`);
  }
  requestProductDocumentUpload(productMasterId: string, input: RequestProductDocumentUploadInput): Promise<{ uploadUrl: string; blobName: string }> {
    return this.request(`/product-catalog/${productMasterId}/documents/upload-url`, { method: "POST", body: JSON.stringify(input) });
  }
  createProductDocument(productMasterId: string, input: CreateProductDocumentInput): Promise<ProductDocumentSummary> {
    return this.request(`/product-catalog/${productMasterId}/documents`, { method: "POST", body: JSON.stringify(input) });
  }
  approveProductDocument(documentId: string): Promise<ProductDocumentSummary> {
    return this.request(`/product-catalog/documents/${documentId}/approve`, { method: "POST", body: "{}" });
  }
  archiveProductDocument(documentId: string, reason?: string): Promise<ProductDocumentSummary> {
    return this.request(`/product-catalog/documents/${documentId}/archive`, { method: "POST", body: JSON.stringify({ reason }) });
  }
  getProductDocumentDownloadUrl(documentId: string): Promise<{ downloadUrl: string }> {
    return this.request(`/product-catalog/documents/${documentId}/download-url`);
  }

  /** Product families (step 3b, 2026-10-18). */
  listProductFamilies(params: { search?: string; category?: string; page?: number; pageSize?: number } = {}): Promise<ProductFamilyListResult> {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") q.set(k, String(v));
    return this.request(`/product-catalog/families${q.toString() ? `?${q}` : ""}`);
  }
  getProductFamily(familyId: string): Promise<ProductFamilyDetail> {
    return this.request(`/product-catalog/families/${familyId}`);
  }
  createProductFamily(input: CreateProductFamilyInput): Promise<ProductFamilySummary> {
    return this.request("/product-catalog/families", { method: "POST", body: JSON.stringify(input) });
  }
  updateProductFamily(familyId: string, input: UpdateProductFamilyInput): Promise<ProductFamilySummary> {
    return this.request(`/product-catalog/families/${familyId}`, { method: "PATCH", body: JSON.stringify(input) });
  }
  getProductFamilyHistory(familyId: string): Promise<ProductChangeEntry[]> {
    return this.request(`/product-catalog/families/${familyId}/history`);
  }
  listFamilyRegistrations(familyId: string, includeArchived = false): Promise<ProductRegistrationSummary[]> {
    return this.request(`/product-catalog/families/${familyId}/registrations${includeArchived ? "?includeArchived=true" : ""}`);
  }
  createFamilyRegistration(familyId: string, input: CreateRegistrationInput): Promise<ProductRegistrationSummary> {
    return this.request(`/product-catalog/families/${familyId}/registrations`, { method: "POST", body: JSON.stringify(input) });
  }
  listFamilyDocuments(familyId: string, includeArchived = false): Promise<ProductDocumentSummary[]> {
    return this.request(`/product-catalog/families/${familyId}/documents${includeArchived ? "?includeArchived=true" : ""}`);
  }
  requestFamilyDocumentUpload(familyId: string, input: RequestProductDocumentUploadInput): Promise<{ uploadUrl: string; blobName: string }> {
    return this.request(`/product-catalog/families/${familyId}/documents/upload-url`, { method: "POST", body: JSON.stringify(input) });
  }
  createFamilyDocument(familyId: string, input: CreateProductDocumentInput): Promise<ProductDocumentSummary> {
    return this.request(`/product-catalog/families/${familyId}/documents`, { method: "POST", body: JSON.stringify(input) });
  }
  assignProductFamily(productId: string, input: { familyId: string | null; variantLabel?: string }): Promise<{ ok: true }> {
    return this.request(`/product-catalog/${productId}/family`, { method: "POST", body: JSON.stringify(input) });
  }
  createFamilyFromProduct(productId: string): Promise<ProductFamilySummary> {
    return this.request(`/product-catalog/${productId}/family/create`, { method: "POST", body: "{}" });
  }

  createProductCatalogEntry(input: CreateProductMasterInput): Promise<ProductCatalogMatch> {
    return this.request("/product-catalog", { method: "POST", body: JSON.stringify(input) });
  }

  /** Paginated browse for the Product Database Management app's catalogue
   * screen — distinct from searchProductCatalog's 25-row typeahead. Added
   * 2026-10-03. */
  listProductCatalog(params?: {
    q?: string;
    category?: string;
    sourceStandard?: string;
    page?: number;
    pageSize?: number;
    includeArchived?: boolean;
    /** Added 2026-10-09 — Stage 0 point 3 (data completeness pass). */
    missingField?: "gtin" | "hsCode" | "unspscCode" | "standardUnit";
    recent?: boolean;
    /** Pharma interconnection filters (2026-10-23). */
    atc?: string;
    inn?: string;
    hsCode?: string;
    register?: "EMA" | "MHRA" | "ANY" | "NONE";
    hasSuggestions?: boolean;
  }): Promise<ProductCatalogListResult> {
    const qs = new URLSearchParams();
    if (params?.q) qs.set("q", params.q);
    if (params?.category) qs.set("category", params.category);
    if (params?.sourceStandard) qs.set("sourceStandard", params.sourceStandard);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    if (params?.includeArchived) qs.set("includeArchived", "true");
    if (params?.missingField) qs.set("missingField", params.missingField);
    if (params?.recent) qs.set("recent", "true");
    if (params?.atc) qs.set("atc", params.atc);
    if (params?.inn) qs.set("inn", params.inn);
    if (params?.hsCode) qs.set("hsCode", params.hsCode);
    if (params?.register) qs.set("register", params.register);
    if (params?.hasSuggestions) qs.set("hasSuggestions", "true");
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.request(`/product-catalog${query}`);
  }

  /** Pharma register links for one product: pills, leaflet links, suggestions (2026-10-23). */
  productPharmaPanel(productId: string): Promise<ProductPharmaPanel> {
    return this.request(`/product-catalog/${productId}/pharma`);
  }
  suggestProductPharmaLinks(productId: string): Promise<ProductPharmaPanel> {
    return this.request(`/product-catalog/${productId}/pharma/suggest`, { method: "POST", body: "{}" });
  }
  /** Standard services catalogue (2026-10-26): active entries for pickers; staff get all entries and can add and edit. */
  serviceCatalogue(): Promise<ServiceCatalogueRow[]> { return this.request("/service-catalogue"); }
  serviceCatalogueUsage(): Promise<Record<string, { projectLines: number; tenderLines: number; organisations: number }>> { return this.request("/service-catalogue/usage"); }
  /** CRM (2026-10-26): relationships sit on top of stakeholders; the list creates any that are missing. */
  crmOverview(): Promise<CrmOverview> { return this.request("/crm/overview"); }
  crmDetail(id: string): Promise<CrmRelationshipDetail> { return this.request(`/crm/relationships/${id}/detail`); }
  crmPeople(): Promise<CrmPeopleOption[]> { return this.request("/crm/people"); }
  crmRelationships(q: Record<string, string | number | undefined> = {}): Promise<CrmRelationshipPage> {
    const p = new URLSearchParams(); for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "") p.set(k, String(v));
    return this.request(`/crm/relationships${p.toString() ? `?${p}` : ""}`);
  }
  crmRelationship(id: string): Promise<CrmRelationshipRow> { return this.request(`/crm/relationships/${id}`); }
  crmScorecard(id: string): Promise<PartnerScorecard> { return this.request(`/crm/relationships/${id}/scorecard`); }
  updateCrmRelationship(id: string, body: CrmRelationshipUpdate): Promise<CrmRelationshipRow> { return this.request(`/crm/relationships/${id}`, { method: "PATCH", body: JSON.stringify(body) }); }
  serviceCatalogueAll(): Promise<ServiceCatalogueRow[]> { return this.request("/service-catalogue/all"); }
  serviceCostRange(code: string): Promise<ServiceCostRange> { return this.request(`/service-catalogue/${code}/cost-range`); }
  createServiceCatalogueEntry(body: Omit<ServiceCatalogueRow, "active">): Promise<ServiceCatalogueRow> { return this.request("/service-catalogue", { method: "POST", body: JSON.stringify(body) }); }
  updateServiceCatalogueEntry(code: string, body: Partial<Omit<ServiceCatalogueRow, "code" | "category">>): Promise<ServiceCatalogueRow> { return this.request(`/service-catalogue/${code}`, { method: "PATCH", body: JSON.stringify(body) }); }
  linkProductToRegister(productId: string, pharmaReferenceId: string): Promise<ProductPharmaPanel> {
    return this.request(`/product-catalog/${productId}/pharma/link`, { method: "POST", body: JSON.stringify({ pharmaReferenceId }) });
  }
  setProductPilUrl(productId: string, url: string | null): Promise<ProductPharmaPanel> {
    return this.request(`/product-catalog/${productId}/pharma/pil-url`, { method: "PUT", body: JSON.stringify({ url }) });
  }
  decideProductPharmaLink(linkId: string, decision: "confirm" | "reject"): Promise<ProductPharmaPanel> {
    return this.request(`/product-catalog/pharma-links/${linkId}/${decision}`, { method: "POST", body: "{}" });
  }
  pharmaRegisterSummary(): Promise<{ linkedEntries: number; counts: Array<{ source: string; status: string; count: number }>; lastSync: Array<{ source: string; finishedAt: string | null; fetched: number }>; attribution: string }> {
    return this.request(`/pharma-reference/summary`);
  }
  getPharmaRegisterEntry(id: string): Promise<{ id: string; source: "EMA" | "MHRA"; sourceKey: string; name: string; activeSubstances: string | null; inn: string | null; atcCode: string | null; holder: string | null; status: string; legalStatus: string | null; windsorCategory: string | null; indication: string | null; therapeuticArea: string | null; pharmacotherapeuticGroup: string | null; authorisedOn: string | null; sourceUrl: string | null; pilLinks: PilLink[]; linkedProducts: Array<{ id: string; name: string; category: string; isSimulated: boolean }>; scopeSubcategory: string | null }> {
    return this.request(`/pharma-reference/${id}`);
  }
  searchPharmaRegister(params: { q?: string; source?: string; atc?: string; status?: string; holder?: string; generic?: boolean; biosimilar?: boolean; orphan?: boolean; linked?: "YES" | "NO"; skip?: number; take?: number }): Promise<{ total: number; items: Array<{ id: string; source: "EMA" | "MHRA"; sourceKey: string; name: string; activeSubstances: string | null; inn: string | null; atcCode: string | null; holder: string | null; status: string; isGeneric: boolean; isBiosimilar: boolean; isOrphan: boolean; sourceUrl: string | null; linkedProducts: number; pilLinks: PilLink[] }> }> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && v !== false) qs.set(k, String(v));
    return this.request(`/pharma-reference/search?${qs.toString()}`);
  }

  /** GET /product-catalog/completeness-stats — Stage 0 point 3 (data
   * completeness pass). Added 2026-10-09. */
  getProductCatalogCompletenessStats(): Promise<ProductCatalogCompletenessStats> {
    return this.request(`/product-catalog/completeness-stats`);
  }

  /** GET /product-catalog/dashboard-stats — Stage 1 (standardised
   * dashboard pattern), applied to the catalogue screen. Added
   * 2026-10-09. */
  getProductCatalogDashboardStats(): Promise<ProductCatalogDashboardStats> {
    return this.request(`/product-catalog/dashboard-stats`);
  }

  /** Added 2026-10-09 — return type changed from a bare ProductCatalogMatch
   * to UpdateProductMasterResult: platform staff still get the applied
   * row back directly, but everyone else proposing a same-org amendment
   * gets back the new PENDING amendment's id instead (the live product is
   * untouched until a QA/RP user ratifies it) — see
   * ProductCatalogService.update()'s doc comment for the full design. */
  updateProductCatalogEntry(id: string, input: UpdateProductMasterInput): Promise<UpdateProductMasterResult> {
    return this.request(`/product-catalog/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  /** GET /product-catalog/:id/amendments — this product's amendment
   * history, tenant-scoped to the caller's own organisation. Added
   * 2026-10-09. */
  getProductAmendments(productMasterId: string): Promise<ProductAmendmentSummary[]> {
    return this.request(`/product-catalog/${productMasterId}/amendments`);
  }

  /** GET /product-catalog/amendments/:id — a single amendment by id, for
   * the QA Queue's "Review amendment" deep link. Added 2026-10-09. */
  getProductAmendment(amendmentId: string): Promise<ProductAmendmentSummary> {
    return this.request(`/product-catalog/amendments/${amendmentId}`);
  }

  /** POST /product-catalog/amendments/:id/ratify — applies the proposed
   * changes and marks the amendment APPROVED. Gated server-side on
   * products.approve. Added 2026-10-09. */
  ratifyProductAmendment(amendmentId: string): Promise<ProductAmendmentSummary> {
    return this.request(`/product-catalog/amendments/${amendmentId}/ratify`, { method: "POST" });
  }

  /** POST /product-catalog/amendments/:id/reject — marks the amendment
   * REJECTED; the live product is never touched. Added 2026-10-09. */
  rejectProductAmendment(amendmentId: string, input?: RejectProductAmendmentInput): Promise<ProductAmendmentSummary> {
    return this.request(`/product-catalog/amendments/${amendmentId}/reject`, {
      method: "POST",
      body: JSON.stringify(input ?? {}),
    });
  }

  importProductCatalogRows(
    sourceStandard: "HS_CODE" | "WHO_EML" | "UNSPSC" | "GS1_GTIN",
    rows: ImportProductMasterRow[],
  ): Promise<ImportProductMasterResult> {
    return this.request("/product-catalog/import", {
      method: "POST",
      body: JSON.stringify({ sourceStandard, rows }),
    });
  }

  // --- Quality Assurance (added 2026-10-01) ---

  getQualityDashboard(): Promise<QualityDashboardSummary> {
    return this.request("/quality/dashboard");
  }

  /** One page of the QA queue (oldest first) with category counts. */
  getQaQueuePage(params: { category?: string; page?: number; pageSize?: number }): Promise<QaQueuePage> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
    return this.request(`/quality/qa-queue/page?${qs.toString()}`);
  }

  /** @deprecated Oldest 200 per source only — use getQaQueuePage. */
  getQaQueue(): Promise<QaQueueSummary> {
    return this.request("/quality/qa-queue");
  }

  // --- Reference data (added 2026-10-01) ---

  listCountries(): Promise<CountryOption[]> {
    return this.request("/countries");
  }

  /** GET /countries/regions — see geo.service.ts's listRegions() doc comment
   * for why this isn't "/geo/regions" despite the Region model/service
   * naming. Added 2026-10-14 when Region (previously dead schema) was
   * wired up. */
  listRegions(): Promise<RegionSummary[]> {
    return this.request("/countries/regions");
  }

  /** Server-paged sourcing approvals (status PENDING | APPROVED | REJECTED | WARNING; q matches product/manufacturer/supplier). */
  listProductSourceApprovalsPage(params: { status?: string; q?: string; page?: number; pageSize?: number }): Promise<PagedResult<ProductSourceApprovalSummary>> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
    return this.request(`/quality/product-approvals/page?${qs.toString()}`);
  }

  /** First 500 only; optionally one product's sourcing. Lists use listProductSourceApprovalsPage. */
  listProductSourceApprovals(status?: string, productMasterId?: string): Promise<ProductSourceApprovalSummary[]> {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (productMasterId) qs.set("productMasterId", productMasterId);
    return this.request(`/quality/product-approvals${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  createProductSourceApproval(input: CreateProductSourceApprovalInput): Promise<ProductSourceApprovalSummary> {
    return this.request("/quality/product-approvals", { method: "POST", body: JSON.stringify(input) });
  }

  updateProductSourceApproval(id: string, input: UpdateProductSourceApprovalInput): Promise<ProductSourceApprovalSummary> {
    return this.request(`/quality/product-approvals/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  /** Server-paged scorecards (aggregated in the database). */
  getPartnerPerformancePage(params: { roleType?: string; q?: string; page?: number; pageSize?: number }): Promise<PagedResult<PartnerPerformanceMetric>> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
    return this.request(`/quality/performance/page?${qs.toString()}`);
  }

  /** @deprecated First 500 only — use getPartnerPerformancePage. */
  getPartnerPerformance(roleType?: string): Promise<PartnerPerformanceMetric[]> {
    const query = roleType ? `?roleType=${encodeURIComponent(roleType)}` : "";
    return this.request(`/quality/performance${query}`);
  }

  /** Simulated (scale-test) organisations are left out unless includeSimulated is true (platform staff only). */
  listOrganizations(includeSimulated = false): Promise<OrganizationSummary[]> {
    return this.request(`/organizations${includeSimulated ? "?includeSimulated=true" : ""}`);
  }

  /** The organisations the caller may switch into: their own plus, for demo users, the demo organisations they have been granted (2026-10-20). */
  listAccessibleOrganizations(): Promise<(OrganizationSummary & { isDemo: boolean })[]> {
    return this.request("/organizations/accessible");
  }

  listOrganizationAccess(organizationId: string): Promise<OrganizationAccessList> {
    return this.request(`/organizations/${organizationId}/access`);
  }
  addOrganizationAccess(organizationId: string, email: string): Promise<OrganizationAccessList> {
    return this.request(`/organizations/${organizationId}/access`, { method: "POST", body: JSON.stringify({ email }) });
  }
  removeOrganizationAccess(organizationId: string, grantId: string): Promise<OrganizationAccessList> {
    return this.request(`/organizations/${organizationId}/access/${grantId}`, { method: "DELETE" });
  }

  getOrganization(organizationId: string): Promise<OrganizationDetail> {
    return this.request(`/organizations/${organizationId}`);
  }

  updateOrganization(organizationId: string, input: UpdateOrganizationInput): Promise<OrganizationDetail> {
    return this.request(`/organizations/${organizationId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  createOrganization(input: CreateOrganizationInput): Promise<OrganizationSummary> {
    return this.request("/organizations", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  listOrganizationRoles(organizationId: string): Promise<RoleSummary[]> {
    return this.request(`/organizations/${organizationId}/roles`);
  }

  /** Returns null when no consent row exists yet (shouldn't happen for a
   * properly-provisioned org, but the type is nullable to match the
   * service — see DataSharingConsentSummary's doc comment). Added
   * 2026-10-14. */
  getOrganizationDataSharingConsent(organizationId: string): Promise<DataSharingConsentSummary | null> {
    return this.request(`/organizations/${organizationId}/data-sharing-consent`);
  }

  /** Added 2026-10-14 — see OrganizationCountryPresenceSummary's doc
   * comment for how this differs from the supplier-side
   * setMySupplierCountryPresence/countryCode list below. */
  listOrganizationCountryPresence(organizationId: string): Promise<OrganizationCountryPresenceSummary[]> {
    return this.request(`/organizations/${organizationId}/country-presence`);
  }

  /** Replace-the-whole-list semantics, same as setMySupplierCountryPresence
   * — pass the complete new set of country codes, not a delta. */
  setOrganizationCountryPresence(organizationId: string, countryCodes: string[]): Promise<OrganizationCountryPresenceSummary[]> {
    return this.request(`/organizations/${organizationId}/country-presence`, {
      method: "PUT",
      body: JSON.stringify({ countryCodes }),
    });
  }

  /** Added 2026-10-14 — the five org-type detail profiles, see
   * OrganizationsService's own doc comment for the shape decisions. */
  getProcurementAgentProfile(organizationId: string): Promise<ProcurementAgentProfileSummary | null> {
    return this.request(`/organizations/${organizationId}/procurement-agent-profile`);
  }

  upsertProcurementAgentProfile(organizationId: string, input: Partial<ProcurementAgentProfileSummary>): Promise<ProcurementAgentProfileSummary> {
    return this.request(`/organizations/${organizationId}/procurement-agent-profile`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  }

  getTenderingBodyProfile(organizationId: string): Promise<TenderingBodyProfileSummary | null> {
    return this.request(`/organizations/${organizationId}/tendering-body-profile`);
  }

  upsertTenderingBodyProfile(organizationId: string, input: Partial<TenderingBodyProfileSummary>): Promise<TenderingBodyProfileSummary> {
    return this.request(`/organizations/${organizationId}/tendering-body-profile`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  }

  getPartnerOrganizationLink(partnerId: string): Promise<{ organizationId: string | null }> { return this.request(`/partners/${partnerId}/organization-link`); }
  getOrganizationCard(organizationId: string): Promise<OrganizationCard> {
    return this.request(`/organizations/${organizationId}/card`);
  }

  getOrganizationScope(organizationId: string): Promise<OrganizationScopeSummary> {
    return this.request(`/organizations/${organizationId}/scope`);
  }

  setOrganizationScope(organizationId: string, scopeSubIds: string[]): Promise<OrganizationScopeSummary> {
    return this.request(`/organizations/${organizationId}/scope`, { method: "PUT", body: JSON.stringify({ scopeSubIds }) });
  }

  listOrganizationCertifications(organizationId: string): Promise<OrganizationCertificationSummary[]> {
    return this.request(`/organizations/${organizationId}/certifications`);
  }

  addOrganizationCertification(organizationId: string, input: SaveOrganizationCertificationInput): Promise<OrganizationCertificationSummary> {
    return this.request(`/organizations/${organizationId}/certifications`, { method: "POST", body: JSON.stringify(input) });
  }

  updateOrganizationCertification(organizationId: string, certId: string, input: SaveOrganizationCertificationInput): Promise<OrganizationCertificationSummary> {
    return this.request(`/organizations/${organizationId}/certifications/${certId}`, { method: "PUT", body: JSON.stringify(input) });
  }

  /** Attaches a certificate file: asks for a write link, puts the file straight to storage, then records it. */
  async uploadOrganizationCertificationDocument(organizationId: string, certId: string, file: File): Promise<OrganizationCertificationSummary> {
    const up = await this.request<{ uploadUrl: string; blobName: string }>(`/organizations/${organizationId}/certifications/${certId}/document/upload-url`, { method: "POST", body: JSON.stringify({ fileName: file.name, contentType: file.type || "application/octet-stream", fileSizeBytes: file.size }) });
    await this.uploadDocumentFile(up.uploadUrl, file);
    return this.request(`/organizations/${organizationId}/certifications/${certId}/document`, { method: "POST", body: JSON.stringify({ blobName: up.blobName, fileName: file.name, mimeType: file.type || undefined }) });
  }

  organizationCertificationDocumentUrl(organizationId: string, certId: string): Promise<{ downloadUrl: string; fileName: string | null }> {
    return this.request(`/organizations/${organizationId}/certifications/${certId}/document`);
  }

  removeOrganizationCertificationDocument(organizationId: string, certId: string): Promise<OrganizationCertificationSummary> {
    return this.request(`/organizations/${organizationId}/certifications/${certId}/document`, { method: "DELETE" });
  }

  archiveOrganizationCertification(organizationId: string, certId: string): Promise<void> {
    return this.request(`/organizations/${organizationId}/certifications/${certId}`, { method: "DELETE" });
  }

  getManufacturerProfile(organizationId: string): Promise<ManufacturerProfileSummary | null> {
    return this.request(`/organizations/${organizationId}/manufacturer-profile`);
  }

  upsertManufacturerProfile(organizationId: string, input: Partial<ManufacturerProfileSummary>): Promise<ManufacturerProfileSummary> {
    return this.request(`/organizations/${organizationId}/manufacturer-profile`, { method: "PUT", body: JSON.stringify(input) });
  }

  getFunderProfile(organizationId: string): Promise<FunderProfileSummary | null> {
    return this.request(`/organizations/${organizationId}/funder-profile`);
  }

  upsertFunderProfile(organizationId: string, input: Partial<FunderProfileSummary>): Promise<FunderProfileSummary> {
    return this.request(`/organizations/${organizationId}/funder-profile`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  }

  getDataInsightsUserProfile(organizationId: string): Promise<DataInsightsUserProfileSummary | null> {
    return this.request(`/organizations/${organizationId}/data-insights-profile`);
  }

  upsertDataInsightsUserProfile(organizationId: string, input: Partial<DataInsightsUserProfileSummary>): Promise<DataInsightsUserProfileSummary> {
    return this.request(`/organizations/${organizationId}/data-insights-profile`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  }

  /** One-to-many — see OrganizationManufacturerSiteSummary's doc comment. */
  listManufacturerSites(organizationId: string): Promise<OrganizationManufacturerSiteSummary[]> {
    return this.request(`/organizations/${organizationId}/manufacturer-sites`);
  }

  addManufacturerSite(
    organizationId: string,
    input: { locationCountryCode?: string; locationDetail?: string; gmpCertified?: boolean; gmpCertificationDetail?: string },
  ): Promise<OrganizationManufacturerSiteSummary> {
    return this.request(`/organizations/${organizationId}/manufacturer-sites`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  removeManufacturerSite(organizationId: string, siteId: string): Promise<void> {
    return this.request(`/organizations/${organizationId}/manufacturer-sites/${siteId}`, { method: "DELETE" });
  }

  /** Server-paged users (admin screens). */
  listUsersPage(params: { page?: number; pageSize?: number; q?: string; status?: string; organizationId?: string; includeSimulated?: boolean }): Promise<PagedResult<UserSummary>> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
    return this.request(`/users/page?${qs.toString()}`);
  }

  getUserCounts(organizationId?: string, includeSimulated = false): Promise<UserCounts> {
    const qs = new URLSearchParams();
    if (organizationId) qs.set("organizationId", organizationId);
    if (includeSimulated) qs.set("includeSimulated", "true");
    const suffix = qs.toString();
    return this.request(`/users/counts${suffix ? `?${suffix}` : ""}`);
  }

  /** Colleagues in your organisation (names only) for pickers; any member may call it. */
  listUserOptions(q?: string, activeOnly = false): Promise<UserOption[]> {
    const qs = [q ? `q=${encodeURIComponent(q)}` : "", activeOnly ? "active=true" : ""].filter(Boolean).join("&");
    return this.request(`/users/options${qs ? `?${qs}` : ""}`);
  }

  /** @deprecated Unpaged (capped at 500) — use listUsersPage / getUserCounts / listUserOptions. */
  listUsers(organizationId?: string): Promise<UserSummary[]> {
    const query = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : "";
    return this.request(`/users${query}`);
  }

  inviteUser(input: InviteUserInput): Promise<UserSummary> {
    return this.request("/users", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  listPermissions(): Promise<PermissionSummary[]> {
    return this.request("/permissions");
  }

  listRoles(organizationId: string): Promise<RoleDetail[]> {
    return this.request(`/roles?organizationId=${encodeURIComponent(organizationId)}`);
  }

  createRole(input: CreateRoleInput): Promise<RoleDetail> {
    return this.request("/roles", { method: "POST", body: JSON.stringify(input) });
  }

  updateRole(id: string, input: UpdateRoleInput): Promise<RoleDetail> {
    return this.request(`/roles/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  deleteRole(id: string): Promise<{ deleted: true }> {
    return this.request(`/roles/${id}`, { method: "DELETE" });
  }

  getUser(id: string): Promise<UserDetail> {
    return this.request(`/users/${id}`);
  }

  updateUser(id: string, input: UpdateUserInput): Promise<UserDetail> {
    return this.request(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  resetUserSignIn(id: string): Promise<UserSummary> {
    return this.request(`/users/${id}/reset-sign-in`, { method: "POST" });
  }

  reactivateUser(id: string): Promise<UserSummary> {
    return this.request(`/users/${id}/reactivate`, { method: "POST" });
  }

  getStakeholderAccess(): Promise<StakeholderAccessOverview> {
    return this.request("/stakeholder-access");
  }

  grantStakeholderAccess(input: GrantStakeholderAccessInput): Promise<UserSummary> {
    return this.request("/stakeholder-access", { method: "POST", body: JSON.stringify(input) });
  }

  /** Archives the account (never deletes it); optional reason is logged. */
  deactivateUser(id: string, reason?: string): Promise<UserSummary> {
    return this.request(`/users/${id}${reason ? `?reason=${encodeURIComponent(reason)}` : ""}`, { method: "DELETE" });
  }

  updateUserRoles(id: string, roleIds: string[]): Promise<UserSummary> {
    return this.request(`/users/${id}/roles`, {
      method: "PATCH",
      body: JSON.stringify({ roleIds }),
    });
  }

  // --- Supplier/manufacturer marketplace (added 2026-09-24) ---

  searchSupplierDirectory(params: { category?: string; countryCode?: string } = {}): Promise<SupplierSearchResult[]> {
    const query = new URLSearchParams(
      Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined),
    ).toString();
    return this.request(`/supplier-directory/search${query ? `?${query}` : ""}`);
  }

  searchNetwork(f: { q?: string; type?: string; scope?: string; country?: string; certType?: string; minYears?: number; warehousing?: string; whoPq?: boolean; localMfr?: boolean; certified?: boolean; sort?: string; offset?: number }): Promise<NetworkSearchResult> {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => !!v).map(([k, v]) => [k, String(v)])).toString();
    return this.request(`/supplier-directory/network${qs ? `?${qs}` : ""}`);
  }

  listNetworkSavedSearches(): Promise<NetworkSavedSearchRecord[]> { return this.request("/supplier-directory/network/searches"); }
  saveNetworkSearch(body: NetworkSearchCriteria & { name: string; alertsEnabled?: boolean }): Promise<{ id: string }> { return this.request("/supplier-directory/network/searches", { method: "POST", body: JSON.stringify(body) }); }
  updateNetworkSavedSearch(id: string, body: { name?: string; alertsEnabled?: boolean }): Promise<unknown> { return this.request(`/supplier-directory/network/searches/${id}`, { method: "PATCH", body: JSON.stringify(body) }); }
  deleteNetworkSavedSearch(id: string): Promise<unknown> { return this.request(`/supplier-directory/network/searches/${id}`, { method: "DELETE" }); }

  getSupplierProfile(organizationId: string): Promise<SupplierProfile & { countryCodes: string[] }> {
    return this.request(`/supplier-directory/profile/${organizationId}`);
  }

  getMySupplierProfile(): Promise<SupplierProfile | null> {
    return this.request("/supplier-directory/profile/me");
  }

  upsertMySupplierProfile(input: UpsertSupplierProfileInput): Promise<SupplierProfile> {
    return this.request("/supplier-directory/profile/me", { method: "PUT", body: JSON.stringify(input) });
  }

  getOrgDirectoryProfile(organizationId: string): Promise<OrgDirectoryProfile> {
    return this.request(`/supplier-directory/org/${organizationId}/profile`);
  }

  saveOrgDirectoryProfile(organizationId: string, input: UpsertOrgDirectoryProfileInput): Promise<OrgDirectoryProfile> {
    return this.request(`/supplier-directory/org/${organizationId}/profile`, { method: "PUT", body: JSON.stringify(input) });
  }

  setOrgDirectoryPublished(organizationId: string, published: boolean): Promise<OrgDirectoryProfile> {
    return this.request(`/supplier-directory/org/${organizationId}/profile/${published ? "publish" : "unpublish"}`, { method: "POST" });
  }

  publishMySupplierProfile(): Promise<SupplierProfile> {
    return this.request("/supplier-directory/profile/me/publish", { method: "POST" });
  }

  unpublishMySupplierProfile(): Promise<SupplierProfile> {
    return this.request("/supplier-directory/profile/me/unpublish", { method: "POST" });
  }

  setMySupplierCountryPresence(countryCodes: string[]): Promise<{ countryCode: string }[]> {
    return this.request("/supplier-directory/profile/me/countries", {
      method: "PUT",
      body: JSON.stringify({ countryCodes }),
    });
  }

  listMySupplierProducts(): Promise<SupplierProduct[]> {
    return this.request("/supplier-directory/products/me");
  }

  createSupplierProduct(input: CreateSupplierProductInput): Promise<SupplierProduct> {
    return this.request("/supplier-directory/products", { method: "POST", body: JSON.stringify(input) });
  }

  updateSupplierProduct(id: string, input: UpdateSupplierProductInput): Promise<SupplierProduct> {
    return this.request(`/supplier-directory/products/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  /** Buyer selects a published supplier product — records interest for the
   * supplier to see; does not itself modify the buyer's own project data
   * (see SupplierDirectoryService.selectProduct's doc comment). */
  selectSupplierProduct(id: string): Promise<SupplierSearchResult> {
    return this.request(`/supplier-directory/products/${id}/select`, { method: "POST" });
  }

  getMySupplierLeads(): Promise<SupplierLead[]> {
    return this.request("/supplier-directory/leads/me");
  }

  // --- Evidence & standards catalog (GDP gap-closing, Gap 3 — added
  // 2026-10-07/08). See EvidenceStandardSummary/StakeholderEvidenceRecordSummary
  // doc comments in @universe/types and EvidenceService in apps/api. ---

  listEvidenceStandards(stakeholderType?: string, includeInactive?: boolean): Promise<EvidenceStandardSummary[]> {
    const qs = new URLSearchParams();
    if (stakeholderType) qs.set("stakeholderType", stakeholderType);
    if (includeInactive) qs.set("includeInactive", "true");
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.request(`/evidence-standards${query}`);
  }

  createEvidenceStandard(input: CreateEvidenceStandardInput): Promise<EvidenceStandardSummary> {
    return this.request("/evidence-standards", { method: "POST", body: JSON.stringify(input) });
  }

  updateEvidenceStandard(id: string, input: UpdateEvidenceStandardInput): Promise<EvidenceStandardSummary> {
    return this.request(`/evidence-standards/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  listEvidenceRecordsForPartner(partnerId: string): Promise<StakeholderEvidenceRecordSummary[]> {
    return this.request(`/partners/${partnerId}/evidence-records`);
  }

  createEvidenceRecord(input: CreateEvidenceRecordInput): Promise<StakeholderEvidenceRecordSummary> {
    return this.request("/evidence-records", { method: "POST", body: JSON.stringify(input) });
  }

  updateEvidenceRecord(id: string, input: UpdateEvidenceRecordInput): Promise<StakeholderEvidenceRecordSummary> {
    return this.request(`/evidence-records/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  /** Gap 2's e-signature meaning statement — see verifyRecord's doc
   * comment in EvidenceService. */
  verifyEvidenceRecord(id: string, input: VerifyEvidenceRecordInput): Promise<StakeholderEvidenceRecordSummary> {
    return this.request(`/evidence-records/${id}/verify`, { method: "PATCH", body: JSON.stringify(input) });
  }

  // --- Product batches & temperature logs (Gaps 5/6 — added 2026-10-07/08).
  // See ProductBatchSummary/ProductBatchDetail/BatchTemperatureLogSummary
  // doc comments in @universe/types and ProductBatchesService in apps/api. ---

  /** Server-paged batches. */
  searchProductBatchesPage(params: SearchProductBatchesInput & { page?: number; pageSize?: number }): Promise<PagedResult<ProductBatchSummary>> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
    return this.request(`/batches/page?${qs.toString()}`);
  }

  /** First 100 only (picker use) — the Batches screen uses searchProductBatchesPage. */
  searchProductBatches(params?: SearchProductBatchesInput): Promise<ProductBatchSummary[]> {
    const qs = new URLSearchParams();
    if (params?.batchNumber) qs.set("batchNumber", params.batchNumber);
    if (params?.productMasterId) qs.set("productMasterId", params.productMasterId);
    if (params?.manufacturerId) qs.set("manufacturerId", params.manufacturerId);
    if (params?.status) qs.set("status", params.status);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return this.request(`/batches${query}`);
  }

  getProductBatch(id: string): Promise<ProductBatchDetail> {
    return this.request(`/batches/${id}`);
  }

  createProductBatch(input: CreateProductBatchInput): Promise<ProductBatchSummary> {
    return this.request("/batches", { method: "POST", body: JSON.stringify(input) });
  }

  updateProductBatch(id: string, input: UpdateProductBatchInput): Promise<ProductBatchSummary> {
    return this.request(`/batches/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  addBatchTemperatureLog(batchId: string, input: CreateTemperatureLogInput): Promise<BatchTemperatureLogSummary> {
    return this.request(`/batches/${batchId}/temperature-logs`, { method: "POST", body: JSON.stringify(input) });
  }

  reviewBatchTemperatureLog(logId: string, input: ReviewTemperatureLogInput): Promise<BatchTemperatureLogSummary> {
    return this.request(`/batches/temperature-logs/${logId}/review`, { method: "PATCH", body: JSON.stringify(input) });
  }

  // --- Follow-up frontend pass (added 2026-10-07/08) — Gap 1's audit-log
  // viewer, Gap 3's re-verification dashboard, Gap 4's risk register, and
  // Gap 7's controlled-document module. See AuditLogService,
  // RiskAssessmentsService, EvidenceService.listDueForReVerification, and
  // ControlledDocumentsService in apps/api. ---

  /** Gap 1 — the full field-change history for one record, newest first. */
  getAuditLog(tableName: string, recordId: string): Promise<FieldChangeLogEntry[]> {
    const qs = new URLSearchParams({ tableName, recordId });
    return this.request(`/audit-log?${qs.toString()}`);
  }

  /** Admin app global activity feed (added 2026-10-16). */
  getActivityFeed(params: { organizationId?: string; tableName?: string; changedById?: string; before?: string; limit?: number; includeSimulated?: boolean } = {}): Promise<FieldChangeFeedPage> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
    const suffix = qs.toString();
    return this.request(`/audit-log/feed${suffix ? `?${suffix}` : ""}`);
  }

  /** Gap 4 — the risk register entries logged against one subject
   * (e.g. subjectType "PARTNER" + a Partner id). */
  listRiskAssessments(subjectType: string, subjectId: string): Promise<RiskAssessmentSummary[]> {
    const qs = new URLSearchParams({ subjectType, subjectId });
    return this.request(`/risk-assessments?${qs.toString()}`);
  }

  /** Gap 4 follow-up — every risk across the organisation (the standalone
   * Risk Register page), with each row's subject display name already
   * resolved server-side. */
  /** Server-paged risk register. */
  listRiskRegisterPage(params: { overdue?: boolean; highCritical?: boolean; q?: string; status?: string; severity?: string; subjectType?: string; sort?: string; dir?: string; page?: number; pageSize?: number }): Promise<PagedResult<RiskAssessmentListItem>> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && v !== false) qs.set(k, String(v));
    return this.request(`/risk-assessments/all/page?${qs.toString()}`);
  }

  getRiskRegisterCounts(): Promise<RiskRegisterCounts> {
    return this.request("/risk-assessments/all/counts");
  }

  /** @deprecated First 500 only — use listRiskRegisterPage. */
  listAllRiskAssessments(): Promise<RiskAssessmentListItem[]> {
    return this.request("/risk-assessments/all");
  }

  createRiskAssessment(input: CreateRiskAssessmentInput): Promise<RiskAssessmentSummary> {
    return this.request("/risk-assessments", { method: "POST", body: JSON.stringify(input) });
  }

  updateRiskAssessment(id: string, input: UpdateRiskAssessmentInput): Promise<RiskAssessmentSummary> {
    return this.request(`/risk-assessments/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  /** Gap 4 — a dedicated "Close" action requiring a reason, distinct from
   * the generic update() above — see CloseRiskAssessmentInput's doc
   * comment in @universe/types. */
  closeRiskAssessment(id: string, input: CloseRiskAssessmentInput): Promise<RiskAssessmentSummary> {
    return this.request(`/risk-assessments/${id}/close`, { method: "PATCH", body: JSON.stringify(input) });
  }

  /** Gap 3 — evidence records coming due (or overdue) for re-verification,
   * across every partner in the organisation. */
  listEvidenceDueForReview(withinDays?: number): Promise<EvidenceDueForReviewSummary[]> {
    const qs = withinDays !== undefined ? `?withinDays=${withinDays}` : "";
    return this.request(`/evidence-records/due-for-review${qs}`);
  }

  // --- Gap 7 — controlled documents (an organisation's own SOPs/policies). ---

  listControlledDocuments(category?: string): Promise<ControlledDocumentSummary[]> {
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    return this.request(`/controlled-documents${qs}`);
  }

  createControlledDocument(input: CreateControlledDocumentInput): Promise<ControlledDocumentSummary> {
    return this.request("/controlled-documents", { method: "POST", body: JSON.stringify(input) });
  }

  updateControlledDocument(id: string, input: UpdateControlledDocumentInput): Promise<ControlledDocumentSummary> {
    return this.request(`/controlled-documents/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  // --- Supply-chain CO2/distance/efficiency (added 2026-10-08) — see
  // supply-chain-co2-efficiency.md. getLogisticsLines is org-private
  // (this organization's own lines); getGlobalLogisticsRoutes and
  // getGlobalStakeholderRatings are the anonymized, cross-tenant views.
  // All three share the same filter shape. ---

  private logisticsQueryString(filters?: LogisticsFilters): string {
    if (!filters) return "";
    const qs = new URLSearchParams();
    if (filters.manufactureCountryCode) qs.set("manufactureCountryCode", filters.manufactureCountryCode);
    if (filters.destinationCountryCode) qs.set("destinationCountryCode", filters.destinationCountryCode);
    if (filters.transportMode) qs.set("transportMode", filters.transportMode);
    if (filters.incoterm) qs.set("incoterm", filters.incoterm);
    if (filters.commodityGroup) qs.set("commodityGroup", filters.commodityGroup);
    if (filters.scoreBand) qs.set("scoreBand", filters.scoreBand);
    if (filters.minDurationDays !== undefined) qs.set("minDurationDays", String(filters.minDurationDays));
    if (filters.maxDurationDays !== undefined) qs.set("maxDurationDays", String(filters.maxDurationDays));
    if (filters.search) qs.set("search", filters.search);
    const s = qs.toString();
    return s ? `?${s}` : "";
  }

  /** One page of logistics lines with database-computed totals over the filtered set. */
  getLogisticsLinesPage(filters: LogisticsFilters | undefined, page: number, pageSize: number): Promise<LogisticsLinesPage> {
    const base = this.logisticsQueryString(filters);
    return this.request(`/logistics-insights/lines/page${base}${base ? "&" : "?"}page=${page}&pageSize=${pageSize}`);
  }

  /** @deprecated First 500 only — use getLogisticsLinesPage. */
  getLogisticsLines(filters?: LogisticsFilters): Promise<OrgLogisticsLineSummary[]> {
    return this.request(`/logistics-insights/lines${this.logisticsQueryString(filters)}`);
  }

  getGlobalLogisticsRoutes(filters?: LogisticsFilters): Promise<LogisticsRouteSummary[]> {
    return this.request(`/logistics-insights/global/routes${this.logisticsQueryString(filters)}`);
  }

  getGlobalStakeholderRatings(): Promise<StakeholderRatingSummary[]> {
    return this.request("/logistics-insights/global/stakeholder-ratings");
  }

  getGlobalProductSourcing(): Promise<ProductSourcingSummary[]> {
    return this.request("/product-sourcing-insights/global");
  }

  // ---- Insights app (2026-10-25) ----
  insightsOverview(): Promise<InsightsOverview> {
    return this.request("/insights/overview");
  }
  insightsPriceCategories(): Promise<InsightsPricedCategory[]> {
    return this.request("/insights/prices/categories");
  }
  insightsPriceTrend(category: string): Promise<InsightsPriceTrendPoint[]> {
    return this.request(`/insights/prices/trend?category=${encodeURIComponent(category)}`);
  }
  insightsPriceMovement(): Promise<InsightsPriceMovement[]> {
    return this.request("/insights/prices/movement");
  }
  insightsFxSeries(from: string, to: string, start: string, end: string): Promise<InsightsFxSeries> {
    return this.request(`/insights/fx/series?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&start=${start}&end=${end}`);
  }
  insightsActivity(): Promise<InsightsActivity> {
    return this.request("/insights/activity");
  }
  insightsFreightRates(): Promise<InsightsFreightRate[]> {
    return this.request("/insights/freight/rates");
  }
  insightsFreightMovement(): Promise<InsightsPriceMovement[]> {
    return this.request("/insights/freight/movement");
  }
  insightsServicePrices(byRegion = false): Promise<InsightsServicePrice[]> {
    return this.request(`/insights/services/prices${byRegion ? "?byRegion=true" : ""}`);
  }
  insightsItems(): Promise<InsightsUserItem[]> {
    return this.request("/insights/me/items");
  }
  insightsSaveItem(body: SaveInsightsUserItemInput): Promise<{ id: string | null; already: boolean }> {
    return this.request("/insights/me/items", { method: "POST", body: JSON.stringify(body) });
  }
  insightsRenameItem(id: string, name: string): Promise<{ updated: boolean }> {
    return this.request(`/insights/me/items/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
  }
  insightsRemoveItem(id: string): Promise<{ removed: boolean }> {
    return this.request(`/insights/me/items/${id}`, { method: "DELETE" });
  }
  insightsServiceMovement(): Promise<InsightsPriceMovement[]> {
    return this.request("/insights/services/movement");
  }
  insightsPriceBreakdown(category: string, by: InsightsPriceDimension): Promise<InsightsPriceBreakdownRow[]> {
    return this.request(`/insights/prices/breakdown?category=${encodeURIComponent(category)}&by=${by}`);
  }
  insightsSourcing(): Promise<ProductSourcingSummary[]> {
    return this.request("/insights/sourcing");
  }
  insightsLogisticsRoutes(filters?: LogisticsFilters): Promise<LogisticsRouteSummary[]> {
    return this.request(`/insights/logistics/routes${this.logisticsQueryString(filters)}`);
  }
  insightsLogisticsTrend(filters: { manufactureCountryCode?: string; destinationCountryCode?: string; transportMode?: string } = {}): Promise<InsightsLogisticsTrendPoint[]> {
    const q = new URLSearchParams(); for (const [k, v] of Object.entries(filters)) if (v) q.set(k, v);
    return this.request(`/insights/logistics/trend${q.toString() ? `?${q.toString()}` : ""}`);
  }
  insightsSourcingTrend(manufactureCountryCode?: string): Promise<InsightsSourcingTrendPoint[]> {
    return this.request(`/insights/sourcing/trend${manufactureCountryCode ? `?manufactureCountryCode=${encodeURIComponent(manufactureCountryCode)}` : ""}`);
  }
  insightsReferenceCountries(): Promise<InsightsReferenceCountry[]> {
    return this.request("/insights/reference/countries");
  }
  insightsLogisticsRatings(): Promise<StakeholderRatingSummary[]> {
    return this.request("/insights/logistics/ratings");
  }
}

const ACTIVE_ORG_KEY = "universe.activeOrganizationId";

/** The organisation platform staff last chose in this app's header switcher
 * (per browser, per app). Wrapped because storage can be unavailable. */
export function getStoredActiveOrganizationId(): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(ACTIVE_ORG_KEY);
  } catch {
    return null;
  }
}

export function setStoredActiveOrganizationId(id: string | null): void {
  try {
    if (id) window.localStorage.setItem(ACTIVE_ORG_KEY, id);
    else window.localStorage.removeItem(ACTIVE_ORG_KEY);
  } catch {
    /* storage unavailable — selection just won't persist */
  }
}

const BRAND_KEY = "universe.rememberedBrand";

export interface RememberedBrand {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

/** The last organisation brand this browser signed in as, so the sign-in
 * screen can show it before anyone is authenticated. Local to this app/browser. */
export function getRememberedBrand(): RememberedBrand | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(BRAND_KEY);
    return raw ? (JSON.parse(raw) as RememberedBrand) : null;
  } catch {
    return null;
  }
}

export function rememberBrand(brand: RememberedBrand): void {
  try {
    window.localStorage.setItem(BRAND_KEY, JSON.stringify(brand));
  } catch {
    /* storage unavailable — sign-in screen just shows the Universe default */
  }
}
