# Tender Issuance & Management — design v2 (2026-10-19)

Status: decisions agreed by Lewis on 2026-10-19; nothing built yet. Demo content will be simulated like everything else.

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

## 5. Eligibility (who may see and bid)
Each tender states rules; Universe checks them against the organisation's registry record, not self-declaration alone:
- Organisation type (supplier, manufacturer, agent), countries of operation or registration, product categories.
- Qualification and registration evidence (WHO PQ, SRA, ERP, ISO 13485, national registrations) held in the stakeholder registry and product catalogue, with expiry respected.
- Performance floor (minimum supplier rating) and sanctions screening results where available.
- Explicit invitation list (always allowed), or an exclusion list.
Eligible organisations see the tender in a "Tenders for you" list and are notified. Ineligible organisations cannot see it, and the system records why (so issuers can defend decisions).

## 6. Core records
Tender, TenderLot, TenderLine (catalogue product, quantity, destination country, required registration, shelf-life and cold-chain needs), TenderCriterion (weight, gate or scored), TenderEligibilityRule, TenderInvitation/Participation (interest, status), TenderDocument, Clarification (question, answer, shared to all participants anonymously), Bid (per participant, sealed, per-line prices, lead time, offered product and manufacturer, evidence, validity), BidScore (per evaluator per criterion), Award (per tender or per lot, reasons), Contract (parties, terms, value, dates, status, variations), ContractMilestone, Engagement (the thread) and EngagementEvent (the shared audit timeline), SupplierPerformanceRecord (from delivery and quality data), plus notifications and actions through the existing helpers.

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

## 11. Assumptions I am making (shout if wrong)
- Contract signing in version 1 is recorded in-app (parties confirm, uploaded signed document), not a legal e-signature product.
- The issuer can be any organisation type that tenders; the participant must be a registered Universe organisation, so public viewing of tenders is out for now.
- Eligibility is rule-based on registry data, with manual invitation always allowed.
- Performance ratings are computed from delivery data plus an issuer rating at closeout, and are visible to both parties and (anonymised) to the platform's insights.
