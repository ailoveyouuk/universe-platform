import { Suspense } from "react";
import { StatusView } from "./StatusView";

export default function StatusPage() {
  return <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}><StatusView /></Suspense>;
}
