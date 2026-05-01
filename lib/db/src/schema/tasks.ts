import { pgTable, serial, text, integer, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamMembersTable } from "./teamMembers";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", {
    enum: ["open", "in_progress", "done", "blocked", "captured", "dispatched", "acknowledged", "complete", "cancelled"],
  }).notNull().default("captured"),
  priority: text("priority", {
    enum: ["low", "medium", "high", "critical", "urgent", "normal"],
  }).default("normal"),
  assigneeId: integer("assignee_id").references(() => teamMembersTable.id),
  ownerId: integer("owner_id").references(() => teamMembersTable.id),
  originMessageId: integer("origin_message_id"),
  dueDate: date("due_date"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  proposedDueAt: timestamp("proposed_due_at", { withTimezone: true }),
  dispatchChannel: text("dispatch_channel", { enum: ["sms", "email", "pwa"] }),
  authorityTier: text("authority_tier", { enum: ["A", "B", "C"] }).default("A"),
  projectId: integer("project_id"),
  tags: jsonb("tags").default([]),
  proposedOwnerHint: text("proposed_owner_hint"),
  sourceJobId: text("source_job_id"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
