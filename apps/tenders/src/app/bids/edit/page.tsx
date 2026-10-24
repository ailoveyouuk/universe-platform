import { Suspense } from "react";
import { BidBuilder } from "./BidBuilder";

export default function BidPage() {
  return <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}><BidBuilder /></Suspense>;
}
