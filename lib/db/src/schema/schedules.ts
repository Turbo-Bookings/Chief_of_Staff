import { pgTable, serial, text, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const schedulesTable = pgTable("schedules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  scheduleType: text("schedule_type", {
    enum: ["cron", "one_time", "recurring"],
  }).notNull().default("one_time"),
  cronExpression: text("cron_expression"),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  taskTemplate: jsonb("task_template").default({}),
  enabled: boolean("enabled").notNull().default(true),
  ownerId: integer("owner_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertScheduleSchema = createInsertSchema(schedulesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedulesTable.$inferSelect;
