import { Suspense } from "react";
import { ManageView } from "./ManageView";

// useSearchParams() opts the page out of static prerendering unless wrapped in Suspense.
export default function ManagePage() {
  return (
    <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}>
      <ManageView />
    </Suspense>
  );
}
