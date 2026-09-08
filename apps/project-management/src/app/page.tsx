import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Universe — Project Management</h1>
      <p>
        <Link href="/projects">View all projects</Link>
      </p>
    </main>
  );
}
