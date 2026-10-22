"use client";

import { useEffect, useState } from "react";
import type { AuthenticatedUser, OrganizationSummary } from "@universe/types";
import { setStoredActiveOrganizationId } from "@universe/api-client";
import { OrgPicker, OrgSwitcher } from "@universe/ui";
import { apiClient } from "../lib/apiClient";

const PICKED_KEY = "universe.orgPicked";
type Org = OrganizationSummary & { isDemo?: boolean };

/** Header dropdown letting platform staff choose which organisation the app
 * acts inside. Demo users (2026-10-20) get the same dropdown over the demo
 * organisations they have been granted, plus a chooser shown once per browser
 * session after sign-in. Renders nothing for everyone else (and when there is
 * only one organisation to pick). Switching reloads so every page refetches. */
export function PlatformOrgSwitcher({ me }: { me: AuthenticatedUser }) {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [accessible, setAccessible] = useState<Org[]>([]);
  const [picked, setPicked] = useState(true);
  const isStaff = me.platformStaffRole !== "NONE";
  const isDemoMember = !isStaff && !!me.isDemoUser;

  useEffect(() => {
    if (isStaff) apiClient.listOrganizations().then(setOrgs).catch(() => setOrgs([]));
    if (isStaff || isDemoMember) {
      apiClient.listAccessibleOrganizations().then((a) => { setAccessible(a); if (!isStaff) setOrgs(a); }).catch(() => setAccessible([]));
    }
  }, [isStaff, isDemoMember]);

  useEffect(() => {
    try { setPicked(window.sessionStorage.getItem(PICKED_KEY) === "1"); } catch { setPicked(true); }
  }, []);

  if ((!isStaff && !isDemoMember) || orgs.length < 2) return null;

  const choose = (id: string) => {
    try { window.sessionStorage.setItem(PICKED_KEY, "1"); } catch { /* the chooser then simply shows again next load */ }
    if (id === me.organizationId) { setPicked(true); return; }
    setStoredActiveOrganizationId(id === me.homeOrganizationId ? null : id);
    window.location.reload();
  };

  return (
    <>
      {!picked && accessible.length >= 2 && <OrgPicker organizations={accessible} currentId={me.organizationId} userName={me.forename} onChoose={choose} />}
      <OrgSwitcher organizations={orgs} value={me.organizationId} onChange={choose} />
    </>
  );
}
