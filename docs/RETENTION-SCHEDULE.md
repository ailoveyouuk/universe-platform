# Default retention schedule

*Set 2026-10-31 at Lewis's request: "the default standard expectations that are compliant with UK/EU regulations".*
The single source is `packages/types/src/retention-schedule.ts`; it is shown read-only in the CRM under Privacy, Retention schedule, and the CRM's own retention queue reads its two periods from it.

## What this is and is not
- UK GDPR and EU GDPR set **no fixed periods**. They require a period that is justified, no longer than needed, and reviewed (storage limitation). These are defaults with a stated reason, not legal minimums, and an organisation may justify a different one.
- **Nothing is deleted automatically.** At the end of a period a record goes to a review queue (or the person's details are anonymised) and a person decides. This follows the platform rule that nothing is hard deleted without Lewis's say-so.
- The "basis" column is honest about firmness. *Set by law* = Limitation Act 1980 six-year contract claims, HMRC and Companies Act six-year accounting records. *Regulator guidance* = MHRA and EU Good Distribution Practice (at least five years) and ICO guidance on backups. *Common practice* = recalled norms with no single source. All of these were recalled, not re-read from the source text, so the non-statute rows (and the statute rows too) go to the specialist in `docs/LEGAL-REVIEW-BRIEF.md` (decision C) to confirm.

| What | Kept for | From | At the end | Why | Basis |
|---|---|---|---|---|---|
| **CRM people**: Contact details of a person who has left the organisation they were a contact at | 2 years | the date they left | Personal detail anonymised | No fixed period in UK GDPR; two years lets the relationship recover while avoiding keeping people "just in case". | Common practice |
| **CRM people**: Contact details not re-checked | 3 years | the last check | A person reviews it | Data must be accurate; details unchecked for three years are probably out of date. | Common practice |
| **CRM relationships**: People linked to a stakeholder relationship that has ended | 2 years | the relationship ending | A person reviews it | Keep enough to show the relationship existed; review the personal detail. | Common practice |
| **CRM people**: A person a reviewer chose to keep | 1 year | the review | A person reviews it | A decision to keep expires and must be made again with a reason. | Common practice |
| **Privacy**: Subject-access, erasure and other privacy requests, decisions and exemptions | 6 years | the request closing | A person reviews it | Needed to show compliance; matches the six-year limitation period for claims. | Set by law |
| **Privacy**: Hashed email kept so an erased person is not added back | No end date | kept while the organisation operates (no end date) | A person reviews it | Holds only a one-way hash; keeping it is what makes the erasure stick. | Regulator guidance |
| **Security**: Who viewed personal data in the CRM | 2 years | the view | Archived | Security and audit evidence (UK GDPR Article 32; ISO 27001 logging); two years covers an annual audit cycle plus a year. | Common practice |
| **Security**: Field-change log and audit trail of who changed what | 6 years | the change | Archived | Business and dispute evidence; matches the six-year limitation period. | Set by law |
| **Tenders**: Tender documents, evaluation scores, award decision and standstill record | 6 years | contract award (or tender cancellation) | A person reviews it | Challenges and contract claims can be brought for six years (Limitation Act 1980); public-sector norms are five to seven years. | Set by law |
| **Tenders**: Personal details of people at unsuccessful bidders (names, emails, CVs) | 2 years | contract award | Personal detail anonymised | Keep the bid and score for the file; the personal detail is not needed once challenge time has passed. | Common practice |
| **Contracts**: Awarded contracts, variations, performance records and signatures | 6 years | contract end or expiry | A person reviews it | Six years for contract claims; twelve if executed as a deed (shown on the contract). | Set by law |
| **Quality**: Complaint record, investigation, corrective action and closure | 5 years | the complaint closing | A person reviews it | MHRA and EU Good Distribution Practice expect distribution and quality records to be kept for at least five years. | Regulator guidance |
| **Quality**: Name and contact details of the person who complained | 2 years | the complaint closing | Personal detail anonymised | The complaint stays for five years; the complainant's identity is minimised sooner unless a regulator or safety matter is open. | Common practice |
| **Products**: Registrations, safety notices, recall records and batch traceability | 5 years | the later of last batch expiry and the record closing | A person reviews it | GDP expects at least five years; product-safety actions may need longer, so a reviewer extends them. | Regulator guidance |
| **Compliance**: Licences, certificates and audit reports | 6 years | expiry or replacement | A person reviews it | Evidence for inspections and disputes over the period claims can be brought. | Common practice |
| **Anti-bribery**: Gifts and hospitality register entries | 6 years | the entry date | A person reviews it | Evidence of adequate procedures (Bribery Act 2010; ISO 37001 documented information); six years is typical. | Common practice |
| **Finance**: Invoices, payment and accounting records | 6 years | the end of the financial year | A person reviews it | HMRC and Companies Act accounting records: six years (UK). | Set by law |
| **Accounts**: A person's platform account after they leave (archived, not deleted) | 6 years | the account being archived | Personal detail anonymised | Needed so the audit trail still says who did what; then the name is replaced. | Common practice |
| **Supplier directory**: Supplier enquiries that never led to a relationship | 1 year | the enquiry closing | Personal detail anonymised | No continuing purpose once the enquiry is closed. | Common practice |
| **Notifications**: In-app alerts | 3 months | the alert being read or dismissed | Archived | Convenience messages with no record-keeping purpose. | Common practice |
| **Backups**: Database backups | 1 month | the backup being taken | Archived | ICO: where erasure is not immediate in backups, data is put beyond use until the backup expires; the backup window is the stated period. | Regulator guidance |

## How it is used (built 2026-10-31)
- **Admin, Retention** (organisation administrators): a review list of tender files, contracts and quality complaints past their period, and complainants whose personal details can now be removed. A person keeps a record (a reason is required; it returns after 12 months), archives it (tenders and complaints) or removes the complainant's name, email and phone (the complaint itself stays). Every decision is recorded (`retention_decisions`) and audited.
- **Own periods:** an organisation can set its own months for a rule, with a reason (`retention_overrides`); the platform default applies otherwise.
- **Complainant requests:** find complaints that name a person (name, email or phone, including the linked contact) and download a copy for a subject access request.
- A complaint with a regulator decision still under consideration is never offered for archive or removal.
- RLS for the two new tables: `infra/sql/retention-rls.sql` (Lewis runs it once after deploy).

## Still to build
- Review queues for the other record types in the schedule (finance, certification, gifts register, notifications, backups) when those areas hold real data.
- Email to the complainant (waiting on the email decision).
