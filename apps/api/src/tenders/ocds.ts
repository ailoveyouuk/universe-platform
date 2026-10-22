/**
 * Open Contracting Data Standard (OCDS 1.1) release package for one tender (2026-10-22). Pure mapping, no database access, so the rules
 * are unit tested. Privacy rules are applied by the caller handing in only what may be shown and enforced again here:
 *  - bidders (tenderers) and their count appear only once the bids have been opened (sealed until then);
 *  - an award's reasoning, scores, prices per bid and evaluator names are never exported (they are internal), only the award, the supplier
 *    and the awarded value;
 *  - the OCID prefix below is a placeholder; a publisher that registers its own prefix with the Open Contracting Partnership replaces it.
 */
export const OCDS_VERSION = "1.1";
export const OCID_PREFIX = "ocds-universe";
const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : undefined);
const num = (v: { toString(): string } | number | null | undefined) => (v === null || v === undefined ? undefined : Number(v.toString()));
const clean = <T extends Record<string, unknown>>(o: T): T => { for (const k of Object.keys(o)) if (o[k] === undefined || (Array.isArray(o[k]) && (o[k] as unknown[]).length === 0)) delete o[k]; return o; };

export interface OcdsInput {
  baseUrl?: string;
  tender: {
    id: string; organizationId: string; referenceNumber: string; title: string; summary: string | null; tenderType: string; visibility: string; status: string; currency: string | null;
    publishedAt: Date | null; clarificationDeadline: Date | null; closingAt: Date | null; awardDueAt: Date | null; contractStartDate: Date | null; bidsOpenedAt: Date | null; awardedAt: Date | null;
    cancelledReason: string | null; emergencyProcurement: boolean; emergencyReason: string | null; frameworkTermMonths: number | null; frameworkCeiling: { toString(): string } | null; frameworkCallOffMethod: string | null; deliveryCountryCodes: string | null;
  };
  buyer: { id: string; name: string };
  lines: { id: string; lineNumber: number; lotNumber: number | null; lotTitle: string | null; description: string; quantity: { toString(): string } | null; unit: string | null; destinationCountryCode: string | null }[];
  countryNames: Record<string, string>;
  submittedBids: { organizationId: string }[];
  orgNames: Record<string, string>;
  awards: { id: string; awardedOrganizationId: string; awardedAt: Date; valueAmount: number | null; currency: string | null }[];
  contracts: {
    id: string; awardId: string; reference: string; title: string; status: string; currency: string | null; totalValue: { toString(): string } | null; startDate: Date | null; endDate: Date | null; executedAt: Date | null;
    milestones: { id: string; title: string; dueDate: Date | null; status: string; completedAt: Date | null; notes: string | null }[];
    variations: { id: string; number: number; title: string; reason: string; termsAmendment: string | null; appliedAt: Date | null; status: string }[];
  }[];
  now?: Date;
}

const TENDER_STATUS = (t: OcdsInput["tender"], hasAward: boolean): string =>
  t.status === "CANCELLED" ? "cancelled" : t.status === "DRAFT" ? "planning" : hasAward || t.awardedAt ? "complete" : "active";
const METHOD = (visibility: string, emergency: boolean) => (emergency ? "limited" : visibility === "INVITED_ONLY" ? "selective" : "open");
const CONTRACT_STATUS: Record<string, string> = { DRAFT: "pending", AWAITING_SIGNATURE: "pending", ACTIVE: "active", COMPLETED: "terminated", TERMINATED: "terminated" };
const MILESTONE_STATUS: Record<string, string> = { PENDING: "scheduled", DONE: "met", MISSED: "notMet" };
const TYPE_DETAIL: Record<string, string> = { RFQ: "Request for quotation", RFP: "Request for proposals", ITT: "Invitation to tender", OPEN_TENDER: "Open tender", FRAMEWORK: "Framework agreement" };

