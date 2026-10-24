"use client";

import { Suspense } from "react";
import { UsersView } from "../../components/UsersView";

export default function UsersPage() {
  // useSearchParams needs a Suspense boundary in a static export.
  return (
    <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}>
      <UsersView />
    </Suspense>
  );
}
