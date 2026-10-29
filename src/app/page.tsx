import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "4rem 1.25rem 5rem",
      }}
    >
      <p
        style={{
          color: "var(--accent)",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontSize: "0.8rem",
          marginBottom: "1rem",
        }}
      >
        Bulk list cleanup
      </p>
      <h1
        style={{
          fontSize: "clamp(2.4rem, 6vw, 3.6rem)",
          lineHeight: 1.05,
          margin: "0 0 1rem",
          maxWidth: 720,
        }}
      >
        Phone<span style={{ color: "var(--accent)" }}>Verify</span>
      </h1>
      <p
        className="muted"
        style={{ fontSize: "1.15rem", maxWidth: 560, lineHeight: 1.55, marginBottom: "2rem" }}
      >
        Clean phone lists with numbering-plan validation and regulator block
        assignment for US, UK, Germany, and global formats — before you spend on SMS.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <Link href="/login" className="btn btn-primary">
          Open dashboard
        </Link>
        <Link href="/register" className="btn btn-ghost">
          Create account
        </Link>
      </div>

      <div
        className="card"
        style={{
          marginTop: "3.5rem",
          padding: "1.25rem 1.4rem",
          maxWidth: 720,
        }}
      >
        <strong style={{ display: "block", marginBottom: "0.5rem" }}>
          Honest labeling
        </strong>
        <p className="muted" style={{ margin: 0, lineHeight: 1.5, fontSize: "0.95rem" }}>
          Results are marked <em>structurally valid / block allocated</em> — not
          “live on the network.” True currently-active status needs a carrier HLR
          feed; a Live Lookup provider slot is ready when you add one.
        </p>
      </div>
    </main>
  );
}
