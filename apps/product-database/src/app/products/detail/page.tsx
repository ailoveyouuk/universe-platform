import { Suspense } from "react";
import { ProductDetailView } from "./ProductDetailView";

// useSearchParams() opts this page out of static prerendering unless wrapped in Suspense.
export default function ProductDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}>
      <ProductDetailView />
    </Suspense>
  );
}
