import { Suspense } from "react";
import { UserDetailView } from "./UserDetailView";

export default function UserDetailPage() {
  return (
    <Suspense fallback={<main style={{ padding: 32 }}>Loading…</main>}>
      <UserDetailView />
    </Suspense>
  );
}
