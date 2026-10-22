import { Suspense } from "react";
import { FrameworkPage } from "./FrameworkPage";

export default function Page() {
  return <Suspense fallback={<main style={{ padding: 32 }}>Loading…</main>}><FrameworkPage /></Suspense>;
}
