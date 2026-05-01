import { pgTable, serial, text, integer, timestamp, decimal, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { threadsTable } from "./threads";
import { directionEnum, senderTypeEnum, contentTypeEnum } from "./enums";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => threadsTable.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  audioObjectPath: text("audio_object_path"),
  direction: directionEnum("direction"),
  senderType: senderTypeEnum("sender_type"),
  contentType: contentTypeEnum("content_type").default("text"),
  contentUrl: text("content_url"),
  transcriptionConfidence: decimal("transcription_confidence", { precision: 4, scale: 3 }),
  claudeParse: jsonb("claude_parse"),
  externalId: text("external_id"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("messages_thread_id_idx").on(table.threadId),
  index("messages_created_at_idx").on(table.createdAt),
  index("messages_direction_idx").on(table.direction),
  index("messages_sender_type_idx").on(table.senderType),
  index("messages_content_type_idx").on(table.contentType),
  index("messages_thread_id_created_at_idx").on(table.threadId, table.createdAt),
]);

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
