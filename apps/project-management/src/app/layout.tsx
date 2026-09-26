import type { ReactNode } from "react";
import { AppShell } from "../components/AppShell";

export const metadata = {
  title: "Project Management — Universe",
  description: "Universe project management",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
