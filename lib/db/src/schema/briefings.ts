import { pgTable, serial, text, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const briefingsTable = pgTable("briefings", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
  markdown: text("markdown").notNull(),
  openTasksCount: integer("open_tasks_count"),
  escalationCount: integer("escalation_count"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBriefingSchema = createInsertSchema(briefingsTable).omit({ id: true, generatedAt: true });
export type InsertBriefing = z.infer<typeof insertBriefingSchema>;
export type Briefing = typeof briefingsTable.$inferSelect;
