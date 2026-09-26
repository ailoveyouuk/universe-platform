"use client";

import { createContext, useContext } from "react";
import type { AuthenticatedUser } from "@universe/types";

/**
 * The signed-in user's profile, populated once by AppShell's useAuth() call
 * and read from here by any page — same pattern as
 * apps/project-management/src/lib/AuthContext.tsx, so every admin page
 * (invite form, org creation, org list) can read `me` without each one
 * making its own redundant /me call.
 */
export const AuthContext = createContext<AuthenticatedUser | null>(null);

export function useCurrentUser(): AuthenticatedUser | null {
  return useContext(AuthContext);
}
