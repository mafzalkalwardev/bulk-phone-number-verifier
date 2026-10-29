import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncBnetza } from "@/lib/importers/bnetza";
import { syncNanpa, syncNanpaFromText } from "@/lib/importers/nanpa";
import { syncOfcom, syncOfcomFromCsv } from "@/lib/importers/ofcom";
import { seedNumberBlocks } from "@/lib/importers/seed-blocks";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [blockCounts, syncRuns] = await Promise.all([
    prisma.numberBlock.groupBy({
      by: ["country", "source", "status"],
      _count: true,
    }),
    prisma.syncRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
    }),
  ]);

  const totalBlocks = await prisma.numberBlock.count();
  const liveConfigured = Boolean(process.env.REDIS_URL); // informational; live HLR separate

  return NextResponse.json({
    totalBlocks,
    blockCounts,
    syncRuns,
    liveLookup: {
      configured: false,
      message:
        "Live HLR provider is not configured. Results are structural + regulator block only.",
    },
    queue: {
      redis: Boolean(process.env.REDIS_URL?.trim()),
      mode: process.env.REDIS_URL?.trim() ? "bullmq" : "in-process",
      redisConfiguredNote: liveConfigured,
    },
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const source = String(body.source || "all");
  const text = typeof body.text === "string" ? body.text : "";

  const results: Record<string, unknown> = {};

  if (source === "seed" || source === "all") {
    results.seed = { upserted: await seedNumberBlocks() };
  }
  if (source === "nanpa" || source === "all") {
    if (text && source === "nanpa") {
      results.nanpa = { upserted: await syncNanpaFromText(text), message: "Imported from body text" };
    } else {
      results.nanpa = await syncNanpa();
    }
  }
  if (source === "ofcom" || source === "all") {
    if (text && source === "ofcom") {
      results.ofcom = { upserted: await syncOfcomFromCsv(text), message: "Imported from body text" };
    } else {
      results.ofcom = await syncOfcom();
    }
  }
  if (source === "bnetza" || source === "all") {
    if (text && source === "bnetza") {
      const { syncBnetzaFromCsv } = await import("@/lib/importers/bnetza");
      results.bnetza = { upserted: await syncBnetzaFromCsv(text), message: "Imported from body text" };
    } else {
      results.bnetza = await syncBnetza();
    }
  }

  return NextResponse.json({ ok: true, results });
}
