import { processJob } from "@/lib/jobs/process-job";

/**
 * Enqueue a verification job.
 * Uses BullMQ when REDIS_URL is set; otherwise processes asynchronously in-process
 * (and the `npm run worker` DB poller can also pick up pending jobs).
 */
export async function enqueueVerificationJob(jobId: string): Promise<void> {
  const redisUrl = process.env.REDIS_URL?.trim();

  if (redisUrl) {
    try {
      const { Queue } = await import("bullmq");
      const { default: IORedis } = await import("ioredis");
      const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
      const queue = new Queue("phone-verify", { connection });
      await queue.add("verify", { jobId }, { removeOnComplete: 100, removeOnFail: 50 });
      await queue.close();
      await connection.quit();
      return;
    } catch (err) {
      console.warn("BullMQ enqueue failed, falling back to in-process:", err);
    }
  }

  // Fire-and-forget in-process processing (dev / no Redis)
  setTimeout(() => {
    processJob(jobId).catch((err) => {
      console.error(`Job ${jobId} failed:`, err);
    });
  }, 0);
}
