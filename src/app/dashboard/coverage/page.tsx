"use client";

import { useEffect, useState } from "react";

interface CoverageData {
  totalBlocks: number;
  blockCounts: Array<{ country: string; source: string; status: string; _count: number }>;
  syncRuns: Array<{
    id: string;
    source: string;
    status: string;
    rowsUpserted: number;
    message: string | null;
    startedAt: string;
  }>;
  liveLookup: {
    configured: boolean;
    message: string;
    name?: string;
    bulkEnabled?: boolean;
    signupUrl?: string;
  };
  queue: { redis: boolean; mode: string };
}

export default function CoveragePage() {
  const [data, setData] = useState<CoverageData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/admin/sync");
    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    load();
  }, []);

  async function sync(source: string) {
    setBusy(source);
    setMessage("");
    const res = await fetch("/api/admin/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    });
    const json = await res.json();
    setBusy(null);
    setMessage(JSON.stringify(json.results, null, 2));
    await load();
  }

  return (
    <div>
      <h1 style={{ marginBottom: "0.35rem" }}>Coverage & sync</h1>
      <p className="muted" style={{ marginTop: 0, marginBottom: "1.5rem" }}>
        Regulator number-block database and live lookup configuration.
      </p>

      {!data ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "0.85rem",
              marginBottom: "1.25rem",
            }}
          >
            <div className="card" style={{ padding: "1.1rem" }}>
              <div className="muted" style={{ fontSize: "0.75rem" }}>
                Number blocks
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{data.totalBlocks}</div>
            </div>
            <div className="card" style={{ padding: "1.1rem" }}>
              <div className="muted" style={{ fontSize: "0.75rem" }}>
                Job queue
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: "0.35rem" }}>
                {data.queue.mode}
              </div>
              <p className="muted" style={{ fontSize: "0.8rem", margin: "0.35rem 0 0" }}>
                Redis {data.queue.redis ? "connected" : "not set — in-process fallback"}
              </p>
            </div>
            <div className="card" style={{ padding: "1.1rem" }}>
              <div className="muted" style={{ fontSize: "0.75rem" }}>
                Live HLR lookup
              </div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  marginTop: "0.35rem",
                  color: data.liveLookup.configured ? "var(--accent)" : "var(--warn)",
                }}
              >
                {data.liveLookup.configured ? "Configured" : "Not configured"}
              </div>
              <p className="muted" style={{ fontSize: "0.8rem", margin: "0.35rem 0 0", lineHeight: 1.4 }}>
                {data.liveLookup.message}
              </p>
              {data.liveLookup.signupUrl && !data.liveLookup.configured && (
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem" }}>
                  <a
                    href={data.liveLookup.signupUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--accent)" }}
                  >
                    Get HLR API keys →
                  </a>
                </p>
              )}
              {data.liveLookup.configured && (
                <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.8rem" }}>
                  Provider: {data.liveLookup.name} · Bulk credits:{" "}
                  {data.liveLookup.bulkEnabled ? "ON" : "OFF"}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            {[
              ["all", "Sync all"],
              ["seed", "Reseed demos"],
              ["nanpa", "NANPA"],
              ["ofcom", "Ofcom"],
              ["bnetza", "BNetzA"],
            ].map(([source, label]) => (
              <button
                key={source}
                type="button"
                className="btn btn-ghost"
                disabled={!!busy}
                onClick={() => sync(source)}
              >
                {busy === source ? "Running…" : label}
              </button>
            ))}
          </div>

          <div className="card" style={{ overflowX: "auto", marginBottom: "1.25rem" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {data.blockCounts.map((row, i) => (
                  <tr key={`${row.country}-${row.source}-${row.status}-${i}`}>
                    <td>{row.country}</td>
                    <td>{row.source}</td>
                    <td>{row.status}</td>
                    <td>{row._count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: "1.1rem" }}>Recent sync runs</h2>
          <div className="card" style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Rows</th>
                  <th>Message</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {data.syncRuns.map((run) => (
                  <tr key={run.id}>
                    <td>{run.source}</td>
                    <td>{run.status}</td>
                    <td>{run.rowsUpserted}</td>
                    <td className="muted" style={{ fontSize: "0.85rem", maxWidth: 360 }}>
                      {run.message}
                    </td>
                    <td className="muted" style={{ fontSize: "0.85rem" }}>
                      {new Date(run.startedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {message && (
            <pre
              style={{
                marginTop: "1rem",
                background: "var(--bg-soft)",
                padding: "1rem",
                borderRadius: 12,
                overflow: "auto",
                fontSize: "0.8rem",
              }}
            >
              {message}
            </pre>
          )}
        </>
      )}
    </div>
  );
}
