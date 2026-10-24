/*
 * Universe accessibility scanner (2026-10-24).
 *
 * Paste this whole file into the browser console (or run it through the browser tool) on any signed-in Universe app page. It then crawls the app's
 * own pages in hidden same-origin frames (so the sign-in is reused), checks each page in the light AND dark theme, and returns a compact report.
 *
 *   await __uniA11y.crawl({ start: ["/", "/projects"], max: 60 })      // follows in-app links, 2 pages per path pattern
 *   __uniA11y.scanDocument(document)                                  // just the page you are on
 *
 * Checks (WCAG 2.1 AA): text contrast (4.5:1, large text 3:1); exactly one <main>; one <h1> and no skipped heading levels; buttons and links with no
 * name; form fields with no label; images with no alt; duplicate ids; positive tabindex; tables with no header cells; missing <html lang>.
 * It cannot judge reading order, announcement quality, or colour-only meaning: those need a person with a screen reader (VoiceOver / NVDA).
 */
(() => {
  const parse = (c) => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });

  function scanDocument(doc) {
    const win = doc.defaultView;
    const bgOf = (el) => {
      const stack = []; let e = el;
      while (e) { const c = parse(win.getComputedStyle(e).backgroundColor); if (c && c.a > 0) stack.push(c); if (c && c.a === 1) break; e = e.parentElement; }
      let base = { r: 255, g: 255, b: 255, a: 1 };
      if (!stack.length || stack[stack.length - 1].a < 1) { const root = parse(win.getComputedStyle(doc.body).backgroundColor); if (root && root.a > 0) base = over(root, base); }
      for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base);
      return base;
    };
    const issues = [];
    const add = (type, detail) => issues.push({ type, detail });
    const walker = doc.createTreeWalker(doc.body, 4); const seen = new Set();
    while (walker.nextNode()) {
      const n = walker.currentNode; if (!n.textContent.trim()) continue;
      const el = n.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
      const cs = win.getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) continue;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      let fg = parse(cs.color); if (!fg) continue;
      const bg = bgOf(el); if (fg.a < 1) fg = over(fg, bg);
      const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const size = parseFloat(cs.fontSize); const large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700); const need = large ? 3 : 4.5;
      if (ratio < need) add("contrast", `${ratio.toFixed(2)}:1 (need ${need}) "${n.textContent.trim().slice(0, 30)}" ${cs.color} on rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)}) <${el.tagName.toLowerCase()}>`);
    }
    const q = (s) => [...doc.querySelectorAll(s)];
    const mains = q("main").length; if (mains !== 1) add("landmark", `${mains} <main> elements (need exactly 1)`);
    const heads = q("h1,h2,h3,h4,h5,h6").map((h) => +h.tagName[1]);
    const h1 = heads.filter((x) => x === 1).length; if (h1 !== 1) add("heading", `${h1} <h1> elements (need exactly 1)`);
    for (let i = 1; i < heads.length; i++) if (heads[i] - heads[i - 1] > 1) { add("heading", `level skips from h${heads[i - 1]} to h${heads[i]}`); break; }
    q("button,[role=button],a[href],[role=link],[role=menuitem],[role=tab]").forEach((b) => {
      const name = (b.getAttribute("aria-label") || b.getAttribute("aria-labelledby") || b.textContent || b.getAttribute("title") || (b.querySelector("img[alt]") || {}).alt || "").trim();
      if (!name) add("name", `${b.tagName.toLowerCase()} with no accessible name: ${b.outerHTML.slice(0, 90)}`);
    });
    q("input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea").forEach((i) => {
      const ok = i.getAttribute("aria-label") || i.getAttribute("aria-labelledby") || (i.id && doc.querySelector(`label[for="${i.id}"]`)) || i.closest("label") || i.getAttribute("title");
      if (!ok) add("label", `field with no label: ${i.outerHTML.slice(0, 90)}`);
    });
    q("img:not([alt])").forEach((i) => add("alt", `image with no alt: ${i.outerHTML.slice(0, 80)}`));
    const ids = {}; q("[id]").forEach((e) => { ids[e.id] = (ids[e.id] || 0) + 1; });
    Object.entries(ids).filter(([, c]) => c > 1).slice(0, 3).forEach(([id, c]) => add("id", `id "${id}" used ${c} times`));
    q("[tabindex]").filter((e) => +e.getAttribute("tabindex") > 0).forEach((e) => add("tabindex", `positive tabindex: ${e.outerHTML.slice(0, 80)}`));
    q("table").forEach((t) => { if (!t.querySelector("th")) add("table", `table with no header cells: ${t.outerHTML.slice(0, 60)}`); });
    if (!doc.documentElement.lang) add("lang", "<html> has no lang");
    return issues;
  }

  /** Runs scanDocument in both themes with transitions switched off (otherwise colours are read part-way through a transition). */
  async function scanBothThemes(doc) {
    const st = doc.createElement("style"); st.textContent = "*{transition:none!important;animation:none!important}"; doc.head.appendChild(st);
    const out = {};
    for (const th of ["light", "dark"]) {
      doc.documentElement.setAttribute("data-theme", th);
      await new Promise((r) => setTimeout(r, 150));
      out[th] = scanDocument(doc);
    }
    st.remove();
    return out;
  }

  async function crawl({ start = ["/"], max = 40, perPattern = 2, settleMs = 3500 } = {}) {
    const queue = [...start]; const done = new Set(); const perPath = {}; const report = [];
    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;left:-12000px;top:0;width:1280px;height:900px;border:0";
    document.body.appendChild(frame);
    const load = (url) => new Promise((res) => { const t = setTimeout(res, 15000); frame.onload = () => { clearTimeout(t); res(); }; frame.src = url; });
    while (queue.length && done.size < max) {
      const url = queue.shift(); const u = new URL(url, location.origin); const path = u.pathname.replace(/\/$/, "") || "/";
      if (u.origin !== location.origin || done.has(u.pathname + u.search)) continue;
      if ((perPath[path] = (perPath[path] || 0) + 1) > perPattern) continue;
      done.add(u.pathname + u.search);
      await load(u.href); await new Promise((r) => setTimeout(r, settleMs));
      const doc = frame.contentDocument; if (!doc || !doc.body) { report.push({ url: u.pathname + u.search, error: "no document" }); continue; }
      const res = await scanBothThemes(doc);
      report.push({ url: u.pathname + u.search, textLen: doc.body.innerText.length, light: res.light, dark: res.dark });
      doc.querySelectorAll("a[href]").forEach((a) => { const h = new URL(a.getAttribute("href"), u.href); if (h.origin === location.origin && !/^\/(api|notices)/.test(h.pathname) && !done.has(h.pathname + h.search)) queue.push(h.pathname + h.search); });
    }
    frame.remove();
    return report;
  }

  /** Compact text summary of a crawl report. */
  function summarise(report) {
    const lines = []; let bad = 0;
    for (const r of report) {
      if (r.error) { lines.push(`${r.url}: ${r.error}`); continue; }
      for (const th of ["light", "dark"]) {
        const byType = {}; r[th].forEach((i) => { byType[i.type] = (byType[i.type] || 0) + 1; });
        if (r[th].length) { bad++; lines.push(`${r.url} [${th}] ${JSON.stringify(byType)} e.g. ${r[th][0].detail}`); }
      }
    }
    return `${report.length} pages scanned, ${bad} page-theme combinations with issues\n` + lines.join("\n");
  }
  window.__uniA11y = { scanDocument, scanBothThemes, crawl, summarise };
})();
