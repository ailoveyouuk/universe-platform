# Universe colour palette and display standards audit

Date: 2026-10-24. Standard applied: WCAG 2.1 level AA (text contrast 4.5:1, large text and meaningful graphics 3:1, visible keyboard focus, skip links, reduced motion, text alternatives for colour). Contrast ratios were calculated from the token values in `packages/ui/src/tokens.css` using the WCAG relative-luminance formula.

## Passed without change
| Pair (light theme) | Ratio |
|---|---|
| Ink on white / on light grey | 18.5 / about 17 |
| Secondary text on white / on light grey | 5.16 / 4.85 |
| Brand violet (links, text) on white | 10.19 |
| White on brand violet | 10.19 |
| Accent magenta on white / on its tint | 5.50 / 5.00 |
| On-violet secondary text on violet | 5.39 |
| Critical red as text on white | 4.80 |
| All six app module accents against white (graphics, need 3:1) | 3.74 to 9.26 |
| Dark theme: ink, secondary, violet, magenta on dark surfaces | 5.0 to 17.0 |

## Failed, and fixed
| Item | Before | After |
|---|---|---|
| Status good text on white | 3.35 | new text token `--u-status-good-text` #0a6a0a (6.8) |
| Status warning text on white | 1.83 | `--u-status-warning-text` #8a620e (5.5) |
| Status serious text on white | 2.64 | `--u-status-serious-text` #8e4f36 (6.6) |
| Status critical text, dark theme | 3.85 | `--u-status-critical-text` #ff8a8a on dark (8.2) |
| On-violet muted text on violet | 3.76 | #BDB0DC (5.05) |
| Admin "Expiring soon" amber text | 4.24 | warning text token (5.5) |
| White text on Awarded, Completed, Unawarded, Declined badges | 3.35, 4.51, 2.64, 2.64 | #0a6a0a, #085a08, #b0481a, #b0481a (6.8, 8.5, 5.5, 5.5) |
| Pills (good, warning, critical) text on tint | 3.0 or lower | text tokens |
| Score gradient bars (50 to 100%) against light track | 2.6 to 3.1 | hsl(hue 80% 32%): 3.08 or better at every point |

Rule going forward: the bright status colours (`--u-status-*`) are for dots, bars and fills only; any status colour used as text must use the matching `-text` token (or `statusText()` from `@universe/ui`). 57 source files were migrated.

## Added
- A visible focus ring (2px brand violet) on buttons, inputs, selects, tabs and anything with a tabindex.
- A "Skip to main content" link in all five app shells (first focusable item, visible on focus).
- A `prefers-reduced-motion` rule that removes animation and transitions for people who ask for it.

## Already in place
- Language set on every page (`lang="en"`); pinch-zoom not disabled; 44px minimum touch targets on touch devices; links underline on hover and focus; status is always shown with words as well as colour (for example "Action needed"); the dark palette exists but is not switched on anywhere.

## Follow-up pass (2026-10-24): the three "not covered" items

**1. Screen reader and high-contrast**
- Windows high-contrast / forced-colours: a `@media (forced-colors: active)` block in `tokens.css` keeps borders, focus rings, gauge bars and status pills visible using system colours.
- Landmarks: every page had a nested `<main>` (the shell's `<main id="main-content">` wrapping a page-level `<main>`). All 42 page-level ones are now `<div>`; each page has exactly one `main`. The public tender notices page, which has no shell, keeps its own.
- Accessible names: inputs that relied on a placeholder alone now carry an `aria-label` (shared `SearchInput` plus 16 form fields).
- Automated structure scan (own in-page checker: contrast, unnamed buttons/links, unlabelled fields, images without alt, one h1, heading order, single main) run on live pages in light and dark: PM quality list and scorecard page; Tenders home and list; Admin home and organisations; Product Database home and register. Result after fixes: 0 failures.
- NOT done: a real screen reader (VoiceOver, NVDA) walk-through. That needs a person; automated checks cannot judge reading order or announcement quality. Recommended before go-live. Supplier portal and the tender framework page were not scanned live (no direct URL / empty for the demo user).

**2. Dark theme**
- Scanned live with transitions disabled (an earlier "24 failures" was a measurement artefact from mid-transition colours).
- Real issue found and fixed: brand violet link text on amber-tinted rows was 4.34:1; dark `--u-brand-violet` lightened #9B84D9 -> #A58FE0 (4.93 on the tint, 6.7 on the surface).
- Result: 0 contrast failures on all dark pages scanned. Dark remains an opt-in theme, not the default.

**3. Hard-coded colours**
- Status chips in Admin (organisations, users) used white text on amber/green (1.8:1); now the shared `Pill`.
- 19 places used the bright `--u-status-*` colours as text; now `-text` tokens.
- Module accents darkened in light theme so they pass 4.5:1 when used as text: CRM #52708A, Product Database #2F7A45, Supplier portal #B83B71, Tenders #A85A18.
- Remaining intentional exceptions: the Logo and per-organisation theme colours (brand identity, organisation-set), and decorative category swatches (non-text, 3:1 graphics rule).

## Known limits and follow-ups
- Screen reader walk-through by a person is still outstanding (see above).
- Score gradient: colour is never the only signal, because every bar sits next to its value and status wording.
- Automated scans cover the pages listed above, not every page; the same checker can be re-run on any page.

## Platform-wide live crawl (2026-10-24)
Scanner: `scripts/a11y/scan.js` (contrast 4.5:1 / 3:1 large, one main, one h1, no skipped heading levels, names on buttons/links, labels on fields, alt, ids, table headers), each page in light and dark.
- First pass found: PM unlabelled selects and risk-chip contrast and heading skips; Tenders unlabelled country search, h2 to h4 skips, fallback states with no h1; Product Database heading skips and a dead /products breadcrumb. All fixed.
- Re-scan after deploy: Admin 13 pages, Tenders 20, Project Management 24, Product Database 13: zero issues, except one heading skip on PM project detail (Status History), fixed afterwards.
- Not scanned live: Supplier portal (not deployed; covered by CI lint and code review). Not covered by any tool: reading order and announcement quality, which need a person with VoiceOver/NVDA.
