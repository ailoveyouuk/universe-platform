import type { ReactNode } from "react";
import { AppShell } from "../components/AppShell";

export const metadata = {
  title: "Product Database — Universe",
  description: "Universe platform shared product catalogue",
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
