import { Suspense } from "react";
import { TenderView } from "./TenderView";

export default function ViewPage() {
  return <Suspense fallback={<main style={{ padding: 32 }}>Loading…</main>}><TenderView /></Suspense>;
}
