"use client";

import { FormEvent, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";

interface Result {
  input: string;
  e164: string | null;
  country: string | null;
  lineType: string;
  classification: string;
  blockStatus: string | null;
  blockPrefix: string | null;
  blockCarrier: string | null;
  blockSource: string | null;
  score: number;
  formats: { e164: string; international: string; national: string } | null;
  liveStatus: string;
  liveConfigured: boolean;
  liveMessage?: string;
}

export default function VerifyPage() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: fd.get("phone"),
        defaultCountry: fd.get("defaultCountry"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Lookup failed");
      return;
    }
    setResult(data.result);
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ marginBottom: "0.35rem" }}>Single check</h1>
      <p className="muted" style={{ marginTop: 0, marginBottom: "1.5rem" }}>
        Validate one number with format rules and regulator block data.
      </p>

      <form onSubmit={onSubmit} className="card" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
        <div>
          <label className="muted" style={{ fontSize: "0.85rem" }}>
            Phone number
          </label>
          <input
            className="field"
            name="phone"
            required
            placeholder="+14155552671"
            style={{ fontFamily: "var(--font-mono)" }}
          />
        </div>
        <div>
          <label className="muted" style={{ fontSize: "0.85rem" }}>
            Default country
          </label>
          <select className="field" name="defaultCountry" defaultValue="US">
            <option value="US">US</option>
            <option value="GB">UK</option>
            <option value="DE">DE</option>
          </select>
        </div>
        {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Checking…" : "Check number"}
        </button>
      </form>

      {result && (
        <div className="card" style={{ marginTop: "1.25rem", padding: "1.35rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <StatusBadge classification={result.classification} />
          </div>
          <dl style={{ display: "grid", gap: "0.65rem", margin: 0 }}>
            <Row label="E.164" value={result.e164 || "—"} mono />
            <Row label="Country" value={result.country || "—"} />
            <Row label="Line type" value={result.lineType} />
            <Row label="Block status" value={result.blockStatus || "—"} />
            <Row label="Block prefix" value={result.blockPrefix || "—"} mono />
            <Row label="Carrier / source" value={`${result.blockCarrier || "—"} (${result.blockSource || "n/a"})`} />
            <Row label="Score" value={String(result.score)} />
            <Row
              label="Live status"
              value={
                result.liveConfigured
                  ? result.liveStatus
                  : "Not configured"
              }
            />
          </dl>
          {result.liveMessage && (
            <p className="muted" style={{ fontSize: "0.85rem", marginTop: "1rem", marginBottom: 0 }}>
              {result.liveMessage}
            </p>
          )}
          {result.formats && (
            <div style={{ marginTop: "1rem" }}>
              <div className="muted" style={{ fontSize: "0.75rem", marginBottom: "0.35rem" }}>
                Formats
              </div>
              <pre
                style={{
                  margin: 0,
                  background: "var(--bg-soft)",
                  padding: "0.75rem",
                  borderRadius: 8,
                  fontSize: "0.8rem",
                  overflow: "auto",
                }}
              >
                {JSON.stringify(result.formats, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "0.5rem" }}>
      <dt className="muted" style={{ fontSize: "0.85rem" }}>
        {label}
      </dt>
      <dd style={{ margin: 0, fontFamily: mono ? "var(--font-mono)" : undefined, fontSize: "0.95rem" }}>
        {value}
      </dd>
    </div>
  );
}
