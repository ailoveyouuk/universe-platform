import { Suspense } from "react";
import { FamilyDetailView } from "./FamilyDetailView";

export default function FamilyDetailPage() {
  return (
    <Suspense fallback={<main style={{ padding: 32 }}>Loading…</main>}>
      <FamilyDetailView />
    </Suspense>
  );
}
