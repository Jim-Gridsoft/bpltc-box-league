import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  float,
} from "drizzle-orm/mysql-core";

// ── Users ──────────────────────────────────────────────────────────────────────
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

// ── Seasons ────────────────────────────────────────────────────────────────────
// Each season runs for ~3 months. Four seasons per year.
// status: "upcoming" | "registration" | "active" | "completed"
export const seasons = mysqlTable("seasons", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 64 }).notNull(), // e.g. "Spring 2026"
  year: int("year").notNull(),
  quarter: mysqlEnum("quarter", ["spring", "summer", "autumn", "winter"]).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  registrationDeadline: timestamp("registrationDeadline").notNull(),
  status: mysqlEnum("status", ["upcoming", "registration", "active", "completed"])
    .default("upcoming")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Season = typeof seasons.$inferSelect;
export type InsertSeason = typeof seasons.$inferInsert;

// ── Season Entrants ────────────────────────────────────────────────────────────
// A player registers individually for each season they wish to enter.
export const seasonEntrants = mysqlTable("season_entrants", {
  id: int("id").autoincrement().primaryKey(),
  seasonId: int("seasonId").notNull(),
  userId: int("userId").notNull(),
  displayName: varchar("displayName", { length: 128 }).notNull(),
  /** Self-assessed ability 1–5 used for initial box seeding */
  abilityRating: int("abilityRating").default(3).notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 128 }),
  paid: boolean("paid").default(false).notNull(),
  /** Points accumulated this season (2 per win, 1 per loss) */
  seasonPoints: int("seasonPoints").default(0).notNull(),
  matchesPlayed: int("matchesPlayed").default(0).notNull(),
  matchesWon: int("matchesWon").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SeasonEntrant = typeof seasonEntrants.$inferSelect;
export type InsertSeasonEntrant = typeof seasonEntrants.$inferInsert;

// ── Year Points Accumulator ────────────────────────────────────────────────────
// Running total across all seasons in a calendar year — used for annual awards.
export const yearPoints = mysqlTable("year_points", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  year: int("year").notNull(),
  totalPoints: int("totalPoints").default(0).notNull(),
  totalMatchesPlayed: int("totalMatchesPlayed").default(0).notNull(),
  totalMatchesWon: int("totalMatchesWon").default(0).notNull(),
  seasonsEntered: int("seasonsEntered").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type YearPoints = typeof yearPoints.$inferSelect;
export type InsertYearPoints = typeof yearPoints.$inferInsert;

// ── Boxes ──────────────────────────────────────────────────────────────────────
// A box is a group of 6–8 players within a season, seeded by ability.
// level 1 = top box, higher numbers = lower ability groups.
export const boxes = mysqlTable("boxes", {
  id: int("id").autoincrement().primaryKey(),
  seasonId: int("seasonId").notNull(),
  name: varchar("name", { length: 32 }).notNull(), // e.g. "Box A", "Box B"
  level: int("level").notNull(), // 1 = top, 2 = second, etc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Box = typeof boxes.$inferSelect;
export type InsertBox = typeof boxes.$inferInsert;

// ── Box Members ────────────────────────────────────────────────────────────────
// Which season entrant is in which box.
export const boxMembers = mysqlTable("box_members", {
  id: int("id").autoincrement().primaryKey(),
  boxId: int("boxId").notNull(),
  seasonEntrantId: int("seasonEntrantId").notNull(),
  /** Populated after season ends: promoted / stayed / relegated */
  outcome: mysqlEnum("outcome", ["promoted", "stayed", "relegated"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BoxMember = typeof boxMembers.$inferSelect;
export type InsertBoxMember = typeof boxMembers.$inferInsert;

// ── Matches ────────────────────────────────────────────────────────────────────
// A doubles match within a box. Players are individuals; partners rotate each match.
// Team A = player1 + partner1 vs Team B = player2 + partner2.
// All four must be members of the same box.
export const matches = mysqlTable("matches", {
  id: int("id").autoincrement().primaryKey(),
  boxId: int("boxId").notNull(),
  seasonId: int("seasonId").notNull(),
  /** Team A — player who reported the match */
  player1Id: int("player1Id").notNull(),
  /** Team A — player1's partner */
  partner1Id: int("partner1Id").notNull(),
  /** Team B */
  player2Id: int("player2Id").notNull(),
  /** Team B — player2's partner */
  partner2Id: int("partner2Id").notNull(),
  /** Score string, e.g. "6-3, 4-6, 10-8" */
  score: varchar("score", { length: 64 }).notNull(),
  /** Which team won: "A" or "B" */
  winner: mysqlEnum("winner", ["A", "B"]).notNull(),
  playedAt: timestamp("playedAt").notNull(),
  /** Admin can verify or flag a result */
  verified: boolean("verified").default(false).notNull(),
  /** Optional notes */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

// ── Partner Availability ───────────────────────────────────────────────────────
// A player posts a slot when they are looking for a doubles partner.
export const partnerSlots = mysqlTable("partner_slots", {
  id: int("id").autoincrement().primaryKey(),
  seasonEntrantId: int("seasonEntrantId").notNull(),
  userId: int("userId").notNull(),
  slotDescription: varchar("slotDescription", { length: 256 }).notNull(),
  notes: text("notes"),
  open: boolean("open").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PartnerSlot = typeof partnerSlots.$inferSelect;
export type InsertPartnerSlot = typeof partnerSlots.$inferInsert;

// ── Match Requests ─────────────────────────────────────────────────────────────
// Sent by one player to another in response to an open partner slot.
export const matchRequests = mysqlTable("match_requests", {
  id: int("id").autoincrement().primaryKey(),
  slotId: int("slotId").notNull(),
  toUserId: int("toUserId").notNull(),
  fromUserId: int("fromUserId").notNull(),
  message: text("message"),
  status: mysqlEnum("status", ["pending", "accepted", "declined"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MatchRequest = typeof matchRequests.$inferSelect;
export type InsertMatchRequest = typeof matchRequests.$inferInsert;
