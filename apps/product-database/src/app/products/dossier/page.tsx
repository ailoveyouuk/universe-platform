import { Suspense } from "react";
import { DossierView } from "./DossierView";

export default function ProductDossierPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}>
      <DossierView />
    </Suspense>
  );
}
