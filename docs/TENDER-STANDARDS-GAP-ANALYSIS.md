# Tender app: shared-infrastructure audit, standards landscape and gap analysis

Written 2026-10-19. Status update (same day, later): Lewis decided sealed bids wait and donor-specific quality-policy logic is not needed now (issuers have their own). Built since: shared Incoterm/unit/qualification lists; published Q&A; addenda with acknowledgement; integrity pledge and exclusion declaration; issuer sanctions/debarment screening log; optional standstill (off by default); optional public notice (off by default); explicit time zones; hash-chained audit log; currency required to publish. Built 2026-10-19/20 (steps 3 and 4): sealed bids, bid form and locked templates, evaluator conflict declarations, per-evaluator scoring and moderation, multi-award, debriefs, optional standstill and complaint record, publication snapshot in the audit chain. FX at submission was simplified: bids are priced in the tender currency. Still to come: document versioning, minimum-bid-period policy, contract clause library, e-signature (step 5), performance records (6), frameworks and lots (7). OCDS export, ISO 27001 readiness, WCAG audit and multilingual remain later.

Evidence key: **[S]** read from a source this session (linked in section 5); **[K]** general professional knowledge, not re-verified this session, to be confirmed with a procurement specialist before anything is claimed publicly.

## 1. Shared-infrastructure audit (is the tender app reusing what we built?)

| Area | Before | Now / action |
|---|---|---|
| Shell, sign-in, org switcher, notifications, AppSwitcher, StatTile, Pill, Button, SearchInput | Shared (`@universe/ui`, `@universe/auth`) | OK |
| API client and types | Shared packages | OK |
| Countries (delivery, destination, eligibility rule) | `CountrySelect` / `CountryMultiSelect` over the shared Country table | OK. `useCountries` is copied per app (same as the other apps; known, deliberate) |
| Product picker and catalogue link | `ProductPicker`, `productMasterId` | OK. Unit is pre-filled from the product's `standardUnit` |
| Organisation search | Platform API, ring-fenced for demo | OK |
| Currency | **Free text, 3 letters** | **Fixed**: shared `CurrencySelect` with `CURRENCY_OPTIONS` |
| Incoterm | **Free text** | **Fixed**: shared dropdown. The list now lives in `@universe/types` (`INCOTERMS`, `INCOTERM_NAMES`) and the tender API validates against it. Project Management and the projects DTO still have their own copies of the list; migrate them to the shared one when next touched |
| Unit of measure | **Free text** | **Gap**: there is no shared unit list in the platform (only `ProductMaster.standardUnit`, itself free text). Recommend one shared UoM list (UN/ECE Recommendation 20 codes with plain names) used by products, project lines and tender lines. Needs your OK because it touches the product schema |
| Qualifications | Fixed list in `apps/tenders/src/lib/ui.tsx` | Local constant; should become a shared reference list (see 3.8) so Product Database registrations and tender gates use the same vocabulary |
| Free text left | Title, summary, client name, terms, specification, lot title, required registration, criterion text | Acceptable as prose. **Required registration on an item is free text and should be a pick from the qualifications list** |
| Org type, category | Shared enums / product categories | OK |
| Client name | Free text | Could link to the shared Partners/clients table for projects handed over (step 5) |

## 2. Standards landscape

Universe is a **platform** that issuers (NGOs, agencies, ministries, procurement agents, manufacturers) use to run tenders. It is not itself a contracting authority, so the realistic goal is "supports an issuer's compliance with X" rather than "Universe is certified to X". The frameworks fall into four groups.

**A. Public procurement law and principles (what a public-sector issuer must be able to prove)**
- WTO Government Procurement Agreement: binding on its parties (42 including the EU) for covered procurement; transparency, non-discrimination, impartiality, no contract splitting to avoid coverage. [S]
- UNCITRAL Model Law on Public Procurement (2011): template for national laws; objectivity, fairness, competition, integrity, transparency, and a supplier challenge mechanism (reconsideration and independent review). [S]
- UN Convention against Corruption, Article 9: transparent, competitive, objective procurement; information public; criteria set and published in advance; decisions verifiable; appeal route. [S]
- World Bank Procurement Regulations (IPF borrowers): seven principles: value for money, economy, integrity, fit for purpose, efficiency, transparency, fairness. [S]
- EU Directives 2014/24, 2014/25, 2014/23 plus the Remedies Directives: published in TED; standstill period; challenge of awards; eForms (Regulation 2019/1780) mandatory for above-threshold TED notices since October 2023. [S]
- UK Procurement Act 2023 (live for procurements started on or after 24 Feb 2025): pipeline, tender, transparency, award and termination notices; open and competitive flexible procedures; "most advantageous tender"; 8 working day standstill; assessment summaries replace standstill letters; central debarment list; KPIs for contracts over £5m; open frameworks up to 8 years that must reopen; 30-day payment terms down the chain. [S]
- US FAR (Title 48 CFR): best value, integrity, fairness, openness. [S, one line only]

