import { Router, type IRouter } from "express";
import { db, tasksTable, messagesTable, threadsTable } from "@workspace/db";
import { eq, desc, isNull, and, notInArray, asc, sql } from "drizzle-orm";

const router: IRouter = Router();

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

router.get("/today/brief", async (_req, res): Promise<void> => {
  const [principalThread] = await db
    .select()
    .from(threadsTable)
    .where(eq(threadsTable.threadType, "principal_talk"))
    .limit(1);

  if (!principalThread) {
    res.json({
      id: null,
      date: new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }),
      markdown: "Good morning, Selmen. No briefing has been generated yet. Your first brief will appear here at 7 AM.",
      generatedAt: null,
      openTasksCount: null,
      escalationCount: null,
    });
    return;
  }

  const [briefMessage] = await db
    .select()
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.threadId, principalThread.id),
        eq(messagesTable.senderType, "agent"),
        eq(messagesTable.contentType, "system"),
      ),
    )
    .orderBy(desc(messagesTable.createdAt))
    .limit(1);

  if (!briefMessage) {
    res.json({
      id: null,
      date: new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }),
      markdown: "Good morning, Selmen. No briefing has been generated yet. Your first brief will appear here at 7 AM.",
      generatedAt: null,
      openTasksCount: null,
      escalationCount: null,
    });
    return;
  }

  res.json({
    id: briefMessage.id,
    date: briefMessage.createdAt.toLocaleDateString("en-CA", { timeZone: "America/New_York" }),
    markdown: briefMessage.content,
    generatedAt: briefMessage.createdAt.toISOString(),
    openTasksCount: null,
    escalationCount: null,
  });
});

router.get("/today/tasks", async (_req, res): Promise<void> => {
  const tasks = await db
    .select()
    .from(tasksTable)
    .where(
      and(
        isNull(tasksTable.deletedAt),
        isNull(tasksTable.ownerId),
        notInArray(tasksTable.status, ["complete", "cancelled", "done"]),
      ),
    )
    .orderBy(
      sql`CASE
        WHEN ${tasksTable.priority} = 'urgent' THEN 0
        WHEN ${tasksTable.priority} = 'high' THEN 1
        WHEN ${tasksTable.priority} = 'normal' THEN 2
        WHEN ${tasksTable.priority} = 'low' THEN 3
        ELSE 4
      END`,
      asc(tasksTable.dueAt),
      asc(tasksTable.createdAt),
    )
    .limit(100);

  res.json(
    tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description ?? null,
      status: t.status,
      priority: t.priority ?? null,
      assigneeId: t.assigneeId ?? null,
      assigneeName: null,
      ownerId: t.ownerId ?? null,
      dueAt: t.dueAt?.toISOString() ?? null,
      authorityTier: t.authorityTier ?? null,
      tags: (t.tags as string[]) ?? [],
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  );
});

router.get("/today/recent-captures", async (req, res): Promise<void> => {
  const limit = Math.min(parseInt((req.query.limit as string) ?? "20", 10), 50);

  const [principalThread] = await db
    .select()
    .from(threadsTable)
    .where(eq(threadsTable.threadType, "principal_talk"))
    .limit(1);

  if (!principalThread) {
    res.json([]);
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.threadId, principalThread.id),
        eq(messagesTable.direction, "inbound"),
      ),
    )
    .orderBy(desc(messagesTable.createdAt))
    .limit(limit);

  res.json(
    messages.map((m) => ({
      id: m.id,
      threadId: m.threadId,
      role: m.role,
      content: m.content,
      audioObjectPath: m.audioObjectPath ?? null,
      direction: m.direction ?? null,
      senderType: m.senderType ?? null,
      contentType: m.contentType ?? null,
      contentUrl: m.contentUrl ?? null,
      transcriptionConfidence: m.transcriptionConfidence ? Number(m.transcriptionConfidence) : null,
      claudeParse: m.claudeParse ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  );
});

export default router;
