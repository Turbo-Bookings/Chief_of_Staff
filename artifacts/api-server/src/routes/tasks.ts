import { Router, type IRouter } from "express";
import { db, tasksTable, teamMembersTable, agentActionsLogTable } from "@workspace/db";
import { eq, sql, isNull } from "drizzle-orm";
import {
  ListTasksQueryParams,
  CreateTaskBody,
  GetTaskParams,
  UpdateTaskParams,
  UpdateTaskBody,
  DeleteTaskParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const TASK_SELECT = {
  id: tasksTable.id,
  title: tasksTable.title,
  description: tasksTable.description,
  status: tasksTable.status,
  priority: tasksTable.priority,
  assigneeId: tasksTable.assigneeId,
  assigneeName: teamMembersTable.name,
  dueDate: tasksTable.dueDate,
  createdAt: tasksTable.createdAt,
  updatedAt: tasksTable.updatedAt,
};

router.get("/tasks", async (req, res): Promise<void> => {
  const queryParams = ListTasksQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  const { status, assigneeId } = queryParams.data;

  const tasks = await db
    .select(TASK_SELECT)
    .from(tasksTable)
    .leftJoin(teamMembersTable, eq(tasksTable.assigneeId, teamMembersTable.id))
    .where(
      sql`${tasksTable.deletedAt} IS NULL
        AND ${status != null ? sql`${tasksTable.status} = ${status}` : sql`1=1`}
        AND ${assigneeId != null ? sql`${tasksTable.assigneeId} = ${assigneeId}` : sql`1=1`}`,
    )
    .orderBy(tasksTable.createdAt);

  res.json(tasks.map((t) => ({
    ...t,
    dueDate: t.dueDate ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  })));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, description, status, priority, assigneeId, dueDate } = parsed.data;

  const dueDateStr = dueDate instanceof Date ? dueDate.toISOString().split("T")[0] : dueDate ?? null;

  const [task] = await db
    .insert(tasksTable)
    .values({
      title,
      description: description ?? null,
      status: (status ?? "open") as "open" | "in_progress" | "done" | "blocked",
      priority: (priority ?? undefined) as "low" | "medium" | "high" | "critical" | undefined,
      assigneeId: assigneeId ?? null,
      dueDate: dueDateStr,
    })
    .returning();

  const assignee = task!.assigneeId
    ? await db.select().from(teamMembersTable).where(eq(teamMembersTable.id, task!.assigneeId)).limit(1)
    : [];

  await db.insert(agentActionsLogTable).values({
    action: "task.created",
    entityType: "task",
    entityId: String(task!.id),
    payload: { title, status: task!.status },
    source: "manual",
  });

  res.status(201).json({
    ...task!,
    assigneeName: assignee[0]?.name ?? null,
    dueDate: task!.dueDate ?? null,
    createdAt: task!.createdAt.toISOString(),
    updatedAt: task!.updatedAt.toISOString(),
  });
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .select(TASK_SELECT)
    .from(tasksTable)
    .leftJoin(teamMembersTable, eq(tasksTable.assigneeId, teamMembersTable.id))
    .where(sql`${tasksTable.id} = ${params.data.id} AND ${tasksTable.deletedAt} IS NULL`);

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json({
    ...task,
    dueDate: task.dueDate ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  });
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

  const updates: Record<string, unknown> = {};
  const { title, description, status, priority, assigneeId, dueDate } = parsed.data;

  if (title != null) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (status != null) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  if (assigneeId !== undefined) updates.assigneeId = assigneeId;
  if (dueDate !== undefined) {
    updates.dueDate = dueDate instanceof Date ? dueDate.toISOString().split("T")[0] : dueDate;
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

  const assignee = task.assigneeId
    ? await db.select().from(teamMembersTable).where(eq(teamMembersTable.id, task.assigneeId)).limit(1)
    : [];

  await db.insert(agentActionsLogTable).values({
    action: "task.updated",
    entityType: "task",
    entityId: String(task.id),
    payload: updates as Record<string, unknown>,
    source: "manual",
  });

  res.json({
    ...task,
    assigneeName: assignee[0]?.name ?? null,
    dueDate: task.dueDate ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  });
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
