"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CrmDriverFactor, CrmWinLossDrivers } from "@universe/types";
import { apiClient } from "../lib/apiClient";

const muted: React.CSSProperties = { margin: 0, fontSize: 13, color: "var(--u-ink-secondary)" };
const track: React.CSSProperties = { display: "block", height: 10, borderRadius: 5, backgroundColor: "var(--u-border)", overflow: "hidden" };
const rate = (x: { won: number; lost: number }) => (x.won + x.lost ? Math.round((x.won / (x.won + x.lost)) * 100) : null);

function Factor({ f }: { f: CrmDriverFactor }) {
  const a = rate(f.with), b = rate(f.without);
  const rows: { label: string; r: number | null; n: number; tone: string }[] = [
    { label: "With", r: a, n: f.with.won + f.with.lost, tone: "var(--u-module-product-database)" },
    { label: "Without", r: b, n: f.without.won + f.without.lost, tone: "var(--u-ink-secondary)" },
  ];
  return (
    <li style={{ display: "grid", gap: 4, paddingBottom: 8, borderBottom: "1px solid var(--u-border)" }}>
      <span style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{f.href ? <Link href={f.href}>{f.label}</Link> : f.label}</span>
        <span style={{ fontSize: 13, color: "var(--u-ink-secondary)" }}>{f.lift === null ? "Too few to compare" : f.lift === 0 ? "No difference" : `${f.lift > 0 ? "▲ +" : "▼ "}${f.lift} points`}</span>
      </span>
      <span style={{ fontSize: 12.5, color: "var(--u-ink-secondary)" }}>{f.detail}{f.basis === "TODAY" ? " Judged on the record as it stands today." : ""}</span>
      {rows.map((x) => (
        <span key={x.label} style={{ display: "grid", gridTemplateColumns: "64px 1fr 92px", gap: 8, alignItems: "center", fontSize: 12.5 }}>
          <span>{x.label}</span>
          <span aria-hidden="true" style={track}><span style={{ display: "block", height: "100%", width: `${x.r ?? 0}%`, backgroundColor: x.tone }} /></span>
          <span style={{ color: "var(--u-ink-secondary)" }}>{x.r === null ? "none yet" : `${x.r}% won of ${x.n}`}</span>
        </span>
      ))}
    </li>
  );
}

/**
 * What the platform knows about the opportunities that were won or lost (2026-10-27): the organisation's own contact history, tenders, approvals, certificates, complaints
 * and delivery record set against the outcome. It sits above the reasons people typed, which are kept as one more piece of evidence.
 */
export function WinLossDrivers({ version }: { version: number }) {
  const [d, setD] = useState<CrmWinLossDrivers | null>(null);
  useEffect(() => { apiClient.crmWinLossDrivers().then(setD).catch(() => setD(null)); }, [version]);
  if (!d || d.factors.length === 0) return null;
  return (
    <>
      <p style={muted}>What the platform knows about the {d.won} won and {d.lost} lost: win rate with and without each factor, strongest differences first.</p>
      {d.factors.some((f) => f.lift !== null) && <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>{d.factors.filter((f) => f.lift !== null).map((f) => <Factor key={f.key} f={f} />)}</ul>}
      {d.factors.some((f) => f.lift === null) && <p style={{ ...muted, fontSize: 12.5 }}>Not enough variety in your records yet to compare: {d.factors.filter((f) => f.lift === null).map((f) => f.label.toLowerCase()).join("; ")}. These fill in as more opportunities close and more is recorded.</p>}
    </>
  );
}
