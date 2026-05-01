import { db, captureJobsTable, tasksTable, threadsTable, messagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { ObjectStorageService } from "./objectStorage";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI, { toFile } from "openai";

const anthropicClient = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const openaiClient = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const objectStorage = new ObjectStorageService();

const WHISPER_PROMPT =
  "Selmen Hassen, CEO, Takeovers Rentals. Team: Oscar, Nick, Josh, Orlando, Joan, Kathy, Karina, Tahir, Richard, Brandon. " +
  "Business terms: Fareharbor, ATV, UTV, sunflower field, Miami, Dallas, Houston. Properties, rentals, leases, maintenance.";

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

interface ClaudeParse {
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

export async function getOrCreatePrincipalThread() {
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

export async function transcribeVoiceMemo(contentUrl: string): Promise<{ text: string; confidence: string }> {
  const objectFile = await objectStorage.getObjectEntityFile(contentUrl);

  const chunks: Buffer[] = [];
  const stream = objectFile.createReadStream();

  await new Promise<void>((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on("end", resolve);
    stream.on("error", reject);
  });

  const audioBuffer = Buffer.concat(chunks);

  const filename = contentUrl.split("/").pop() ?? "audio.webm";
  const audioFile = await toFile(audioBuffer, filename, { type: "audio/webm" });

  const transcription = await openaiClient.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
    prompt: WHISPER_PROMPT,
    response_format: "verbose_json",
  });

  const avgLogprob = (transcription as unknown as { avg_logprob?: number }).avg_logprob;
  const confidence =
    typeof avgLogprob === "number"
      ? Math.min(1, Math.max(0, (avgLogprob + 2) / 2)).toFixed(3)
      : "0.500";

  return { text: transcription.text, confidence };
}

export async function processCaptureJob(jobId: string): Promise<void> {
  const [job] = await db
    .select()
    .from(captureJobsTable)
    .where(eq(captureJobsTable.jobId, jobId));

  if (!job) {
    throw new Error(`Capture job ${jobId} not found`);
  }

  const messageId = job.messageId;
  if (!messageId) {
    throw new Error(`Capture job ${jobId} has no associated messageId`);
  }

  const [message] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.id, messageId));

  if (!message) {
    throw new Error(`Message ${messageId} not found`);
  }

  let transcript = message.content;

  if (message.contentType === "voice" && message.contentUrl) {
    logger.info({ jobId, messageId, contentUrl: message.contentUrl }, "Transcribing audio via Whisper");

    const { text, confidence } = await transcribeVoiceMemo(message.contentUrl);
    transcript = text;

    await db
      .update(messagesTable)
      .set({ content: transcript, transcriptionConfidence: confidence })
      .where(eq(messagesTable.id, messageId));

    logger.info({ jobId, messageId, transcriptLength: transcript.length }, "Transcription complete");
  }

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

  let parsed: ClaudeParse;

  try {
    const jsonMatch = contentBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in Claude response");
    parsed = JSON.parse(jsonMatch[0]) as ClaudeParse;
  } catch (err) {
    logger.error({ err, rawResponse: contentBlock.text }, "Failed to parse Claude response");
    throw new Error("Failed to parse AI response");
  }

  await db
    .update(messagesTable)
    .set({ claudeParse: parsed as unknown as Record<string, unknown> })
    .where(eq(messagesTable.id, messageId));

  const priorityMap: Record<string, "urgent" | "high" | "normal" | "low"> = {
    urgent: "urgent", high: "high", normal: "normal", low: "low",
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
      originMessageId: messageId,
    });
    logger.info({ jobId, messageId, taskTitle: parsed.title }, "Task created from capture");
  }

  const principalThread = await getOrCreatePrincipalThread();
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
    .set({ lastMessageAt: new Date(), messageCount: (principalThread.messageCount ?? 0) + 1 })
    .where(eq(threadsTable.id, principalThread.id));

  await db
    .update(captureJobsTable)
    .set({ status: "done", transcript, parsedEntities: parsed as unknown as Record<string, unknown> })
    .where(eq(captureJobsTable.jobId, jobId));

  logger.info({ jobId, messageId, type: parsed.type }, "Capture job complete");
}

function buildAgentReply(parsed: ClaudeParse): string {
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
    if (parsed.clarification_question) parts.push(parsed.clarification_question);
  } else {
    parts.push(`Captured: **${parsed.title ?? "Note"}**`);
  }

  return parts.join(" · ");
}
