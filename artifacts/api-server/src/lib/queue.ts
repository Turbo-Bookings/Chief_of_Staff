import { Queue, Worker, type Job } from "bullmq";
import { logger } from "./logger";
import { db, captureJobsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { processCaptureJob } from "./captureProcessor";
import { generateBriefingForDate } from "./briefingGenerator";

const REDIS_URL = process.env.REDIS_URL;

export let captureQueue: Queue | null = null;
let briefingQueue: Queue | null = null;

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
    {
      connection,
      settings: {
        backoffStrategy: (attemptsMade: number) => Math.pow(2, attemptsMade) * 1000,
      },
    },
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

  briefingQueue = new Queue("briefing", { connection });

  const briefingWorker = new Worker(
    "briefing",
    async (_job: Job) => {
      const dateStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
      logger.info({ dateStr }, "Generating scheduled briefing");
      try {
        await generateBriefingForDate(dateStr);
        logger.info({ dateStr }, "Scheduled briefing generated");
      } catch (err) {
        logger.error({ err, dateStr }, "Failed to generate scheduled briefing");
        throw err;
      }
    },
    { connection },
  );

  briefingWorker.on("failed", (job: Job | undefined, err: Error) => {
    logger.error({ err, job: job?.id }, "Briefing cron job failed");
  });

  briefingQueue.add(
    "morning-briefing",
    {},
    {
      repeat: { pattern: "0 7 * * *", tz: "America/New_York" },
      jobId: "morning-briefing",
      removeOnComplete: 3,
      removeOnFail: 3,
    },
  ).catch((err) => logger.error({ err }, "Failed to schedule morning briefing"));

  briefingQueue.add(
    "evening-briefing",
    {},
    {
      repeat: { pattern: "0 18 * * *", tz: "America/New_York" },
      jobId: "evening-briefing",
      removeOnComplete: 3,
      removeOnFail: 3,
    },
  ).catch((err) => logger.error({ err }, "Failed to schedule evening briefing"));

  logger.info("BullMQ queues initialized: capture + briefing cron (7 AM / 6 PM ET)");
} else {
  logger.warn("REDIS_URL not set — BullMQ disabled, capture jobs run inline, briefing cron inactive");
}

export async function enqueueCapture(jobId: string): Promise<void> {
  if (captureQueue) {
    await captureQueue.add("capture", { jobId }, {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: 10,
      removeOnFail: 10,
    });
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
