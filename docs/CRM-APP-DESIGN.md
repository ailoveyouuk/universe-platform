# CRM app: design for approval (draft 2026-10-26, updated after the standards research)

**Read with `CRM-STANDARDS-AND-DATA-PROTECTION.md`**, which sets the essential and desirable requirements from UK GDPR, the ICO, the Data (Use and Access) Act 2025, international standards and the established CRM platforms. Where this document and that one differ, that one wins on data protection.

Written after the Tenders, Product Database, Admin, Project Management and Insights builds, so it reuses what exists rather than adding a parallel contact book. Items marked **[K]** are general professional knowledge that has not been read from the source in this project and should be confirmed with a specialist before any public claim. Items marked **[R]** were read from the source (see the Tenders standards guide for which sources those are).

## 1. What the CRM is for

**Reading taken (please confirm, section 11, question 1):** each organisation uses the CRM to manage its **relationships with the stakeholders it works with**: manufacturers, suppliers, freight forwarders, clients, funders, tendering bodies and other Universe organisations. It answers: who do we deal with, how healthy is each relationship, what happened last, what is due next, what is the opportunity, and is every relationship compliant with our own rules.

It is **not** a sales-marketing tool (no campaigns, no bulk email, no lead scoring). It is a **relationship and accountability record** for a regulated supply chain, in the same spirit as the rest of Universe: auditable, interconnected and evidence-led.

A second, smaller use, for you as platform owner (pipeline of organisations joining Universe), is noted in section 10 and is not part of the first build.

## 2. Principles

1. **One source of truth.** The stakeholder stays in Project Management (`Partner`) or, for another Universe organisation, in the Admin hub (`Organization` and its profiles). The CRM adds a **relationship layer** on top. It never copies company details, certifications, scorecards or documents; it shows them read-only and links to where they are edited.
2. **Everything links.** Every interaction, task and opportunity can point at a project, tender, bid, contract, complaint, batch or product, and those records show their related CRM activity back.
3. **Nothing is deleted.** Records are archived or, for personal data, restricted or anonymised (section 8 has one decision for you on this).
4. **Private by default.** A relationship record belongs to one organisation. Another organisation never sees your notes, interactions or opportunities. The shared stakeholder registry and Insights never receive contact or relationship data.
5. **Personal data is treated as personal data.** Business contacts are individuals (section 8).
6. **Accessible and consistent.** Same shell, palette, four-tile dashboards, drilldown and filters as the other apps; WCAG 2.1 AA in both themes.
7. **Server-enforced app access.** A new app key `crm` joins the per-person app toggles in Admin, and the controllers carry `RequiresApp("crm")`.

## 3. What already exists and is reused

| Need | Already in Universe | Where |
|---|---|---|
| Company identity, roles, approval status, risk tier, review cadence | `Partner`, `PartnerRole`, `PartnerApprovalHistory`, `nextApprovalReviewDue` | Project Management |
| Checks, certificates, financial detail, evidence | `PartnerCompanyCheck`, `PartnerCertification`, `PartnerFinancialDetail`, `StakeholderEvidenceRecord` | Project Management |
| Role detail (manufacturer sites, warehousing, etc.) | `*Detail` tables, `ManufacturerSite` | Project Management |
| Performance | Partner scorecard (0 to 100), tender performance records, quality complaints (CAPA) | Quality, Tenders |
| Contacts | `Contact` (name, email, phone, title) linked to a partner and to projects | Project Management |
| Other organisations' public profiles | Organisation hub, supplier directory, scope, certifications, network search, saved searches | Admin, Tenders |
| De-duplication across organisations | `StakeholderRegistryEntry` | Shared |
| Tasks and reminders | Notification actions with due dates, assignee, completion | All apps |
| Timeline / audit | Tender event chain, audit log, field change log | API |

## 4. What is genuinely missing (the CRM adds only this)

1. **A relationship record**: an owner, a tier, a status and a review cadence for each counterparty. Today a stakeholder has an approval status but no "who looks after this relationship" and no relationship health.
2. **Richer contacts**: today a contact has four fields. A relationship needs role in decisions, preferred channel and language, last verified, and a basis for holding the data.
3. **Interactions**: a dated log of meetings, calls, site visits, audits, correspondence summaries and decisions, linked to the work they were about. Nothing records this today.
4. **Follow-ups**: tasks tied to a relationship or interaction, using the existing action system.
5. **Opportunities**: a light pipeline of things that could become work (a tender to bid on, a product to source, a framework call-off to raise, a supplier to qualify), with a stage and a link to the real tender or project once it exists.
6. **A relationship 360 view and overview dashboards** that pull together what is already scattered across apps.
7. **Segments and tags** for finding groups (for example "WHO-prequalified manufacturers in India with certificates expiring in 90 days").

