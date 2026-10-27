"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SearchIcon } from "./icons";
import { UNIVERSE_APPS } from "./AppSwitcher";

/* Structural copy of SearchResult from @universe/types (this package has no
 * dependency on it). */
export interface GlobalSearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  link: string;
  app: string;
}
export interface GlobalSearchApi {
  searchEverything(q: string): Promise<{ query: string; results: GlobalSearchResult[] }>;
}

const TYPE_LABEL: Record<string, string> = {
  project: "Projects",
  stakeholder: "Stakeholders",
  contact: "Contacts",
  batch: "Batches",
  risk: "Risks",
  product: "Products",
  tender: "Tenders",
  relationship: "Relationships",
  opportunity: "Opportunities",
};
const ORDER = ["project", "stakeholder", "contact", "batch", "risk", "product", "tender", "relationship", "opportunity"];

/**
 * Header search: opens a panel (click the icon, or press Ctrl/Cmd + K),
 * searches as you type, groups results by kind, arrow keys + Enter to open.
 * Results belonging to another app open there (same hostnames the app
 * switcher uses).
 */
export function GlobalSearch({ api, LinkComponent, currentApp }: { api: GlobalSearchApi; LinkComponent: any; currentApp: string }) {
  const Link = LinkComponent;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  // Flatten in display order so arrow keys follow what's on screen.
  const ordered = (results ?? []).slice().sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
    else {
      setQ("");
      setResults(null);
      setFailed(false);
    }
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      setFailed(false);
      return;
    }
    const mine = ++seq.current;
    const t = setTimeout(() => {
      api
        .searchEverything(term)
        .then((r) => {
          if (mine !== seq.current) return; // a newer search superseded this one
          setResults(r.results);
          setActive(0);
          setFailed(false);
        })
        .catch(() => mine === seq.current && setFailed(true));
    }, 250);
    return () => clearTimeout(t);
  }, [q, api]);

  const hrefFor = useCallback((r: GlobalSearchResult): { external: boolean; href: string } => {
    if (r.app === currentApp) return { external: false, href: r.link };
    const base = UNIVERSE_APPS.find((a) => a.key === r.app)?.href ?? "";
    return { external: true, href: `${base}${r.link}` };
  }, [currentApp]);

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(ordered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && ordered[active]) {
      const { external, href } = hrefFor(ordered[active]);
      setOpen(false);
      if (external) window.location.href = href;
      else (document.querySelector(`[data-search-result="${active}"]`) as HTMLElement | null)?.click();
    }
  }

  let lastType = "";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Search (Ctrl/Cmd + K)"
        aria-label="Search"
        style={{ border: "none", background: "none", padding: 0, cursor: "pointer", color: "var(--u-ink-secondary)", display: "flex" }}
      >
        <SearchIcon size={18} />
      </button>
      {open && (
        <div
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 80, background: "var(--u-overlay)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "min(12vh, 90px) 12px 12px" }}
        >
          <div role="dialog" aria-label="Search" style={{ width: 560, maxWidth: "100%", maxHeight: "76vh", display: "flex", flexDirection: "column", background: "var(--u-surface-raised, var(--u-surface))", border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg, 12px)", boxShadow: "var(--u-shadow-card)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--u-border)", color: "var(--u-ink-secondary)" }}>
              <SearchIcon size={18} />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search projects, stakeholders, batches, risks, products…"
                aria-label="Search"
                style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 15, color: "var(--u-ink)" }}
              />
              <kbd style={{ fontSize: 11, border: "1px solid var(--u-border)", borderRadius: 4, padding: "1px 5px" }}>Esc</kbd>
            </div>
            <div style={{ overflowY: "auto" }}>
              {q.trim().length < 2 && <p style={{ margin: 0, padding: 16, fontSize: 13, color: "var(--u-ink-secondary)" }}>Type at least two characters.</p>}
              {failed && <p style={{ margin: 0, padding: 16, fontSize: 13, color: "var(--u-status-critical-text)" }}>Search failed — please try again.</p>}
              {results && results.length === 0 && !failed && <p style={{ margin: 0, padding: 16, fontSize: 13, color: "var(--u-ink-secondary)" }}>No matches for “{q.trim()}”.</p>}
              {ordered.map((r, i) => {
                const heading = r.type !== lastType ? TYPE_LABEL[r.type] ?? r.type : null;
                lastType = r.type;
                const { external, href } = hrefFor(r);
                const row = (
                  <span style={{ display: "block", padding: "9px 14px", background: i === active ? "var(--u-surface-alt, rgba(0,0,0,0.05))" : "transparent" }} onMouseEnter={() => setActive(i)}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--u-ink)", overflowWrap: "anywhere" }}>{r.title}</span>
                    {r.subtitle && <span style={{ display: "block", fontSize: 12, color: "var(--u-ink-secondary)", marginTop: 1, overflowWrap: "anywhere" }}>{r.subtitle}{external ? " · opens Product Database" : ""}</span>}
                  </span>
                );
                return (
                  <div key={`${r.type}-${r.id}`}>
                    {heading && <div style={{ padding: "10px 14px 4px", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--u-ink-secondary)" }}>{heading}</div>}
                    {external ? (
                      <a href={href} data-search-result={i} style={{ textDecoration: "none", display: "block" }}>{row}</a>
                    ) : (
                      <Link href={href} data-search-result={i} onClick={() => setOpen(false)} style={{ textDecoration: "none", display: "block" }}>{row}</Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
