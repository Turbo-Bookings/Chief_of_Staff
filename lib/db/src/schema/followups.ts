import { pgTable, serial, smallint, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tasksTable } from "./tasks";

export const followupsTable = pgTable("followups", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasksTable.id),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
  nudgeLevel: smallint("nudge_level").notNull(),
  status: text("status", {
    enum: ["pending", "sent", "satisfied", "cancelled", "escalated"],
  }).notNull().default("pending"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  satisfiedAt: timestamp("satisfied_at", { withTimezone: true }),
  nudgeMessage: text("nudge_message"),
  channel: text("channel", { enum: ["sms", "email", "pwa"] }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFollowupSchema = createInsertSchema(followupsTable).omit({ id: true, createdAt: true });
export type InsertFollowup = z.infer<typeof insertFollowupSchema>;
export type Followup = typeof followupsTable.$inferSelect;
