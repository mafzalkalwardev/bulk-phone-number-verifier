"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push(params.get("callbackUrl") || "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: "1.75rem", display: "grid", gap: "0.9rem" }}>
      <div>
        <label className="muted" style={{ fontSize: "0.85rem" }}>
          Email
        </label>
        <input className="field" name="email" type="email" required defaultValue="demo@phoneverify.local" />
      </div>
      <div>
        <label className="muted" style={{ fontSize: "0.85rem" }}>
          Password
        </label>
        <input className="field" name="password" type="password" required defaultValue="demo1234" />
      </div>
      {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
        No account? <Link href="/register">Register</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "4rem 1.25rem" }}>
      <h1 style={{ marginBottom: "0.35rem" }}>Sign in</h1>
      <p className="muted" style={{ marginTop: 0, marginBottom: "1.5rem" }}>
        Demo: demo@phoneverify.local / demo1234
      </p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
