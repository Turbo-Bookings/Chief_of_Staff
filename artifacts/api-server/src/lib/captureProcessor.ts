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

const SYSTEM_PROMPT = `You are the parsing layer of Selmen's Chief of Staff agent. Your job is to take
a captured input and return structured JSON describing what it is and what
action should be taken.

Selmen is the CEO of Takeovers Rentals. He brain-dumps thoughts throughout
the day — tasks, reminders, decisions, ideas, questions. You classify each.

Return ONLY a JSON object with this shape:
{
  "type": "task" | "reminder" | "decision" | "context" | "question" | "draft_request" | "project",
  "title": "short summary, max 100 chars",
  "description": "full structured description",
  "proposed_owner_hint": null | "team member name if mentioned",
  "proposed_priority": "urgent" | "high" | "normal" | "low",
  "proposed_due": null | "ISO timestamp if mentioned",
  "tags": ["array", "of", "tags"],
  "requires_clarification": false,
  "clarification_question": null | "question to ask Selmen if unclear"
}`;

interface ClauseParse {
  type: "task" | "reminder" | "decision" | "context" | "question" | "draft_request" | "project";
  title: string;
  description: string;
  proposed_owner_hint: string | null;
  proposed_priority: "urgent" | "high" | "normal" | "low";
  proposed_due: string | null;
  tags: string[];
  requires_clarification: boolean;
  clarification_question: string | null;
}

async function getOrCreatePrincipalThread() {
  const [existing] = await db
    .select()
    .from(threadsTable)
    .where(eq(threadsTable.threadType, "principal_talk"))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(threadsTable)
    .values({
      title: "Talk",
      threadType: "principal_talk",
      channel: "pwa",
      status: "active",
      messageCount: 0,
    })
    .returning();

  return created!;
}

export async function processCaptureJob(jobId: string): Promise<void> {
  const [job] = await db
    .select()
    .from(captureJobsTable)
    .where(eq(captureJobsTable.jobId, jobId));

  if (!job) {
    throw new Error(`Capture job ${jobId} not found`);
  }

  let transcript = job.rawText ?? "";
  let contentType: "text" | "voice" = job.audioObjectPath ? "voice" : "text";
  let transcriptionConfidence: number | null = null;

  if (job.audioObjectPath && !transcript) {
    logger.info({ jobId, audioObjectPath: job.audioObjectPath }, "Transcribing audio via Whisper");
    const objectPath = job.audioObjectPath.replace(/^\/objects\//, "");
    const privateDir = process.env.PRIVATE_OBJECT_DIR ?? "/tmp/objects";
    const filePath = path.join(privateDir, objectPath);

    if (fs.existsSync(filePath)) {
      const fileStream = fs.createReadStream(filePath);
      const transcription = await openaiClient.audio.transcriptions.create({
        file: fileStream as unknown as File,
        model: "whisper-1",
        response_format: "verbose_json",
      });
      transcript = transcription.text;
      transcriptionConfidence = (transcription as unknown as { avg_logprob?: number }).avg_logprob
        ? Math.min(1, Math.max(0, ((transcription as unknown as { avg_logprob: number }).avg_logprob + 2) / 2))
        : null;
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
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Captured input: "${transcript}"` }],
  });

  const contentBlock = response.content[0];
  if (!contentBlock || contentBlock.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  let parsed: ClauseParse;

  try {
    const jsonMatch = contentBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    parsed = JSON.parse(jsonMatch[0]) as ClauseParse;
  } catch (err) {
    logger.error({ err, rawResponse: contentBlock.text }, "Failed to parse Claude response");
    throw new Error("Failed to parse AI response");
  }

  const priorityMap: Record<string, "urgent" | "high" | "normal" | "low"> = {
    urgent: "urgent",
    high: "high",
    normal: "normal",
    low: "low",
  };

  if (parsed.type === "task" || parsed.type === "reminder") {
    await db.insert(tasksTable).values({
      title: parsed.title ?? transcript.slice(0, 100),
      description: parsed.description ?? null,
      status: "captured",
      priority: priorityMap[parsed.proposed_priority] ?? "normal",
      proposedOwnerHint: parsed.proposed_owner_hint ?? null,
      proposedDueAt: parsed.proposed_due ? new Date(parsed.proposed_due) : null,
      tags: parsed.tags ?? [],
      sourceJobId: jobId,
    });
    logger.info({ jobId, taskTitle: parsed.title }, "Task created from capture");
  }

  const principalThread = await getOrCreatePrincipalThread();

  const [userMessage] = await db
    .insert(messagesTable)
    .values({
      threadId: principalThread.id,
      role: "user",
      content: transcript,
      audioObjectPath: job.audioObjectPath ?? null,
      direction: "inbound",
      senderType: "principal",
      contentType,
      contentUrl: job.audioObjectPath ?? null,
      transcriptionConfidence: transcriptionConfidence?.toString() ?? null,
      claudeParse: parsed as unknown as Record<string, unknown>,
    })
    .returning();

  const agentReply = buildAgentReply(parsed);

  await db.insert(messagesTable).values({
    threadId: principalThread.id,
    role: "assistant",
    content: agentReply,
    direction: "outbound",
    senderType: "agent",
    contentType: "text",
  });

  await db
    .update(threadsTable)
    .set({
      lastMessageAt: new Date(),
      messageCount: principalThread.messageCount + 2,
    })
    .where(eq(threadsTable.id, principalThread.id));

  await db
    .update(captureJobsTable)
    .set({
      status: "done",
      transcript,
      parsedEntities: parsed as unknown as Record<string, unknown>,
    })
    .where(eq(captureJobsTable.jobId, jobId));

  logger.info({ jobId, type: parsed.type }, "Capture job complete");
}

function buildAgentReply(parsed: ClauseParse): string {
  const parts: string[] = [];

  if (parsed.type === "task" || parsed.type === "reminder") {
    parts.push(`Logged: **${parsed.title}**`);
    if (parsed.proposed_priority && parsed.proposed_priority !== "normal") {
      parts.push(`Priority: ${parsed.proposed_priority}`);
    }
    if (parsed.proposed_due) {
      const due = new Date(parsed.proposed_due);
      parts.push(`Due: ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
    }
    parts.push("Tap to view in Today tab.");
  } else if (parsed.type === "decision") {
    parts.push(`Decision noted: **${parsed.title}**`);
  } else if (parsed.type === "context") {
    parts.push(`Context captured: **${parsed.title}**`);
  } else if (parsed.type === "question") {
    parts.push(`Question logged: **${parsed.title}**`);
    if (parsed.clarification_question) {
      parts.push(parsed.clarification_question);
    }
  } else {
    parts.push(`Captured: **${parsed.title ?? "Note"}**`);
  }

  return parts.join(" · ");
}
