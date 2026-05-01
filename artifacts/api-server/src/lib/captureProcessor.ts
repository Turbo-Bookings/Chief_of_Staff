import { db, captureJobsTable, tasksTable, threadsTable, messagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const anthropicClient = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const openaiClient = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SYSTEM_PROMPT = `You are a Chief of Staff AI for Selmen Hassen, CEO of Takeovers Rentals.
You parse voice memos and notes to extract:
1. Tasks with assignees, priority, and deadlines
2. Follow-ups that need tracking
3. Escalations that need urgent attention

Respond ONLY with valid JSON in this exact format:
{
  "tasks": [{ "title": string, "assigneeName": string | null, "priority": "low" | "medium" | "high" | "critical", "dueDate": string | null, "description": string | null }],
  "followups": [{ "description": string, "person": string | null }],
  "escalations": [{ "description": string, "severity": "low" | "medium" | "high" }],
  "summary": string
}`;

export async function processCaptureJob(jobId: string): Promise<void> {
  const [job] = await db
    .select()
    .from(captureJobsTable)
    .where(eq(captureJobsTable.jobId, jobId));

  if (!job) {
    throw new Error(`Capture job ${jobId} not found`);
  }

  let transcript = job.rawText ?? "";

  if (job.audioObjectPath && !transcript) {
    logger.info({ jobId, audioObjectPath: job.audioObjectPath }, "Transcribing audio");
    const objectPath = job.audioObjectPath.replace(/^\/objects\//, "");
    const privateDir = process.env.PRIVATE_OBJECT_DIR ?? "/tmp/objects";
    const filePath = path.join(privateDir, objectPath);

    if (fs.existsSync(filePath)) {
      const fileStream = fs.createReadStream(filePath);
      const transcription = await openaiClient.audio.transcriptions.create({
        file: fileStream as unknown as File,
        model: "whisper-1",
      });
      transcript = transcription.text;
      logger.info({ jobId, transcriptLength: transcript.length }, "Transcription complete");
    } else {
      logger.warn({ jobId, filePath }, "Audio file not found, skipping transcription");
      transcript = "[Audio file not accessible]";
    }
  }

  await db
    .update(captureJobsTable)
    .set({ transcript })
    .where(eq(captureJobsTable.jobId, jobId));

  const response = await anthropicClient.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: transcript }],
  });

  const contentBlock = response.content[0];
  if (contentBlock.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  let parsed: {
    tasks: Array<{ title: string; assigneeName: string | null; priority: string; dueDate: string | null; description: string | null }>;
    followups: Array<{ description: string; person: string | null }>;
    escalations: Array<{ description: string; severity: string }>;
    summary: string;
  };

  try {
    const jsonMatch = contentBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    logger.error({ err, rawResponse: contentBlock.text }, "Failed to parse Claude response");
    throw new Error("Failed to parse AI response");
  }

  for (const task of parsed.tasks ?? []) {
    await db.insert(tasksTable).values({
      title: task.title,
      description: task.description ?? null,
      status: "open",
      priority: (["low", "medium", "high", "critical"].includes(task.priority) ? task.priority : "medium") as "low" | "medium" | "high" | "critical",
      sourceJobId: jobId,
    });
  }

  const [principalThread] = await db
    .select()
    .from(threadsTable)
    .where(eq(threadsTable.title, "principal_talk"))
    .limit(1);

  if (principalThread) {
    await db.insert(messagesTable).values({
      threadId: principalThread.id,
      role: "user",
      content: transcript,
      audioObjectPath: job.audioObjectPath ?? null,
    });

    if (parsed.summary) {
      await db.insert(messagesTable).values({
        threadId: principalThread.id,
        role: "assistant",
        content: parsed.summary,
      });
    }

    await db
      .update(threadsTable)
      .set({ lastMessageAt: new Date(), messageCount: principalThread.messageCount + (parsed.summary ? 2 : 1) })
      .where(eq(threadsTable.id, principalThread.id));
  }

  await db
    .update(captureJobsTable)
    .set({
      status: "done",
      transcript,
      parsedEntities: parsed as unknown as Record<string, unknown>,
    })
    .where(eq(captureJobsTable.jobId, jobId));
}
