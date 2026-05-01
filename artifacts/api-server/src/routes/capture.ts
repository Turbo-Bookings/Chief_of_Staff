import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { db, captureJobsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SubmitCaptureBody, GetCaptureJobStatusParams } from "@workspace/api-zod";
import { enqueueCapture } from "../lib/queue";

const router: IRouter = Router();

router.post("/capture", async (req, res): Promise<void> => {
  const parsed = SubmitCaptureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { audioObjectPath, text, durationSeconds } = parsed.data;

  if (!audioObjectPath && !text) {
    res.status(400).json({ error: "Either audioObjectPath or text must be provided" });
    return;
  }

  const jobId = randomUUID();

  await db.insert(captureJobsTable).values({
    jobId,
    status: "queued",
    audioObjectPath: audioObjectPath ?? null,
    rawText: text ?? null,
    durationSeconds: durationSeconds ?? null,
  });

  await enqueueCapture(jobId);

  res.status(202).json({ jobId, status: "queued" });
});

router.get("/capture/:jobId/status", async (req, res): Promise<void> => {
  const params = GetCaptureJobStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [job] = await db
    .select()
    .from(captureJobsTable)
    .where(eq(captureJobsTable.jobId, params.data.jobId));

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json({
    jobId: job.jobId,
    status: job.status,
    transcript: job.transcript ?? null,
    parsedEntities: job.parsedEntities ?? null,
    error: job.errorMessage ?? null,
  });
});

export default router;
