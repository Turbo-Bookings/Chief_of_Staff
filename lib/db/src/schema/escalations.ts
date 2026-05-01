import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tasksTable } from "./tasks";
import { followupsTable } from "./followups";

export const escalationsTable = pgTable("escalations", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasksTable.id),
  followupId: integer("followup_id").references(() => followupsTable.id),
  reason: text("reason").notNull(),
  recommendedAction: text("recommended_action"),
  status: text("status", {
    enum: ["open", "resolved", "dismissed"],
  }).notNull().default("open"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEscalationSchema = createInsertSchema(escalationsTable).omit({ id: true, createdAt: true });
export type InsertEscalation = z.infer<typeof insertEscalationSchema>;
export type Escalation = typeof escalationsTable.$inferSelect;
