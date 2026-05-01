import { Queue, Worker, type Job } from "bullmq";
import { logger } from "./logger";
import { db, captureJobsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { processCaptureJob } from "./captureProcessor";

const REDIS_URL = process.env.REDIS_URL;

export let captureQueue: Queue | null = null;

if (REDIS_URL) {
  const connection = { url: REDIS_URL };

  captureQueue = new Queue("capture", { connection });

  const captureWorker = new Worker(
    "capture",
    async (job: Job) => {
      const { jobId } = job.data as { jobId: string };
      logger.info({ jobId }, "Processing capture job");

      await db
        .update(captureJobsTable)
        .set({ status: "processing" })
        .where(eq(captureJobsTable.jobId, jobId));

      try {
        await processCaptureJob(jobId);
        logger.info({ jobId }, "Capture job completed");
      } catch (err) {
        logger.error({ err, jobId }, "Capture job failed");
        await db
          .update(captureJobsTable)
          .set({ status: "failed", errorMessage: String(err) })
          .where(eq(captureJobsTable.jobId, jobId));
        throw err;
      }
    },
    { connection },
  );

  captureWorker.on("completed", async (job: Job) => {
    const { jobId } = job.data as { jobId: string };
    await db
      .update(captureJobsTable)
      .set({ status: "done" })
      .where(eq(captureJobsTable.jobId, jobId));
  });

  captureWorker.on("failed", (job: Job | undefined, err: Error) => {
    logger.error({ err, job: job?.id }, "Worker job failed");
  });

  logger.info("BullMQ capture queue and worker initialized");
} else {
  logger.warn("REDIS_URL not set — BullMQ disabled, capture jobs run inline");
}

export async function enqueueCapture(jobId: string): Promise<void> {
  if (captureQueue) {
    await captureQueue.add("capture", { jobId });
  } else {
    processCaptureJob(jobId).catch((err) => {
      logger.error({ err, jobId }, "Inline capture processing failed");
      db.update(captureJobsTable)
        .set({ status: "failed", errorMessage: String(err) })
        .where(eq(captureJobsTable.jobId, jobId))
        .catch(() => {});
    });
  }
}
