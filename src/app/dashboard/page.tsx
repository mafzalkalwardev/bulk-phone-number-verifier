import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const session = await auth();
  const jobs = await prisma.job.findMany({
    where: { userId: session!.user!.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: "1rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 0.35rem" }}>Jobs</h1>
          <p className="muted" style={{ margin: 0 }}>
            Bulk cleanup runs — structural validity + regulator block status.
          </p>
        </div>
        <Link href="/dashboard/upload" className="btn btn-primary">
          New upload
        </Link>
      </div>

      <div
        className="card"
        style={{
          padding: "0.75rem 1rem",
          marginBottom: "1.25rem",
          borderColor: "rgba(240, 180, 41, 0.35)",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.45 }}>
          <strong style={{ color: "var(--warn)" }}>Not live HLR.</strong>{" "}
          <span className="muted">
            “Structurally valid” means numbering-plan valid and (when covered)
            in an allocated block. It does not mean the subscriber is currently
            active on the network.
          </span>
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
          <p className="muted">No jobs yet. Upload a CSV or paste a list to start.</p>
          <Link href="/dashboard/upload" className="btn btn-primary" style={{ marginTop: "0.75rem" }}>
            Upload list
          </Link>
        </div>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Valid mobile</th>
                <th>Invalid</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const pct =
                  job.totalRows === 0
                    ? 0
                    : Math.round((job.processedRows / job.totalRows) * 100);
                return (
                  <tr key={job.id}>
                    <td>
                      <Link href={`/dashboard/jobs/${job.id}`} style={{ color: "var(--accent)" }}>
                        {job.name}
                      </Link>
                    </td>
                    <td style={{ textTransform: "capitalize" }}>{job.status}</td>
                    <td>
                      {job.processedRows}/{job.totalRows} ({pct}%)
                    </td>
                    <td>{job.validMobileCount}</td>
                    <td>{job.invalidCount}</td>
                    <td className="muted" style={{ fontSize: "0.85rem" }}>
                      {job.createdAt.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
