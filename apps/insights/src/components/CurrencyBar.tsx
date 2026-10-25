"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CURRENCY_NAMES, SUPPORTED_CURRENCIES } from "@universe/types";
import { FxChart } from "./FxChart";
import { monthAverage, rateOn, rateText, setFxLens, todayIso, type FxView } from "../lib/fx";
import { inputStyle } from "../lib/ui";

const monthName = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const dateName = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/**
 * "Show costs in" (2026-10-25): switches a lens to another currency. Costs stay in the currency they were agreed in until a currency is chosen.
 * It then shows the exchange rate behind every conversion: the rate when the costs were logged (the monthly average) and the rate on the date the
 * figures are converted at, with the daily rate chart so the movement between the two can be seen.
 */
export function CurrencyBar({ fx, months, target, mode, asOf, monthly = true }: { fx: FxView; months: string[]; target: string; mode: "logged" | "date"; asOf: string; /** False for lenses whose figures average across months, so only the conversion date applies. */ monthly?: boolean }) {
  const options = useMemo(() => SUPPORTED_CURRENCIES.filter((c) => c !== fx.source), [fx.source]);
  const logged = [...months].sort();
  const pts = fx.series?.points ?? [];
  const dateRate = fx.on ? rateOn(pts, asOf || todayIso()) : null;
  const rows: { label: string; rate: number | null }[] = [];
  if (fx.on) {
    if (logged.length) { rows.push({ label: `When logged, ${monthName(logged[0]!)} (monthly average)`, rate: monthAverage(pts, logged[0]!) }); if (logged.length > 1) rows.push({ label: `When logged, ${monthName(logged[logged.length - 1]!)} (monthly average)`, rate: monthAverage(pts, logged[logged.length - 1]!) }); }
    rows.push({ label: `On ${dateName(asOf || todayIso())}`, rate: dateRate });
  }
  return (
    <section aria-label="Currency" style={{ border: "1px solid var(--u-border)", borderRadius: "var(--u-radius-lg)", backgroundColor: "var(--u-surface-raised)", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, fontWeight: 600 }}>
          Show costs in
          <select className="u-native-select" value={target || ""} onChange={(e) => setFxLens({ target: e.target.value })} style={{ ...inputStyle, width: "auto", minWidth: 200 }}>
            <option value="">{fx.source ? `${fx.source}, as agreed` : "As agreed"}</option>
            {options.map((c) => <option key={c} value={c}>{c} · {CURRENCY_NAMES[c]}</option>)}
          </select>
        </label>
        {target && target !== fx.source && (
          <>
            {monthly && <fieldset style={{ border: 0, margin: 0, padding: 0, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", fontSize: 13 }}>
              <legend style={{ fontSize: 12.5, fontWeight: 600, padding: 0, marginBottom: 4 }}>Convert at</legend>
              <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><input type="radio" name="fx-mode" checked={mode === "logged"} onChange={() => setFxLens({ mode: "logged" })} />The rate when logged</label>
              <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><input type="radio" name="fx-mode" checked={mode === "date"} onChange={() => setFxLens({ mode: "date", asOf: asOf || todayIso() })} />The rate on a date</label>
            </fieldset>}
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, fontWeight: 600 }}>
              Conversion date
              <input type="date" value={asOf || todayIso()} max={todayIso()} onChange={(e) => setFxLens({ asOf: e.target.value || "" })} style={{ ...inputStyle, width: "auto" }} />
            </label>
          </>
        )}
      </div>
      {!target || target === fx.source ? (
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Costs are shown in the currency they were agreed in and are never added across currencies. Choose a currency to see them converted, with the exchange rate behind each figure.</p>
      ) : fx.loading ? <p role="status" style={{ margin: 0, fontSize: 13 }}>Loading exchange rates…</p>
      : fx.failed ? <p role="status" style={{ margin: 0, fontSize: 13, color: "var(--u-status-critical-text)" }}>Exchange rates are not available just now, so costs are shown as agreed in {fx.source}.</p>
      : (
        <>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
            Costs were agreed in <strong>{fx.source}</strong> and are shown in <strong>{fx.ccy}</strong>. {monthly && mode === "logged" ? "Where a figure belongs to a month, it is converted at that month's average rate; figures that average across months use the rate on the conversion date." : (monthly ? "Every figure is converted at the rate on the conversion date." : "These figures average across months, so they are converted at the rate on the conversion date. The rates when the costs were logged are shown for comparison.")} Original amounts stay in the tables as {fx.source}.
          </p>
          <table style={{ borderCollapse: "collapse", fontSize: 13, maxWidth: 560 }}>
            <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Exchange rate of {fx.source} in {fx.ccy}, when logged and on the conversion date</caption>
            <thead><tr><th scope="col" style={{ textAlign: "left", padding: "4px 10px 4px 0", fontWeight: 600 }}>Rate</th><th scope="col" style={{ textAlign: "right", padding: "4px 0 4px 10px", fontWeight: 600 }}>1 {fx.source} in {fx.ccy}</th><th scope="col" style={{ textAlign: "right", padding: "4px 0 4px 10px", fontWeight: 600 }}>Against conversion date</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.label} style={{ borderTop: "1px solid var(--u-border)" }}><th scope="row" style={{ textAlign: "left", padding: "5px 10px 5px 0", fontWeight: 500 }}>{r.label}</th><td style={{ textAlign: "right", padding: "5px 0 5px 10px" }}>{rateText(r.rate)}</td><td style={{ textAlign: "right", padding: "5px 0 5px 10px" }}>{r.rate !== null && dateRate !== null && r.label.startsWith("When") ? `${((dateRate / r.rate - 1) * 100 >= 0 ? "+" : "−")}${Math.abs((dateRate / r.rate - 1) * 100).toFixed(1)}%` : "–"}</td></tr>)}</tbody>
          </table>
          <details>
            <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Exchange rate over time</summary>
            <div style={{ marginTop: 8 }}>
              <FxChart points={pts} from={fx.source} to={fx.ccy} loggedMonths={logged} asOf={asOf || todayIso()} />
              <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--u-ink-secondary)" }}>Source: {fx.series?.source}. <Link href="/currency">See every currency pair</Link> · <Link href="/methodology#reading">How conversion works</Link></p>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
