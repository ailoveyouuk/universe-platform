"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

/**
 * Per-person app access (2026-10-25). Organisation admins choose, in Admin, which apps each person can use. Every app shell publishes the signed-in
 * person's allowed list here (null = every app); the app switcher hides the others and AppAccessGate shows a clear "no access" screen if someone
 * lands on an app they have not been given. API access to Insights is enforced on the server too.
 */
let current: string[] | null = null;
const listeners = new Set<() => void>();
export function setAllowedApps(apps: string[] | null | undefined) {
  const next = apps && apps.length ? apps : null;
  if (JSON.stringify(next) === JSON.stringify(current)) return;
  current = next;
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
export function useAllowedApps(): string[] | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}

/** Wraps an app's page content. Shows a plain explanation (with a heading, for screen readers) when the person has not been given this app. */
export function AppAccessGate({ appKey, appLabel, apps, children }: { appKey: string; appLabel: string; apps: string[] | null | undefined; children: ReactNode }) {
  useEffect(() => { setAllowedApps(apps); }, [apps]);
  if (!apps || apps.length === 0 || apps.includes(appKey)) return <>{children}</>;
  return (
    <div style={{ maxWidth: 560, margin: "48px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>You don&apos;t have access to {appLabel}</h1>
      <p style={{ margin: 0, color: "var(--u-ink-secondary)", fontSize: 14, lineHeight: 1.5 }}>
        Your organisation&apos;s administrator chooses which Universe apps each person can use. Ask them to turn {appLabel} on for you in Admin, under Users. You can still use the other apps you have been given from the app switcher.
      </p>
    </div>
  );
}
