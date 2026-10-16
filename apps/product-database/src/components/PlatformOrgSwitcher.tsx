"use client";

import { useEffect, useState } from "react";
import type { AuthenticatedUser, OrganizationSummary } from "@universe/types";
import { setStoredActiveOrganizationId } from "@universe/api-client";
import { OrgSwitcher } from "@universe/ui";
import { apiClient } from "../lib/apiClient";

/** Header dropdown letting platform staff choose which organisation the app
 * acts inside. Renders nothing for everyone else (and when there is only one
 * organisation to pick). Switching reloads so every page refetches. */
export function PlatformOrgSwitcher({ me }: { me: AuthenticatedUser }) {
  const [orgs, setOrgs] = useState<OrganizationSummary[]>([]);
  const isStaff = me.platformStaffRole !== "NONE";

  useEffect(() => {
    if (!isStaff) return;
    apiClient.listOrganizations().then(setOrgs).catch(() => setOrgs([]));
  }, [isStaff]);

  if (!isStaff || orgs.length < 2) return null;
  return (
    <OrgSwitcher
      organizations={orgs}
      value={me.organizationId}
      onChange={(id) => {
        setStoredActiveOrganizationId(id === me.homeOrganizationId ? null : id);
        window.location.reload();
      }}
    />
  );
}
