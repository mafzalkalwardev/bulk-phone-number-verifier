import { prisma } from "@/lib/db";

/**
 * BNetzA (Germany) best-effort importer.
 * Public machine-readable assignment dumps vary; we accept a simple CSV:
 * prefix,status,carrier
 * and also seed well-known mobile ranges (15x/16x/17x).
 */
export async function syncBnetzaFromCsv(content: string, source = "bnetza"): Promise<number> {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  let upserted = 0;

  for (const line of lines) {
    if (/prefix/i.test(line) && /status/i.test(line)) continue;
    const parts = line.split(",").map((p) => p.replace(/"/g, "").trim());
    if (parts.length < 1) continue;

    const prefix = parts[0].replace(/\D/g, "");
    if (prefix.length < 2) continue;

    const statusRaw = (parts[1] || "allocated").toLowerCase();
    const status = statusRaw.includes("free") ? "free" : "allocated";
    const carrier = parts[2] || null;

    await prisma.numberBlock.upsert({
      where: { country_prefix: { country: "DE", prefix } },
      create: {
        country: "DE",
        prefix,
        status,
        carrier,
        source,
        syncedAt: new Date(),
      },
      update: {
        status,
        carrier,
        source,
        syncedAt: new Date(),
      },
    });
    upserted++;
  }

  return upserted;
}

/** Known DE mobile NDC prefixes used when no external CSV is provided */
const DE_MOBILE_NDCS = [
  "150", "151", "152", "155", "156", "157", "159",
  "160", "162", "163", "170", "171", "172", "173",
  "174", "175", "176", "177", "178", "179",
];

export async function syncBnetza(): Promise<{ upserted: number; message: string }> {
  const run = await prisma.syncRun.create({
    data: { source: "bnetza", status: "running" },
  });

  try {
    const url = process.env.BNETZA_CSV_URL;
    let upserted = 0;
    let message = "";

    if (url) {
      const res = await fetch(url);
      if (res.ok) {
        upserted = await syncBnetzaFromCsv(await res.text(), "bnetza");
        message = `Imported ${upserted} BNetzA prefixes from ${url}`;
      }
    }

    if (upserted === 0) {
      for (const prefix of DE_MOBILE_NDCS) {
        await prisma.numberBlock.upsert({
          where: { country_prefix: { country: "DE", prefix } },
          create: {
            country: "DE",
            prefix,
            status: "allocated",
            carrier: "DE mobile NDC (plan)",
            source: "bnetza",
            syncedAt: new Date(),
          },
          update: {
            status: "allocated",
            source: "bnetza",
            syncedAt: new Date(),
          },
        });
        upserted++;
      }
      message = `Upserted ${upserted} DE mobile NDC prefixes from numbering plan (block-level; not subscriber active status).`;
    }

    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        rowsUpserted: upserted,
        message,
        finishedAt: new Date(),
      },
    });

    return { upserted, message };
  } catch (err) {
    const message = err instanceof Error ? err.message : "BNetzA sync failed";
    await prisma.syncRun.update({
      where: { id: run.id },
      data: { status: "failed", message, finishedAt: new Date() },
    });
    throw err;
  }
}
