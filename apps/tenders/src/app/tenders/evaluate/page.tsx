import { Suspense } from "react";
import { EvaluateView } from "./EvaluateView";

export default function EvaluatePage() {
  return <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}><EvaluateView /></Suspense>;
}
