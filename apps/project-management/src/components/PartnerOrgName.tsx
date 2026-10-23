"use client";

import { SCOPE_TAXONOMY } from "@universe/types";
import { OrganizationCardLink } from "@universe/ui";
import { apiClient } from "../lib/apiClient";

const SCOPE_LABELS: Record<string, string> = Object.fromEntries(SCOPE_TAXONOMY.flatMap((g) => g.subs.map((s) => [s.id, s.label])));

/**
 * A stakeholder's name that opens the real company's organisation card, when that company has published its directory profile.
 * Resolved when clicked (partner → registry entry → published organisation), so lists do not make a request per row.
 */
export function PartnerOrgName({ partnerId, name }: { partnerId: string; name: string }) {
  return (
    <OrganizationCardLink
      organizationId={partnerId}
      name={name}
      scopeLabels={SCOPE_LABELS}
      load={async (pid) => {
        const link = await apiClient.getPartnerOrganizationLink(pid);
        if (!link.organizationId) throw new Error("This company has not published an organisation profile in the Universe directory yet.");
        return apiClient.getOrganizationCard(link.organizationId);
      }}
    />
  );
}
