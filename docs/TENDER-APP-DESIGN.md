# Tender Issuance & Management — design proposal (2026-10-19)

Status: draft for Lewis's decisions. Nothing is built. All figures and data in the app would be simulated in the demo organisation like everything else.

## 1. Purpose
A fourth Universe app for running a competitive procurement end to end: define what is needed, invite suppliers, take their quotes, compare them fairly, award, and hand the award to Project Management as a project with lines and prices. It serves two kinds of organisation: **procurement service agents** (tender on behalf of a client) and **tendering and purchasing bodies** (government, faith-based networks, implementing partners, multilaterals, tendering for themselves). Suppliers and manufacturers take part as invited respondents.

## 2. Lifecycle (stages)
Draft → Issued (open for questions and responses) → Closed (deadline passed, responses locked) → Evaluation → Awarded (or Cancelled / No award) → Handed over (project created).
Each stage has its own tile row at the top, as with Project Management, and no tiles at Draft.

## 3. Core records
- **Tender:** reference, title, type (open, restricted/invited, request for quotation, framework), buyer organisation and optional client, delivery countries (multi-country as in projects), key dates (issue, clarification deadline, closing, evaluation, award, validity), currency, incoterm, terms and conditions, qualification requirements, status.
- **Tender lines:** product (from the shared catalogue where possible, free text otherwise), quantity, unit, specification, required registration or qualification pathway (WHO PQ, SRA, ERP, ISO 13485), delivery destination per line, required shelf life, packaging and cold-chain needs. Catalogue data flows in: registration status, storage class and recall or export-restriction flags show on each line.
- **Invitations:** invited suppliers and manufacturers from the stakeholder registry (or their own partners), each with an invitation state (invited, viewed, declined, responded). Open tenders can also be published to qualified suppliers who match by category and country.
- **Clarifications:** questions from suppliers and the buyer's answers, with answers shared to all bidders anonymously by default, with a log.
- **Responses (bids):** one per supplier: per-line unit price, currency, lead time, offered product (variant and manufacturer, country of manufacture), registration evidence, validity, payment terms, notes, documents, submitted date. Responses are sealed until closing.
- **Evaluation:** weighted criteria (price, quality and registration, delivery, supplier performance, sustainability/CO2), scores per evaluator, compliance gates (pass/fail), a comparison matrix, a recommendation with a written justification, and a full audit trail.
- **Award:** per tender or split per line, with reasons, unsuccessful-bidder notifications, standstill period where relevant, then **Create project** (carries client, countries, lines, supplier, manufacturer, prices and margins into Project Management).

## 4. What it reuses
Stakeholder registry and consent model; product catalogue and its registrations, safety notices and export restrictions; supplier enquiries and quotes already in Project Management (a tender response can become a quote); logistics distance and CO2 estimates (price vs. emissions in evaluation); notifications and actions (deadlines, new clarifications, responses received, evaluation due); document storage; exports; audit trail; role and permission model (new keys: tenders.view, tenders.create, tenders.evaluate, tenders.award).

## 5. Security and integrity (the part that makes tendering credible)
- Sealed bids: responses are invisible to the buyer until closing; the system, not a person, opens them.
- Supplier isolation: each supplier sees only its own response and the shared clarifications.
- Evaluator conflict-of-interest declaration, independent scoring before consensus.
- Immutable audit of every view, change, award decision and document, with timestamps and users.
- Archive, never delete.
- Supplier access: a limited supplier portal view (no access to the buyer's other data); invited suppliers without an account are onboarded through the existing registry route.

## 6. Screens (first pass)
1. Tenders list with tiles (draft, open, closing soon, in evaluation, awarded) and filters.
2. Tender detail with stage tiles, lines, invitations, clarifications, documents, timeline.
3. Response entry (supplier view) and responses inbox (buyer view, after closing).
4. Comparison and scoring screen.
5. Award and handover to a project.
6. Supplier-facing "Invitations" page.

## 7. Build order (recommended)
1. Data model, API and permissions for tenders, lines, invitations, clarifications.
2. Buyer screens: create, issue, manage, clarifications, closing.
3. Supplier view: respond with sealed bids.
4. Evaluation and award.
5. Handover to Project Management; demo data; tiles; exports; notifications.
Each step ships with tests, audit, and demo data, as the other apps did.

## 8. Decisions needed
See the questions asked in chat: tender types in scope, who responds (invited only vs. open marketplace), how suppliers take part (in-app portal vs. buyer-entered bids), and scoring depth.
