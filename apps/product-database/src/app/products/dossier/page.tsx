import { Suspense } from "react";
import { DossierView } from "./DossierView";

export default function ProductDossierPage() {
  return (
    <Suspense fallback={<main style={{ padding: 32 }}>Loading…</main>}>
      <DossierView />
    </Suspense>
  );
}
