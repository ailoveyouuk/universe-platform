# Confirmed demo baseline (locked 2026-10-26)

Lewis asked (2026-10-26) that, if the simulated data covers the platform's functionality sufficiently for simulation and demo purposes, it be locked in as the confirmed demo data. Claude judged that it does. This document is the record. All data is simulated; Universe Demo is the only organisation people sign in to.

## What is locked
- **Universe Demo (the signed-in demo organisation, a procurement agent):** 1,517 projects (one test project archived), 5,581 project lines, 3,012 partners, 3,871 batches, 127 users, 44 issued or involved tenders, 42 contracts, with quality, risk, logistics and product source approval data.
- **Platform-wide simulated data:** 302 further simulated organisations with directory profiles (117 supplier, 52 manufacturer, 13 funder, 24 tendering-body, 125 procurement-agent), a catalogue of 31,411 products in 19 groups, tender ecosystem (SIM-ECO-01 to 10, SIM-TND, SIM-FWK frameworks, SIM-SVC service tenders), 43 performance records, Insights benchmark rows (all simulated), 66 standard services.
- **Deliberately in different states:** SIM-SVC-002 stays at Evaluating, SIM-SVC-001 is a published tender with a draft bid, so the demo shows tenders at several stages.
- **Deliberate gaps:** about 6% of catalogue products lack UNSPSC and about 4% lack an HS code.

## Evidence it is consistent (final audits, 2026-10-26)
- Consistency audit: zero anomalies across 1,504 simulated projects and 5,563 lines, including the delivery measures and batch status checks.
- Tender timelines: 64 checked, 0 broken (hash chain intact).
- Catalogue audit: only the deliberate gaps. Insights price audit: no real-organisation rows.
- Coverage audit: remaining empty tables are the supplier, manufacturer, funder and tendering-body profile tables for Universe Demo itself (it is a procurement agent, so they do not apply), product amendments and product lines.

## Known limits (accepted)
- Only Universe Demo can be signed in to, so supplier-side and manufacturer-side views are shown through Universe Demo's bids and through the directory, not by signing in as those organisations.
- Contract evidence rows are logged records without stored files.
- No Reset sandbox (Lewis decided it is not needed: the demo is ring-fenced from live data).
- A person using a screen reader has not yet tested the apps.

## How it is protected
- Repository tag `demo-baseline-2026-10-26` marks the code and seed scripts that produce it. The seed workflows are idempotent and run with a dry run first.
- Rule from now: changes to demo data go through a logged seed script and are recorded in docs/BUILD-LOG.md; nothing is hard deleted.
- Database point in time: the baseline stands as of 2026-10-26 11:20 UTC. Azure SQL keeps automatic point-in-time backups for a limited period; **suggested:** export a .bacpac of the `universe` and `universe-insights` databases from the Azure portal now, and keep it with the LaCie backups, so the baseline can be restored after the automatic window.
