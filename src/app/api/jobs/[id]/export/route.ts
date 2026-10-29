import { NextResponse } from "next/server";
import Papa from "papaparse";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const job = await prisma.job.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") || "all";
  // all | clean | sms | invalid | unallocated | structurally_valid | unknown

  const where: Record<string, unknown> = { jobId: id };
  if (filter === "clean" || filter === "sms") {
    where.classification = "structurally_valid";
    if (filter === "sms") {
      where.lineType = { in: ["mobile", "fixed_line_or_mobile"] };
    }
  } else if (filter !== "all") {
    where.classification = filter;
  }

  const rows = await prisma.jobRow.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });

  const data = rows.map((r) => ({
    input: r.input,
    e164: r.e164 || "",
    country: r.country || "",
    line_type: r.lineType || "",
    classification: r.classification,
    block_status: r.blockStatus || "",
    block_prefix: r.blockPrefix || "",
    block_carrier: r.blockCarrier || "",
    block_source: r.blockSource || "",
    score: r.score,
    note:
      r.classification === "structurally_valid"
        ? "Structurally valid / block allocated — NOT live network active"
        : r.classification === "unallocated"
          ? "Regulator block marked free/unallocated"
          : r.classification === "unknown"
            ? "Valid format but no regulator block coverage"
            : "Invalid numbering-plan format",
  }));

  const csv = Papa.unparse(data);
  const filename = `${job.name.replace(/[^\w.-]+/g, "_")}_${filter}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
