# CRM: standards, platform benchmarks and UK data protection requirements (2026-10-26)

Companion to `CRM-APP-DESIGN.md`. It turns what national and international standards, established CRM platforms and the ICO expect into **build requirements** the CRM must meet, split into **essential** (must hold before real use) and **desirable** (build when the essentials are done). This is engineering guidance, not legal advice: the privacy sections need review by a data-protection adviser before real organisations load real contacts.

## 1. How far each source was read

The Tenders standards guide taught us to say exactly what was and was not read. Same rule here.

| Source | Basis |
|---|---|
| ICO: legitimate interests guide | Read (page) |
| ICO: records of processing (RoPA) and lawful basis (audit framework page) | Read |
| ICO: subject access guide (updated 16 July 2026 for the Data (Use and Access) Act 2025) | Read |
| ICO: right to erasure | Read |
| ICO: storage limitation | Read |
| ICO: data protection by design and default (updated 5 Feb 2026) | Read |
| ICO: contracts between controllers and processors (what the contract must include) | Read; ICO notes it is under review for the Act |
| ICO: business-to-business marketing (PECR) | Read |
| ICO: DPIA guidance (Oct 2022 version) | Read to about 100,000 of 122,837 characters; the rest not read |
| ICO: personal data breach reporting (audit toolkit page) | Read; ICO notes it is under review for the Act |
| ICO news: Data (Use and Access) Act consultations (Aug 2025) | Read |
| Data (Use and Access) Act 2025 commencement dates (Bratby Law, a law-firm summary) | Read, **secondary source**; the page itself says to check the legislation. Dates below are as reported there |
| UK international transfers (IDTA, UK Addendum, transfer risk assessment) | Read via a law-firm summary (Brodies); ICO page and adequacy regulations **not read** |
| Salesforce, Microsoft Dynamics 365, HubSpot privacy and GDPR feature pages | Read (vendor pages, so what they claim, not an audit) |
| A vendor feature list (Creatio) as a proxy for common CRM scope | Read; a marketing page, so used only as a checklist of common features |
| ISO/IEC 27701:2025 | Abstract page read (October 2025 edition; specifies a privacy information management system for PII controllers and processors); the standard text is paywalled |
| ISO 10002 (complaints handling) | Summary page read; edition not stated; the standard text is paywalled |
| ISO/IEC 27001:2022, ISO 9001:2015, SOC 2, NIST Privacy Framework | **Recalled, not read** [K] |
| Veeva CRM (life-sciences CRM) | **Not verified**: the page returned was unrelated. Not relied on |
| Gartner and Forrester CRM evaluations | **Not read** (paywalled abstracts only) |
| EU GDPR and UK adequacy status for EU contacts | **Not read** [K] |

## 2. The most important design fact: who is the controller?

Each customer organisation decides why and how it uses its relationship and contact records. That makes **each organisation the controller** of its CRM data, and **Universe the processor** operating the system for it (for CRM content). Universe is the **controller** only of its own account data (user sign-in, audit logs, billing and similar).

This matters because (ICO, read):
- A controller-processor **contract is required**, with the Article 28(3) terms: processing details; documented instructions only (including for transfers); confidentiality of staff; security under Article 32; sub-processor controls (prior written authorisation, flow-down, processor stays liable); help with data-subject requests, breach notification and DPIAs; **delete or return all personal data at the end of the contract**; and audit access. Universe's terms with each organisation must include these.
- A **sub-processor register** is needed (Microsoft Azure and any other service that touches CRM data), with a way to notify organisations of changes and let them object.
- The ICO also recommends that where deleting from backups is not immediate, data is put **beyond use** with a defined retention period. Universe's backup policy must say this.
- Universe must not use CRM content for its own purposes (for example it must never feed Insights, the registry or benchmarks), because that would make Universe a controller of that use. The design already forbids this; this section is the reason.

**Decision needed from you (question A):** confirm this controller/processor split, and that Universe will offer a standard data-processing agreement in its terms. A data-protection adviser should confirm it.

## 3. Requirements from UK GDPR and the ICO

**E** = essential before real use. **D** = desirable.

### 3.1 Lawful basis, transparency, accountability

