import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const principalTable = pgTable("principal", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  timezone: text("timezone").notNull().default("America/New_York"),
  clerkUserId: text("clerk_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPrincipalSchema = createInsertSchema(principalTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPrincipal = z.infer<typeof insertPrincipalSchema>;
export type Principal = typeof principalTable.$inferSelect;
