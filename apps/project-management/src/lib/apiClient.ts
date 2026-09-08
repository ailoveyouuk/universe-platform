"use client";

import { UniverseApiClient } from "@universe/api-client";
import { DEFAULT_LOGIN_SCOPES } from "@universe/auth";
import { msalInstance } from "./msalInstance";

async function getAccessToken(): Promise<string> {
  const account = msalInstance.getAllAccounts()[0];
  if (!account) throw new Error("Not signed in");

  const result = await msalInstance.acquireTokenSilent({
    account,
    scopes: DEFAULT_LOGIN_SCOPES,
  });
  return result.accessToken;
}

export const apiClient = new UniverseApiClient(
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000",
  getAccessToken,
);
