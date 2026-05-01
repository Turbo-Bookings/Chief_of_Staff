import { Router, type IRouter } from "express";
import { db, briefingsTable, tasksTable, messagesTable, threadsTable } from "@workspace/db";
import { eq, desc, isNull, and, sql } from "drizzle-orm";
import { generateBriefingForDate } from "../lib/briefingGenerator";

const router: IRouter = Router();

router.get("/today/brief", async (req, res): Promise<void> => {
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
    req.log.error({ err }, "Failed to generate today brief");
    res.status(500).json({ error: "Failed to generate brief" });
  }
});

router.get("/today/tasks", async (req, res): Promise<void> => {
  const statusFilter = req.query.status as string | undefined;

  const allowedStatuses = [
    "open", "in_progress", "done", "blocked",
    "captured", "dispatched", "acknowledged", "complete", "cancelled",
  ];

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(
      and(
        isNull(tasksTable.deletedAt),
        isNull(tasksTable.ownerId),
        statusFilter && allowedStatuses.includes(statusFilter)
          ? sql`${tasksTable.status} = ${statusFilter}`
          : sql`${tasksTable.status} IN ('captured', 'open', 'dispatched', 'acknowledged', 'in_progress', 'blocked')`,
      ),
    )
    .orderBy(desc(tasksTable.createdAt))
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
      dueDate: t.dueDate ?? null,
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
        eq(messagesTable.role, "user"),
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
