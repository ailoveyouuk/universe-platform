# Universe accessibility standard

Applies to every app and shared component, from 2026-10-24. Target: **WCAG 2.1 level AA**, in both the light and the dark theme. Background and measurements: `docs/ACCESSIBILITY-COLOUR-AUDIT.md`.

## Rules for anything built
1. **Colour tokens only.** Use `--u-*` tokens, never hard-coded hex, `white` or `black` for text or surfaces (the Logo, the per-organisation theme and one-off decorative swatches are the only exceptions). Hard-coded colours break in the dark theme.
2. **Status colours.** The bright `--u-status-*` colours are for dots, bars and fills only. Text in a status colour uses `--u-status-*-text` (or `statusText()`). Text on a coloured fill uses the matching "on" token (`--u-brand-violet-on`, `--u-on-accent`). Prefer the shared `Pill`, `Badge`, `StatTile`.
3. **Contrast.** Text 4.5:1 (3:1 for 24px, or 18.66px bold); icons, borders and chart marks that carry meaning 3:1. Check both themes. Disabled controls are exempt but must not be the only way to tell something.
4. **Never colour alone.** Status always has words or an icon as well (for example "Action needed", not just a red dot). Score bars sit next to their number.
5. **One landmark.** The app shell owns the only `<main id="main-content">`. Pages and shared components render `<div>`, never `<main>`. Each page has exactly one `<h1>` and no skipped heading levels.
6. **Names.** Every button, link and icon-only control has an accessible name (text, `aria-label`). Every form field has a visible `<label>` or an `aria-label`; a placeholder is not a label. Images have `alt` (empty `alt=""` only when purely decorative).
7. **Keyboard.** Everything clickable is a `<button>` or `<a>`. If a non-native element must be clickable, give it `role`, `tabIndex={0}` and Enter/Space handling. No positive `tabIndex`. Focus is always visible (the global `:focus-visible` ring); never remove outlines. Menus and dialogs close on Escape and return focus.
8. **Motion.** Respect `prefers-reduced-motion` (handled globally); no auto-playing motion longer than 5 seconds.
9. **Tables** have header cells (`<th>`); data presented as a table is a table.
10. **Errors and status messages** are text next to the field and announced (`role="alert"` or `aria-live`), not colour changes.
11. **Targets.** Touch targets at least 44px on touch devices (handled globally); do not shrink them.
12. **Forced colours.** Do not rely on background colour alone to show state; use a border or icon too (the `forced-colors` block in `tokens.css` covers the shared components).

## How it is enforced
- **CI** runs `npm run lint:a11y` (`scripts/a11y-lint.mjs`) on every push and pull request. It fails the build for: `<main>` outside the shell, `<img>` without `alt`, bright status tokens used as text colour, hard-coded white/black text, inputs with a placeholder and no `aria-label`, clickable non-interactive elements, and positive `tabIndex`. A deliberate exception ends the line with `// a11y-ok: reason`.
- **Live page scan** (`scripts/a11y/scan.js`): paste into the console of a signed-in app, then `await __uniA11y.crawl({ start: ["/"], max: 60 })`. It follows in-app links and checks every page in light and dark for contrast, landmarks, headings, names, labels, alt text, duplicate ids and table headers. Run it after any change that touches layout, colour or forms, and before each release.
- **Theme check.** Switch the theme toggle (Light / Dark / Device) and look at the screen you changed.
- **Screen reader.** A person walks the main journeys with VoiceOver (Mac/iOS) or NVDA (Windows) before go-live and after big UI changes. Automated checks cannot judge reading order or whether announcements make sense.

## Definition of done for UI work
No new lint problems, a clean live scan of the pages touched in both themes, keyboard-only use works, and the BUILD-LOG entry says what was checked.
