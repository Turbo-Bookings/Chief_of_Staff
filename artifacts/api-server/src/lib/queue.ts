import { Queue, Worker, type Job } from "bullmq";
import { logger } from "./logger";
import { db, captureJobsTable, messagesTable, agentActionsLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { processCaptureJob } from "./captureProcessor";
import { generateBriefingForDate } from "./briefingGenerator";

const REDIS_URL = process.env.REDIS_URL;
const CAPTURE_MAX_ATTEMPTS = 3;

export let captureQueue: Queue | null = null;
let briefingQueue: Queue | null = null;

async function handleFinalCaptureFailure(job: Job, err: Error): Promise<void> {
  const { jobId, messageId } = job.data as { jobId: string; messageId?: number };

  logger.error({ err, jobId, messageId, attempts: job.attemptsMade }, "Capture job exhausted all retries");

  if (messageId) {
    await db
      .update(messagesTable)
      .set({
        content: "[transcription failed — tap to retry]",
        transcriptionConfidence: "0.000",
      })
      .where(eq(messagesTable.id, messageId))
      .catch((e) => logger.error({ e }, "Failed to update message with fallback"));

    await db
      .insert(agentActionsLogTable)
      .values({
        action: "capture_job_failed",
        source: "capture",
        entityType: "message",
        entityId: String(messageId),
        payload: { jobId, messageId, error: err.message, attempts: job.attemptsMade },
      })
      .catch((e) => logger.error({ e }, "Failed to log final capture failure to agent_actions_log"));
  }

  await db
    .update(captureJobsTable)
    .set({ status: "failed", errorMessage: err.message })
    .where(eq(captureJobsTable.jobId, jobId))
    .catch(() => {});
}

if (REDIS_URL) {
  const connection = { url: REDIS_URL };

  captureQueue = new Queue("capture", { connection });

  const captureWorker = new Worker(
    "capture",
    async (job: Job) => {
      const { jobId } = job.data as { jobId: string };
      logger.info({ jobId, attempt: job.attemptsMade + 1 }, "Processing capture job");

      await db
        .update(captureJobsTable)
        .set({ status: "processing" })
        .where(eq(captureJobsTable.jobId, jobId));

      await processCaptureJob(jobId);
      logger.info({ jobId }, "Capture job completed");
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

  captureWorker.on("failed", async (job: Job | undefined, err: Error) => {
    if (!job) return;
    const maxAttempts = (job.opts?.attempts ?? CAPTURE_MAX_ATTEMPTS);
    if (job.attemptsMade >= maxAttempts) {
      await handleFinalCaptureFailure(job, err);
    } else {
      const { jobId } = job.data as { jobId: string };
      logger.warn({ err, jobId, attempt: job.attemptsMade, maxAttempts }, "Capture job failed, will retry");
    }
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

export async function enqueueCapture(jobId: string, messageId?: number): Promise<void> {
  if (captureQueue) {
    await captureQueue.add("capture", { jobId, messageId }, {
      attempts: CAPTURE_MAX_ATTEMPTS,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: 10,
      removeOnFail: 10,
    });
  } else {
    processCaptureJob(jobId).catch(async (err) => {
      logger.error({ err, jobId }, "Inline capture processing failed after all retries");
      if (messageId) {
        await db
          .update(messagesTable)
          .set({
            content: "[transcription failed — tap to retry]",
            transcriptionConfidence: "0.000",
          })
          .where(eq(messagesTable.id, messageId))
          .catch(() => {});

        await db
          .insert(agentActionsLogTable)
          .values({
            action: "capture_job_failed",
            source: "capture",
            entityType: "message",
            entityId: String(messageId),
            payload: { jobId, messageId, error: String(err) },
          })
          .catch(() => {});
      }
      await db.update(captureJobsTable)
        .set({ status: "failed", errorMessage: String(err) })
        .where(eq(captureJobsTable.jobId, jobId))
        .catch(() => {});
    });
  }
}
