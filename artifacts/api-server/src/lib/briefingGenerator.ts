import { db, briefingsTable, tasksTable, messagesTable, threadsTable } from "@workspace/db";
import { eq, sql, count } from "drizzle-orm";
import { logger } from "./logger";
import Anthropic from "@anthropic-ai/sdk";

const anthropicClient = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

async function getPrincipalThread() {
  const [thread] = await db
    .select()
    .from(threadsTable)
    .where(eq(threadsTable.threadType, "principal_talk"))
    .limit(1);
  return thread ?? null;
}

export async function generateBriefingForDate(
  dateStr: string,
): Promise<typeof briefingsTable.$inferSelect> {
  const openTasksResult = await db
    .select({ count: count() })
    .from(tasksTable)
    .where(
      sql`${tasksTable.status} NOT IN ('complete', 'cancelled', 'done') AND ${tasksTable.deletedAt} IS NULL`,
    );
  const openTasksCount = openTasksResult[0]?.count ?? 0;

  const openTasks = await db
    .select()
    .from(tasksTable)
    .where(
      sql`${tasksTable.status} NOT IN ('complete', 'cancelled', 'done') AND ${tasksTable.deletedAt} IS NULL`,
    )
    .limit(20);

  const tasksText =
    openTasks.length > 0
      ? openTasks
          .map(
            (t) =>
              `- [${t.priority ?? "normal"} / ${t.status}] ${t.title}${t.description ? `: ${t.description}` : ""}${t.dueAt ? ` (due ${t.dueAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })})` : ""}`,
          )
          .join("\n")
      : "No open tasks.";

  const prompt = `Today is ${dateStr}. You are the AI Chief of Staff for Selmen Hassen, CEO of Takeovers Rentals.

Current open tasks (${openTasksCount} total):
${tasksText}

Write a concise daily briefing in markdown. Include:
1. **Top Priorities** — 3-5 most important things to address today
2. **Open Tasks Summary** — brief status overview
3. **Action Items** — specific things Selmen should do today

Keep it focused and actionable. Use markdown formatting.`;

  const response = await anthropicClient.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const contentBlock = response.content[0];
  if (!contentBlock || contentBlock.type !== "text") {
    throw new Error("Unexpected response from Claude");
  }

  const markdown = contentBlock.text;

  const [existing] = await db
    .select()
    .from(briefingsTable)
    .where(eq(briefingsTable.date, dateStr));

  let briefing: typeof briefingsTable.$inferSelect;

  if (existing) {
    const [updated] = await db
      .update(briefingsTable)
      .set({
        markdown,
        openTasksCount: Number(openTasksCount),
        escalationCount: 0,
        generatedAt: new Date(),
      })
      .where(eq(briefingsTable.date, dateStr))
      .returning();
    briefing = updated!;
  } else {
    const [created] = await db
      .insert(briefingsTable)
      .values({
        date: dateStr,
        markdown,
        openTasksCount: Number(openTasksCount),
        escalationCount: 0,
      })
      .returning();
    briefing = created!;
  }

  const principalThread = await getPrincipalThread();
  if (principalThread) {
    await db.insert(messagesTable).values({
      threadId: principalThread.id,
      role: "assistant",
      content: markdown,
      direction: "outbound",
      senderType: "agent",
      contentType: "system",
    });
    logger.info({ date: dateStr, threadId: principalThread.id }, "Briefing stored as system message in principal thread");
  }

  logger.info({ date: dateStr }, "Generated briefing");
  return briefing;
}