| Ref | Requirement | Source | Priority |
|---|---|---|---|
| P1 | Every contact has a recorded **lawful basis** and its reason; identified before the data is stored. The CRM supplies a default (legitimate interests for managing a supply relationship) that the organisation can change, never a blank. | ICO RoPA/lawful basis page | E |
| P2 | A **legitimate interests assessment** template (purpose, necessity, balancing) is built in, completed by the organisation once for its CRM use, kept on record, and prompted for review when its purpose or data changes. Universe supplies a draft LIA for the standard supply-chain use. | ICO legitimate interests guide | E |
| P3 | A **RoPA export** for the CRM processing (purposes, categories of people and data, recipients, transfers, retention, security measures). Universe populates the technical parts; the organisation completes the rest. | ICO RoPA page | E |
| P4 | **Privacy information** for contacts: who holds their data, why, on what basis (including the legitimate interests relied on), how long, and how to object or complain. An editable notice text the organisation can send or link when it records a contact, **especially where the contact was not collected from the person** (the individual should still be told). | ICO legitimate interests and B2B pages | E |
| P5 | **Data protection by design and by default**: minimise fields (business details only); privacy-protective defaults (notes private, no data shared outside the organisation); access by role; revoke on role change. | ICO Article 25 guidance | E |
| P6 | **DPIA screening record** for the CRM, and a DPIA if any trigger is added: scoring or profiling individuals, matching or enriching from several sources, tracking behaviour, large-scale processing, collecting personal data from third parties without notice. Routine business-contact storage probably does not need one, but the decision and reasons are recorded. | ICO DPIA guidance | E |
| P7 | A **complaints process** about data handling: an electronic form, acknowledgement within 30 days, and progress updates. Universe provides the form and tracking for its own complaints and a template for the organisation's. | DUAA s.103, reported in force 19 June 2026 | E |

### 3.2 Individual rights

| Ref | Requirement | Source | Priority |
|---|---|---|---|
| R1 | **Subject access**: a "find everything about this person" search across contacts, interactions (including notes), tasks and linked records, producing a copy in a commonly used electronic format, within one month of the *relevant time* (receipt, or identity confirmation). The one-month period can be paused ("stop the clock") while waiting for a clarification the organisation reasonably needs, and extended by up to two months for complex or numerous requests with notice inside the first month. Searches need only be reasonable and proportionate. Log each request, its dates, the decision and any exemption reasons. | ICO subject access guide (16 July 2026) | E |
| R2 | **Third-party information** in notes is the main subject-access risk: a note about one contact often names others. The tool flags third-party names in a result so a reviewer can redact, and the writing guidance tells staff to write notes as if the person will read them. | ICO subject access guide | E |
| R3 | **Erasure**: handle requests case by case. Grounds include data no longer needed, objection with no overriding interest, and withdrawal of consent; exemptions include legal obligation and defending legal claims. Erase from the live system, tell recipients the data was shared with, and put backup copies **beyond use** until they are overwritten on the normal schedule. | ICO erasure guide | E |
| R4 | **Rectification and restriction**: edit with history; a "restricted" flag that stops use while a dispute is resolved. | UK GDPR rights [K] | E |
| R5 | **Objection**: a per-contact objection flag. For direct marketing the right is absolute and processing for marketing must stop; for legitimate interests generally, it stops unless compelling grounds are shown. Objections go on a **suppression list kept even after erasure**, so the person is not recontacted. | ICO legitimate interests and B2B pages | E |
| R6 | **Automated decisions**: the CRM makes no solely automated decision with legal or similarly significant effect on an individual. Relationship health is calculated about the *organisation*, not scored on a person, and a human always decides. If this ever changes, the new Article 22A to 22D safeguards apply. | DUAA s.80, reported in force 5 Feb 2026 | E |
| R7 | **Erasure versus "nothing is ever deleted"**: the platform rule yields to the law for personal data. Proposal: on a valid erasure request, personal fields are **irreversibly anonymised in place** (name, email, phone, free-text mentions), the business fact of an interaction remains, and the action is logged. The ICO's erasure guide covers erasure and "beyond use" for backups but **does not mention anonymisation as a substitute for erasure**; the storage-limitation guide does allow anonymisation as an alternative to erasure when data is no longer needed. So anonymisation must be genuinely irreversible (no key kept), and a data-protection adviser should confirm it for erasure requests. | ICO erasure and storage-limitation guides | E |

### 3.3 Retention, security, breaches, transfers

