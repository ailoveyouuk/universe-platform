#!/usr/bin/env node
/**
 * Accessibility lint (2026-10-24): static checks that run in CI and locally (`npm run lint:a11y`).
 * It enforces the rules in docs/ACCESSIBILITY-STANDARD.md that can be checked from source. It does not replace the live page scan
 * (scripts/a11y/scan.js) or a screen-reader test.
 * A line that is a deliberate exception can end with `// a11y-ok: reason`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "out" || name === "dist") continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (p.endsWith(".tsx")) files.push(p);
  }
};
for (const d of ["apps", "packages/ui/src"]) walk(join(root, d));

const problems = [];
const report = (file, line, rule, text) => problems.push(`${relative(root, file)}:${line}  [${rule}]  ${text.trim().slice(0, 140)}`);

for (const file of files) {
  const rel = relative(root, file).split(sep).join("/");
  const src = readFileSync(file, "utf8");
  const lines = src.split("\n");
  const isShell = rel.endsWith("components/AppShell.tsx");
  const isPublicNotices = rel.startsWith("apps/tenders/src/app/notices/");
  const isBrandAsset = /packages\/ui\/src\/(Logo|BrandMark|OrgTheme|MobileBrand)\.tsx$/.test(rel);

  lines.forEach((text, i) => {
    const n = i + 1;
    if (/a11y-ok/.test(text)) return;
    // 1. one <main> per page, owned by the app shell
    if (/<main\b/.test(text) && !isShell && !isPublicNotices) report(file, n, "landmark", "Pages must not render <main>; the app shell provides it. Use <div>.");
    // 2. images need alt
    if (/<img\b/.test(text)) { const tag = lines.slice(i, i + 10).join(" ").match(/<img\b[\s\S]*?\/>/); if (!tag || !/\balt=/.test(tag[0])) report(file, n, "alt", "<img> without alt"); }
    // 3. bright status colours are for dots, bars and fills only, never text
    if (/\bcolor:\s*[^,}]*var\(--u-status-(critical|good|warning|serious)\)/.test(text) && !/\blabel:/.test(text)) report(file, n, "status-text", "Use var(--u-status-*-text) or statusText() for text colour; the bright tokens fail contrast on white.");
    // 4. no hard-coded white/black text (breaks in dark theme); use --u-brand-violet-on / --u-on-accent / --u-ink
    if (!isBrandAsset && /\bcolor:\s*[^,}]*["'](#fff|#ffffff|white|#000|#000000|black)["']/i.test(text) && !/var\(--/.test(text.split(/["'](#fff|#ffffff|white|#000|#000000|black)["']/i)[0].slice(-40))) report(file, n, "hard-coded-colour", "Hard-coded white/black text; use a token (--u-ink, --u-brand-violet-on, --u-on-accent).");
    // 5. text inputs must have an accessible name (placeholder alone is not one)
    if (/<(input|textarea)\b/.test(text) && /placeholder=/.test(text) && !/aria-label|aria-labelledby/.test(text)) report(file, n, "input-name", "Input with a placeholder but no aria-label");
    // 6. clickable non-interactive elements
    if (/<(div|span|li|td|tr)\b[^>]*\bonClick=/.test(text) && !/\brole=/.test(text) && !/stopPropagation|onClick=\{\(e\)\s*=>\s*e\.stopPropagation/.test(text)) report(file, n, "click-target", "onClick on a non-interactive element: use <button>, or add role, tabIndex and a key handler.");
    // 7. positive tabindex
    if (/tabIndex=\{?["']?[1-9]/.test(text)) report(file, n, "tabindex", "Positive tabIndex breaks keyboard order");
  });
}

if (problems.length) {
  console.error(`Accessibility lint: ${problems.length} problem(s)\n` + problems.join("\n"));
  process.exit(1);
}
console.log(`Accessibility lint: ${files.length} files, no problems.`);
