import { prisma } from "@/lib/db";
import { verifyNumber } from "@/lib/pipeline/verify";

const BATCH_SIZE = 50;

export async function processJob(jobId: string): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return;
  if (job.status === "completed" || job.status === "failed") return;

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "processing" },
  });

  try {
    let hasMore = true;

    while (hasMore) {
      const pending = await prisma.jobRow.findMany({
        where: { jobId, classification: "pending" },
        take: BATCH_SIZE,
        orderBy: { createdAt: "asc" },
      });

      if (pending.length === 0) {
        hasMore = false;
        break;
      }

      let invalidCount = 0;
      let unallocatedCount = 0;
      let validMobileCount = 0;
      let validOtherCount = 0;
      let unknownCount = 0;

      for (const row of pending) {
        const result = await verifyNumber(row.input, job.defaultCountry, {
          useCache: true,
          includeLive: true,
        });

        await prisma.jobRow.update({
          where: { id: row.id },
          data: {
            e164: result.e164,
            country: result.country,
            lineType: result.lineType,
            classification: result.classification,
            blockStatus: result.blockStatus,
            blockPrefix: result.blockPrefix,
            blockCarrier: result.blockCarrier,
            blockSource: result.blockSource,
            score: result.score,
            formatsJson: result.formats ? JSON.stringify(result.formats) : null,
            rawJson: JSON.stringify(result),
          },
        });

        switch (result.classification) {
          case "invalid":
            invalidCount++;
            break;
          case "unallocated":
            unallocatedCount++;
            break;
          case "unknown":
            unknownCount++;
            break;
          case "structurally_valid":
            if (
              result.lineType === "mobile" ||
              result.lineType === "fixed_line_or_mobile"
            ) {
              validMobileCount++;
            } else {
              validOtherCount++;
            }
            break;
        }
      }

      await prisma.job.update({
        where: { id: jobId },
        data: {
          processedRows: { increment: pending.length },
          invalidCount: { increment: invalidCount },
          unallocatedCount: { increment: unallocatedCount },
          validMobileCount: { increment: validMobileCount },
          validOtherCount: { increment: validOtherCount },
          unknownCount: { increment: unknownCount },
        },
      });
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });
  } catch (err) {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Job failed",
      },
    });
    throw err;
  }
}

/** Claim next pending job (DB-backed queue fallback when Redis is unavailable). */
export async function processNextPendingJob(): Promise<string | null> {
  const job = await prisma.job.findFirst({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
  });
  if (!job) return null;
  await processJob(job.id);
  return job.id;
}
