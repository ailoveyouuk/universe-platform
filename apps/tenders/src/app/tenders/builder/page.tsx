import { Suspense } from "react";
import { BuilderView } from "./BuilderView";

// useSearchParams() opts the page out of static prerendering unless wrapped in Suspense.
export default function BuilderPage() {
  return (
    <Suspense fallback={<main style={{ padding: 32 }}>Loading…</main>}>
      <BuilderView />
    </Suspense>
  );
}
