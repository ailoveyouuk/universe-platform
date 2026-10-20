import { Suspense } from "react";
import { StatusView } from "./StatusView";

export default function StatusPage() {
  return <Suspense fallback={<main style={{ padding: 32 }}>Loading…</main>}><StatusView /></Suspense>;
}
