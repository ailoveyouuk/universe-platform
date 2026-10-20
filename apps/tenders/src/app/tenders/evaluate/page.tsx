import { Suspense } from "react";
import { EvaluateView } from "./EvaluateView";

export default function EvaluatePage() {
  return <Suspense fallback={<main style={{ padding: 32 }}>Loading…</main>}><EvaluateView /></Suspense>;
}
