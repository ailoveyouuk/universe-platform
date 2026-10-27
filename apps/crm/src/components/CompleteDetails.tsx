"use client";
import { useEffect, useState } from "react";
import { COMMODITY_GROUPS, commodityGroupLabel, type CrmOpportunity, type CrmPeopleOption } from "@universe/types";
import { Button } from "@universe/ui";
import { apiClient } from "../lib/apiClient";
import { Field, inputStyle } from "../lib/ui";

/**
 * "Make this richer" for one opportunity: shows only the details still missing and what each one improves, and saves them in place. Hidden once nothing is missing.
 */
export function CompleteDetails({ o, canManage, onChanged, onError }: { o: CrmOpportunity; canManage: boolean; onChanged: () => void; onError: (m: string | null) => void }) {
  const open = !["WON", "LOST", "WITHDRAWN"].includes(o.stage);
  const missing = { value: o.expectedValue === null, date: !o.expectedDate, group: !o.commodityGroup, owner: !o.ownerUserId };
  const count = Object.values(missing).filter(Boolean).length;
  const [show, setShow] = useState(false);
  const [people, setPeople] = useState<CrmPeopleOption[]>([]);
  const [f, setF] = useState({ value: "", currency: o.currency ?? "GBP", date: "", group: "", owner: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (show && missing.owner && !people.length) apiClient.crmPeople().then(setPeople).catch(() => undefined); }, [show, missing.owner, people.length]);
  if (!open || count === 0 || !canManage) return null;
  const save = async () => {
    setBusy(true); onError(null);
    try {
      const body: Parameters<typeof apiClient.updateCrmOpportunity>[1] = {};
      if (missing.value && f.value.trim() !== "") { body.expectedValue = Number(f.value); body.currency = f.currency.toUpperCase(); }
      if (missing.date && f.date) body.expectedDate = f.date;
      if (missing.group && f.group) body.commodityGroup = f.group as never;
      if (missing.owner && f.owner) body.ownerUserId = f.owner;
      if (Object.keys(body).length === 0) { setShow(false); return; }
      await apiClient.updateCrmOpportunity(o.id, body); setShow(false); onChanged();
    } catch (e) { onError(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); }
  };
  return (
    <div style={{ fontSize: 12.5 }}>
      {!show ? (
        <button type="button" onClick={() => setShow(true)} style={{ background: "none", border: 0, padding: 0, font: "inherit", color: "var(--u-link)", textDecoration: "underline", cursor: "pointer" }}>
          Add the missing {count === 1 ? "detail" : `${count} details`}: {[missing.value && "expected value", missing.date && "expected date", missing.group && "commodity group", missing.owner && "owner"].filter(Boolean).join(", ")}
        </button>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void save(); }} aria-label="Add the missing details" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", border: "1px dashed var(--u-border)", borderRadius: "var(--u-radius-md)", padding: 10 }}>
          {missing.value && <>
            <div style={{ flex: "1 1 140px" }}><Field label="Expected cost value" hint="Adds it to the pipeline value and likely-to-land total."><input data-field="value" autoFocus inputMode="decimal" type="number" min={0} step="any" style={inputStyle} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field></div>
            <div style={{ flex: "0 1 90px" }}><Field label="Currency"><input style={inputStyle} maxLength={3} pattern="[A-Za-z]{3}" value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} /></Field></div>
          </>}
          {missing.date && <div style={{ flex: "1 1 150px" }}><Field label="Expected date" hint="Places it in the forecast by month."><input data-field="date" type="date" style={inputStyle} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field></div>}
          {missing.group && <div style={{ flex: "1 1 200px" }}><Field label="Commodity or service group" hint="Lets the chance of winning learn from like-for-like work."><select data-field="group" className="u-native-select" style={inputStyle} value={f.group} onChange={(e) => setF({ ...f, group: e.target.value })}><option value="">Not set</option>{COMMODITY_GROUPS.map((g) => <option key={g} value={g}>{commodityGroupLabel(g)}</option>)}</select></Field></div>}
          {missing.owner && <div style={{ flex: "1 1 180px" }}><Field label="Owner" hint="Gets the stale and overdue reminders."><select data-field="owner" className="u-native-select" style={inputStyle} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}><option value="">No owner yet</option>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field></div>}
          <Button size="sm" variant="primary" type="submit" disabled={busy}>Save</Button>
          <Button size="sm" variant="secondary" type="button" onClick={() => setShow(false)}>Cancel</Button>
        </form>
      )}
    </div>
  );
}
