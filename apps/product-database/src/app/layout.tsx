import type { ReactNode } from "react";
import "@universe/ui/src/tokens.css";
import { AppShell } from "../components/AppShell";

export const metadata = {
  title: "Product Database — Universe",
  description: "Universe platform shared product catalogue",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Universe Design System typefaces — see universe-brand-identity.md
           "Typography". Mirrors apps/project-management/src/app/layout.tsx
           exactly; this app's AppShell/Sidebar/tokens.css wiring already
           assumed these were loaded (it references var(--u-font-sans) etc.
           throughout) but the actual <link>/import were missing here,
           which is why this app rendered with no brand styling at all
           until this fix (2026-10-09 — see claude/app-completeness-audit.md). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@600;700&family=JetBrains+Mono:wght@500&display=swap"
        />
      </head>
      <body style={{ margin: 0, fontFamily: "var(--u-font-sans)" }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
