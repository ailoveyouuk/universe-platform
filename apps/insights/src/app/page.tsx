"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { InsightsOverview } from "@universe/types";
import { GaugeIcon, GlobeIcon, InfoIcon, StatTile, StatTileGrid, TrendingUpIcon } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { DEFAULT_HIGHLIGHTS, HIGHLIGHTS, type HighlightDef, type HighlightResult } from "../lib/highlights";
import { useCountries } from "../lib/useCountries";
import { removeInsightsItem, saveInsightsItem, useInsightsItems } from "../lib/views";
import { Card, ErrorNote, Heading, Page, fmtDate, inputStyle, pill } from "../lib/ui";

const h2: React.CSSProperties = { margin: 0, fontFamily: "var(--u-font-display)", fontSize: 16 };
const sub: React.CSSProperties = { margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" };
const WELCOME_KEY = "universe.insights.welcomeHidden";

const THEMES: { title: string; story: string; areas: { href: string; label: string; text: string }[] }[] = [
  { title: "Where goods come from and go", story: "Every shipment starts in one country and ends in another. These areas show the map of that trade.", areas: [
    { href: "/geographies", label: "Geographies", text: "A map you can switch between where goods are made, where they are delivered and the busiest flows, with region-to-region trade and the most efficient delivery countries." },
    { href: "/sourcing", label: "Sourcing", text: "Which countries manufacture each product group, as a map and a table." },
  ] },
  { title: "How goods move", story: "Getting goods from maker to patient costs time, money and carbon. These areas compare the ways to do it.", areas: [
    { href: "/modes", label: "Shipping modes", text: "Air, sea and land side by side: how much moves each way, how long it takes and what it costs in CO2." },
    { href: "/distances", label: "Distances", text: "How far goods travel and what changes with distance, including what freight costs per tonne and per tonne-kilometre, lane by lane." },
    { href: "/logistics", label: "Logistics and CO2", text: "The busiest and most CO2-efficient routes, filterable by country, mode and delivery terms." },
  ] },
  { title: "What things cost", story: "All prices here are cost prices: what the supplier or provider charged before any margin. A figure only appears when at least five organisations are behind it.", areas: [
    { href: "/commodities", label: "Commodities", text: "How the cost of each product group is moving, like for like, so a change in what was bought is not mistaken for a change in price." },
    { href: "/services", label: "Services", text: "Consultancy, technical assistance, advisory, testing, equipment servicing and more, each priced in its own unit (a day, a month, a fee)." },
    { href: "/prices", label: "Prices", text: "Cost by product group over time, split by where it is made, where it is delivered and the delivery terms." },
  ] },
];

export default function InsightsHome() {
  const router = useRouter();
  const countries = useCountries();
  const { items } = useInsightsItems();
  const [o, setO] = useState<InsightsOverview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [hidden, setHidden] = useState(false);
  const [customise, setCustomise] = useState(false);
  const [data, setData] = useState<Record<string, HighlightResult | null | "error">>({});
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => { apiClient.insightsOverview().then(setO).catch((e) => setErr(e instanceof Error ? e.message : "Could not load Insights.")); }, []);
  useEffect(() => { try { setHidden(window.localStorage.getItem(WELCOME_KEY) === "1"); } catch { /* storage unavailable: the welcome simply stays open */ } }, []);
  const setWelcome = (hide: boolean) => { setHidden(hide); try { window.localStorage.setItem(WELCOME_KEY, hide ? "1" : "0"); } catch { /* ignore */ } };

  const pins = (items ?? []).filter((i) => i.kind === "PIN");
  const shownIds = pins.length ? pins.map((p) => p.target) : DEFAULT_HIGHLIGHTS;
  const shown = shownIds.map((id) => HIGHLIGHTS.find((h) => h.id === id)).filter((h): h is HighlightDef => !!h);
  useEffect(() => {
    if (items === null) return;
    for (const h of shown) {
      if (h.id in data) continue;
      setData((d) => ({ ...d, [h.id]: null }));
      h.load({ countries }).then((r) => setData((d) => ({ ...d, [h.id]: r }))).catch(() => setData((d) => ({ ...d, [h.id]: "error" })));
    }
  }, [items, shownIds.join(","), countries.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (h: HighlightDef, on: boolean) => {
    try {
      // The first change turns the default set into the person's own pins, so nothing else moves.
      if (!pins.length) for (const id of DEFAULT_HIGHLIGHTS) if (!(id === h.id && !on)) { const d = HIGHLIGHTS.find((x) => x.id === id)!; await saveInsightsItem({ kind: "PIN", name: d.title, target: d.id }); }
      if (on && pins.length) await saveInsightsItem({ kind: "PIN", name: h.title, target: h.id });
      if (!on && pins.length) { const p = pins.find((x) => x.target === h.id); if (p) await removeInsightsItem(p.id); }
      setNote(on ? `Pinned “${h.title}”.` : `Removed “${h.title}”.`);
    } catch (e) { setNote(e instanceof Error ? e.message : "Could not change your highlights."); }
  };
  const resetHighlights = async () => { for (const p of pins) await removeInsightsItem(p.id); setNote("Back to the standard highlights."); };
  const views = (items ?? []).filter((i) => i.kind === "VIEW");

  return (
    <Page>
      <Heading title="Insights" sub="What the market is doing, built from the activity of organisations on Universe. Everything is anonymised: no organisation, person or supplier is ever shown." actions={hidden ? <button type="button" className="u-touch" style={pill(false)} onClick={() => setWelcome(false)}>Show the welcome</button> : undefined} />
      <ErrorNote message={err} />

      {!hidden && (
        <section aria-labelledby="welcome" style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", background: "var(--u-surface-raised)", padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <h2 id="welcome" style={{ ...h2, fontSize: 20 }}>Welcome to Insights</h2>
            <button type="button" className="u-touch" style={pill(false)} onClick={() => setWelcome(true)}>Hide the welcome</button>
          </div>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, maxWidth: 820 }}>
            Every organisation on Universe buys, ships and manages health supplies and services. Insights pools what they all do, strips out who did it, and shows the pattern: what goods and services really cost, where they are made, how far and how fast they travel, and what that does to the planet.
          </p>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, maxWidth: 820 }}>
            Use it to check a quote against the market, to choose between air and sea, to see whether a product group is getting dearer, or to understand a corridor before you plan a shipment. Nothing here is a single organisation&apos;s data: a figure only appears when at least five organisations are behind it, and prices are always the cost before any margin.
          </p>
          <form role="search" onSubmit={(e) => { e.preventDefault(); router.push(`/search?q=${encodeURIComponent(q.trim())}`); }} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, fontWeight: 600, flex: "1 1 280px", maxWidth: 560 }}>
              Search Insights
              <input type="search" aria-label="Search Insights" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try: technical assistance, sea freight, Kenya, vaccines" style={{ ...inputStyle, padding: "11px 12px", fontSize: 14 }} />
            </label>
            <button type="submit" className="u-touch" style={pill(true)}>Search</button>
          </form>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: 18 }}>
            {THEMES.map((t) => (
              <div key={t.title}>
                <h3 style={{ margin: "0 0 4px", fontFamily: "var(--u-font-display)", fontSize: 14.5 }}>{t.title}</h3>
                <p style={{ ...sub, marginBottom: 8, lineHeight: 1.5 }}>{t.story}</p>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {t.areas.map((a) => <li key={a.href} style={{ fontSize: 13.5, lineHeight: 1.45 }}><Link href={a.href} style={{ fontWeight: 600 }}>{a.label}</Link><span style={{ color: "var(--u-ink-secondary)" }}> {a.text}</span></li>)}
                </ul>
              </div>
            ))}
          </div>
          <p style={{ ...sub, lineHeight: 1.5 }}>Make it yours: on any page, set the filters you like and choose <strong>Save this view</strong>; pin the highlights below that matter most to you. Both are kept for you and follow you to any device. Tables can be searched, sorted, filtered and downloaded, and every point on a chart can be hovered, tapped or reached with the keyboard to read its exact value. <Link href="/methodology">How we protect privacy</Link></p>
        </section>
      )}

      <section aria-labelledby="mine" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 id="mine" style={h2}>Your highlights</h2>
          <button type="button" className="u-touch" style={pill(customise)} aria-pressed={customise} onClick={() => setCustomise(!customise)}>{customise ? "Done" : "Customise"}</button>
        </div>
        {customise && (
          <Card>
            <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
              <legend style={{ ...sub, marginBottom: 8 }}>Choose the snippets to show (up to 12).</legend>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 8 }}>
                {HIGHLIGHTS.map((h) => <label key={h.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}><input type="checkbox" checked={shownIds.includes(h.id)} onChange={(e) => void toggle(h, e.target.checked)} />{h.title}<span style={{ color: "var(--u-ink-secondary)" }}>({h.area})</span></label>)}
              </div>
              {pins.length > 0 && <button type="button" className="u-touch" style={{ ...pill(false), marginTop: 10 }} onClick={() => void resetHighlights()}>Back to the standard highlights</button>}
            </fieldset>
          </Card>
        )}
        {note && <p role="status" style={sub}>{note}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(250px, 100%), 1fr))", gap: 12 }}>
          {shown.map((h) => {
            const r = data[h.id];
            return (
              <Link key={h.id} href={h.href} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", background: "var(--u-surface-raised)", padding: "14px 16px", height: "100%", boxSizing: "border-box" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--u-ink-secondary)" }}>{h.area}: {h.title}</div>
                  <div style={{ fontFamily: "var(--u-font-display)", fontSize: 18, margin: "6px 0 4px", color: "var(--u-ink)" }}>{r === undefined || r === null ? "Loading…" : r === "error" ? "Not available" : r.headline}</div>
                  <div style={{ fontSize: 12.5, color: "var(--u-ink-secondary)" }}>{r && r !== "error" ? r.detail : r === "error" ? "Could not load this just now." : ""}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="views" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 id="views" style={h2}>Your saved views</h2>
        {items === null ? <p style={sub}>Loading…</p> : views.length === 0 ? <p style={sub}>Nothing saved yet. On any page, set the filters and selections you like, then choose Save this view. It will appear here.</p> : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 10 }}>
            {views.map((v) => (
              <li key={v.id} style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-md)", padding: "10px 12px", background: "var(--u-surface-raised)", display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <Link href={`${v.target}?view=${v.id}`} style={{ fontWeight: 600, minWidth: 0 }}>{v.name}</Link>
                <button type="button" className="u-touch" style={{ ...pill(false), padding: "3px 10px", fontSize: 12 }} aria-label={`Remove saved view ${v.name}`} onClick={() => void removeInsightsItem(v.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="glance" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 id="glance" style={h2}>At a glance</h2>
        <StatTileGrid>
          <Link href="/prices" style={{ textDecoration: "none" }}><StatTile label="Product groups with price data" value={o ? o.pricedCategories : "…"} icon={<TrendingUpIcon size={18} />} tone="brand" /></Link>
          <Link href="/sourcing" style={{ textDecoration: "none" }}><StatTile label="Product groups with sourcing data" value={o ? o.sourcedCategories : "…"} icon={<GlobeIcon size={18} />} tone="brand" /></Link>
          <Link href="/logistics" style={{ textDecoration: "none" }}><StatTile label="Routes with logistics data" value={o ? o.logisticsRoutes : "…"} icon={<GaugeIcon size={18} />} tone="brand" /></Link>
          <Link href="/methodology" style={{ textDecoration: "none" }}><StatTile label="Organisations needed behind any figure" value={o ? o.minimumContributors : "…"} icon={<InfoIcon size={18} />} tone="neutral" /></Link>
        </StatTileGrid>
      </section>
      {o && <p style={{ margin: 0, fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Data last refreshed: prices {fmtDate(o.freshness.prices)}, sourcing {fmtDate(o.freshness.sourcing)}, logistics {fmtDate(o.freshness.logistics)}.</p>}
    </Page>
  );
}
