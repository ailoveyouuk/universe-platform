import { Suspense } from "react";
import { UserDetailView } from "./UserDetailView";

export default function UserDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32 }}>Loading…</div>}>
      <UserDetailView />
    </Suspense>
  );
}
