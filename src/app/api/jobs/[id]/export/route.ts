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
  // all | clean | sms | live_active | invalid | unallocated | structurally_valid | unknown

  const where: Record<string, unknown> = { jobId: id };
  if (filter === "clean" || filter === "sms" || filter === "live_active") {
    where.classification = "structurally_valid";
    if (filter === "sms") {
      where.lineType = { in: ["mobile", "fixed_line_or_mobile"] };
    }
  } else if (filter !== "all") {
    where.classification = filter;
  }

  let rows = await prisma.jobRow.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });

  if (filter === "live_active") {
    rows = rows.filter((r) => {
      if (!r.rawJson) return false;
      try {
        const raw = JSON.parse(r.rawJson) as { liveStatus?: string };
        return raw.liveStatus === "active";
      } catch {
        return false;
      }
    });
  }

  const data = rows.map((r) => {
    let live: Record<string, unknown> = {};
    try {
      live = r.rawJson ? (JSON.parse(r.rawJson) as Record<string, unknown>) : {};
    } catch {
      live = {};
    }

    const liveStatus = String(live.liveStatus || "");
    return {
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
      live_status: liveStatus,
      live_connectivity: live.liveConnectivity || "",
      live_carrier: live.liveCarrier || "",
      live_ported: live.livePorted ?? "",
      live_roaming: live.liveRoaming ?? "",
      live_data_source: live.liveDataSource || "",
      note:
        liveStatus === "active"
          ? "Live HLR: CONNECTED / active on network"
          : liveStatus === "invalid"
            ? "Live HLR: INVALID_MSISDN / dead"
            : liveStatus === "absent"
              ? "Live HLR: ABSENT (exists but unreachable now)"
              : r.classification === "structurally_valid"
                ? "Structurally valid / block allocated — live HLR not confirmed"
                : r.classification === "unallocated"
                  ? "Regulator block marked free/unallocated"
                  : r.classification === "unknown"
                    ? "Valid format but no regulator block coverage"
                    : "Invalid numbering-plan format",
    };
  });

  const csv = Papa.unparse(data);
  const filename = `${job.name.replace(/[^\w.-]+/g, "_")}_${filter}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
