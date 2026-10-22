# Export / hoarding restriction sources by country (research, 2026-10-18)

Status of research for the curated entries in Universe's export-restriction feature. "Primary" = read on an official page; "Press" = reported by news only, official list not yet opened. Nothing below has been loaded as data yet.

## Reference definition
- WHO replaced the "Stringent Regulatory Authority" concept with **WHO Listed Authorities (WLA)**; transitional WLA list valid to 31 March 2027. SRA (Global Fund 2008, based on ICH membership before Oct 2015) is still used by some buyers. Decision for Lewis: which list defines "SRA" in Universe.

## Countries with a published restriction list
| Country | Authority | What | Evidence | Notes |
|---|---|---|---|---|
| UK | DHSC/MHRA | CSV, reg 43(2) HMR 2012 | Primary, live in Universe (38 rows) | Done |
| Portugal | INFARMED | Monthly list of medicines with export/intra-EU distribution temporarily suspended; Art. 100(2)(c) DL 176/2006 and Deliberação 234/2025 | Primary (Deliberação 087/CD/2026, 30 Jul 2026: 38 presentations + all quetiapine); press: 52 medicines on 6 Oct 2026 | Table fields: registration no., trade name, active substance, strength, form, pack. PDF per month; URL changes. |
| Italy | AIFA | Temporary export block list (determina), medicines not to be withdrawn from distribution | Primary: PDF dated 21 May 2026 at aifa.gov.it/documents/20142/2171819/4_Elenco_farmaci_blocco_export.pdf | Separate shortage CSV exists (updated 16 Oct 2026). Legal basis not stated on page. |
| Austria | BASG | Export ban on listed medicines under the Verordnung zur Sicherstellung der Arzneimittelversorgung; amended BGBl. II 294/2026, in force 9 Oct 2026, now covers all countries (was EEA only); named-patient exception | Primary notice; list at medikamente.basg.gv.at/de/export-ban (page is script-rendered, format unknown) | Wholesale-licensed businesses may not trade the products from Austria. |
| Greece | EOF | Three-month ban on parallel export, intra-EU distribution and stockpiling; 82 products announced 27 May 2026 (to 27 Aug) | Press only | Time-limited decisions renewed; official PDF on eof.gr not opened. |
| Poland | Ministry of Health | "Anti-export list": 276 medicines and devices (May 2025) needing special permission to export | Press only | Legal basis not confirmed; official notice in Dziennik Urzędowy MZ. |

## Regime without a fixed list
| Country | Finding |
|---|---|
| Canada | Duty-based: since 2021 licensed distributors may not distribute Canadian-market drugs abroad if it may cause/worsen a shortage (FDR C.01.014.95-.96). The Expanded Scope List defines which drugs are in scope; it is not a ban list. Each exporter assesses and records. Guidance GUI-0145 was a draft at last check. Universe can only show "in scope, assess shortage" not a ban. |

## Not yet resolved (no list found or not checked)
- Germany (BfArM): supply-shortage law (ALBVVG) and reporting duties; no export-ban list found.
- France (ANSM): shortage plans and mandatory safety stocks; no standing export-ban list found; past bans were ad hoc (2020).
- Spain (AEMPS): supply-problem list (CIMA); export controls via circulars; no ban list found.
- Belgium (FAMHP): 2020 ban was COVID-time; later legislative moves; current list not found.
- Netherlands, Ireland, Switzerland, USA, Australia, Japan, Korea: no list found in searches; Australia (TGA) page could not be read by the tool (robots).
- Other EU members (Hungary, Romania, Czechia, Slovakia, Lithuania, Latvia, Croatia, Bulgaria, Slovenia, Cyprus, Malta, Denmark, Sweden, Finland, Norway, Luxembourg): not yet researched.

## Next steps
1. Lewis to confirm the SRA definition (WLA list vs ICH-based SRA).
2. Load Portugal, Italy and Austria first as curated entries (primary sources, structured); open and verify Greece and Poland official documents before loading.
3. Consider connectors: INFARMED monthly deliberation PDF and AIFA PDF are machine-readable but the file URLs change; a monthly check would need page scraping. Entries from them would carry the source link and date and be auto-marked removed when dropped.
4. Re-check each source monthly; EU lists are temporary and renewed.

## Outcome 2026-10-22
Decision (Lewis): UK only for now, unless a reliable European, US, Canadian, Australian or Japanese source exists. Research found none stable (Portugal, Italy, Austria monthly PDFs with changing URLs; EU lists temporary; Canada is duty-based, not a list). Nothing to load; revisit if a source appears.
