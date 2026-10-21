# Tender step 6: performance records and ratings (design for approval)

Written 2026-10-21. **Built the same day** with Lewis's six decisions (section 8): see BUILD-LOG.md for what exists and what differs (quality, cold chain and the scored criterion are deferred; payments are a manual log). It follows the decision recorded in `TENDER-APP-DESIGN.md`: the data is captured on the contract thread, and how it is represented and weighed is a separate design. Items marked [K] are general professional knowledge, to be confirmed with a procurement specialist before any public claim.

## 1. Purpose
Close the loop of the platform's one-thread promise (tender, award, contract, delivery, closure, performance): when a contract closes, both sides can see how it went, and that history informs later tenders. It must be fair to suppliers, hard to game, and never a black box.

## 2. What exists already (reused, not rebuilt)
- **Partner scorecard** (live, 0 to 100, per stakeholder, from Project Management data): delivery (on time, in full, OTIF), cold chain, complaints, compliance, enquiry response, activity. Thresholds editable per organisation. It is the owner's private view of its own partners.
- **Tender data:** bids, scores, debriefs, awards, complaints, contract milestones (pending, done, missed), contract dates, the shared timeline.
- **Quality complaints** (CAPA) and the supplier's delivery project once handed over.

The new piece is a **contract performance record**: a shared, closed-out summary for one contract, owned by neither side alone, plus an optional rating. Everything below is computed from those sources; very little is typed in.

## 3. Proposed record (one per closed contract)
Created when the owner closes the contract (completed or terminated). Frozen at close (a snapshot, so later data changes cannot rewrite history), with a correction path (section 6).

