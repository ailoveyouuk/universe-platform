"use client";

import { PublicClientApplication } from "@azure/msal-browser";
import { createMsalConfig } from "@universe/auth";

// Same Universe CIAM tenant + App Registration as every other Universe app —
// a person signed into Project Management is already signed into Admin.
export const msalInstance = new PublicClientApplication(
  createMsalConfig({
    clientId: process.env.NEXT_PUBLIC_UNIVERSE_CIAM_CLIENT_ID ?? "",
    tenantId: process.env.NEXT_PUBLIC_UNIVERSE_CIAM_TENANT_ID ?? "",
    tenantSubdomain: process.env.NEXT_PUBLIC_UNIVERSE_CIAM_TENANT_SUBDOMAIN,
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI ?? "http://localhost:3001",
  }),
);
