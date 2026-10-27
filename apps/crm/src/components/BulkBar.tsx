"use client";
import { useState } from "react";
import { CRM_TIER_LABELS, CRM_TIERS, type CrmPeopleOption, type CrmTag } from "@universe/types";
import { Button, Select } from "@universe/ui";
import { apiClient } from "../lib/apiClient";

/** Select rows on the page, then set owner, tier or add a tag for all of them at once. */
export function BulkBar({ pageIds, picked, setPicked, people, tags, onDone, onError }: { pageIds: string[]; picked: Set<string>; setPicked: (s: Set<string>) => void; people: CrmPeopleOption[]; tags: CrmTag[]; onDone: (m: string) => void; onError: (m: string | null) => void }) {
  const [owner, setOwner] = useState("");
  const [tier, setTier] = useState("");
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);
  const allOn = pageIds.every((id) => picked.has(id));
  const apply = async () => {
    setBusy(true); onError(null);
    try {
      const r = await apiClient.crmBulk({ ids: [...picked], ...(owner ? { ownerUserId: owner === "none" ? null : owner } : {}), ...(tier ? { tier } : {}), ...(tag ? { tagId: tag } : {}) });
      onDone(`${r.changed} relationship${r.changed === 1 ? "" : "s"} changed${r.skipped ? `, ${r.skipped} already as asked` : ""}.`);
      setOwner(""); setTier(""); setTag("");
    } catch (e) { onError(e instanceof Error ? e.message : "Could not make the change."); } finally { setBusy(false); }
  };
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }} role="group" aria-label="Change many relationships at once">
      <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13.5 }}>
        <input type="checkbox" checked={allOn} onChange={() => setPicked(allOn ? new Set() : new Set(pageIds))} /> Select all on this page
      </label>
      {picked.size > 0 && (<>
        <span aria-live="polite" style={{ fontSize: 13.5 }}><strong>{picked.size}</strong> selected</span>
        <div style={{ minWidth: 160 }}><Select value={owner} onChange={setOwner} allLabel="Owner: no change" options={[{ value: "none", label: "Remove owner" }, ...people.map((p) => ({ value: p.id, label: p.name }))]} ariaLabel="Set owner for selected" /></div>
        <div style={{ minWidth: 150 }}><Select value={tier} onChange={setTier} allLabel="Tier: no change" options={CRM_TIERS.map((t) => ({ value: t, label: CRM_TIER_LABELS[t] }))} ariaLabel="Set tier for selected" /></div>
        {tags.length > 0 && <div style={{ minWidth: 150 }}><Select value={tag} onChange={setTag} allLabel="Add tag…" options={tags.map((t) => ({ value: t.id, label: t.name }))} ariaLabel="Add a tag to selected" /></div>}
        <Button size="sm" disabled={busy || (!owner && !tier && !tag)} onClick={apply}>{busy ? "Applying…" : "Apply"}</Button>
        <Button size="sm" variant="secondary" onClick={() => setPicked(new Set())}>Clear</Button>
      </>)}
    </div>
  );
}
