"use client";
import { useEffect, useState } from "react";
import type { DataGap } from "@universe/types";
import { DataHints } from "@universe/ui";
import { apiClient } from "../lib/apiClient";

/** The CRM's "make this richer" note for a screen (overview, pipeline or portfolio). Refetches when `version` changes, so it clears as gaps are filled. */
export function DataGapsNote({ scope, version = 0 }: { scope: "overview" | "pipeline" | "portfolio"; version?: number }) {
  const [g, setG] = useState<DataGap[] | null>(null);
  useEffect(() => { apiClient.crmDataGaps(scope).then(setG).catch(() => setG(null)); }, [scope, version]);
  return <DataHints gaps={g} source="counts of your organisation's own CRM records as they stand now. Nothing from other organisations and no money. Each link goes to the list or field that fixes it." />;
}
