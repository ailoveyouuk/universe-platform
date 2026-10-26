"use client";

import { useEffect, useState } from "react";
import type { AuthenticatedUser, SupportContact } from "@universe/types";
import { getRememberedBrand, rememberBrand, type RememberedBrand } from "@universe/api-client";
import { apiClient } from "./apiClient";

/** Branding for the app shell: the organisation's logo URL resolved against
 * the API, its support contacts, and — for the sign-in screen — the brand
 * this browser last signed in as. */
export function useBranding(me: AuthenticatedUser | null) {
  const [remembered, setRemembered] = useState<RememberedBrand | null>(null);
  const [support, setSupport] = useState<SupportContact[]>([]);

  useEffect(() => {
    setRemembered(getRememberedBrand());
  }, []);

  const logoUrl = me ? apiClient.assetUrl(me.organizationLogoUrl) : null;
  const iconUrl = me ? apiClient.assetUrl(me.organizationLogoIconUrl) : null;

  useEffect(() => {
    if (!me) return;
    // Remember the signed-in user's HOME organisation, not one platform staff
    // happen to be viewing, so the sign-in screen stays predictable.
    if (me.organizationId === me.homeOrganizationId) {
      rememberBrand({
        name: me.organizationName,
        logoUrl,
        primaryColor: me.organizationPrimaryColor,
        secondaryColor: me.organizationSecondaryColor,
      });
    }
    apiClient.getSupportContacts().then(setSupport).catch(() => setSupport([]));
  }, [me?.organizationId, me?.organizationName, logoUrl, me?.organizationPrimaryColor, me?.organizationSecondaryColor]); // eslint-disable-line react-hooks/exhaustive-deps

  return { logoUrl, iconUrl, support, remembered };
}
