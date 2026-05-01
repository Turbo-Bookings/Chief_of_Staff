import { db, briefingsTable, tasksTable } from "@workspace/db";
import { eq, sql, count } from "drizzle-orm";
import { logger } from "./logger";
import Anthropic from "@anthropic-ai/sdk";

const anthropicClient = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

export async function generateBriefingForDate(
  dateStr: string,
): Promise<typeof briefingsTable.$inferSelect> {
  const openTasksResult = await db
    .select({ count: count() })
    .from(tasksTable)
    .where(sql`${tasksTable.status} != 'done' AND ${tasksTable.deletedAt} IS NULL`);
  const openTasksCount = openTasksResult[0]?.count ?? 0;

  const openTasks = await db
    .select()
    .from(tasksTable)
    .where(sql`${tasksTable.status} != 'done' AND ${tasksTable.deletedAt} IS NULL`)
    .limit(20);

  const tasksText =
    openTasks.length > 0
      ? openTasks
          .map(
            (t) =>
              `- [${t.status}${t.priority ? ` / ${t.priority}` : ""}] ${t.title}${t.description ? `: ${t.description}` : ""}`,
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
  if (contentBlock.type !== "text") {
    throw new Error("Unexpected response from Claude");
  }

  const [existing] = await db
    .select()
    .from(briefingsTable)
    .where(eq(briefingsTable.date, dateStr));

  if (existing) {
    const [updated] = await db
      .update(briefingsTable)
      .set({
        markdown: contentBlock.text,
        openTasksCount: Number(openTasksCount),
        escalationCount: 0,
        generatedAt: new Date(),
      })
      .where(eq(briefingsTable.date, dateStr))
      .returning();
    return updated!;
  }

  const [created] = await db
    .insert(briefingsTable)
    .values({
      date: dateStr,
      markdown: contentBlock.text,
      openTasksCount: Number(openTasksCount),
      escalationCount: 0,
    })
    .returning();

  logger.info({ date: dateStr }, "Generated briefing");
  return created!;
}
