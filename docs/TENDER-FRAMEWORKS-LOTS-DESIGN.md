# Tender step 7: lots and framework agreements (design for approval)

Written 2026-10-21. Nothing here is built. Items marked [K] are general procurement knowledge to be confirmed with a specialist before any public claim.

## 1. What exists today
- **Lots:** a line can carry a lot number and title, and the builder has a "Lot (optional)" box. Nothing uses it: every bidder prices every line, evaluation is one ranking, and an award already splits by line with percentage shares (so a multi-supplier award works today, per line, not per lot).
- **Frameworks:** "Framework agreement" is a selectable tender type with no different behaviour. A contract is one per award, with a value and milestones.

## 2. Lots (proposal)
A **lot** is a group of lines that is bid, evaluated and awarded on its own, so suppliers can bid for the parts they can supply (typical for health commodities: one lot per product family or region) [K].
- **Builder:** lots become real: create, name and order lots, assign lines to them. Lines outside any lot sit in an implicit "Lot 1" so simple tenders are unchanged.
- **Tender-level rules (issuer chooses):** bidders may bid for any lots / for at most N lots; a bid on a lot must price every line in it (partial lots refused); optional **award limit** per supplier (a cap on lots one supplier can win, with the tie-break order stated) to spread supply risk [K].
- **Bidders:** the bid form shows lots as sections; a bidder can tick which lots it is bidding for and "no bid" a whole lot. Sealed-bid, template and completeness checks apply per lot.
- **Evaluation:** gates and criteria stay tender-wide, but scoring and ranking are **per lot**: price and lead time are calculated within the lot, manual criteria can be scored per lot or once for all. The results table and finalise step run per lot. Past-performance score is per supplier, reused across lots.
- **Award:** award per lot (one supplier, or shares as today). Debriefs list results per lot a bidder bid on. One contract per award is kept, so a supplier winning two lots gets two contracts unless the owner chooses to combine (decision 3).
- **Standstill and complaints** stay tender-wide: the standstill runs once after the last lot is awarded unless the owner awards lots in stages (decision 4).

## 3. Framework agreements and call-offs (proposal)
A **framework** is an agreement with one or more suppliers on prices and terms for a period, with no firm quantity; purchases are made later as **call-offs** [K].
- **Tender type FRAMEWORK:** adds framework settings: term (start/end), maximum total value (optional), number of suppliers (single or multi-supplier), and for multi-supplier frameworks how call-offs are placed: **direct award to the first-ranked supplier**, **rotation**, or **mini-competition among framework suppliers** (decision 5).
- **Award creates a framework agreement** for each awarded supplier (it reuses the contract: draft, signature section, active, close) with the agreed price list per line, framework term and ceiling. Contract milestones are optional.
- **Call-offs:** while a framework is active, the framework owner raises a call-off (lines and quantities from the price list, delivery country and date, within remaining ceiling and term). Direct award: goes to the chosen supplier, who accepts or declines. Mini-competition: sent to the framework suppliers, who quote within the framework prices or better; the owner picks, with a written reason on the timeline.
- **Each accepted call-off** is a contract-like order: the supplier can create its Project Management project from it (the existing handover), and its delivery results feed the performance record for the framework agreement.
- **Tracking:** remaining ceiling, call-offs placed, share by supplier, expiry warning, all on the agreement card. Every step goes on the hash-chained timeline.
- **Performance:** the framework's record is created when the framework closes (as now), built from all its call-offs' milestones and deliveries; interim call-off results show on the card.

## 4. Data model (outline)
New: `TenderLot` (tender, number, title, rules), lot id on lines and bid lines, `TenderBidLot` (bidder's lot participation), lot id on moderated scores and awards; `TenderFrameworkTerms` (term, ceiling, call-off method), `TenderCallOff` and `TenderCallOffLine` (framework contract, status, lines, quantities, delivery details, price snapshot), `TenderCallOffQuote` (mini-competition). All two-party RLS like contracts. Migration is additive; existing tenders keep working with an implicit lot.

## 5. Decisions needed from Lewis
1. **Scope and order.** Build lots first and frameworks second (recommended: lots touch bidding, evaluation and award, the riskiest part), or frameworks first?
2. **Lot bidding rules:** all lots allowed by default with the optional "at most N lots" and per-supplier award limit as above. Keep, or simplify to bid-on-any-lots only for the first version?
3. **Contracts for a multi-lot award:** one contract per awarded lot (simplest, clean performance records per lot) or one contract per supplier covering their lots (fewer documents, harder to measure)? Recommendation: one per supplier, with a milestone per lot.
4. **Standstill with lots:** one standstill after the last lot is awarded (recommended), or per lot?
5. **Framework call-off methods in version 1:** direct award to first-ranked plus rotation, with mini-competition added afterwards? Or all three at once?
6. **Framework ceiling:** is a maximum value needed in version 1, and should it be enforced (block a call-off above the remaining ceiling) or only warned?
7. **Call-off approvals:** any user with the award permission raises a call-off, or add a second-person approval above a value you set?

## 5a. Lewis's decisions (2026-10-21)
1. **Order:** lots first, then frameworks.
2. **Lot bidding:** bid on any lots. No maximum-lots rule and no per-supplier award cap.
3. **Award:** several suppliers can win in one lot, but each item goes to exactly one supplier (100%). Split shares are blocked on tenders with lots.
4. **Standstill:** one award event, one standstill after it (Claude's recommendation).
5. **Call-off methods v1:** direct award to first-ranked, and rotation; mini-competition added afterwards (Claude's recommendation).
6. **Framework pricing:** taken from the supplier's submitted bid, with a price-hold period (for example 90 days) after which a line-level price review can be negotiated. The ceiling stays warn-only.
7. **Call-off approval:** thresholds with a second authoriser above them. No single published "accepted insurer practice" exists, so tiers are configurable per organisation with flagged defaults for Lewis to confirm.

Contracts for a multi-lot award: one per supplier with a milestone per lot (Claude's recommendation, not contradicted).

## 5b. Lots: what was built (2026-10-21)
- Builder: lot number plus one shared lot title per lot; once any item has a lot, all must (server-enforced).
- Bid: items grouped by lot with "Not bidding for this lot". A lot must be priced in full or not bid at all (checklist rule).
- Evaluation: "Results by lot". Price and lead time are scored on the lot's own items; gates, evaluator scores and past performance stay tender-wide. Only bidders who priced the whole lot are listed.
- Award: "Award by item", defaulting each item to the lot's rank 1; change per item to split a lot. One award decision, one standstill.
- Debrief: each bidder sees its own rank, score and items won per lot (`tender_debriefs.lotsJson`, migration 20261021180000).
- Not yet: automatic milestone per lot at contract creation, and the Excel bid template has no lot column (lots are enforced when the draft is checked).

## 6. Build plan once approved
1. Lots: schema and builder; bid form and completeness per lot; evaluation and results per lot; award, debriefs and contracts; tests; demo lots on a new simulated tender.
2. Framework terms and agreement (reusing the contract card); call-off model with direct award and rotation; supplier accept/decline and project handover; ceiling tracking; tests; demo framework.
3. Mini-competition (if not in step 2), framework performance, documents, backup and live walkthrough as for every step.
Estimated at roughly two to three times the size of step 6, so delivered in the two parts above.
