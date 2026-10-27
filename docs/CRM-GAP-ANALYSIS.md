# CRM: what is built, what is missing, what existing data could be used (2026-10-27)

Method: read the design (`CRM-APP-DESIGN.md`, `CRM-STANDARDS-AND-DATA-PROTECTION.md`) against the code in `apps/api/src/crm`, `apps/crm/src`, the shared types, and the other apps' references to the CRM (searched for), plus the live checks run today. Items marked **(verified)** were confirmed in code or live; **(inferred)** are judgements from the design or from data the platform already holds.

## 1. Built and working (verified)

Relationship record with owner, tier, status, review cadence, calculated health with reasons and a manager override; Relationship 360 with Overview, Interactions, Opportunities, People, Places and links, Work together, Performance and Compliance tabs; interactions with links to a project, a confidential flag and follow-ups that appear in the bell; opportunities with a pipeline summary; contact profiles (decision role, lawful basis, subscriber type, status, verified date, notice sent), a primary contact, the privacy console (requests with a one-month clock, suppression list, access log, retention queue, anonymise); tags; saved filters; Overview dashboard (tiles, pipeline strip, reviews overdue, follow-ups, by tag); Portfolio (project counts by outcome, last project, map, country filter); global search for relationships and opportunities; daily review reminders; server-side app and permission checks; audit logging of every change; accessibility lint and live scans clean.

## 2. Gaps against the design (verified unless stated)

| # | Gap | Design reference | Why it matters | Effort |
|---|---|---|---|---|
| 1 | **No hooks in Project Management or Tenders.** Nothing in either app mentions the CRM: no "Log interaction" on a project, tender, bid, contract or complaint, and no Relationship panel on the stakeholder page. | section 7, build step 3 | The design's "everything links" principle is one-directional today (the CRM reads the other apps; they do not show CRM activity). | Medium |
| 2 | **Tender events do not move opportunities.** A tender award or contract does not mark an opportunity WON, and a closed tender does not mark one LOST. Opportunities link only to projects in the form, though tenders can be linked by data (the seed does so). | step 5 | The pipeline goes stale by hand. | Medium |
| 3 | **Only Project Management stakeholders are tracked.** `counterpartyOrganizationId` exists in the table but no code uses it, so other Universe organisations in the Admin hub cannot have a relationship. | section 5 | Buyers, funders and tendering bodies (the people a supplier wants to look after) cannot be managed. | Medium to large |
| 4 | **Work together shows projects only**, not tenders and bids, contracts, call-offs, batches or products. | section 6 | The "complete picture of what we do with them" is partial. | Medium |
| 5 | **No Documents tab.** Controlled documents, contract files and certificate evidence are held elsewhere and not linked. | section 6 | Design item, not yet started. | Small to medium |
| 6 | **Health ignores interaction recency, scorecard score, tender performance, product safety notices and sanctions screening.** It uses approval status, certificates, complaints and review dates only. | section 5 (health) | A stakeholder nobody has spoken to for a year, or with a falling scorecard, still reads "Good". | Small |
| 7 | **Relationship list has no "last interaction" column or staleness filter, no certificate-state filter, no map toggle**, and no bulk actions (assign owner, set tier, add tag to many). | section 6 | Managers work in lists; this is the usual daily need. | Small to medium |
| 8 | **No CRM export.** The platform rule is that organisations can export everything they add; relationships, interactions, opportunities, tags and places have no export: the organisation export (`data-exports`) covers nine entities (partners, projects, project lines, contacts, batches, logistics, certifications, evidence, risks), none from the CRM. | export rule 2026-10-18 | Compliance with Lewis's own rule, and the UK GDPR access request needs a person-level export (the privacy console covers the person, not the organisation's own data). | Small |
| 9 | **Contact profile lacks preferred channel, language and time zone** (in the design). | section 5 | Useful for international contacts. | Small |
| 10 | **No gifts-and-hospitality interaction type** and no compliance reviewer view. Decision 6 in the design was never answered. | decision 6, ISO 37001 | Anti-bribery control; needs your answer first. | Small |
| 11 | **Interactions cannot be edited after saving, only archived.** (inferred from the UI: archive is the only action once saved.) | step 3 | Typos mean archive-and-retype. | Small |
| 12 | **Pipeline is a list, not a board**, with no value totals by currency and no weighting by stage. | section 6 | The summary strip exists; a board is the expected CRM view. | Medium |
| 13 | **No reviews page, follow-ups page or segments page.** Reviews and follow-ups are Overview sections; segments are tags and saved filters. | section 6 | Fine for now; becomes necessary at volume. | Small |
| 14 | **No notifications for health turning At risk, an opportunity passing its expected date, or a certificate expiring on a tracked stakeholder** (only review and follow-up reminders exist). | step 6 | Proactive alerts are where a CRM earns its keep. | Small |
| 15 | **New stakeholders appear in the CRM only when someone opens it** (tracking happens on first open per organisation). Stakeholders created later are picked up the next time a list loads, owner empty. | section 7 | Owner defaults to the creator in the design; today it is blank. | Small |
| 16 | **Insights benchmarks are not shown beside a relationship** (for example typical lead time for the category). | section 7 | Design says anonymised benchmarks may appear; cost price rules already allow it. | Medium |
| 17 | **Places and links have no tie to the map elsewhere**: the Product Database and Logistics maps do not show CRM places, and a place cannot be marked as a shipping origin. | new | Optional. | Medium |
| 18 | **Mobile and tablet pass was not repeated for the new tabs** (Places and links, Work together). Desktop scans are clean. (inferred) | accessibility standard | A required check, not yet done. | Small |

