/**
 * Background worker:
 * - If REDIS_URL is set, consumes BullMQ jobs
 * - Otherwise polls DB for pending jobs
 *
 * Load env from .env manually for standalone script.
 */
import { config } from "dotenv";
config();

async function processJob(jobId: string) {
  // Dynamic import after env loaded so Prisma picks up DATABASE_URL
  const { processJob: run } = await import("../src/lib/jobs/process-job");
  await run(jobId);
}

async function processNextPendingJob() {
  const { processNextPendingJob: next } = await import("../src/lib/jobs/process-job");
  return next();
}

async function runDbPoller() {
  console.log("[worker] DB poller started (no REDIS_URL)");
  for (;;) {
    try {
      const id = await processNextPendingJob();
      if (!id) {
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        console.log(`[worker] completed job ${id}`);
      }
    } catch (err) {
      console.error("[worker] error", err);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

async function runBullWorker() {
  const redisUrl = process.env.REDIS_URL!;
  const { Worker } = await import("bullmq");
  const { default: IORedis } = await import("ioredis");
  const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

  console.log("[worker] BullMQ worker started");
  const worker = new Worker(
    "phone-verify",
    async (job) => {
      const jobId = job.data.jobId as string;
      console.log(`[worker] processing ${jobId}`);
      await processJob(jobId);
    },
    { connection }
  );

  worker.on("failed", (job, err) => {
    console.error(`[worker] failed ${job?.id}`, err);
  });
}

async function main() {
  if (process.env.REDIS_URL?.trim()) {
    await runBullWorker();
  } else {
    await runDbPoller();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
