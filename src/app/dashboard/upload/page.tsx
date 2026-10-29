"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function UploadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = e.currentTarget;
    const fd = new FormData(form);

    const res = await fetch("/api/jobs", { method: "POST", body: fd });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Upload failed");
      return;
    }

    router.push(`/dashboard/jobs/${data.job.id}`);
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ marginBottom: "0.35rem" }}>Upload list</h1>
      <p className="muted" style={{ marginTop: 0, marginBottom: "1.5rem" }}>
        CSV with a phone column, or plain text — one number per line. Max 100,000.
      </p>

      <form onSubmit={onSubmit} className="card" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
        <div>
          <label className="muted" style={{ fontSize: "0.85rem" }}>
            Job name
          </label>
          <input className="field" name="name" placeholder="March outreach list" required />
        </div>
        <div>
          <label className="muted" style={{ fontSize: "0.85rem" }}>
            Default country (ISO)
          </label>
          <select className="field" name="defaultCountry" defaultValue="US">
            <option value="US">US</option>
            <option value="GB">UK (GB)</option>
            <option value="DE">Germany (DE)</option>
            <option value="CA">Canada</option>
            <option value="AU">Australia</option>
            <option value="FR">France</option>
            <option value="IN">India</option>
          </select>
        </div>
        <div>
          <label className="muted" style={{ fontSize: "0.85rem" }}>
            Phone column name (optional for CSV)
          </label>
          <input className="field" name="phoneColumn" placeholder="phone" />
        </div>
        <div>
          <label className="muted" style={{ fontSize: "0.85rem" }}>
            File
          </label>
          <input className="field" name="file" type="file" accept=".csv,.txt,.tsv" />
        </div>
        <div>
          <label className="muted" style={{ fontSize: "0.85rem" }}>
            Or paste numbers
          </label>
          <textarea
            className="field"
            name="text"
            rows={8}
            placeholder={"+14155552671\n+447911123456\n+4915112345678"}
            style={{ resize: "vertical", fontFamily: "var(--font-mono)" }}
          />
        </div>
        {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Starting…" : "Start cleanup"}
        </button>
      </form>
    </div>
  );
}
