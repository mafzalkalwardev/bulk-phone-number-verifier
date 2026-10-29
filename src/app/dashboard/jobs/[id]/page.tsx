"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";

interface Job {
  id: string;
  name: string;
  status: string;
  defaultCountry: string;
  totalRows: number;
  processedRows: number;
  invalidCount: number;
  unallocatedCount: number;
  validMobileCount: number;
  validOtherCount: number;
  unknownCount: number;
  errorMessage?: string | null;
}

interface Row {
  id: string;
  input: string;
  e164: string | null;
  country: string | null;
  lineType: string | null;
  classification: string;
  blockStatus: string | null;
  blockCarrier: string | null;
  blockSource: string | null;
  score: number;
  raw?: {
    liveStatus?: string;
    liveConfigured?: boolean;
    liveCarrier?: string | null;
    liveMessage?: string;
  };
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [job, setJob] = useState<Job | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("all");
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    const [jRes, rRes] = await Promise.all([
      fetch(`/api/jobs/${id}`),
      fetch(
        `/api/jobs/${id}/rows?pageSize=100${
          filter === "sms"
            ? "&smsCandidates=1"
            : filter !== "all"
              ? `&classification=${filter}`
              : ""
        }`
      ),
    ]);
    const jData = await jRes.json();
    const rData = await rRes.json();
    if (jData.job) setJob(jData.job);
    setRows(rData.rows || []);
    setTotal(rData.total || 0);
  }, [id, filter]);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (job?.status === "pending" || job?.status === "processing" || !job) {
        load();
      }
    }, 2000);
    return () => clearInterval(t);
  }, [load, job?.status]);

  if (!job) {
    return <p className="muted">Loading job…</p>;
  }

  const pct =
    job.totalRows === 0 ? 0 : Math.round((job.processedRows / job.totalRows) * 100);

  const stats = [
    { label: "Valid mobile", value: job.validMobileCount, color: "var(--accent)" },
    { label: "Valid other", value: job.validOtherCount, color: "var(--info)" },
    { label: "Unallocated", value: job.unallocatedCount, color: "var(--warn)" },
    { label: "Invalid", value: job.invalidCount, color: "var(--danger)" },
    { label: "Unknown", value: job.unknownCount, color: "var(--muted)" },
  ];

  return (
    <div>
      <p style={{ marginBottom: "0.5rem" }}>
        <Link href="/dashboard" className="muted">
          ← Jobs
        </Link>
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 0.35rem" }}>{job.name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Status: <strong style={{ color: "var(--text)" }}>{job.status}</strong> ·{" "}
            Default country {job.defaultCountry} · {job.processedRows}/{job.totalRows} (
            {pct}%)
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <a className="btn btn-ghost" href={`/api/jobs/${id}/export?filter=all`}>
            Export all
          </a>
          <a className="btn btn-ghost" href={`/api/jobs/${id}/export?filter=clean`}>
            Export clean
          </a>
          <a className="btn btn-ghost" href={`/api/jobs/${id}/export?filter=sms`}>
            Export SMS candidates
          </a>
          <a className="btn btn-primary" href={`/api/jobs/${id}/export?filter=live_active`}>
            Export live active
          </a>
        </div>
      </div>

      {job.errorMessage && (
        <p style={{ color: "var(--danger)" }}>{job.errorMessage}</p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.25rem",
        }}
      >
        {stats.map((s) => (
          <div key={s.label} className="card" style={{ padding: "1rem" }}>
            <div className="muted" style={{ fontSize: "0.75rem", marginBottom: "0.35rem" }}>
              {s.label}
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "0.85rem",
        }}
      >
        {[
          ["all", "All"],
          ["structurally_valid", "Structurally valid"],
          ["sms", "SMS candidates"],
          ["unallocated", "Unallocated"],
          ["invalid", "Invalid"],
          ["unknown", "Unknown"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`btn ${filter === value ? "btn-primary" : "btn-ghost"}`}
            style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
        Showing {rows.length} of {total}
      </p>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Input</th>
              <th>E.164</th>
              <th>Type</th>
              <th>Classification</th>
              <th>Block</th>
              <th>Score</th>
              <th>Live</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                  {row.input}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                  {row.e164 || "—"}
                </td>
                <td>{row.lineType || "—"}</td>
                <td>
                  <StatusBadge classification={row.classification} />
                </td>
                <td style={{ fontSize: "0.85rem" }}>
                  {row.blockStatus || "—"}
                  {row.blockCarrier ? (
                    <div className="muted">{row.blockCarrier}</div>
                  ) : null}
                  {row.blockSource ? (
                    <div className="muted" style={{ fontSize: "0.75rem" }}>
                      {row.blockSource}
                    </div>
                  ) : null}
                </td>
                <td>{row.score}</td>
                <td style={{ fontSize: "0.8rem" }}>
                  {row.raw?.liveConfigured ? (
                    <>
                      <strong
                        style={{
                          color:
                            row.raw.liveStatus === "active"
                              ? "var(--accent)"
                              : row.raw.liveStatus === "invalid"
                                ? "var(--danger)"
                                : "var(--warn)",
                        }}
                      >
                        {String(row.raw.liveStatus)}
                      </strong>
                      {row.raw.liveCarrier ? (
                        <div className="muted">{String(row.raw.liveCarrier)}</div>
                      ) : null}
                    </>
                  ) : (
                    <span className="muted">Not configured</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
