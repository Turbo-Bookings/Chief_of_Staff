import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { threadTypeEnum, channelEnum, threadStatusEnum } from "./enums";

export const threadsTable = pgTable("threads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  threadType: threadTypeEnum("thread_type").notNull().default("principal_talk"),
  participantId: integer("participant_id"),
  channel: channelEnum("channel").default("pwa"),
  status: threadStatusEnum("status").default("active"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  messageCount: integer("message_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("threads_thread_type_idx").on(table.threadType),
  index("threads_last_message_at_idx").on(table.lastMessageAt),
  index("threads_status_idx").on(table.status),
]);

export const insertThreadSchema = createInsertSchema(threadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertThread = z.infer<typeof insertThreadSchema>;
export type Thread = typeof threadsTable.$inferSelect;
