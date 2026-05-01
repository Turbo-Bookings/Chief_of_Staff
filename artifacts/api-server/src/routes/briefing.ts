import { Router, type IRouter } from "express";
import { db, briefingsTable, tasksTable } from "@workspace/db";
import { eq, sql, count } from "drizzle-orm";
import { logger } from "../lib/logger";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();

const anthropicClient = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

async function generateBriefingForDate(dateStr: string): Promise<typeof briefingsTable.$inferSelect> {
  const openTasksResult = await db
    .select({ count: count() })
    .from(tasksTable)
    .where(sql`${tasksTable.status} != 'done'`);
  const openTasksCount = openTasksResult[0]?.count ?? 0;

  const openTasks = await db
    .select()
    .from(tasksTable)
    .where(sql`${tasksTable.status} != 'done'`)
    .limit(20);

  const tasksText = openTasks.length > 0
    ? openTasks.map((t) => `- [${t.status}${t.priority ? ` / ${t.priority}` : ""}] ${t.title}${t.description ? `: ${t.description}` : ""}`).join("\n")
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
  return created!;
}

router.get("/briefing/today", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0]!;

  const [existing] = await db
    .select()
    .from(briefingsTable)
    .where(eq(briefingsTable.date, today));

  if (existing) {
    res.json({
      id: existing.id,
      date: existing.date,
      markdown: existing.markdown,
      generatedAt: existing.generatedAt.toISOString(),
      openTasksCount: existing.openTasksCount ?? null,
      escalationCount: existing.escalationCount ?? null,
    });
    return;
  }

  try {
    const briefing = await generateBriefingForDate(today);
    res.json({
      id: briefing.id,
      date: briefing.date,
      markdown: briefing.markdown,
      generatedAt: briefing.generatedAt.toISOString(),
      openTasksCount: briefing.openTasksCount ?? null,
      escalationCount: briefing.escalationCount ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to generate briefing");
    res.status(500).json({ error: "Failed to generate briefing" });
  }
});

router.post("/briefing/today/regenerate", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0]!;
  try {
    const briefing = await generateBriefingForDate(today);
    res.json({
      id: briefing.id,
      date: briefing.date,
      markdown: briefing.markdown,
      generatedAt: briefing.generatedAt.toISOString(),
      openTasksCount: briefing.openTasksCount ?? null,
      escalationCount: briefing.escalationCount ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to regenerate briefing");
    res.status(500).json({ error: "Failed to regenerate briefing" });
  }
});

export default router;