**B. Global-health quality and sourcing rules (what a health-product issuer must enforce)**
- Global Fund Quality Assurance Policy for pharmaceuticals: product must be authorised in the country of use and be WHO prequalified, authorised by a Stringent Regulatory Authority, or authorised by a WHO Listed Authority; an Expert Review Panel route only when one or no such product exists, time-limited, needs a no-objection letter, with independent lab testing before shipment. [S]
- Stop TB Global Drug Facility QA policy: routes A/B (WHO PQ or SRA) preferred, route C (ERP) only when none available (manufacturing site inspected under WHO PQ, an SRA or PIC/S; maximum 12 months); "available" means the requested quantity can be supplied within 90 days of the requested delivery; limited international competitive bid among A/B sources where there are two or more; pre-shipment inspection with randomised batch sampling and certificate of analysis; non-compliant batches replaced at the manufacturer's cost; product defined by INN, strength, form and packaging type; bidders supply national marketing authorisation, PQ/SRA evidence, GMP evidence for the dosage form; procurement agents evidence WHO GDP and MQAS compliance and a written recall procedure; QC agents need ISO 17025 and PQ/SRA GLP. [S]
- WHO Model Quality Assurance System for procurement agencies (MQAS, TRS 986 Annex 3) and Good Pharmaceutical Procurement Practices: supplier prequalification, product assessment, monitoring of supplier performance. [S for existence, K for detail]
- UNICEF, UNFPA, Unitaid, PEPFAR/USAID have their own QA policies that largely mirror the above. [S for existence, K for detail]

**C. Data and publication standards (how a tender should be described and published)**
- Open Contracting Data Standard (OCDS): one process identifier (OCID) across tender, award, contract, implementation; JSON schema with codelists; Excel/CSV supported; extensions exist for EU/GPA reporting. [S]
- Master data: ISO 3166 countries, ISO 4217 currencies, ISO 8601 dates/times, Incoterms 2020, UN/ECE Rec. 20 units, UNSPSC, HS codes, GS1 GTIN, WHO INN. UNSPSC, HS and GTIN already exist in the product master. [K]
- PEPPOL (e-procurement document exchange) and EU eForms matter only if we publish into EU public notices. [K]

**D. Organisational and legal assurance (what buyers will ask of the platform itself)**
- ISO/IEC 27001 (information security), GDPR / UK GDPR (bid data are commercial and personal data), WCAG 2.2 AA and EN 301 549 for accessibility on public-sector systems, eIDAS / ESIGN / UETA for e-signature (relevant to step 5), ISO 37001 (anti-bribery management), ISO 20400 (sustainable procurement guidance; not certifiable; sets no tender procedure). [ISO 20400: S; rest K]

## 3. Gap analysis

Priority: **P1** needed before any real (non-demo) tender; **P2** needed for credible public-sector or donor use; **P3** later or specialist.

### 3.1 Process integrity and fair treatment
| Requirement | Source | Current state | Gap | Pri | Step |
|---|---|---|---|---|---|
| Sealed bids, nothing visible before closing | UNCITRAL, UNCAC, all | Designed (release-at RLS), not built | Build | P1 | 3 |
| Clarifications answered to all bidders, questioner anonymous | UNCITRAL, WB, EU | Tables exist; no endpoints or screens | Build published Q&A and notify all participants | P1 | 3 |
| Amendments (addenda) acknowledged by every bidder | EU, UNCITRAL | After publish only dates move, logged | Add formal addendum with bidder acknowledgement and automatic extension prompt | P1 | 3 |
| Minimum bid period appropriate to procedure | EU/UK/WB (fixed by value and procedure) | Hard minimum of 12 hours | Issuer-configurable policy (e.g. 30 days default for international, shorter for RFQ) with warning, not a legal engine | P2 | 3 |
| Equal information to all bidders | All | Documents not yet uploadable | Tender document upload, versioned, same set to everyone | P1 | 3 |
| Closing time unambiguous across time zones | All | Stored as datetime; shown in browser local time | Show closing time with explicit zone (UTC and issuer zone) everywhere | P1 | 3 |
| Procedure types | EU/UK/GDF | RFQ, RFP, etc. via `tenderType` | Add restricted/limited international competition, framework and lots (already planned) | P2 | 7 |

