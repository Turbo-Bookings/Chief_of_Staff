import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { db, captureJobsTable, messagesTable, threadsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SubmitCaptureBody, SubmitVoiceCaptureBody } from "@workspace/api-zod";
import { enqueueCapture } from "../lib/queue";
import { getOrCreatePrincipalThread } from "../lib/captureProcessor";

const router: IRouter = Router();

router.post("/capture", async (req, res): Promise<void> => {
  const parsed = SubmitCaptureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { audioObjectPath, text } = parsed.data;

  if (!audioObjectPath && !text) {
    res.status(400).json({ error: "Either audioObjectPath or text must be provided" });
    return;
  }

  const principalThread = await getOrCreatePrincipalThread();

  const [message] = await db
    .insert(messagesTable)
    .values({
      threadId: principalThread.id,
      role: "user",
      content: text ?? "",
      audioObjectPath: audioObjectPath ?? null,
      direction: "inbound",
      senderType: "principal",
      contentType: audioObjectPath ? "voice" : "text",
      contentUrl: audioObjectPath ?? null,
    })
    .returning();

  await db
    .update(threadsTable)
    .set({ lastMessageAt: new Date(), messageCount: (principalThread.messageCount ?? 0) + 1 })
    .where(eq(threadsTable.id, principalThread.id))
    .catch(() => {});

  const jobId = randomUUID();

  await db.insert(captureJobsTable).values({
    jobId,
    messageId: message!.id,
    status: "queued",
    audioObjectPath: audioObjectPath ?? null,
    rawText: text ?? null,
  });

  await enqueueCapture(jobId);

  res.status(202).json({ messageId: message!.id, jobId, status: "queued" });
});

router.post("/capture/voice", async (req, res): Promise<void> => {
  const parsed = SubmitVoiceCaptureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { audioObjectPath, durationSeconds } = parsed.data;

  const principalThread = await getOrCreatePrincipalThread();

  const [message] = await db
    .insert(messagesTable)
    .values({
      threadId: principalThread.id,
      role: "user",
      content: "",
      audioObjectPath,
      direction: "inbound",
      senderType: "principal",
      contentType: "voice",
      contentUrl: audioObjectPath,
    })
    .returning();

  const jobId = randomUUID();

  await db.insert(captureJobsTable).values({
    jobId,
    messageId: message!.id,
    status: "queued",
    audioObjectPath,
    rawText: null,
    durationSeconds: durationSeconds ?? null,
  });

  await enqueueCapture(jobId);

  res.status(202).json({ messageId: message!.id, status: "transcribing" });
});

router.get("/capture/voice/:id", async (req, res): Promise<void> => {
  const messageId = parseInt(req.params.id ?? "", 10);
  if (isNaN(messageId)) {
    res.status(400).json({ error: "Invalid message id" });
    return;
  }

  const [message] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.id, messageId));

  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  let status: "transcribing" | "parsed" | "done";
  if (!message.content || message.content === "") {
    status = "transcribing";
  } else if (!message.claudeParse) {
    status = "parsed";
  } else {
    status = "done";
  }

  res.json({
    messageId: message.id,
    status,
    transcript: message.content || null,
    transcriptionConfidence: message.transcriptionConfidence ? Number(message.transcriptionConfidence) : null,
    claudeParse: message.claudeParse ?? null,
  });
});

router.get("/capture/:jobId/status", async (req, res): Promise<void> => {
  const jobId = req.params.jobId;
  if (!jobId) {
    res.status(400).json({ error: "Missing jobId" });
    return;
  }

  const [job] = await db
    .select()
    .from(captureJobsTable)
    .where(eq(captureJobsTable.jobId, jobId));

  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json({
    jobId: job.jobId,
    messageId: job.messageId ?? null,
    status: job.status,
    transcript: job.transcript ?? null,
    parsedEntities: job.parsedEntities ?? null,
    error: job.errorMessage ?? null,
  });
});

export default router;
