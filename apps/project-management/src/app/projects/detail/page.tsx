import { Suspense } from "react";
import { ProjectDetailView } from "./ProjectDetailView";

// useSearchParams() opts this page out of static prerendering unless
// wrapped in Suspense — see https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<main style={{ padding: 32 }}>Loading…</main>}>
      <ProjectDetailView />
    </Suspense>
  );
}
