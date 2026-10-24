import { Suspense } from "react";
import { OrganizationDetailView } from "./OrganizationDetailView";

// useSearchParams() needs a Suspense boundary for static export — same
// pattern as apps/project-management/src/app/projects/detail/page.tsx.
export default function OrganizationDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}>
      <OrganizationDetailView />
    </Suspense>
  );
}
