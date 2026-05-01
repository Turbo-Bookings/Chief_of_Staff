import { Router, type IRouter } from "express";
import { db, tasksTable, teamMembersTable, agentActionsLogTable } from "@workspace/db";
import { eq, sql, inArray } from "drizzle-orm";
import {
  ListTasksQueryParams,
  CreateTaskBody,
  GetTaskParams,
  UpdateTaskParams,
  UpdateTaskBody,
  DeleteTaskParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

type TaskRow = typeof tasksTable.$inferSelect;

function serializeTask(task: TaskRow, assigneeName?: string | null) {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority ?? null,
    assigneeId: task.assigneeId ?? null,
    assigneeName: assigneeName ?? null,
    ownerId: task.ownerId ?? null,
    dueDate: task.dueDate ?? null,
    dueAt: task.dueAt?.toISOString() ?? null,
    authorityTier: task.authorityTier ?? null,
    tags: (task.tags as string[]) ?? [],
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

async function resolveAssigneeNames(assigneeIds: (number | null)[]) {
  const ids = assigneeIds.filter((id): id is number => id != null);
  if (ids.length === 0) return new Map<number, string>();
  const members = await db
    .select({ id: teamMembersTable.id, name: teamMembersTable.name })
    .from(teamMembersTable)
    .where(inArray(teamMembersTable.id, ids));
  return new Map(members.map((m) => [m.id, m.name]));
}

router.get("/tasks", async (req, res): Promise<void> => {
  const queryParams = ListTasksQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  const { status, assigneeId } = queryParams.data;

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(
      sql`${tasksTable.deletedAt} IS NULL
        AND ${status != null ? sql`${tasksTable.status} = ${status}` : sql`1=1`}
        AND ${assigneeId != null ? sql`${tasksTable.assigneeId} = ${assigneeId}` : sql`1=1`}`,
    )
    .orderBy(tasksTable.createdAt);

  const nameMap = await resolveAssigneeNames(tasks.map((t) => t.assigneeId));
  res.json(tasks.map((t) => serializeTask(t, nameMap.get(t.assigneeId ?? -1) ?? null)));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, description, status, priority, assigneeId, ownerId, dueDate, dueAt, authorityTier, tags } = parsed.data;

  const dueDateStr = dueDate instanceof Date ? dueDate.toISOString().split("T")[0] : (dueDate as string | null | undefined) ?? null;

  const [task] = await db
    .insert(tasksTable)
    .values({
      title,
      description: description ?? null,
      status: (status ?? "captured") as typeof tasksTable.$inferInsert["status"],
      priority: (priority ?? "normal") as typeof tasksTable.$inferInsert["priority"],
      assigneeId: assigneeId ?? null,
      ownerId: ownerId ?? null,
      dueDate: dueDateStr,
      dueAt: dueAt instanceof Date ? dueAt : null,
      authorityTier: (authorityTier ?? "A") as "A" | "B" | "C",
      tags: tags ?? [],
    })
    .returning();

  const assigneeName = task!.assigneeId
    ? (await db.select({ name: teamMembersTable.name }).from(teamMembersTable).where(eq(teamMembersTable.id, task!.assigneeId)).limit(1))[0]?.name ?? null
    : null;

  await db.insert(agentActionsLogTable).values({
    action: "task.created",
    entityType: "task",
    entityId: String(task!.id),
    payload: { title, status: task!.status },
    source: "manual",
  });

  res.status(201).json(serializeTask(task!, assigneeName));
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .select()
    .from(tasksTable)
    .where(sql`${tasksTable.id} = ${params.data.id} AND ${tasksTable.deletedAt} IS NULL`);

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const assigneeName = task.assigneeId
    ? (await db.select({ name: teamMembersTable.name }).from(teamMembersTable).where(eq(teamMembersTable.id, task.assigneeId)).limit(1))[0]?.name ?? null
    : null;

  res.json(serializeTask(task, assigneeName));
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<typeof tasksTable.$inferInsert> = {};
  const { title, description, status, priority, assigneeId, ownerId, dueDate, dueAt, authorityTier } = parsed.data;

  if (title != null) updates.title = title;
  if (description !== undefined) updates.description = description ?? undefined;
  if (status != null) updates.status = status as typeof tasksTable.$inferInsert["status"];
  if (priority !== undefined) updates.priority = (priority ?? undefined) as typeof tasksTable.$inferInsert["priority"];
  if (assigneeId !== undefined) updates.assigneeId = assigneeId ?? undefined;
  if (ownerId !== undefined) updates.ownerId = ownerId ?? undefined;
  if (dueDate !== undefined) {
    updates.dueDate = dueDate instanceof Date ? dueDate.toISOString().split("T")[0] : ((dueDate as string | null | undefined) ?? undefined);
  }
  if (dueAt !== undefined) {
    updates.dueAt = dueAt instanceof Date ? dueAt : undefined;
  }
  if (authorityTier !== undefined && authorityTier !== null) {
    updates.authorityTier = authorityTier as "A" | "B" | "C";
  }

  const [task] = await db
    .update(tasksTable)
    .set(updates)
    .where(sql`${tasksTable.id} = ${params.data.id} AND ${tasksTable.deletedAt} IS NULL`)
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const assigneeName = task.assigneeId
    ? (await db.select({ name: teamMembersTable.name }).from(teamMembersTable).where(eq(teamMembersTable.id, task.assigneeId)).limit(1))[0]?.name ?? null
    : null;

  await db.insert(agentActionsLogTable).values({
    action: "task.updated",
    entityType: "task",
    entityId: String(task.id),
    payload: updates as Record<string, unknown>,
    source: "manual",
  });

  res.json(serializeTask(task, assigneeName));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .update(tasksTable)
    .set({ deletedAt: new Date() })
    .where(sql`${tasksTable.id} = ${params.data.id} AND ${tasksTable.deletedAt} IS NULL`)
    .returning({ id: tasksTable.id });

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  await db.insert(agentActionsLogTable).values({
    action: "task.deleted",
    entityType: "task",
    entityId: String(task.id),
    payload: { softDelete: true },
    source: "manual",
  });

  res.sendStatus(204);
});

export default router;
