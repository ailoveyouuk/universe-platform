import { Suspense } from "react";
import { ProductDetailView } from "./ProductDetailView";

// useSearchParams() opts this page out of static prerendering unless wrapped in Suspense.
export default function ProductDetailPage() {
  return (
    <Suspense fallback={<main style={{ padding: 32 }}>Loading…</main>}>
      <ProductDetailView />
    </Suspense>
  );
}
