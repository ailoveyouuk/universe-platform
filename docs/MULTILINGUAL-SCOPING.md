# Multilingual platform: scoping and recommended approach (2026-10-28)

Asked by Lewis: a language switch for the whole platform, starting with English, French and Spanish, with Russian, Chinese, Arabic and other prominent languages in view. This is a scoping exercise: nothing is built. Figures come from a count of the code on 2026-10-28; effort and cost figures are rough estimates, not quotes.

## 1. Bottom line
Yes, and it is a contained piece of work, because every app shares one UI package and one API. Recommended: build a shared i18n foundation once, extract the text app by app, ship French and Spanish first, and make the layout right-to-left ready during extraction so Arabic is not a retrofit. Treat translations as **English-authoritative**: machine-drafted, human-reviewed where the words carry legal, regulatory or safety weight.

## 2. What is in scope (three layers)
| Layer | What it is | Approach |
|---|---|---|
| A. Interface text | Buttons, headings, labels, empty states, help text, "Source:" lines, methodology pages in six apps and the shared UI package | Message catalogues per language; extracted from code |
| B. Platform-owned content | Labels held in `@universe/types` (gap labels, categories, roles), API error and notification messages, the 66 standard services and 22 categories, tender standards guide (46 items), data-health notes, CRM methodology | Codes plus parameters from the API, translated on screen; translation tables for database content |
| C. User and organisation content | Product names, tender documents, notes, contract text, complaints, messages | **Not translated by the platform by default.** Optional later: on-demand machine translation, clearly labelled, with a privacy review |

## 3. What the code looks like today (measured)
- Six Next.js static-export apps (Azure Static Web Apps) plus `packages/ui`; all hard-coded English, `<html lang="en">`, no i18n library, no locale on the User record.
- Roughly **3,600 distinct UI strings and 20,000 words** found by a conservative count (apps 3,143; shared UI 84; `@universe/types` 359). The true count is probably 1.5 to 2 times higher once strings built in code are included. Largest: Project Management (769), Tenders (667), CRM (600), Insights (422).
- **718** English error messages thrown by the API; notifications are stored in the database as finished English sentences.
- About **185** places format dates or numbers with a hard-coded or default locale (97 fixed "en-GB"/"en-US", 88 without one) and about **56** hand-built plurals (`n === 1 ? "" : "s"`). These break in Russian (three plural forms) and Arabic (six).
- About **229** left/right style rules (margins, padding, alignment, borders) to convert to logical properties for right-to-left.
- Font stack is Inter: covers Latin, Cyrillic and Greek, **not Arabic or Chinese**.

## 4. Recommended architecture
1. **One package, `@universe/i18n`:** provider, `t()` / `<T>` helpers, formatting helpers (date, number, currency, list, relative time, plural) built on the browser's `Intl`, a locale registry (code, name in its own script, direction, font, numbering), and the catalogues.
2. **ICU MessageFormat** for messages with variables and plurals. Library choice (FormatJS/react-intl, Lingui, i18next or next-intl) is settled by a one-day spike; my lean is **FormatJS** (first-class ICU, extraction and compile CLI, ESLint rule against hard-coded text). The apps are static exports, so Next's built-in locale routing is out; the locale is chosen at run time, catalogues load on demand (one small file per language per app) so bundles do not grow.
3. **Choosing the language:** profile setting (new `locale` on User, returned by `/me`, so one choice follows the person across all six apps, which sit on different web addresses) → organisation default (new `defaultLocale`) → browser language → English. Switcher in the shared header and account menu, named in each language (Français, Español, العربية), never flags. Pre-login pages use the browser setting and local storage.
4. **Server text:** the API returns a message code and parameters (English kept as a fallback); the app translates. Notifications gain a template key plus parameters; existing rows stay English. The 359 labels in `@universe/types` move to catalogues keyed by their enum value.
5. **Database content** (services, categories, roles, regulatory lists): translation tables or a JSON translations column, with English as the source; global search matches in any language.
6. **Format and RTL:** every date, number and currency goes through the helpers. Currency codes stay data; only formatting varies. Default to Latin digits in Arabic for business figures, with a possible user choice later. Convert left/right styles to logical properties while extracting, mirror directional icons, isolate Latin product names and codes inside Arabic text, and check charts and tables.
7. **Fonts:** keep Inter; add Noto Sans Arabic (small subset) and rely on system CJK fonts first (a web font for Chinese is heavy), self-hosted so nothing is fetched from a third party.
8. **Accessibility (standing requirement):** `lang` on the page follows the switch and on foreign-language fragments (WCAG 3.1.1, 3.1.2); translated aria-labels; keyboard-operable switcher; the live accessibility scan runs per language; a pseudo-language (accented, 40 percent longer) finds overflow before real translations arrive.
9. **Guardrails:** CI check for missing or stale keys in each language, a lint rule against new hard-coded text in the apps (sits beside `lint:a11y`), and a rule that the source-text hash flags translations needing review when English changes.

