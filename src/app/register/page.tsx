"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") || ""),
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Registration failed");
      return;
    }

    await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });
    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "4rem 1.25rem" }}>
      <h1 style={{ marginBottom: "0.35rem" }}>Create account</h1>
      <p className="muted" style={{ marginTop: 0, marginBottom: "1.5rem" }}>
        Start cleaning phone lists in minutes.
      </p>
      <form onSubmit={onSubmit} className="card" style={{ padding: "1.75rem", display: "grid", gap: "0.9rem" }}>
        <div>
          <label className="muted" style={{ fontSize: "0.85rem" }}>
            Name
          </label>
          <input className="field" name="name" />
        </div>
        <div>
          <label className="muted" style={{ fontSize: "0.85rem" }}>
            Email
          </label>
          <input className="field" name="email" type="email" required />
        </div>
        <div>
          <label className="muted" style={{ fontSize: "0.85rem" }}>
            Password
          </label>
          <input className="field" name="password" type="password" minLength={6} required />
        </div>
        {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </button>
        <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
