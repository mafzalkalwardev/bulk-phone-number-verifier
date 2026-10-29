import { prisma } from "@/lib/db";

/**
 * NANPA importer.
 * Downloads public CO code assignment data when available; falls back to documenting
 * the expected format and leaving seed data in place.
 *
 * Official sources:
 * - https://nationalnanpa.com/reports/co-code-reports/cocodes_assign
 * - Utilized CO codes ZIP (tab-delimited: State, NPA-NXX, OCN, Company Name, ...)
 */
export async function syncNanpaFromText(content: string, source = "nanpa"): Promise<number> {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  let upserted = 0;

  for (const line of lines) {
    // Skip headers
    if (/state/i.test(line) && /npa/i.test(line)) continue;

    const parts = line.includes("\t") ? line.split("\t") : line.split(",");
    if (parts.length < 2) continue;

    const npaNxxRaw = (parts[1] || parts[0]).replace(/"/g, "").trim();
    const match = npaNxxRaw.match(/(\d{3})-?(\d{3})/);
    if (!match) continue;

    const prefix = `${match[1]}${match[2]}`;
    const ocn = (parts[2] || "").replace(/"/g, "").trim() || null;
    const carrier = (parts[3] || "").replace(/"/g, "").trim() || null;
    const statusField = (parts[4] || "").toUpperCase();
    // Utilized files = allocated; available files should pass status free
    const status =
      statusField.includes("UA") || statusField.includes("AVAILABLE")
        ? "free"
        : "allocated";

    await prisma.numberBlock.upsert({
      where: { country_prefix: { country: "US", prefix } },
      create: {
        country: "US",
        prefix,
        status,
        carrier,
        ocn,
        source,
        syncedAt: new Date(),
      },
      update: {
        status,
        carrier,
        ocn,
        source,
        syncedAt: new Date(),
      },
    });
    upserted++;
  }

  return upserted;
}

export async function syncNanpa(): Promise<{ upserted: number; message: string }> {
  const run = await prisma.syncRun.create({
    data: { source: "nanpa", status: "running" },
  });

  try {
    // Attempt download of a public summary if network allows.
    // Full regional ZIPs require selecting a region; we try the all-states utilized listing page pattern.
    const urls = [
      process.env.NANPA_UTILIZED_URL,
    ].filter(Boolean) as string[];

    let upserted = 0;
    let message = "No NANPA_UTILIZED_URL set; seed blocks remain. Upload a CO-code file via admin sync.";

    for (const url of urls) {
      const res = await fetch(url);
      if (!res.ok) continue;
      const text = await res.text();
      upserted += await syncNanpaFromText(text, "nanpa");
      message = `Imported ${upserted} NANPA prefixes from ${url}`;
    }

    if (upserted === 0) {
      message =
        "NANPA live download not configured. Place utilized CO-code TSV content via API /api/admin/sync/nanpa with body { text }, or set NANPA_UTILIZED_URL. Seed data covers demo prefixes.";
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
    const message = err instanceof Error ? err.message : "NANPA sync failed";
    await prisma.syncRun.update({
      where: { id: run.id },
      data: { status: "failed", message, finishedAt: new Date() },
    });
    throw err;
  }
}
