import { pgTable, serial, text, timestamp, boolean, jsonb, time } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const principalTable = pgTable("principal", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  fullName: text("full_name"),
  email: text("email"),
  primaryEmail: text("primary_email"),
  phone: text("phone"),
  primaryPhone: text("primary_phone"),
  timezone: text("timezone").notNull().default("America/New_York"),
  briefingMorningTime: text("briefing_morning_time").default("07:00"),
  briefingEveningTime: text("briefing_evening_time").default("18:00"),
  preferences: jsonb("preferences").default({}),
  killSwitch: boolean("kill_switch").default(false),
  clerkUserId: text("clerk_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPrincipalSchema = createInsertSchema(principalTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPrincipal = z.infer<typeof insertPrincipalSchema>;
export type Principal = typeof principalTable.$inferSelect;
