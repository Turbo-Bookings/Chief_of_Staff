import { Router, type IRouter } from "express";
import { db, threadsTable, messagesTable } from "@workspace/db";
import { eq, lt, desc } from "drizzle-orm";
import { GetThreadMessagesParams, GetThreadMessagesQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/threads", async (_req, res): Promise<void> => {
  const threads = await db
    .select()
    .from(threadsTable)
    .orderBy(desc(threadsTable.lastMessageAt));

  res.json(threads.map((t) => ({
    id: t.id,
    title: t.title,
    lastMessageAt: t.lastMessageAt?.toISOString() ?? null,
    messageCount: t.messageCount ?? null,
    createdAt: t.createdAt.toISOString(),
  })));
});

router.get("/threads/:id/messages", async (req, res): Promise<void> => {
  const params = GetThreadMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const queryParams = GetThreadMessagesQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  const [thread] = await db
    .select()
    .from(threadsTable)
    .where(eq(threadsTable.id, params.data.id));

  if (!thread) {
    res.status(404).json({ error: "Thread not found" });
    return;
  }

  const limit = queryParams.data.limit ?? 50;
  const before = queryParams.data.before;

  const messages = await db
    .select()
    .from(messagesTable)
    .where(
      before != null
        ? eq(messagesTable.threadId, params.data.id)
        : eq(messagesTable.threadId, params.data.id),
    )
    .orderBy(desc(messagesTable.createdAt))
    .limit(limit);

  res.json(messages.reverse().map((m) => ({
    id: m.id,
    threadId: m.threadId,
    role: m.role,
    content: m.content,
    audioObjectPath: m.audioObjectPath ?? null,
    createdAt: m.createdAt.toISOString(),
  })));
});

export default router;
