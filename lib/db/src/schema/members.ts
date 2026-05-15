import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tripMembersTable = pgTable("trip_members", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTripMemberSchema = createInsertSchema(tripMembersTable).omit({ id: true, joinedAt: true });
export type InsertTripMember = z.infer<typeof insertTripMemberSchema>;
export type TripMember = typeof tripMembersTable.$inferSelect;
