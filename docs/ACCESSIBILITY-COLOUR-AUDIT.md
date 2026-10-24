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

## Known limits and follow-ups
- Not tested with a screen reader or with Windows high-contrast mode; both are recommended before go-live.
- Score gradient: colour is never the only signal, because every bar sits next to its value and status wording.
- Contrast was measured from token values; a few components use inline colours (about 20 hard-coded hex values remain, mostly in the logistics score legend and per-app accents). They are swatches next to text labels, so they meet the 3:1 non-text rule or have a label, but they are candidates for tokens.
- The dark theme has not been audited against every component because it is not live.
