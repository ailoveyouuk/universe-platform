import { Suspense } from "react";
import { BidBuilder } from "./BidBuilder";

export default function BidPage() {
  return <Suspense fallback={<main style={{ padding: 32 }}>Loading…</main>}><BidBuilder /></Suspense>;
}