### 3.2 Evaluation and award
| Requirement | Source | Current | Gap | Pri | Step |
|---|---|---|---|---|---|
| Criteria and weights published in advance, applied as published | UNCAC, UNCITRAL, WB | Criteria locked at publish | Met by design; keep | n/a | 2 |
| Compliance gates before scoring | GDF, Global Fund | Gates exist | Evaluation screen to record pass/fail with evidence | P1 | 4 |
| Individual evaluator scoring, moderation, written rationale | UNCITRAL, WB | Not built | Build with per-evaluator scores, comments, locked after submission | P1 | 4 |
| Conflict-of-interest declaration by evaluators | UNCAC, WB, ISO 37001 | Not built | Declaration required before access to bids | P1 | 4 |
| Award notice and assessment summary / debrief to unsuccessful bidders | UK PA23, EU | Not built | Generated debrief per bidder | P2 | 4 |
| Standstill period before contract signature | EU, UK (8 working days) | Not built | Configurable standstill with block on contract creation (public-sector option) | P2 | 4/5 |
| Challenge / complaint route | UNCITRAL, UNCAC, EU Remedies | Not built | Simple complaint and review record during standstill | P2 | 4 |
| Immutable audit trail of every decision | All | Append-only `tender_events` for issuer actions | Extend to evaluation, access to sealed bids, document views; tamper-evidence (hash chain) | P1 | 4 |

### 3.3 Eligibility, exclusion and integrity
| Requirement | Source | Current | Gap | Pri |
|---|---|---|---|---|
| Exclusion grounds (fraud, corruption, insolvency, sanctions) declared by bidder | EU, UK, WB | Only a manual "excluded organisation" rule | Bidder declaration of exclusion grounds at opt-in and bid | P1 |
| Debarment and sanctions screening (UN, World Bank, UK debarment list, OFAC, EU) | UK PA23, WB, general | None. The export-restriction sources doc covers goods, not parties | Screening against published lists, with date-stamped result on the participation record | P2 |
| Integrity pledge / code of conduct acceptance | UNCAC, ISO 37001 | None | Mandatory acceptance logged per bidder | P1 |
| Beneficial ownership / conflicts | WB, UK | None | Optional issuer question | P3 |

### 3.4 Health-product quality rules (the most specific to Universe)
| Requirement | Source | Current | Gap | Pri |
|---|---|---|---|---|
| Qualification vocabulary | Global Fund, GDF, MQAS | WHO PQ, SRA, ISO 13485, ISO 9001, ERP | **Add**: WHO Listed Authority (WLA); PIC/S GMP; national marketing authorisation; WHO GDP; MQAS compliance (agents); ISO 17025 (QC labs). Make this a shared reference list tied to Product Database registrations | P1 |
| Quality route logic (A/B preferred, ERP only if none) | GDF, Global Fund | Not modelled | Optional issuer rule "ERP only if fewer than two PQ/SRA sources" and display of the route on each bid | P2 |
| Product defined by INN, strength, form, pack type | GDF | Catalogue link or free text | When catalogue-linked, show and require these fields; for free text prompt for them | P2 |
| "Available" = quantity within 90 days of requested delivery | GDF | Not modelled | Add required delivery date per item and bidder-stated lead time | P2 |
| Shelf life at delivery, cold chain | Common practice | Present per item | Met | n/a |
| Pre-shipment inspection and batch testing, replacement at supplier cost | GDF, Global Fund | Not modelled | Contract clause library and QC agent assignment in step 5 (batch and COA data already in Product Database) | P2 |
| Recall procedure evidence (agents) | GDF | None | Document request type on bids | P2 |
| Check against live registrations and safety notices | Platform value | Linked via catalogue | Surface "registration expired / safety notice" on a bid automatically (shared Product Database data) | P2 |

### 3.5 Commercial terms
| Requirement | Current | Gap | Pri |
|---|---|---|---|
| Currency | Shared selector (fixed today) | Define evaluation currency and the FX rate date used for comparing bids in different currencies (shared exchange-rate service exists) | P1 |
| Incoterm | Shared selector (fixed today) | Per-item override where needed | P3 |
| Unit of measure | Free text | Shared UoM list | P1 |
| Payment terms, price validity, tax/VAT treatment, delivery schedule | `bidValidityDays` only | Structured fields (payment terms picklist; delivery date per item) | P2 |
| Bid security / performance security | None | Optional amount and form fields | P3 |
| Pricing schedule per item and lot | Not built (bids are step 3) | Bid form generated from items: unit price, currency, lead time, origin country, manufacturer, registration refs | P1 |

### 3.6 Publication and data standards
| Requirement | Source | Current | Gap | Pri |
|---|---|---|---|---|
| OCDS export of every tender (OCID, tender, awards, contracts) | OCDS, GPA/EU reporting | None | Add OCDS release export (JSON) from existing tables; assign OCID `ocds-{prefix}-{reference}` | P2 |
| Public notices (tender, award, contract) | UK PA23, EU | Public teaser parked (v2) | Notice pages and downloadable notice documents; UK Find a Tender / EU TED submission is out of scope (manual or later API) | P2/P3 |
| UNSPSC / HS on tender items | OCDS, EU CPV | Held on the product master | Carry through from catalogue link; CPV mapping only if EU publishing is wanted | P3 |
| Machine-readable standard dates and ISO codes | ISO | Mostly met | Audit | P3 |