## 3. Data the platform already holds that the CRM could use (inferred from the schema and other apps)

- **Supplier performance**: scorecards (shown today as a score), tender performance records, on-time-in-full flags, and the trend. Could drive health and a performance sparkline on the 360 Overview.
- **Quality**: complaints (counted today), CAPA actions, supplier audits, temperature logs and quality-to-contract links. A "quality" timeline and an audit-due reminder would come free.
- **Tenders and contracts**: participations, bids and quote prices, awards, call-offs, contract milestones and payments, sanctions screening. These are the strongest signals for opportunities and for "what do we owe each other".
- **Product Database**: product source approvals, registrations (and their expiry), safety notices. A safety notice naming a stakeholder's product should raise health.
- **Insights** (anonymised cost prices, lead times by lane): a "how do they compare" card.
- **Admin organisation hub** (for Universe organisations): directory profile, scope and certifications, countries of operation. This is the data source for gap 3.
- **Risk register** and **logistics**: risks naming a supplier or lane, and on-time delivery by forwarder.

## 4. Demo data (step 7) and what it shows

The seed adds, to Universe Demo only and only where none existed: owners, tiers, statuses, summaries and review dates for the ~280 most engaged stakeholders; about 1,160 interactions (more for strategic and key accounts); 16 follow-up actions; about 170 opportunities across every stage (tender ones carry the simulated tender reference as text); 10 tags and about 230 applications; a head office and a LinkedIn link for every tracked stakeholder; other offices, factories, warehouses, portals and quality pages for the engaged ones; a primary contact for every stakeholder; seven saved filters. Every web address ends in `.example`. See the build log for the final counts.

## 5. Suggested order

1. Gaps 6, 7, 14 and 15 (small, make the daily lists and alerts useful). 
2. Gap 8 (export, since it is your own rule) and gap 18 (mobile pass).
3. Gaps 1 and 2 (Log interaction from project/tender/complaint, tender events moving opportunities), then gap 4 (richer Work together).
4. Gap 3 (Universe organisations as counterparties), the largest and most valuable piece for buyers and funders.
5. Gaps 12, 16, 17 and the rest as polish.

## 6. Decisions I need from you

- Gifts and hospitality as an interaction type, visible to compliance reviewers (design decision 6, still open)?
- Should Universe organisations (buyers, funders, tendering bodies) be trackable in the CRM (gap 3)?
- Should health fall to "Watch" when nobody has recorded an interaction for a set time, and what is that time (suggest 6 months for strategic and key, 12 for the rest)?
