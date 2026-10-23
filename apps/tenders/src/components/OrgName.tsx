"use client";

import { SCOPE_TAXONOMY } from "@universe/types";
import { OrganizationCardLink } from "@universe/ui";
import { apiClient } from "../lib/apiClient";

const SCOPE_LABELS: Record<string, string> = Object.fromEntries(SCOPE_TAXONOMY.flatMap((g) => g.subs.map((s) => [s.id, s.label])));

/** An organisation's name that opens its read-only profile card (edited in Admin). */
export function OrgName({ id, name }: { id: string; name: string | null | undefined }) {
  return <OrganizationCardLink organizationId={id} name={name ?? "Organisation"} load={(oid) => apiClient.getOrganizationCard(oid)} scopeLabels={SCOPE_LABELS} />;
}
