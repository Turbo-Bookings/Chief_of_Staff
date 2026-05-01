import { Router, type IRouter } from "express";
import { db, threadsTable, messagesTable } from "@workspace/db";
import { eq, desc, lt, and } from "drizzle-orm";
import { GetThreadMessagesParams, GetThreadMessagesQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

function serializeMessage(m: typeof messagesTable.$inferSelect) {
  return {
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
  };
}

router.get("/threads/principal", async (_req, res): Promise<void> => {
  let [principalThread] = await db
    .select()
    .from(threadsTable)
    .where(eq(threadsTable.threadType, "principal_talk"))
    .limit(1);

  if (!principalThread) {
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
    principalThread = created!;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.threadId, principalThread.id))
    .orderBy(desc(messagesTable.createdAt))
    .limit(50);

  res.json({
    thread: {
      id: principalThread.id,
      title: principalThread.title,
      threadType: principalThread.threadType,
      channel: principalThread.channel ?? null,
      status: principalThread.status ?? null,
      lastMessageAt: principalThread.lastMessageAt?.toISOString() ?? null,
      messageCount: principalThread.messageCount ?? null,
      createdAt: principalThread.createdAt.toISOString(),
    },
    messages: messages.reverse().map(serializeMessage),
  });
});

router.get("/threads", async (_req, res): Promise<void> => {
  const threads = await db
    .select()
    .from(threadsTable)
    .orderBy(desc(threadsTable.lastMessageAt));

  res.json(
    threads.map((t) => ({
      id: t.id,
      title: t.title,
      threadType: t.threadType ?? null,
      channel: t.channel ?? null,
      status: t.status ?? null,
      lastMessageAt: t.lastMessageAt?.toISOString() ?? null,
      messageCount: t.messageCount ?? null,
      createdAt: t.createdAt.toISOString(),
    })),
  );
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

  const conditions = before != null
    ? and(
        eq(messagesTable.threadId, params.data.id),
        lt(messagesTable.id, before),
      )
    : eq(messagesTable.threadId, params.data.id);

  const messages = await db
    .select()
    .from(messagesTable)
    .where(conditions)
    .orderBy(desc(messagesTable.createdAt))
    .limit(limit);

  res.json(messages.reverse().map(serializeMessage));
});

export default router;
