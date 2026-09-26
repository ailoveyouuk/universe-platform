"use client";

import { createContext, useContext } from "react";
import type { AuthenticatedUser } from "@universe/types";

/**
 * The signed-in user's profile (identity + their organization's branding),
 * populated once by AppShell's useAuth() call and read from here by any
 * page — so "Welcome back, {forename}" on the home page and the org
 * logo/name in the header both come from the SAME single /me call, rather
 * than each page fetching it again itself.
 */
export const AuthContext = createContext<AuthenticatedUser | null>(null);

export function useCurrentUser(): AuthenticatedUser | null {
  return useContext(AuthContext);
}
