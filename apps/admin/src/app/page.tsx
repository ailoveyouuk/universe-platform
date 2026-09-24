import Link from "next/link";

export default function AdminHomePage() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Universe Admin</h1>
      <p style={{ color: "#6B7280", maxWidth: 560 }}>
        Onboard organizations and invite users. Inviting someone here does not create their
        Microsoft account — it puts them on the allowed list with an organization and role
        already assigned, so the first time they sign in via Microsoft SSO on any Universe app,
        they're recognized and let in with exactly that access.
      </p>
      <p>
        <Link href="/organizations">Manage Organizations</Link>
      </p>
      <p>
        <Link href="/users">Manage Users</Link>
      </p>
      <p>
        <Link href="/users/invite">+ Invite a User</Link>
      </p>
    </main>
  );
}
