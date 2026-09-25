"use client";

import { UniverseApiClient } from "@universe/api-client";
import { API_SCOPES } from "@universe/auth";
import { msalInstance } from "./msalInstance";

async function getAccessToken(): Promise<string> {
  const account = msalInstance.getAllAccounts()[0];
  if (!account) throw new Error("Not signed in");

  // API_SCOPES (not DEFAULT_LOGIN_SCOPES) — this token is sent to the
  // Universe API as a bearer token, so it must carry the API's own
  // audience, not the Microsoft Graph audience DEFAULT_LOGIN_SCOPES
  // produces. See packages/auth/src/msalConfig.ts.
  const result = await msalInstance.acquireTokenSilent({
    account,
    scopes: API_SCOPES,
  });
  return result.accessToken;
}

export const apiClient = new UniverseApiClient(
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000",
  getAccessToken,
);
