import { Suspense } from "react";
import { FrameworkPage } from "./FrameworkPage";

export default function Page() {
  return <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}><FrameworkPage /></Suspense>;
}
