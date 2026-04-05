import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Tournament Entrants ────────────────────────────────────────────────────────
export const entrants = mysqlTable("entrants", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  displayName: varchar("displayName", { length: 128 }).notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 128 }),
  paid: boolean("paid").default(false).notNull(),
  setsWon: int("setsWon").default(0).notNull(),
  setsPlayed: int("setsPlayed").default(0).notNull(),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Entrant = typeof entrants.$inferSelect;
export type InsertEntrant = typeof entrants.$inferInsert;

// ── Set Reports ────────────────────────────────────────────────────────────────
export const setReports = mysqlTable("set_reports", {
  id: int("id").autoincrement().primaryKey(),
  entrantId: int("entrantId").notNull(),
  opponent: varchar("opponent", { length: 256 }).notNull(),
  score: varchar("score", { length: 32 }).notNull(),
  won: boolean("won").notNull(),
  playedOn: timestamp("playedOn").notNull(),
  notes: text("notes"),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SetReport = typeof setReports.$inferSelect;
export type InsertSetReport = typeof setReports.$inferInsert;

// ── Partner Availability ───────────────────────────────────────────────────────
// A player posts a slot when they are looking for a doubles partner.
export const partnerSlots = mysqlTable("partner_slots", {
  id: int("id").autoincrement().primaryKey(),
  entrantId: int("entrantId").notNull(),
  /** Free-text date/time description, e.g. "Saturday 12 Apr, 10am–12pm" */
  slotDescription: varchar("slotDescription", { length: 256 }).notNull(),
  /** Optional preferred court or notes */
  notes: text("notes"),
  /** Whether the slot is still open */
  open: boolean("open").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PartnerSlot = typeof partnerSlots.$inferSelect;
export type InsertPartnerSlot = typeof partnerSlots.$inferInsert;

// ── Match Requests ─────────────────────────────────────────────────────────────
// Sent by one entrant to another in response to an open partner slot.
export const matchRequests = mysqlTable("match_requests", {
  id: int("id").autoincrement().primaryKey(),
  slotId: int("slotId").notNull(),
  /** The entrant who owns the slot (receives the request) */
  toEntrantId: int("toEntrantId").notNull(),
  /** The entrant who sent the request */
  fromEntrantId: int("fromEntrantId").notNull(),
  message: text("message"),
  status: mysqlEnum("status", ["pending", "accepted", "declined"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MatchRequest = typeof matchRequests.$inferSelect;
export type InsertMatchRequest = typeof matchRequests.$inferInsert;
