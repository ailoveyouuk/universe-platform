import type { ReactNode } from "react";
import "@universe/ui/src/tokens.css";
import { AppShell } from "../components/AppShell";

export const metadata = {
  title: "Project Management — Universe",
  description: "Universe project management",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Universe Design System typefaces — see universe-brand-identity.md
           "Typography". Loaded once here for the whole app; first real use
           is the StageTracker component (project-stage-navigation-plan.md),
           kept deliberately contained rather than restyling everything at
           once — see that plan's "Applying the Universe brand system"
           section. */}
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
