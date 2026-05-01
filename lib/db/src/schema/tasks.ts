import { pgTable, serial, text, integer, timestamp, date, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamMembersTable } from "./teamMembers";
import { taskStatusEnum, priorityEnum, authorityTierEnum, dispatchChannelEnum } from "./enums";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("captured"),
  priority: priorityEnum("priority").default("normal"),
  assigneeId: integer("assignee_id").references(() => teamMembersTable.id),
  ownerId: integer("owner_id").references(() => teamMembersTable.id),
  originMessageId: integer("origin_message_id"),
  dueDate: date("due_date"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  proposedDueAt: timestamp("proposed_due_at", { withTimezone: true }),
  dispatchChannel: dispatchChannelEnum("dispatch_channel"),
  authorityTier: authorityTierEnum("authority_tier").default("A"),
  projectId: integer("project_id"),
  tags: jsonb("tags").default([]),
  proposedOwnerHint: text("proposed_owner_hint"),
  sourceJobId: text("source_job_id"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("tasks_status_idx").on(table.status),
  index("tasks_priority_idx").on(table.priority),
  index("tasks_owner_id_idx").on(table.ownerId),
  index("tasks_deleted_at_idx").on(table.deletedAt),
  index("tasks_due_at_idx").on(table.dueAt),
  index("tasks_created_at_idx").on(table.createdAt),
  index("tasks_unassigned_active_idx").on(table.ownerId, table.status, table.deletedAt),
]);

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
