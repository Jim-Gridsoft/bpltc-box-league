import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./db";
import { entrants, setReports, InsertEntrant, InsertSetReport } from "../drizzle/schema";

// ── Entrants ──────────────────────────────────────────────────────────────────

export async function getEntrantByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(entrants).where(eq(entrants.userId, userId)).limit(1);
  return rows[0];
}

export async function createEntrant(data: InsertEntrant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(entrants).values(data);
  const rows = await db.select().from(entrants).where(eq(entrants.userId, data.userId)).limit(1);
  return rows[0];
}

export async function markEntrantPaid(entrantId: number, stripePaymentIntentId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(entrants)
    .set({ paid: true, stripePaymentIntentId })
    .where(eq(entrants.id, entrantId));
}

export async function getAllEntrants() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(entrants).orderBy(desc(entrants.setsWon));
}

export async function getLeaderboard() {
  const db = await getDb();
  if (!db) return [];
  // Return paid entrants only, ordered by sets won desc, then completed date asc
  const rows = await db.select().from(entrants).where(eq(entrants.paid, true));
  return rows.sort((a, b) => {
    if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
    // If both completed, earlier completion date ranks higher
    if (a.completedAt && b.completedAt) {
      return a.completedAt.getTime() - b.completedAt.getTime();
    }
    return 0;
  });
}

// ── Set Reports ───────────────────────────────────────────────────────────────

export async function getSetReportsByEntrantId(entrantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(setReports)
    .where(eq(setReports.entrantId, entrantId))
    .orderBy(desc(setReports.playedOn));
}

export async function addSetReport(data: InsertSetReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(setReports).values(data);

  // Recalculate totals for the entrant
  const allSets = await db
    .select()
    .from(setReports)
    .where(eq(setReports.entrantId, data.entrantId));

  const setsPlayed = allSets.length;
  const setsWon = allSets.filter((s) => s.won).length;
  const completed = setsWon >= 50;

  const updateData: Partial<typeof entrants.$inferInsert> = {
    setsPlayed,
    setsWon,
    completed,
  };

  // Set completedAt only when first crossing the 50-set threshold
  if (completed) {
    const existing = await db
      .select()
      .from(entrants)
      .where(eq(entrants.id, data.entrantId))
      .limit(1);
    if (existing[0] && !existing[0].completedAt) {
      updateData.completedAt = new Date();
    }
  }

  await db.update(entrants).set(updateData).where(eq(entrants.id, data.entrantId));

  const updated = await db
    .select()
    .from(entrants)
    .where(eq(entrants.id, data.entrantId))
    .limit(1);
  return updated[0];
}

export async function deleteSetReport(reportId: number, entrantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(setReports)
    .where(and(eq(setReports.id, reportId), eq(setReports.entrantId, entrantId)));

  // Recalculate totals
  const allSets = await db
    .select()
    .from(setReports)
    .where(eq(setReports.entrantId, entrantId));

  const setsPlayed = allSets.length;
  const setsWon = allSets.filter((s) => s.won).length;
  const completed = setsWon >= 50;

  await db
    .update(entrants)
    .set({ setsPlayed, setsWon, completed })
    .where(eq(entrants.id, entrantId));
}
