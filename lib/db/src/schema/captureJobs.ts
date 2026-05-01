import { pgTable, serial, text, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const captureJobsTable = pgTable("capture_jobs", {
  id: serial("id").primaryKey(),
  jobId: text("job_id").notNull().unique(),
  status: text("status", { enum: ["queued", "processing", "done", "failed"] }).notNull().default("queued"),
  audioObjectPath: text("audio_object_path"),
  rawText: text("raw_text"),
  transcript: text("transcript"),
  parsedEntities: jsonb("parsed_entities"),
  durationSeconds: real("duration_seconds"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCaptureJobSchema = createInsertSchema(captureJobsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCaptureJob = z.infer<typeof insertCaptureJobSchema>;
export type CaptureJob = typeof captureJobsTable.$inferSelect;