### 3.7 Platform assurance
| Requirement | Source | Current | Gap | Pri |
|---|---|---|---|---|
| Access control, tenant isolation, RLS | ISO 27001, GDPR | Strong (RLS in prod) | Evidence pack: document the controls | P2 |
| ISO 27001 / SOC 2 readiness | Buyer due diligence | Not assessed | Gap assessment; Azure provides much of the infrastructure control | P3 |
| GDPR / UK GDPR: data processing terms, retention, deletion, subject access | Law | Org-level handling exists in the platform | Define tender data retention (public-sector norms are commonly 5 to 7 years after contract end [K]) and legal-hold rule | P2 |
| Accessibility WCAG 2.2 AA | Public-sector buyers | Not audited for the tender app | Audit before public-sector use | P2 |
| E-signature validity | eIDAS, ESIGN | Planned step 5 | Choose provider (qualified vs advanced signature) | P2 |
| Languages | WHO/UN practice | English only | English, French, Spanish later | P3 |
| Sustainability / social value | ISO 20400, UK PA23 | Not modelled | Optional weighted criterion templates (carbon, social value, modern slavery statement) | P3 |

## 4. Recommendation

1. **Be explicit about position.** Describe the app as "designed to support" UNCITRAL/UNCAC principles, the UK Procurement Act 2023 notice and standstill model, and donor quality-assurance policies (Global Fund, GDF). Do not claim compliance with any law until a procurement specialist has reviewed the issuer-facing controls.
2. **Do now (small, safe):** the currency and Incoterm fixes (done in this commit); make item "required registration" a pick from a shared qualifications list; add WLA, PIC/S GMP, national MA, GDP, MQAS, ISO 17025 to that list.
3. **Fold into step 3 (participant side and sealed bids):** clarifications Q&A, addenda with acknowledgement, document upload, explicit time zones, integrity pledge and exclusion declaration, bid form with structured price/lead-time/origin, evaluation currency and FX date.
4. **Fold into step 4 (evaluation/award):** evaluator conflict declarations, per-evaluator scoring and moderation, hash-chained audit log, award notice and debrief, optional standstill and complaint record.
5. **Later:** OCDS export and public notices (with the public teaser), sanctions/debarment screening, shared UoM list across products and projects, ISO 27001 readiness, WCAG audit, multilingual.
6. **Decisions needed from Lewis:** (a) agree a shared UoM list touching the product schema; (b) whether public-sector standstill is an issuer option or out of scope; (c) which donors' QA policies to model first (suggest Global Fund and GDF, which are the best documented).

## 5. Sources read this session
- Open Contracting Partnership: [What's the deal with trade and public procurement](https://www.open-contracting.org/2018/09/06/whats-the-deal-with-trade-public-procurement/)
- Mitigate: [Rulebooks of public procurement](https://tendergate.ai/blog/rulebooks-of-public-procurement) (secondary summary; confirm against primary texts)
- Tender Tracker: [Procurement Act 2023 guide](https://tendertracker.co.uk/guides/procurement-act-2023) (secondary summary; confirm against gov.uk guidance)
- The Global Fund: [Quality assurance, medicines](https://www.theglobalfund.org/md/en/sourcing-management/quality-assurance/medicines/)
- Stop TB Partnership GDF: [QA policy and procedures](https://stoptb.org/assets/documents/gdf/drugsupply/GDF%20QA%20Policy%20and%20Procedures.pdf)
- OCDS: [How does the OCDS work](https://standard.open-contracting.org/latest/en/primer/how/)
- UNCITRAL: [2011 Model Law on Public Procurement](https://uncitral.un.org/sites/uncitral.un.org/files/media-documents/uncitral/en/2011-model-law-on-public-procurement-e.pdf) (located, not read in full)
- WHO: [MQAS, TRS 986 Annex 3](https://sites.bu.edu/qualityofmedicalproducts/files/2017/06/2014-WHO-MQAS-TRS986-annex3.pdf) (located, not read in full)


## Status check, 2026-10-24
Checked against BUILD-LOG.md. The "Not built" rows above predate later build steps and are now **built**: sealed bids, evaluator conflict declarations and individual scoring, award notices and bidder debriefs, configurable standstill (default 8 working days, enforced at award), and the complaint and challenge record (visible on the participant status page), plus lots, frameworks and call-offs, contracts, variations and evidence records, and supplier performance ratings. Still open: the items parked or deferred by Lewis (e-auction, public non-registered viewing, accounting-system payment reconciliation, framework-level approval limits by role or currency, call-off documents). Read the table above as the original gap list, not current status.
