# Sandbox baseline readiness (2026-10-24)

Question from Lewis: is the simulated data ready to be agreed as the baseline for "Reset sandbox", and are other data sets needed first so every part of the system can be exercised? Project Management is out of scope for new work for now.

Evidence: read-only audits run against Universe Demo on 2026-10-24 (`npm run audit:demo` for cross-field consistency, `npm run audit:demo-coverage` for row counts; both are manual GitHub workflows).

## Ready
| Area | Evidence |
|---|---|
| Project Management portfolio | 1,503 projects, 5,560 lines, 3,012 partners, 1,211 risks, 3,871 batches, 14,554 product source approvals, 5,565 logistics metrics, 6,023 contacts. Consistency audit: only 3 projects / 9 lines (the test projects) lack freight mode, forwarder, PO and warehouse references. The earlier known faults (0% on-time-in-full on delivered awards; batch status against expiry) no longer appear. |
| Quality | 72 complaints with 321 events, 128 actions and an attachment; 23 evidence standards; scorecard now shows enquiries quoted, quote price and tender contract performance for 12 linked suppliers (seeded 2026-10-24: 1,413 enquiries, 12 suppliers linked to platform organisations, 2 to 4 closed scored contracts each). |
| Product Database | 11,896 registration verifications, 8,458 product documents, 35 safety-notice reviews; catalogue of 19 groups. |

## Not ready: data sets to add first (in priority order)
1. **Tender ecosystem (largest gap).** Universe Demo owns only 3 tenders (1 draft, 1 cancelled, 1 contracted) and the whole platform has just 1 published tender, so Discover, Find tenders and "For you" look empty. Missing entirely in the demo organisation: addenda and acknowledgements, clarifications (1 question), tender documents, bid files, screening, shortlists, saved searches, call-offs and their quotes, mini-competitions, price reviews, contract variations, contract files, quality links, performance replies, approval settings and role limits (built 2026-10-24, nothing configured). Needed: about 10 published tenders across types and stages (open, closing soon, evaluating, awarded), one framework with lots, call-offs, mini-competitions, a price review and a variation, contracts with files, configured approval limits.
2. **Organisation directory and network.** 302 simulated organisations exist but almost no profiles: 1 supplier profile, 0 manufacturer, funder, tendering-body or procurement-agent profiles, 0 country presence, 0 manufacturer sites, 0 supplier products, 0 saved network searches, 1 organisation certification, 2 scope rows. "Find suppliers", the network directory and the organisation card have nothing to show. Needed: profiles for a few hundred organisations by type, with countries, certifications, sites and listed products, consistent with the partners and catalogue already in place.
3. **Supplier-side view.** The Supplier portal is not deployed (its deploy job is skipped until a `SUPPLIER_PORTAL_URL` setting and Static Web App exist), so the participant experience cannot be demonstrated. Needs a decision and a deployment, and at least one simulated supplier organisation with invitations, bids and enquiries to look at.
4. **Smaller items.** Quality scorecard settings (0 rows; defaults apply), insights user profiles (0), the "real data in anonymised views" Insights area (not built), 3 test projects to archive or fix.

## Reset sandbox: the mechanism still needs deciding
Reset sandbox is not built. Two options: (a) re-run the ordered seed workflows into a cleared demo organisation, or (b) restore a snapshot. Either removes stakeholder-created rows, which conflicts with the platform rule that nothing is hard deleted, so it needs Lewis's explicit approval for the demo organisation only. Recommended: define the baseline as an ordered list of seed workflows plus the two audits passing, so it can be rebuilt and checked, then build the reset on top of it.

## Recommendation
Not yet. Build data sets 1 and 2 (and decide on 3), then re-run both audits, agree the baseline, and build Reset sandbox.

## Update, 2026-10-24 (late): data sets 1 and 2 built and applied
- **Tender ecosystem:** `seed:demo-tender-ecosystem` created ten simulated tenders (SIM-ECO-01 to 10) from interleaved issuers (tendering bodies and procurement agents): four newly published (RFQ, ITT, RFP, open tender) with eligibility rules, one with an addendum and a published clarification, one closing in three days, two closed with three sealed bids each, one open framework, one invited-only. Hash-chained timelines, expressions of interest, and for Universe Demo two saved searches, three shortlist entries, approval settings (25,000 GBP) and a Finance role limit. Find tenders now lists 15 tenders (9 open) with You can bid / Almost eligible / Not eligible chips.
- **Organisation directory:** `seed:demo-org-profiles` filled 302 simulated organisations: 117 supplier profiles, 52 manufacturer profiles, 13 funder, 24 tendering-body and 125 procurement-agent profiles, 704 countries of operation, 631 supply countries, 974 listed products, 543 scope rows, 607 certifications (some expiring, a few expired), 96 manufacturer sites, and a registration country for every organisation. Find suppliers now shows 105 published organisations, 40 countries, 58 categories.
- **Still open:** tender documents (need real stored files), mini-competitions, price reviews, variations and contract files for the new tenders (the older SIM-TND/SIM-FWK tenders already cover awards, contracts and call-offs), the Supplier portal deployment decision, quality scorecard settings, Insights user profiles, and the Reset sandbox mechanism.
- **Note:** Universe Demo is registered as a procurement agent, so tenders limited to suppliers or manufacturers show it as "Not eligible"; that is the eligibility logic working.

## Update, 2026-10-25: tender files, multi-role organisations, audits
- Tender documents, bid files and signed contract copies now exist as real stored PDFs for the simulated tenders; tender lines are topic-coherent.
- Organisations can hold several roles, so a supplier that is also a procurement service agent is no longer missed by eligibility, search or saved searches.
- Audits re-run clean. Remaining before baseline: mini-competitions, price reviews and variations for the new tenders; Insights using real data in anonymised views; Reset sandbox mechanism (needs your approval, demo organisation only); a real screen-reader pass by a person.

## Update, 2026-10-25 (later): contract life-cycle data
- Three simulated frameworks now carry mini-competitions, variations and price reviews (SIM-FWK-001, 002, and 003 issued by Universe Demo). Supplier Portal dropped.
- Remaining before baseline: Insights approach (Lewis to decide), Reset sandbox mechanism (Lewis to approve), real screen-reader pass.
