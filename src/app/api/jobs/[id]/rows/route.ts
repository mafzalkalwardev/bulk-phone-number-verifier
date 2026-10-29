import { NextResponse } from "next/server";
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
  const classification = url.searchParams.get("classification");
  const lineType = url.searchParams.get("lineType");
  const smsCandidates = url.searchParams.get("smsCandidates") === "1";
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get("pageSize") || "50")));

  const where: Record<string, unknown> = { jobId: id };
  if (classification) where.classification = classification;
  if (lineType) where.lineType = lineType;
  if (smsCandidates) {
    where.classification = "structurally_valid";
    where.lineType = { in: ["mobile", "fixed_line_or_mobile"] };
  }

  const [total, rows] = await Promise.all([
    prisma.jobRow.count({ where }),
    prisma.jobRow.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    rows: rows.map((r) => ({
      ...r,
      formats: r.formatsJson ? JSON.parse(r.formatsJson) : null,
      raw: r.rawJson ? JSON.parse(r.rawJson) : null,
    })),
  });
}