| Measure | Source | Notes |
|---|---|---|
| Delivery, on time and in full | Supplier's delivery project lines (existing OTIF logic and the owner's scorecard settings) | Only if the supplier created the project; otherwise "not measured" |
| Milestones met | Contract milestones: done on or before due date, done late, missed | Always available |
| Quality | Complaints upheld against the supplier on this contract, serious ones flagged, CAPA overdue | From the quality module where linked |
| Cold chain | Temperature excursions on this contract's batches | Only where tracked |
| Responsiveness | Clarifications, document requests answered within the timetable | Optional, later |
| Owner feedback | Short structured ratings plus a comment (section 4) | The only typed-in part |
| Payment (owner's side) | Invoices paid on time against agreed terms | Shown to the supplier about the owner, see section 5 |

Each measure shows its **coverage** (how many items it rests on), exactly as the partner scorecard does, and an overall score only when enough measures have data. No data means "not measured", never zero.

## 4. Owner feedback (the typed part)
Five-point scale on: quality of goods, communication, documentation, flexibility, and "would use again". Each needs a one-line reason when 1 or 2. Collected once, at close, by someone holding `tenders.award`, and **cannot be edited after the supplier has responded** (a response, not an edit, is the correction route). The platform never shows a supplier a bare number from one owner without the measured facts beside it.

## 5. Who sees what
- **Both parties** see the full record for their own contract, including the owner-feedback text.
- **Supplier's own profile** shows its history in aggregate: contracts closed, share with all milestones met, average measured scores, number of owners. Individual owners' names are not shown to other owners.
- **Other owners** see, when evaluating or inviting a supplier, an aggregate only: number of closed contracts, on-time-in-full range, upheld-complaint rate, and a band (Strong, Good, Watch, Insufficient history). They do not see another owner's feedback text or the owner's identity, and a minimum of **three contracts from at least two different owners** is needed before any aggregate is shown (prevents one dispute defining a supplier).
- **Owner reciprocity (proposal):** suppliers see a small payment-practice summary for owners they have contracted with (invoices paid within agreed terms), so the record is not one-sided. This depends on invoice data in Project Management and is phase two.
- Consent: this uses shared data under the existing data-sharing terms; the aggregate is opt-out for organisations that have not accepted the pooled-data scope (decision needed, section 8).

## 6. Fairness and safeguards
- **Right of reply:** the supplier sees the record within 14 days of close, can add a written response, and can dispute a measured fact (for example a milestone marked missed). A dispute is answered by the owner; unresolved disputes are flagged beside the measure, not hidden.
- **Platform review:** staff can remove a record only for evident error or abuse, with the reason on the audit trail.
- **No automatic exclusion.** A rating can inform an eligibility rule only when the issuer chooses it (below); it never blocks a bid on its own.
- **Retention:** records are kept for the life of the organisation; aggregates use the last five years [K, to be confirmed].
- **Audit:** record creation, response, dispute and review are appended to the tender timeline (hash-chained), like every other step.

## 7. How it plugs into tenders
- **New eligibility rule** "minimum supplier rating" (deferred in the original design until ratings exist): the issuer picks a band, for example "Good or better, or Insufficient history". **New suppliers are never excluded for having no history**: the rule has an explicit "allow insufficient history" switch, on by default, because a rule that blocks newcomers locks out the small and local suppliers the platform exists to include.
- **Optional scored criterion** "past performance on the platform", weighted by the issuer like any other criterion, scored from the aggregate.
- Bidders see, before bidding, if a rule uses ratings and where they currently stand against it (explained, not hidden, matching the existing eligibility panel).

## 8. Decisions needed from Lewis
1. **Weighting.** Proposal: no single platform-wide weighting. Each measure is shown on its own with its status, and the overall score reuses the partner scorecard's weighted mean with the owner's own scorecard settings. Alternative: one fixed platform formula (simpler, but contestable). Which?
2. **Owner feedback scale and wording** in section 4: keep, or use only measured facts (no typed rating) for the first version?
3. **Minimum history for an aggregate:** three contracts from two owners (proposed). Lower for the pilot, or keep?
4. **Consent default** for showing a supplier's aggregate to other owners: on for all, or only where the supplier has opted in to the pooled-data scope?
5. **Reciprocal owner payment summary:** include in version one, or later?
6. **Public benchmarks:** the on-time and in-full thresholds come from 2016 and 2017 donor reports. Confirm these remain the defaults, or replace them with UNICEF or PAHO figures once found.

## 9. Build plan once approved
1. Schema and RLS: `tender_performance_records` (two-party shared, frozen snapshot JSON plus measure rows), `tender_performance_feedback`, `tender_performance_responses`; supplier aggregate view (read-only, minimum-history rule enforced in the service).
2. Close-out flow: the existing "Close contract" step gains the record and the feedback form; the supplier gets a notification and a 14-day reply window.
3. Screens: record on the contract card (both parties), supplier profile history, issuer "past performance" panel in tender evaluation.
4. Eligibility rule and optional scored criterion.
5. Demo data: close SIM-TND-001 and SIM-TND-002 contracts with realistic records so the screens are populated; tests for isolation (third party sees nothing; owners see aggregate only above the minimum).
6. Documents, backup, live walkthrough as for every step.

Estimated at roughly the same size as step 5.

## 10. Enhancement option: reconcile payments from accounting systems (not built; asked by Lewis, 2026-10-21)
Feasible, and best done in two stages. Facts about each provider's API, pricing and app-review rules change often and are to be confirmed against current documentation before any commitment [K].
1. **Stage 1, CSV import (small).** Either party uploads an invoice export (reference, amount, due date, paid date). Rows are matched to the payment log by invoice reference and fill or confirm entries. Works with every system, needs no credentials.
2. **Stage 2, live connections (medium to large).** Per-organisation OAuth 2.0 connection from the organisation settings to **Xero** first (Accounting API: invoices, payments, due and fully-paid dates; webhooks for changes), then **QuickBooks Online**, **Sage** or **Zoho Books** as demand shows. Read-only scopes only; tokens held in Key Vault; the organisation can disconnect at any time.
   - **Sides:** a supplier reads its sales invoices (accounts receivable); an owner reads its supplier bills (accounts payable). Each side matches an invoice to a contract by reference, once, then updates flow in.
   - **Reconciliation:** each log entry gets a source (Manual, CSV, Xero) and a "last synced" time; a synced entry cannot be edited by hand, differences between the two parties' entries are shown rather than overwritten, and the aggregate prefers the owner's payables data when both exist.
   - **Data minimisation:** only the matched invoice's reference, amount, currency, due date and paid date are stored; nothing else from the accounting system is read into Universe.
   - **Prerequisites:** a registered app with each provider, a data-processing note covering the connection, and a decision on who pays any provider API fees.
Recommended order: stage 1 when payment practice becomes a feature organisations rely on, then Xero.
