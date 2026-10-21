# Tender Issuance & Management — design v3 (2026-10-19)

Status (updated 2026-10-20): decisions agreed by Lewis on 2026-10-19. Build order steps 1 to 4 are built and live (data model and RLS, issuer screens, participant screens with sealed bids and locked Excel/Word templates, evaluation and multi-award with debriefs, standstill and complaints). Step 5 (contracts, signature section, handover) was built on 2026-10-21. Step 6 (performance records, see TENDER-PERFORMANCE-DESIGN.md) was built on 2026-10-21. Step 7 (frameworks and lots) is not built. See BUILD-LOG.md for what exists. Demo content will be simulated like everything else.

## 1. What it is
A shared marketplace-and-workflow app. **Issuers** (donors, governments, ministries, tendering and purchasing bodies, and procurement agents tendering for clients) build and publish tenders. **Participants** (organisations registered on Universe and eligible for that tender) discover them, opt in, ask questions, bid, and, if they win, deliver. Everyone uses the same app; what they see depends on their role in each tender (issuer view or participant view of the same record).

**The unique selling point (Lewis):** one unbroken, auditable relationship between the issuing body and the winning body, running from tender, through award, through contract, through delivery, to closure of the contract or project, with a full audit log and supplier performance feeding back into the platform. Nothing is re-keyed between stages and neither side loses the thread.

