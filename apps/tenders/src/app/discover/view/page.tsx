import { Suspense } from "react";
import { TenderView } from "./TenderView";

export default function ViewPage() {
  return <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}><TenderView /></Suspense>;
}
