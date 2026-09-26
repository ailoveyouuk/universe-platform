"use client";

import Link from "next/link";
import { useCurrentUser } from "../lib/AuthContext";

export default function HomePage() {
  // Always non-null here — AppShell only renders this page's tree once
  // status === "signedIn" (see AppShell.tsx), so there's no "guest" state
  // to design for on this page.
  const me = useCurrentUser();

  return (
    <main style={{ padding: 32 }}>
      <h1>Welcome back, {me?.forename}.</h1>
      <p>
        <Link href="/projects">View all projects</Link>
      </p>
    </main>
  );
}
