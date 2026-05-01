import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const threadsTable = pgTable("threads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  threadType: text("thread_type", {
    enum: ["principal_talk", "team_member", "system_internal"],
  }).notNull().default("principal_talk"),
  participantId: integer("participant_id"),
  channel: text("channel", { enum: ["sms", "email", "pwa"] }).default("pwa"),
  status: text("status", { enum: ["active", "archived"] }).default("active"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  messageCount: integer("message_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertThreadSchema = createInsertSchema(threadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertThread = z.infer<typeof insertThreadSchema>;
export type Thread = typeof threadsTable.$inferSelect;