## 5. Data model (proposal)

All tenant tables carry `organizationId` and get row-level security in `infra/sql`, like the Tender and Quality tables. Archive columns follow the existing pattern.

- **`CrmRelationship`**: `organizationId`, one of `partnerId` or `counterpartyOrganizationId` (exactly one), `ownerUserId`, `tier` (STRATEGIC, KEY, STANDARD, WATCH), `status` (PROSPECT, ACTIVE, DORMANT, ON_HOLD, ENDED), `reviewIntervalMonths`, `nextReviewDue`, `healthOverride` (optional, with reason), `summary`, `archivedAt`. Unique per organisation and counterparty.
- **`CrmContactProfile`**: extends `Contact` one-to-one: `decisionRole` (DECISION_MAKER, INFLUENCER, TECHNICAL, FINANCE, QUALITY, LOGISTICS, OTHER), `preferredChannel`, `language`, `timeZone`, `lawfulBasis` and `lawfulBasisReason` (section 8), `source` (how and where the contact was obtained), `privacyInfoSentOn`, `subscriberType` (COMPANY, SOLE_TRADER_OR_PARTNERSHIP, UNKNOWN, treated as an individual), `lastVerifiedOn`, `status` (ACTIVE, LEFT_ORGANISATION, DO_NOT_CONTACT), `objectedAt`, `restrictedAt`, `anonymisedAt`. Existing `Contact` columns are not changed, so Project Management keeps working.
- **`CrmInteraction`**: `relationshipId`, `type` (MEETING, CALL, SITE_VISIT, AUDIT, VIDEO_CALL, CORRESPONDENCE, DECISION, OTHER), `occurredAt`, `summary`, `outcome`, `participantsInternal[]`, `participantContactIds[]`, `linkedType` plus `linkedId` (project, tender, bid, contract, complaint, batch, product), `confidential` flag (visible only to the owner and relationship managers), `createdById`. Edits are logged; no hard delete.
- **`CrmOpportunity`**: `relationshipId`, `title`, `kind` (TENDER, SOURCING, FRAMEWORK_CALL_OFF, QUALIFICATION, OTHER), `stage` (IDENTIFIED, QUALIFYING, ENGAGED, SUBMITTED, WON, LOST, WITHDRAWN), `expectedValue` and currency (cost-side figures only, never margin-bearing prices), `expectedDate`, `linkedType`/`linkedId` once a real tender or project exists, `lostReason`.
- **`CrmTag`** and **`CrmRelationshipTag`**: free segments an organisation defines.
- **Follow-ups** reuse `Notification` actions (`requiresAction`, due date, assignee) with a new `subjectType` of `CRM_INTERACTION` or `CRM_RELATIONSHIP`, so they already show in every app's bell and the dashboard actions card. No new task table.
- **Relationship health** is **calculated, not typed**, from data that already exists: scorecard score, open and overdue complaints, certificate expiry, approval review overdue, recent interaction age, tender performance. `healthOverride` exists only for a manager to record a judgement with a reason.

Privacy tables added by the standards research: **`CrmPrivacyRequest`** (access, rectify, erase, restrict, object: received, identity confirmed, clock stopped, due, decision, exemption reasons, completed), **`CrmSuppression`** (objections and opt-outs, kept after erasure), **`CrmRetentionRule`** (per data category, with the justification), **`CrmAccessLog`** (who viewed, exported or anonymised a contact).

Estimated new tables: 10 (plus RLS). No change to existing tables.

## 6. Screens

**Overview** (landing; four tiles per row, drillable, as elsewhere): relationships by tier and status, reviews due in 30 days, relationships needing attention (calculated health), open follow-ups, opportunities by stage, certificates expiring across my relationships, interactions this month.

**Relationships** list with full-depth filters (counterparty type and role, country, tier, status, owner, health, tag, certificate state, last interaction age) and a map toggle reusing the Geographies map components.