## 2. The linked lifecycle
Tender (draft → published → clarification → closed → evaluation) → Award → **Contract** (draft, negotiation, signed, active, variations, closed) → **Delivery and performance** (the awarded body's Project Management project, shared milestones, on-time-in-full, quality, payment, CO2) → Closeout and supplier rating. One **Engagement** record threads these together so every event, document and decision hangs off a single, shared, tamper-evident timeline visible to both parties (each sees only what is shared with them).

## 3. Scope decision: which tender types, now or later
Lewis: start with RFQ and invited tenders, but the design must accommodate every type. So:
- **Built into the data model from day one:** tender type (RFQ, invited/restricted, open, framework agreement with call-offs, rate contract, direct negotiation), visibility (invited only, or published to everyone eligible), lots, lines, evaluation criteria, contracts and call-offs.
- **Built into the screens first (version 1):** RFQ, invited and published-to-eligible tenders end to end. Because publishing to eligible organisations is core, "open" tenders are effectively in version 1.
- **Deferred but designed for (versions 2–3):** framework agreements with call-off orders, rate contracts, multi-lot partial awards, re-tendering, e-auction, public (non-registered) viewing.
This avoids rebuilding the schema later.

## 4. Roles and views
- **Issuer view:** build tender (lines from the product catalogue, criteria, eligibility rules, dates, documents), publish, answer clarifications, open bids at closing, evaluate (scores, compliance gates), award, manage the contract and delivery, rate performance.
- **Participant view:** browse and be alerted to tenders they are eligible for, opt in (express interest), ask questions, build and submit a sealed bid, withdraw before closing, see award outcome and feedback, sign and deliver the contract, see their own performance record.
- **Evaluators** (issuer side): conflict-of-interest declaration, independent scoring, then consensus.
- **Platform staff:** moderation, oversight, dispute support (read-only by default, audited).

## 5. Eligibility: visible, explained, never hidden (revised by Lewis)
Every published tender is visible to every registered organisation. Eligibility does not hide a tender; it explains the position.
- **Rules** (set by the issuer): organisation type, countries of registration or operation, product categories, qualification and registration evidence (WHO PQ, SRA, ERP, ISO 13485, national registrations, with expiry), minimum supplier rating (later, once performance ratings exist), sanctions screening, explicit invitations, exclusions.
- **Checked against the registry**, not self-declaration, per organisation per tender, producing a requirement checklist: each rule shows Met, Not met or Needs evidence, with a plain statement of what the organisation must do to become eligible (for example "Upload your WHO PQ certificate in your profile", "Add Kenya to your countries of operation", "Your ISO 13485 expired on 3 Mar; renew it").
- **Chips on every tender:** Eligible, Almost eligible (n things to do), Not eligible, Invited, Already participating, Closing soon. Filter and sort by them.
- **Shortlist:** organisations can star tenders to a shortlist, and save criteria ("pharmaceuticals, East Africa, WHO PQ") to get a standing "tenders that match you" view and alerts when a new matching tender is published.
- Bidding is allowed only when eligible (or invited); a not-yet-eligible organisation can see everything it needs to prepare, but cannot submit.
- Evaluations are recorded (why an organisation was or was not eligible at the time) so issuers can defend decisions.

## 6. Core records
Tender, TenderLot, TenderLine (catalogue product, quantity, destination country, required registration, shelf-life and cold-chain needs), TenderCriterion (weight, gate or scored), TenderEligibilityRule, TenderInvitation/Participation (interest, status), TenderDocument, Clarification (question, answer, shared to all participants anonymously), Bid (per participant, sealed, per-line prices, lead time, offered product and manufacturer, evidence, validity), BidScore (per evaluator per criterion), Award (per tender or per lot, reasons), Contract (parties, terms, value, dates, status, variations), ContractMilestone, Engagement (the thread) and EngagementEvent (the shared audit timeline), SupplierPerformanceRecord (from delivery and quality data), plus notifications and actions through the existing helpers.

## 6a. Issuer build-out and dashboard (revised by Lewis)
- **Tender builder parameters:** title, reference, type, visibility, lots, lines, destination countries, currency and incoterm, all key dates (publish, clarification deadline, closing, evaluation, award, bid validity, contract start), evaluation criteria and weights, gates, eligibility rules, required documents.
- **Submission rules per requirement:** accepted upload formats and maximum size (for example PDF, DOCX, XLSX, CSV), whether copy-and-paste text answers are allowed as an alternative to uploads, whether each item is mandatory, and a bid-side **completion detection** (a live checklist showing which mandatory prices, documents and answers are missing; a bid cannot be submitted incomplete, and the participant sees exactly what is missing).
- **Dashboard (issuer):** adapts to what the organisation has. Tiles: tenders published, in draft, closing soon (next 7 days), in evaluation, awarded this period; per-tender submissions received against invited/eligible; average bids per tender (competition level); unanswered clarifications; evaluations awaiting scores; awards pending contract; contracts active; average days from publish to award (cycle time); cancelled or re-tendered rate; value awarded; single-bidder tenders (a red-flag metric used by procurement oversight bodies). Per-tender view: submissions over time to the deadline, participants who opted in but have not bid, completeness of started bids. These follow common public-procurement benchmarks (competition, cycle time, single-bid rate, award concentration, cancellation rate).
- **Participant dashboard:** tenders for you, shortlist, closing soon, bids in progress with completion %, awarded, contracts due for signature, deliveries due.

## 7. Cross-organisation data and security (the hardest part)
Today every table belongs to one organisation. Tendering needs data two organisations both see, so:
- **Issuer-owned** records (tender, lines, criteria, evaluation) are tenant rows of the issuer, readable by participants only through narrow, audited published views (the published tender and its documents, clarifications, award outcome), never raw rows.
- **Participant-owned** records (bid, bid documents, internal notes) are tenant rows of the participant; the issuer reads a bid only after closing, through the system's "open bids" step, which is recorded.
- **Shared records** (contract, engagement timeline, performance) carry both organisation ids and a policy that grants access to exactly those two parties (plus platform staff). These need new row-level-security policies for dual-party access; each new table gets entries in `infra/sql/row-level-security.sql` and a test that a third organisation sees nothing.
- Sealed bids: no read path for the issuer before the closing time, enforced in the service and in the database policy.
- Immutable audit: every view of a bid, status change, score, award and contract change is logged (who, when, what) append-only; archive, never delete.
- Demo and simulated data stay ring-fenced as elsewhere.

## 8. What it reuses
Stakeholder registry and consent; product catalogue (registrations, safety notices, export restrictions, standard shelf life); supplier enquiries and quotes; Project Management (award creates the project and lines; delivery, OTIF, payment and CO2 data feed performance); logistics and CO2 estimates (a scored criterion); notifications and actions (deadlines, new clarifications, bids, evaluation due); documents; exports; roles and permissions (new keys: tenders.view, tenders.issue, tenders.bid, tenders.evaluate, tenders.award, contracts.manage).

## 9. Screens
Issuer: tenders list and tiles, tender builder, tender detail with stage tiles (lines, eligibility, participants, clarifications, timeline), bids and comparison, scoring, award, contract and delivery tracker. Participant: "Tenders for you", tender view, opt-in, bid builder, my bids, awards, contract and delivery, my performance. Stage tile rows follow the rule: at most four tiles, none for draft.

## 10. Build order
1. Data model, RLS policies, API and permissions: tenders, lines, criteria, eligibility, participation, clarifications, audit timeline (issuer and participant read paths separated).
2. Issuer screens: build, publish, manage clarifications, close.
3. Participant screens: discover, opt in, ask, sealed bids.
4. Open bids, evaluation (gates, weighted scoring, conflict declarations), award.
5. Contract and engagement timeline; handover to Project Management; milestones.
6. Performance records and ratings back into the registry; notifications; exports; demo data.
7. Later: frameworks and call-offs, lots and partial awards, public viewing.
Each step ships with tests (especially cross-organisation isolation), audit and demo data.

## 11. Decisions made
- **Contract signing:** if a legal contract product cannot be built into the platform, a dedicated **Signature** section on each contract holds an externally executed agreement (Adobe Acrobat Sign, DocuSign or equivalent): the signed PDF, the signing certificate or audit trail document, signer names, roles and dates, status (awaiting signature, partly signed, executed), version history, download and export. Both parties see it. A native integration (envelope sent from Universe, status returned by webhook) is a later option.
- **Public viewing:** not in version 1. Recommended for version 2 as a read-only teaser page per published tender (title, issuer, countries, categories, closing date, summary) with "Register on Universe to access this tender" in place of documents, eligibility and bidding. It is a good sign-up hook and is modest to build (one unauthenticated read route returning a whitelisted subset, search-engine friendly), but it adds an abuse and scraping surface, so it comes after the core is proven. The tender record gets a `publicTeaser` flag now so nothing has to change later.
- **Performance ratings:** deferred to the next round of development. All the underlying data (on-time-in-full, quality, payment, CO2, issuer feedback) will be captured and attached to the Engagement timeline now; how to represent and weigh it is a separate design. The eligibility rule "minimum supplier rating" is added when ratings exist.
- **Assumption:** participants must be registered Universe organisations to see anything beyond the teaser.
