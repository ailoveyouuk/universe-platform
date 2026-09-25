"use client";

import { PublicClientApplication } from "@azure/msal-browser";
import { createMsalConfig } from "@universe/auth";

// Points at the Universe CIAM tenant (Microsoft Entra External ID) — NOT
// any one customer's own corporate Entra ID tenant. See architecture doc, "External SSO".
export const msalInstance = new PublicClientApplication(
  createMsalConfig({
    clientId: process.env.NEXT_PUBLIC_UNIVERSE_CIAM_CLIENT_ID ?? "",
    tenantId: process.env.NEXT_PUBLIC_UNIVERSE_CIAM_TENANT_ID ?? "",
    tenantSubdomain: process.env.NEXT_PUBLIC_UNIVERSE_CIAM_TENANT_SUBDOMAIN,
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI ?? "http://localhost:3000",
  }),
);
