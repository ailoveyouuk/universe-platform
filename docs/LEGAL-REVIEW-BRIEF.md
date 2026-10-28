# Specialist legal review brief (2026-10-28)

**Status: preparation only.** Claude is not a lawyer or data protection adviser and this is not a review. It is the pack to hand to a UK data protection / procurement solicitor so their time goes on the real questions. All dates and ICO positions below come from `CRM-STANDARDS-AND-DATA-PROTECTION.md` and were read from ICO pages or law-firm summaries in October 2026; items marked *secondary* or *recalled* have not been checked against primary text.

## 1. What Universe is
A multi-tenant platform (project management, product database, tendering, CRM, insights). Each organisation's data is isolated (row-level security). Universe is processor for the organisation's CRM and project data, and controller for its own account data and pooled, anonymised Insights data (shared only if an organisation opts in, with a five-organisation floor). Demo data is simulated and hidden from real organisations. Hosting: Azure UK South.

## 2. Documents to be reviewed
| Document | Where | Question for the specialist |
|---|---|---|
| Legitimate interests assessment template (CRM contacts) | CRM, requirement P2 | Is the template sufficient for B2B contact management? Is legitimate interests the right default basis? |
| Privacy notice text for contacts | requirement P4 | Wording, who sends it, timing |
| Data processing agreement (controller-processor) | section 2 of the CRM standards | Article 28(3) terms; sub-processors (Azure, others); current ICO contract guidance is under review for the Data (Use and Access) Act |
| Breach runbook | requirement S3 | 72-hour reporting, processor-to-controller notification, record keeping; guidance under review |
| Erasure by anonymisation in place of deletion (R7) | decision B | Does irreversible anonymisation satisfy erasure while keeping the "nothing is hard deleted" rule? |
| Default retention periods | S1, decision C | Defensible default for relationship records and tender records (public-sector norms of 5 to 7 years are *recalled*) |
| Free-text notes risk (special category data, third-party names in subject access) | R2, S5 | Is the guard and warning enough? |
| International transfers | S4 | Whether any processing leaves the UK; IDTA / UK Addendum if so (*secondary*) |
| ICO registration and fee for Universe as a controller of account data | decision G | Not researched |
| Data protection contact / DPO | decision D | Whether a named contact is enough |

## 3. Procurement-side questions (tenders)
- Wording of "supports, never claims compliance" for UNCITRAL, UK Procurement Act 2023, World Bank rules (the guide is guidance only; nothing has been reviewed by a procurement lawyer).
- Electronic signature validity for contracts and awards (planned external e-sign section).
- Standstill, debrief and complaint defaults and whether they suit UK public-sector buyers.
- Anti-bribery positions on gifts and hospitality (CRM register uses Lewis's own policy threshold).

## 4. Other items for a specialist
- Cyber Essentials Plus readiness and ISO 27001 / SOC 2 gap assessment (standing target, not started).
- Accessibility statement text (WCAG 2.1 AA; a person-run screen-reader pass is still outstanding).
- Terms of service and acceptable-use terms for organisations and users (not drafted).

## 5. Re-check list before launch
ICO contracts and breach guidance after the Act-related review; commencement dates of the Data (Use and Access) Act against the legislation; ICO's new name (Information Commission, from 30 September 2026) in notices and templates.
