import { pgTable, serial, text, integer, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { threadsTable } from "./threads";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => threadsTable.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  audioObjectPath: text("audio_object_path"),
  direction: text("direction", { enum: ["inbound", "outbound"] }),
  senderType: text("sender_type", { enum: ["principal", "agent", "team_member", "external"] }),
  contentType: text("content_type", { enum: ["text", "voice", "image", "file", "system"] }).default("text"),
  contentUrl: text("content_url"),
  transcriptionConfidence: decimal("transcription_confidence", { precision: 4, scale: 3 }),
  claudeParse: jsonb("claude_parse"),
  externalId: text("external_id"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
