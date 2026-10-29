import Link from "next/link";
import { signOut } from "@/lib/auth";

export function DashboardNav({ email }: { email?: string | null }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        padding: "1rem 0",
        marginBottom: "1.5rem",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <Link href="/dashboard" style={{ fontWeight: 700, fontSize: "1.15rem" }}>
          Phone<span style={{ color: "var(--accent)" }}>Verify</span>
        </Link>
        <nav style={{ display: "flex", gap: "1rem", fontSize: "0.95rem" }}>
          <Link href="/dashboard" className="muted">
            Jobs
          </Link>
          <Link href="/dashboard/upload" className="muted">
            Upload
          </Link>
          <Link href="/dashboard/verify" className="muted">
            Single check
          </Link>
          <Link href="/dashboard/coverage" className="muted">
            Coverage
          </Link>
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span className="muted" style={{ fontSize: "0.85rem" }}>
          {email}
        </span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button type="submit" className="btn btn-ghost" style={{ padding: "0.4rem 0.75rem" }}>
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
