"use client";
import { useEffect, useState } from "react";
import { CRM_OPEN_STAGES, CRM_OPPORTUNITY_STAGE_LABELS, CRM_OPPORTUNITY_STAGES, type CrmPeopleOption, type CrmPipelineSummary } from "@universe/types";
import { StatTile, StatTileGrid, TrendingUpIcon } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";
import { useCurrentUser } from "../../lib/AuthContext";
import { ErrorNote, Heading, Page } from "../../lib/ui";
import { Opportunities } from "../../components/Opportunities";

/** Pipeline: opportunities by stage. Tiles filter the list; values are shown per currency and never added across currencies. */
export default function Pipeline() {
  const me = useCurrentUser();
  const [s, setS] = useState<CrmPipelineSummary | null>(null);
  const [stage, setStage] = useState("open");
  const [err, setErr] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => { apiClient.crmPipeline().then(setS).catch((e) => setErr(e instanceof Error ? e.message : "Could not load the pipeline.")); }, [version]);
  const canManage = !!me && (me.platformStaffRole !== "NONE" || me.permissions.includes("crm.manage"));
  const people: CrmPeopleOption[] = [];
  const totals = (st: (typeof CRM_OPPORTUNITY_STAGES)[number]) => { const v = s?.byStage[st].value ?? {}; return Object.keys(v).map((c) => new Intl.NumberFormat("en-GB", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(v[c])).join(" · "); };
  return (
    <Page>
      <Heading title="Pipeline" sub="Things that could become work with your stakeholders. Values are cost-side estimates, shown per currency and never added across currencies." />
      <ErrorNote message={err} />
      <StatTileGrid>
        {CRM_OPPORTUNITY_STAGES.map((st) => <StatTile key={st} label={CRM_OPPORTUNITY_STAGE_LABELS[st]} value={s?.byStage[st].count} icon={<TrendingUpIcon size={18} />} tone={st === "WON" ? "good" : st === "LOST" ? "critical" : CRM_OPEN_STAGES.includes(st) ? "brand" : "neutral"} active={stage === st} onClick={() => setStage(st)} />)}
      </StatTileGrid>
      {s && (
        <div style={{ fontSize: 13.5, display: "grid", gap: 4 }}>
          <p style={{ margin: 0 }}>{s.openCount} open, {s.closingSoon} expected within 30 days. {stage !== "open" && <button type="button" onClick={() => setStage("open")} style={{ all: "unset", cursor: "pointer", textDecoration: "underline", color: "var(--u-link, inherit)" }}>Show all open</button>}</p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", color: "var(--u-ink-secondary)" }}>
            {CRM_OPPORTUNITY_STAGES.filter((st) => totals(st)).map((st) => <li key={st}>{CRM_OPPORTUNITY_STAGE_LABELS[st]}: {totals(st)}</li>)}
          </ul>
        </div>
      )}
      <Opportunities canManage={canManage} people={people} stage={stage} onChanged={() => setVersion((v) => v + 1)} />
    </Page>
  );
}