**Relationship 360** (one page, tabs):
- *Overview*: identity card (read-only from the owning app, with an "Edit in Project Management" or "Edit in Admin" link), owner, tier, health with the reasons behind it, next review.
- *People*: contacts with decision role, verified date and status.
- *Interactions*: timeline, add interaction, filter by type and linked work.
- *Opportunities*: pipeline for this counterparty.
- *Work together*: projects, tenders and bids, contracts, batches and products involving them (read-only links).
- *Performance*: scorecard, tender performance records, complaints and CAPA (read-only, link-through).
- *Compliance*: approval status, review dates, company checks, certificates and evidence expiry, sanctions or debarment screening records where Tenders holds them.
- *Documents*: links to controlled documents already held; no second document store.

**Pipeline** (opportunities board by stage, with value totals in the organisation's currency), **Follow-ups** (the existing actions filtered to CRM), **Reviews** (relationships due for periodic review, tying into the existing annual "Bona Fide re-check"), **Segments** (tags and saved filters).

**Search**: relationships, contacts and interactions join the global search, scoped by the new app key; notifications get CRM route prefixes so they open in the right app (the mechanism built today).

## 7. How it connects to the other apps

| From | Into the CRM | Back out of the CRM |
|---|---|---|
| Project Management: stakeholder created | Relationship auto-created (PROSPECT or ACTIVE by approval status), owner = creator | "Relationship" panel on the stakeholder page |
| Project Management: project, batch, complaint | Shown in *Work together*; complaint raises health flag | "Log interaction" button on those records |
| Tenders: invitation, bid, award, contract, performance record | Shown in *Work together* and *Performance*; award can create or advance an opportunity to WON | Opportunity can link to a tender; "Log interaction" on a bid or contract |
| Admin: organisation profile, scope, certifications | Read-only card and certificate expiry in *Compliance* | "Edit profile" link |
| Product Database: product sources, registrations, safety notices | Shown against the manufacturer or supplier; a safety notice raises a health flag | none |
| Insights | **Nothing** from the CRM, ever (interactions and contacts are identifying) | Anonymised benchmarks may be shown beside a relationship (for example "typical lead time for this category"), as already done for service costs |
| Notifications | Reminders for reviews, follow-ups, expiries | Existing bell |

## 8. Privacy and data protection

The full requirements, with the ICO and legislation basis for each, are in `CRM-STANDARDS-AND-DATA-PROTECTION.md` (references P1 to P7, R1 to R7, S1 to S5). In short:

- **Controller and processor.** Each organisation is the controller of its CRM data and Universe is its processor, so a data-processing agreement with the Article 28 terms and a sub-processor register are required. Universe never uses CRM content for its own purposes.
- **Lawful basis and transparency.** A recorded basis and reason per contact (default legitimate interests, with a built-in assessment template), privacy information for contacts including those not collected from the person, and a records-of-processing export.
- **Individual rights.** One privacy-request console: find everything about a person, export in a common electronic format within the one-month limit (with the stop-the-clock and extension rules), flag third-party names for redaction, rectify, restrict, object (absolute for marketing) with a suppression list that survives erasure, and erase.
- **Erasure versus "nothing is ever deleted".** Personal fields are irreversibly anonymised in place on a valid request, the business fact remains, and the action is logged. The ICO's erasure guidance does not itself endorse anonymisation as a substitute, so this needs a data-protection adviser's confirmation.
- **Retention.** A justified schedule per category with a review queue; the 6-year default is a starting position to justify, not a rule.
- **Special category and criminal-offence data are not recorded.** Free-text notes carry a guard and a writing guide. Tenders holds screening results; the CRM only shows the outcome for individuals.
- **Visibility.** Interactions are visible to people with `crm.view`; a confidential interaction is visible only to its author, the relationship owner and holders of `crm.manage`. Notes are never shown to the counterparty. Contact and interaction data never reaches the registry, the supplier directory, Insights or another organisation.
- **Breaches.** Universe notifies the organisation promptly; the organisation decides on reporting within 72 hours where required.
- **No email logging and no marketing for now.** If either is added later, `subscriberType` and the suppression list are already in place.
- **Access.** `crm.view` and `crm.manage` plus the app toggle; export follows the existing rule that organisations may export what they add.

## 9. Standards this serves

How each source bears on relationship management, and what the CRM does about it. Basis labels follow the standards guide: **[R]** read, **[K]** recalled, not read.

| Expectation | Source and basis | CRM response |
|---|---|---|
| Know your suppliers and assess them before and during use; keep records | WHO Model Quality Assurance System for procurement agencies, supplier prequalification and performance monitoring **[R, partial]**; EU GDP guidelines on outsourced activities and written agreements **[K]** | Compliance tab, review cadence, evidence expiry, performance in one place |
| Due diligence on business partners, proportionate to risk, and raising concerns | ISO 37001 clause titles (due diligence, financial and non-financial controls, gifts and hospitality, raising concerns) **[R, titles only]**; UK Procurement Act 2023 supplier information and exclusion **[R in the guide, partial]** | Tier and risk-based review interval; sanctions and debarment screening shown; a "gifts and hospitality" interaction type (see open question 6) |
| Manage relationships for sustainable procurement | ISO 20400 **[R, abstract only]** | Tier, review and performance feedback loop |
| Control externally provided processes and keep evidence | ISO 9001:2015 clause 8.4 **[K]** | Same as above; interactions and decisions timestamped |
| Handle complaints from and about partners consistently | Existing complaints module; ISO 10002 **[K]** | Complaints surface in health and the 360 view |
| Protect personal data | UK GDPR, Data Protection Act 2018 and the Data (Use and Access) Act 2025 **[R, ICO guidance]** | Section 8 and the companion document |
| Security baseline | Cyber Essentials Plus (the standing target) | Same controls as the rest of the platform |

The CRM does not add a new standards guide; it uses the existing component to show relevant references on the review and onboarding screens, as the Tenders app does.

## 10. Not in the first build

- Platform-owner pipeline (organisations being onboarded to Universe, with stages and follow-up). Better as a small Admin feature using the same opportunity pattern once the organisation CRM exists.
- Email and calendar capture; bulk email; marketing consent.
- Native mobile app (the web app is responsive, as the others are).
- Revenue forecasting, lead scoring, quotas.
- A shared CRM across organisations (relationship notes are never shared).

## 11. Decisions I need from you

1. **Whose CRM?** The reading in section 1 (each organisation manages its own stakeholder relationships) or the platform-owner view (you managing organisations joining Universe), or both with the first as the build?
2. **Separate app?** The app switcher already has a CRM slot and a module colour. I recommend a **dedicated CRM app** on its own Static Web App, as with Insights, for consistent per-person app toggles and search scoping. The alternative is a Relationships section inside Project Management, which you earlier said you do not want to grow.
3. **Erasure versus "never delete":** anonymise personal fields in place on a valid request, with a log entry (my proposal)?
4. **Who owns a relationship by default?** The person who created the stakeholder, with the organisation's admin able to reassign?
5. **Opportunity values:** cost-side figures only, as with Insights, or also expected contract value to the organisation?
6. **Gifts and hospitality** as a recorded interaction type (an anti-bribery control from ISO 37001 titles), visible to compliance reviewers?
7. **Retention default** for ended relationships (proposed 6 years, to be justified in writing), editable per organisation?
8. **Controller and processor split** (each organisation controls its CRM data, Universe processes it) and a standard data-processing agreement?
9. **Who is the data-protection contact** for Universe and, per organisation, for the CRM?

## 12. Proposed build order

1. **Foundation**: `crm` app key, permissions, new Static Web App shell with the standard navigation, theme and accessibility lint; relationship record and auto-creation from stakeholders; relationship list.
2. **Relationship 360** read-only tabs (people, work together, performance, compliance) from existing data.
3. **Interactions and follow-ups** (with linked work and the confidential flag); "Log interaction" from project, tender and complaint screens.
4. **Contacts profile** (decision role, lawful basis, verification) and the anonymise-on-request action.
5. **Opportunities and pipeline**, with automatic stage movement from tender events.
6. **Overview dashboards, segments, reviews, search and notifications**; calculated health.
7. **Demo data**: relationships for the 302 simulated organisations' counterparts in Universe Demo, a believable year of interactions, opportunities linked to existing tenders (SIM-ECO, SIM-SVC, SIM-FWK), through logged seed scripts so the confirmed demo baseline is only added to.

**Privacy gate on every step:** no step ships unless it names the requirement(s) it satisfies in the companion document and adds no data category, sharing path or profiling that the DPIA screening does not cover. The privacy-request console, retention queue, suppression list and access log are built in step 4 with the contact profile, **before** any real data can be entered.

Production steps for you: one SQL paste for the new tables' row-level security, one Static Web App deploy token secret and URL variable plus redirect URI for the new app (as for Insights).
