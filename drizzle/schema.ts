import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SetReport = typeof setReports.$inferSelect;
export type InsertSetReport = typeof setReports.$inferInsert;