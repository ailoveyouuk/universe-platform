"use client";

import { createContext, useContext } from "react";
import type { AuthenticatedUser } from "@universe/types";

/** Same pattern as apps/project-management/src/lib/AuthContext.tsx — the
 * signed-in user's profile, populated once by AppShell's useAuth() call. */
export const AuthContext = createContext<AuthenticatedUser | null>(null);

export function useCurrentUser(): AuthenticatedUser | null {
  return useContext(AuthContext);
}
