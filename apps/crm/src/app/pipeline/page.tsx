"use client";
import { useEffect, useState } from "react";
import { CRM_OPPORTUNITY_STAGE_LABELS, type CrmPeopleOption, type CrmPipelineSummary } from "@universe/types";
import { apiClient } from "../../lib/apiClient";
import { useCurrentUser } from "../../lib/AuthContext";
import { ErrorNote, Heading, Page } from "../../lib/ui";
import { PipelineVisual } from "../../components/PipelineVisual";
import { Opportunities } from "../../components/Opportunities";

/** Pipeline: opportunities by stage. Choose a stage in the chart to filter the list. Values are converted into the currency you pick, at the platform rate. */
export default function Pipeline() {
  const me = useCurrentUser();
  const [s, setS] = useState<CrmPipelineSummary | null>(null);
  const [stage, setStage] = useState("open");
  const [err, setErr] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => { apiClient.crmPipeline().then(setS).catch((e) => setErr(e instanceof Error ? e.message : "Could not load the pipeline.")); }, [version]);
  const canManage = !!me && (me.platformStaffRole !== "NONE" || me.permissions.includes("crm.manage"));
  const people: CrmPeopleOption[] = [];
  return (
    <Page>
      <Heading title="Pipeline" sub="Things that could become work with your stakeholders. Values are cost-side estimates, converted into the currency you choose." />
      <ErrorNote message={err} />
      <PipelineVisual stage={stage} onStage={setStage} version={version} />
      {s && stage !== "open" && <p style={{ margin: 0, fontSize: 13.5 }}>Showing {CRM_OPPORTUNITY_STAGE_LABELS[stage as keyof typeof CRM_OPPORTUNITY_STAGE_LABELS] ?? stage} only. <button type="button" onClick={() => setStage("open")} style={{ all: "unset", cursor: "pointer", textDecoration: "underline", color: "var(--u-link)" }}>Show all open</button></p>}
      <Opportunities canManage={canManage} people={people} stage={stage} onChanged={() => setVersion((v) => v + 1)} />
    </Page>
  );
}
