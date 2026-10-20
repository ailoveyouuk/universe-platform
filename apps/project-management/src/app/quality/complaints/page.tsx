import { Suspense } from "react";
import { ComplaintsView } from "./ComplaintsView";

export default function ComplaintsPage() {
  return <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}><ComplaintsView /></Suspense>;
}