export function buildOcdsPackage(input: OcdsInput) {
  const { tender: t, buyer } = input;
  const now = input.now ?? new Date();
  const ocid = `${OCID_PREFIX}-${t.id}`;
  const party = (id: string, name: string, roles: string[]) => ({ id: `UNIVERSE-${id}`, name, roles });
  const opened = !!t.bidsOpenedAt;
  const tenderers = opened ? [...new Set(input.submittedBids.map((b) => b.organizationId))] : [];
  const lots = [...new Map(input.lines.filter((l) => l.lotNumber !== null).map((l) => [l.lotNumber as number, l.lotTitle])).entries()].map(([n, title]) => ({ id: String(n), title: title ?? `Lot ${n}`, status: t.status === "CANCELLED" ? "cancelled" : "active" }));
  const parties = new Map<string, ReturnType<typeof party>>();
  parties.set(buyer.id, party(buyer.id, buyer.name, ["buyer"]));
  const addRole = (id: string, role: string) => { const p = parties.get(id) ?? party(id, input.orgNames[id] ?? "Organisation", []); if (!p.roles.includes(role)) p.roles.push(role); parties.set(id, p); };
  for (const id of tenderers) addRole(id, "tenderer");
  for (const a of input.awards) { addRole(a.awardedOrganizationId, "supplier"); }

  const tender = clean({
    id: t.referenceNumber, title: t.title, description: t.summary ?? undefined, status: TENDER_STATUS(t, input.awards.length > 0),
    procuringEntity: { id: `UNIVERSE-${buyer.id}`, name: buyer.name },
    items: input.lines.map((l) => clean({
      id: String(l.lineNumber), description: l.description, quantity: num(l.quantity),
      unit: l.unit ? { name: l.unit } : undefined,
      relatedLot: l.lotNumber !== null ? String(l.lotNumber) : undefined,
      deliveryAddress: l.destinationCountryCode ? { countryName: input.countryNames[l.destinationCountryCode] ?? l.destinationCountryCode } : undefined,
    })),
    lots,
    value: t.frameworkCeiling ? { amount: num(t.frameworkCeiling), currency: t.currency ?? undefined } : undefined,
    procurementMethod: METHOD(t.visibility, t.emergencyProcurement),
    procurementMethodDetails: TYPE_DETAIL[t.tenderType] ?? t.tenderType,
    procurementMethodRationale: t.emergencyProcurement ? t.emergencyReason ?? "Emergency procurement" : undefined,
    mainProcurementCategory: "goods",
    submissionMethod: ["electronicSubmission"],
    tenderPeriod: clean({ startDate: iso(t.publishedAt), endDate: iso(t.closingAt) }),
    enquiryPeriod: t.clarificationDeadline ? clean({ endDate: iso(t.clarificationDeadline) }) : undefined,
    awardPeriod: t.awardDueAt ? clean({ endDate: iso(t.awardDueAt) }) : undefined,
    contractPeriod: t.contractStartDate ? clean({ startDate: iso(t.contractStartDate) }) : undefined,
    techniques: t.tenderType === "FRAMEWORK" ? { hasFrameworkAgreement: true, frameworkAgreement: clean({ method: t.frameworkCallOffMethod === "ROTATION" ? "withReopeningCompetition" : "withoutReopeningCompetition", periodRationale: t.frameworkTermMonths ? `${t.frameworkTermMonths} months` : undefined }) } : undefined,
    numberOfTenderers: opened ? tenderers.length : undefined,
    tenderers: tenderers.map((id) => ({ id: `UNIVERSE-${id}`, name: input.orgNames[id] ?? "Organisation" })),
    documents: input.baseUrl ? [clean({ id: "tender-page", documentType: "tenderNotice", title: "Tender notice", url: `${input.baseUrl}/discover/view?id=${t.id}`, format: "text/html" })] : undefined,
  });

  const awards = input.awards.map((a) => clean({
    id: a.id, title: `Award for ${t.referenceNumber}`, status: "active", date: iso(a.awardedAt),
    suppliers: [{ id: `UNIVERSE-${a.awardedOrganizationId}`, name: input.orgNames[a.awardedOrganizationId] ?? "Organisation" }],
    value: a.valueAmount !== null ? { amount: a.valueAmount, currency: a.currency ?? t.currency ?? undefined } : undefined,
  }));

  const contracts = input.contracts.map((c) => clean({
    id: c.id, awardID: c.awardId, title: c.title, description: c.reference, status: CONTRACT_STATUS[c.status] ?? "pending",
    period: clean({ startDate: iso(c.startDate), endDate: iso(c.endDate) }),
    value: c.totalValue !== null ? { amount: num(c.totalValue), currency: c.currency ?? undefined } : undefined,
    dateSigned: iso(c.executedAt),
    amendments: c.variations.filter((v) => v.status === "ACCEPTED").map((v) => clean({ id: String(v.number), date: iso(v.appliedAt), rationale: v.reason, description: [v.title, v.termsAmendment].filter(Boolean).join(": ") })),
    implementation: c.milestones.length ? { milestones: c.milestones.map((m) => clean({ id: m.id, title: m.title, description: m.notes ?? undefined, dueDate: iso(m.dueDate), dateMet: iso(m.completedAt), status: MILESTONE_STATUS[m.status] ?? "scheduled" })) } : undefined,
  }));

  const tags = ["tender"];
  if (awards.length) tags.push("award");
  if (contracts.length) tags.push("contract");
  if (contracts.some((c) => (c.implementation as unknown))) tags.push("implementation");
  if (t.status === "CANCELLED") tags.push("tenderCancellation");

  const release = clean({
    ocid, id: `${ocid}-${now.toISOString().slice(0, 10)}`, date: now.toISOString(), tag: tags, initiationType: "tender", language: "en",
    parties: [...parties.values()], buyer: { id: `UNIVERSE-${buyer.id}`, name: buyer.name }, tender, awards, contracts,
  });
  return {
    uri: `${input.baseUrl ?? "https://universe.invalid"}/ocds/${ocid}`, version: OCDS_VERSION, publishedDate: now.toISOString(),
    publisher: { name: "Universe Platform", scheme: "universe", uid: buyer.id },
    extensions: ((): string[] | undefined => {
      const e: string[] = [];
      if (lots.length) e.push("https://raw.githubusercontent.com/open-contracting-extensions/ocds_lots_extension/master/extension.json");
      if (t.tenderType === "FRAMEWORK") e.push("https://raw.githubusercontent.com/open-contracting-extensions/ocds_techniques_extension/master/extension.json");
      return e.length ? e : undefined;
    })(),
    releases: [release],
  };
}