## 5. Which languages, in what order
Reasoning: Universe serves health-product procurement, where the UN/WHO official languages, the donors' working languages and the big manufacturing and buying regions matter. UN official languages are English, French, Spanish, Russian, Chinese and Arabic.

| Wave | Languages | Why | Extra technical work |
|---|---|---|---|
| 1 | English (source), **French, Spanish** | WHO/UN working languages; francophone Africa and Latin America; both Latin script, left-to-right | None beyond the foundation |
| 2 | **Portuguese** (suggested addition), **Russian**, **Chinese (Simplified)** | Portuguese: Brazil and Lusophone Africa, a gap in the UN six that donors serve; Russian: Eastern Europe and Central Asia; Chinese: a very large share of manufacturers and suppliers | Russian plural rules; CJK fonts and line breaking; wider review budget for Chinese |
| 3 | **Arabic** | Middle East and North Africa; UN official | Right-to-left layout, Arabic font, bidirectional text; Persian, Urdu and Hebrew then become cheap |
| Later, demand-led | Hindi, Swahili, Bahasa Indonesia, Vietnamese, Turkish | Added when users or customers ask | Only catalogues |

Because the RTL conversion is done during extraction, Arabic can move earlier if a customer needs it. Suggested signal: record the browser language of invited users so the next language is chosen from real demand, plus a "request a language" link.

## 6. Making translations good (the real risk)
- **Glossary first** (about 200 terms): tender, bid, award, standstill, debriefing, call-off, framework agreement, lot, Incoterm, GDP, GMP, WHO prequalification, INN and so on. Align with the official term databases (UNTERM, WHO glossaries, EU IATE) so wording matches what buyers already read; to be checked as we go.
- **Pipeline:** extract English → Claude drafts with the glossary and a note on where each string appears → status per string (draft / reviewed) → native-speaking domain reviewer for high-risk text and spot checks for interface text. Start with the catalogues in the repository and the CI checks; move to a translation platform (Crowdin, Lokalise or self-hosted Weblate) when outside reviewers join.
- **English governs** for legal and regulatory material: privacy notice, terms, data processing agreement, award and standstill notices, the standards guide, safety notices. Show these in the person's language only once a qualified translator has reviewed them, otherwise display English with a labelled machine translation. This sits alongside the specialist review already planned (`LEGAL-REVIEW-BRIEF.md`).
- **User content** is never silently translated. If we later add "translate this" on tender documents, messages or notes, it sends text to a translation service: that needs a data processing agreement, a mention in the privacy notice and a decision on the pooled-data rule first.
- **Multi-language tenders** (an issuer publishing the same tender in two languages) is a separate product feature and should be designed with the procurement rules in mind (language of the solicitation); not assumed here.

## 7. Effort (rough, in build steps of the kind used so far)
| Step | Size |
|---|---|
| 0. Spike: pick the library, prove it on one page of one app, including a pseudo-language and Arabic layout | 1 |
| 1. Foundation package, switcher, profile and organisation fields, formatters, fonts, CI checks | 2 to 3 |
| 2. Extraction by app (codemod for markup text and attributes, by hand for strings built in code and plurals); shared UI first, then CRM, Insights, Tenders, Product Database, Admin, Project Management (largest) | 8 to 12 |
| 3. Server text: error codes, notification templates, labels from `@universe/types` | 2 to 3 |
| 4. Database content translations and search | 2 |
| 5. RTL pass and Arabic visual check (if folded into step 2, mostly verification) | 1 to 2 |
| Per language: AI draft plus glossary, in-app check, accessibility scan | about 1 each |

Translation volume per language is roughly 40,000 to 60,000 words (interface plus platform content). Professional translation of that is commonly priced in the low thousands of pounds per language; AI draft plus human review usually costs a third to a half of that. Treat as an order of magnitude and get quotes before committing.

## 8. Risks
- Strings built by joining pieces ("Showing " + n + " of " + total) must be rewritten as whole sentences; the main cost of extraction.
- Layout breaks from longer words (German-like expansion, French about 20 percent) in tight tables and the compact phone layout; the pseudo-language catches most of it.
- Translations drift as English changes; the stale-key check covers this.
- Machine translation of regulatory or safety wording can be wrong in ways that matter; hence English-authoritative and human review.
- Support load: staff may not read every language; keep English visible to staff in Admin and the audit log.

## 9. Decisions needed from Lewis
1. Languages and order as in section 5 (including adding Portuguese). Arabic last, or earlier if a customer needs it?
2. Is English authoritative for legal and regulatory content, with translations only after qualified review?
3. Will organisations get a default language, with each person able to override it?
4. Machine translation of user content: out for now, or planned later?
5. Who can review French and Spanish (and later others) domain wording: you, a colleague, or paid reviewers?
6. Start with the one-day spike when you are ready (the Entra items wait until then).