| Ref | Requirement | Source | Priority |
|---|---|---|---|
| S1 | **Retention schedule** per category of data, justified and reviewable; the ICO says there is no fixed period and "just in case" is not a reason. After a relationship ends, keep enough to show it existed and ended and the key details, and delete the rest; a legal-claims period can justify keeping some records. Automated flagging of records past their review date, with a human decision to erase or anonymise. Pseudonymised data still counts as personal data. The 6-year default in the design is a starting position to justify, not a rule. | ICO storage limitation guide | E |
| S2 | **Security** appropriate to risk: encryption in transit and at rest, access by role, row-level isolation between organisations, audit log of who viewed, changed, exported or anonymised a contact (the platform already does most of this). | UK GDPR Art. 32 [K]; ISO/IEC 27001:2022 [K] | E |
| S3 | **Breach handling**: record every personal-data breach, assess risk to people, report to the regulator within 72 hours where required, tell affected people where required. As processor, Universe must notify the controller organisation promptly so it can meet its own deadline. Internal runbook, out-of-hours route, breach register. | ICO breach reporting page | E |
| S4 | **International transfers**: restricted transfers need a transfer mechanism (adequacy regulations, the ICO's international data transfer agreement, or the UK Addendum to the EU clauses) and usually a transfer risk assessment. Keep CRM data in the UK or EEA region (Azure UK South already) and list any sub-processor outside it. | Brodies summary of ICO guidance; adequacy not read | E |
| S5 | **Special category and criminal offence data** are not recorded. Free-text notes are the leak path: a field warning, a "do not record health, beliefs, trade-union membership, criminal allegations" prompt, and a way to flag and remove such text. **Sanctions and debarment screening of individuals (for example directors) can touch criminal-offence data.** The CRM shows only the *result* of screening held in Tenders (cleared / not cleared) and does not store allegations about individuals. If an organisation needs more, it needs a Schedule 1 condition and an appropriate policy document. | ICO RoPA/lawful basis page | E |
| S6 | **Children's data**: not expected. The new Article 25 children's duty applies to online services likely to be accessed by children; the CRM is a business tool, so it is out of scope, but the contact form must not invite personal details of minors. | ICO Article 25 guidance | D |

### 3.4 Electronic marketing (PECR) — out of scope now, designed in

Marketing is not part of the CRM today. If email or text is ever added, the ICO rules (read) are:
- Corporate subscribers (companies, LLPs, Scottish partnerships, some public bodies): no consent needed for marketing email or text, but the sender must identify itself, give a valid opt-out and honour it.
- **Sole traders and non-LLP partnerships count as individuals**: consent needed, or the soft opt-in (details obtained in a sale or negotiation, similar products, opt-out at collection and in every message).
- A named person's work address is still personal data under UK GDPR, so objections must be honoured regardless.
- Live B2B calls must be screened against the TPS and CTPS.
- Keep a **suppression list**, not just deletions (this is requirement R5).
- Reported change: analytics and some functionality cookies became exempt from prior consent (DUAA, reported in force 5 Feb 2026); advertising cookies still need consent.

So the contact record carries a `subscriberType` (company, sole trader/partnership, unknown) from day one, even though nothing sends yet. Unknown is treated as an individual.

## 4. What the Data (Use and Access) Act 2025 changes (as reported; verify against the legislation)

| Change | Reported date | Effect on the CRM |
|---|---|---|
| Subject access: "stop the clock", reasonable and proportionate search | 5 February 2026 | R1 |
| Recognised legitimate interests (a short list of public-interest purposes with no balancing test) | 5 February 2026 | Not relevant: ordinary supply-chain use still needs a legitimate interests assessment (P2) |
| Automated decision-making permission-plus-safeguards model | 5 February 2026 | R6 |
| PECR and cookies relaxation for analytics | 5 February 2026 | Section 3.4 |
| Data protection complaints procedure (new s.164A DPA 2018) | 19 June 2026 | P7 |
| ICO reconstituted as the Information Commission | 30 September 2026 | Names in notices and templates: "the ICO / Information Commission"; check the current name when drafting |

The ICO states its own guidance on contracts and breach reporting is under review for the Act, so those two areas need re-checking before launch.

## 5. International standards

| Standard | What it asks of a CRM-like system | Priority | Basis |
|---|---|---|---|
| **ISO/IEC 27001:2022** information security management | Access control, logging and monitoring, supplier (sub-processor) management, secure development, incident management | E (Cyber Essentials Plus is the current target; 27001 is the natural next) | Recalled [K] |
| **ISO/IEC 27701:2025** privacy information management | A management system for PII controllers and processors; the October 2025 edition specifies requirements and guidance | D (adopt after Cyber Essentials Plus; Universe is a processor for CRM data) | Abstract read |
| **ISO 9001:2015** cl. 8.4 (control of externally provided processes) and 9.1.2 (customer satisfaction) | Evidence of how suppliers are selected, evaluated and re-evaluated; monitoring customer perception | E (already the basis for the review cadence and performance tabs) | 9.1.2 confirmed on the 10002 summary page; 8.4 recalled [K] |
| **ISO 10002** complaints handling | A welcoming, accessible, analysed and audited complaints process | D (complaints module exists; reuse for data-protection complaints P7) | Summary page read |
| **ISO 37001** anti-bribery | Due diligence on business partners; controls on gifts and hospitality; raising concerns | E for the "gifts and hospitality" interaction type and review tiers | Clause titles read |
| **ISO 20400** sustainable procurement | Relationship management with suppliers | D | Abstract read |
| **SOC 2** (trust services criteria) | Security, availability, confidentiality, processing integrity, privacy attestation, often requested by larger customers | D (market expectation, not law) | Recalled [K] |
| **NIST Privacy Framework** | A risk-based way to organise privacy work | D | Recalled [K] |
| **EU GDPR** | Applies to EU-based contacts; mostly the same shape as UK GDPR | D (confirm status of UK-EU adequacy before storing EU contacts at scale) | Not read |
| **GxP / EU Annex 11 / 21 CFR Part 11** | Expectations for computerised systems in regulated pharma (validation, audit trail, electronic records) | D, only if an organisation uses the CRM as a GxP system, which this design does not claim | Recalled [K] |

## 6. What established CRM platforms provide

Read from the vendors' own pages (what they say they offer):

| Capability | Salesforce | Dynamics 365 | HubSpot | Universe CRM position |
|---|---|---|---|---|
| Consent and preferences | Global Consent Manager | Consent features are documented for Customer Insights (seen in search results only; not read) | Subscription types with opted-in / neutral / opted-out states, consent on the contact timeline | Consent/objection flag and suppression list (R5); full consent journeys **not needed** (no marketing) |
| Lawful-basis field | Not on the page read | Not on the page read | "Legal Basis for Processing" contact property | **Built in (P1)**, with a reason |
| Field-level audit | Field Audit Trail (who, when, previous value); Event Monitoring of access | System-generated logs exportable by the tenant administrator | Consent history on timeline | Audit of every change and access (S2) |
| Encryption | Platform Encryption at rest with customer key control | Not on the page read | Not detailed | At rest and in transit (S2); customer-managed keys **desirable** |
| Masking in non-production | Data Mask & Seed | Not on the page read | Not on the page read | The demo is simulated; any real-data copy must be masked (D) |
| Retention and archival | Archive with retention limits | Not on the page read | Not on the page read | Retention schedule with review flags (S1) |
| Subject requests | Privacy Center handles access and right-to-be-forgotten, deletion or anonymisation | You locate and classify data yourself; export via search, Excel and API; delete manually; no single restriction feature in most apps | GDPR delete (permanent) with a warning if someone re-adds the person; export of a contact in machine-readable form | **One tool: find, export, rectify, restrict, anonymise (R1 to R4)**, better than manual |
| Transactional records protected from edit | Not stated | Financial ledger entries are locked for audit and fraud reasons | Not stated | Interactions are append-only with edit history; anonymisation changes personal fields only |

Common feature scope in the market (a vendor checklist, so a floor and not a standard): contact and account management with a 360 view, activity and interaction tracking, opportunity and pipeline management, task management, workflow automation, reporting and dashboards, integrations, data security and access controls, document management, mobile access, sandboxes. Universe's design covers all but **workflow automation** (partly, via notifications), **marketing automation** (deliberately excluded), **forecasting** and **AI agents** (out of scope for now).

**Features to adopt from the benchmarks (not in the first design):**
1. A **legal basis** field with reason on each contact (HubSpot-style) — now P1.
2. **Consent/objection status with history** on the timeline — now R5.
3. A **GDPR-style hard-delete warning on re-adding** a person who was erased or objected, adapted to our model: a suppression-list hit when someone tries to add the same email.
4. A **single privacy-request console** (Salesforce Privacy Center idea) rather than manual hunting — now R1 to R4.
5. **Access monitoring** (who viewed which contact), not only change history — S2.

## 7. Essential versus desirable, in one list

**Essential before any real organisation loads real contacts:** P1 to P7, R1 to R7, S1 to S5, the data-processing agreement and sub-processor register (section 2), a breach runbook, a documented DPIA screening, role-based access with an audit of views, exports and anonymisations, and `subscriberType`.

**Desirable, later:** customer-managed encryption keys; masked copies for support; ISO/IEC 27701 and SOC 2 readiness; consent journeys and email/telephone preference handling if marketing is ever added; EU-contact handling; workflow rules that go beyond notifications; read-only API for the organisation's own integrations.

## 8. Changes this makes to the CRM design

The design document now carries these (see its updated sections 5, 8, 9 and 11):
- Contact profile gains `subscriberType`, `source` (where and how the contact was obtained), `privacyInfoSentOn`, `objectedAt`, `restrictedAt`, `anonymisedAt`, and `lawfulBasisReason`.
- New tables: `CrmPrivacyRequest` (access, rectify, erase, restrict, object; dates, decision, exemptions), `CrmSuppression` (kept after erasure), `CrmRetentionRule` (per category) and a `CrmAccessLog` for views and exports.
- A **privacy request console** and a **retention review** queue in the app.
- A **free-text guard** on notes and a writing guide.
- Screens for the LIA and RoPA export.
- A **privacy gate on every build step**: no CRM feature ships unless it can say which requirement(s) in this document it satisfies, and does not add a data category, sharing path or profiling not covered by the DPIA screening.

## 9. Decisions and checks needed

A. **Controller/processor split** (section 2) and a standard data-processing agreement.
B. **Erasure by anonymisation** in place of deletion (R7), confirmed by a data-protection adviser.
C. **Default retention period** (S1), with a justification we can write down.
D. **Who is the CRM's data-protection contact** for the organisation and for Universe (a DPO is only mandatory in certain cases; a named contact is expected).
E. **Specialist review** before launch of: the LIA template, privacy notice text, DPA, breach runbook, and the sections of this document marked as secondary-source or recalled.
F. **Re-check** the ICO's contracts and breach guidance after its Act-related review, and confirm DUAA commencement dates against the legislation.
G. **Whether Universe will register with the ICO** (a data protection fee applies to most controllers; Universe is a controller of its own account data). Not researched here.

## 10. Sources

- ICO, legitimate interests: ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/legitimate-interests/
- ICO, records of processing and lawful basis: ico.org.uk/for-organisations/advice-and-services/audits/data-protection-audit-framework/accountability/records-of-processing-and-lawful-basis
- ICO, subject access: ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/subject-access-requests/a-guide-to-subject-access/
- ICO, right to erasure: ico.org.uk/for-organisations/guide-to-dp/guide-to-the-uk-gdpr/individual-rights/right-to-erasure
- ICO, storage limitation: ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/storage-limitation/
- ICO, data protection by design and default: ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/guide-to-accountability-and-governance/data-protection-by-design-and-default
- ICO, controller-processor contracts: ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/contracts-and-liabilities-between-controllers-and-processors-multi/what-needs-to-be-included-in-the-contract/
- ICO, DPIAs (Oct 2022): ico.org.uk/media/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias-1-0.pdf
- ICO, B2B marketing: ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/business-to-business-marketing/
- ICO, breach reporting (audit toolkit): cy.ico.org.uk/for-organisations/advice-and-services/audits/data-protection-audit-framework/toolkits/personal-data-breach-management/reporting-processes/
- ICO news, DUAA consultations (Aug 2025): ico.org.uk/about-the-ico/media-centre/news-and-blogs/2025/08/ico-launches-consultations-for-data-use-and-access-act-2025-amendments/
- Bratby Law, DUAA commencement (secondary): bratby.law/data-use-and-access-act-2025-commencement/
- Brodies, international transfers (secondary): brodies.com/insights/ip-technology-and-data/ico-publishes-new-guidance-on-international-data-transfers-and-transfer-risk-assessments/
- Salesforce, data privacy and compliance: salesforce.com/products/data-privacy-and-compliance/
- Microsoft Learn, GDPR data subject requests for Dynamics 365: learn.microsoft.com/en-us/compliance/regulatory/gdpr-dsr-Dynamics365
- HubSpot, GDPR: hubspot.com/gdpr
- Creatio, CRM features (vendor checklist): creatio.com/glossary/crm-features
- AFNOR, ISO/IEC 27701:2025 abstract: boutique.afnor.org (ISO/IEC 27701:2025)
- The 9000 Store, ISO 10002 summary: the9000store.com
