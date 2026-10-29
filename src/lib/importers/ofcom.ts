import { prisma } from "@/lib/db";

/**
 * Ofcom numbering data importer (UK).
 * Source: https://www.ofcom.org.uk/phones-and-broadband/phone-numbers/numbering-data
 * CSV columns typically include number block + status Allocated/Free + CP name.
 */
export async function syncOfcomFromCsv(content: string, source = "ofcom"): Promise<number> {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return 0;

  const header = lines[0].toLowerCase();
  const delim = header.includes("\t") ? "\t" : ",";
  const cols = lines[0].split(delim).map((c) => c.replace(/"/g, "").trim().toLowerCase());

  const blockIdx =
    cols.findIndex((c) => c.includes("number") || c.includes("block") || c.includes("code")) >= 0
      ? cols.findIndex((c) => c.includes("number") || c.includes("block") || c.includes("code"))
      : 0;
  const statusIdx = cols.findIndex((c) => c.includes("status") || c.includes("allocation"));
  const carrierIdx = cols.findIndex(
    (c) => c.includes("communications provider") || c.includes("provider") || c.includes("cp")
  );

  let upserted = 0;

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(delim).map((p) => p.replace(/"/g, "").trim());
    const blockRaw = parts[blockIdx] || "";
    const digits = blockRaw.replace(/\D/g, "");
    if (digits.length < 3) continue;

    // Prefer national form with leading 0 when present in source
    let prefix = blockRaw.startsWith("0") ? `0${digits.replace(/^0+/, "")}` : digits;
    // Normalize: keep a useful prefix length
    if (prefix.startsWith("0")) {
      prefix = prefix.slice(0, Math.min(prefix.length, 7));
    } else {
      prefix = prefix.slice(0, Math.min(prefix.length, 6));
    }

    const statusRaw = (statusIdx >= 0 ? parts[statusIdx] : "Allocated").toLowerCase();
    const status = statusRaw.includes("free") || statusRaw.includes("available")
      ? "free"
      : "allocated";
    const carrier = carrierIdx >= 0 ? parts[carrierIdx] || null : null;

    await prisma.numberBlock.upsert({
      where: { country_prefix: { country: "GB", prefix } },
      create: {
        country: "GB",
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

export async function syncOfcom(): Promise<{ upserted: number; message: string }> {
  const run = await prisma.syncRun.create({
    data: { source: "ofcom", status: "running" },
  });

  try {
    const url = process.env.OFCOM_CSV_URL;
    let upserted = 0;
    let message =
      "Ofcom live download not configured. POST CSV text to /api/admin/sync/ofcom or set OFCOM_CSV_URL. Seed data covers demo UK prefixes.";

    if (url) {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        upserted = await syncOfcomFromCsv(text, "ofcom");
        message = `Imported ${upserted} Ofcom prefixes from ${url}`;
      }
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
    const message = err instanceof Error ? err.message : "Ofcom sync failed";
    await prisma.syncRun.update({
      where: { id: run.id },
      data: { status: "failed", message, finishedAt: new Date() },
    });
    throw err;
  }
}
