# Universe Platform — working agreements

- **Accessibility is a standing requirement.** Follow `docs/ACCESSIBILITY-STANDARD.md` for every UI change (WCAG 2.1 AA, light and dark themes). Run `npm run lint:a11y` before pushing; after layout, colour or form changes run the live scan in `scripts/a11y/scan.js` on the pages touched. Use tokens, never hard-coded colours; bright `--u-status-*` colours are never text colours.
- After each change: update `docs/BUILD-LOG.md`, republish it to the Universe project docs (`claude/universe-build-log.md`), update memory, and make a full dated backup to the LaCie drive (`Universe/current/` is kept as a complete copy; dated folders are snapshots).
- All demo data is simulated; nothing is ever hard deleted without Lewis's say-so. Production RLS SQL is run by Lewis from `infra/sql/*.sql`.
