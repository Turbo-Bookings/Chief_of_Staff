import { pgTable, serial, text, timestamp, date, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamMembersTable } from "./teamMembers";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", {
    enum: ["planning", "active", "paused", "complete", "cancelled"],
  }).notNull().default("active"),
  targetCompletion: date("target_completion"),
  leadId: integer("lead_id").references(() => teamMembersTable.id),
  riskLevel: text("risk_level", {
    enum: ["low", "normal", "elevated", "critical"],
  }).default("normal"),
  riskNotes: text("risk_notes"),
  milestones: jsonb("milestones").default([]),
  createdBy: text("created_by", { enum: ["principal", "agent_detected"] }).default("principal"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
