"use client";

import { useState, type ReactNode } from "react";

/**
 * The landing banner every app's Overview page opens with (the style first built for Insights): a coloured band with the welcome line, one headline,
 * a sentence of context, and optionally a search box with quick searches. `color` is the app's own module colour so each app is recognisable; the text on
 * it uses the on-accent colour, and the band keeps a plain background colour under the gradient so contrast never depends on the gradient.
 */
export function OverviewHero({ forename, title, intro, color = "var(--u-brand-violet)", search, children }: {
  forename?: string | null;
  title: string;
  intro?: string;
  color?: string;
  search?: { label: string; placeholder: string; quick?: string[]; onSearch: (term: string) => void };
  children?: ReactNode;
}) {
  const [q, setQ] = useState("");
  return (
    <section aria-labelledby="overview-hero" style={{ backgroundColor: color, backgroundImage: `linear-gradient(120deg, ${color} 0%, var(--u-accent-magenta) 140%)`, color: "var(--u-on-accent)", borderRadius: "var(--u-radius-lg)", padding: "clamp(20px, 4vw, 34px)", display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        {forename && <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600 }}>Welcome back, {forename}.</p>}
        <h1 id="overview-hero" style={{ margin: 0, fontFamily: "var(--u-font-display)", fontSize: "clamp(26px, 4vw, 36px)", lineHeight: 1.15, color: "inherit" }}>{title}</h1>
        {intro && <p style={{ margin: "8px 0 0", fontSize: 15, maxWidth: 640 }}>{intro}</p>}
      </div>
      {search && (
        <>
          <form role="search" onSubmit={(e) => { e.preventDefault(); search.onSearch(q); }} style={{ display: "flex", gap: 8, flexWrap: "wrap", maxWidth: 640 }}>
            <input type="search" aria-label={search.label} value={q} onChange={(e) => setQ(e.target.value)} placeholder={search.placeholder} style={{ flex: "1 1 260px", minWidth: 0, padding: "12px 14px", fontSize: 14.5, borderRadius: "var(--u-radius-md)", border: "1px solid transparent", backgroundColor: "var(--u-surface)", color: "var(--u-ink)", font: "inherit" }} />
            <button type="submit" className="u-touch" style={{ padding: "10px 20px", borderRadius: "var(--u-radius-md)", border: "2px solid var(--u-on-accent)", backgroundColor: "transparent", color: "var(--u-on-accent)", font: "inherit", fontWeight: 700, cursor: "pointer" }}>Search</button>
          </form>
          {search.quick && search.quick.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} aria-label="Quick searches" role="group">
              {search.quick.map((t) => (
                <button key={t} type="button" className="u-touch" onClick={() => search.onSearch(t)} style={{ padding: "5px 14px", borderRadius: 999, border: "1px solid var(--u-on-accent)", backgroundColor: "transparent", color: "var(--u-on-accent)", font: "inherit", fontSize: 13, cursor: "pointer" }}>{t}</button>
              ))}
            </div>
          )}
        </>
      )}
      {children}
    </section>
  );
}

/** A card of related links under a coloured heading, used under "Explore" on Overview pages. */
export function OverviewGroup({ title, color, links, LinkComponent }: { title: string; color: string; links: { href: string; label: string; text: string }[]; LinkComponent: any }) {
  const Link = LinkComponent;
  return (
    <div style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", overflow: "hidden", backgroundColor: "var(--u-surface-raised)", display: "flex", flexDirection: "column" }}>
      <h3 style={{ margin: 0, padding: "10px 16px", backgroundColor: color, color: "var(--u-on-accent)", fontFamily: "var(--u-font-display)", fontSize: 15 }}>{title}</h3>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {links.map((a) => (
          <li key={a.href} style={{ borderTop: "1px solid var(--u-border)" }}>
            <Link href={a.href} style={{ display: "block", padding: "11px 16px", textDecoration: "none", color: "var(--u-ink)" }}>
              <span style={{ fontWeight: 700, fontSize: 14.5 }}>{a.label} <span aria-hidden>→</span></span>
              <span style={{ display: "block", fontSize: 13, color: "var(--u-ink-secondary)" }}>{a.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OverviewGroups({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 14 }}>{children}</div>;
}
