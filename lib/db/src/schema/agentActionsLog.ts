import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const agentActionsLogTable = pgTable("agent_actions_log", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  payload: jsonb("payload"),
  source: text("source", { enum: ["capture", "briefing", "twilio", "manual", "cron"] }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAgentActionLogSchema = createInsertSchema(agentActionsLogTable).omit({ id: true, createdAt: true });
export type InsertAgentActionLog = z.infer<typeof insertAgentActionLogSchema>;
export type AgentActionLog = typeof agentActionsLogTable.$inferSelect;
