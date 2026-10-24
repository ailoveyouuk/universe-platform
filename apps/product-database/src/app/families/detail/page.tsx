import { Suspense } from "react";
import { FamilyDetailView } from "./FamilyDetailView";

export default function FamilyDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}>
      <FamilyDetailView />
    </Suspense>
  );
}
