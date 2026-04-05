import { eq, desc, and, lt, isNull, or } from "drizzle-orm";
import { getDb } from "./db";
import {
  entrants,
  setReports,
  partnerSlots,
  matchRequests,
  users,
  InsertEntrant,
  InsertSetReport,
  InsertPartnerSlot,
  InsertMatchRequest,
} from "../drizzle/schema";

// ── Entrants ──────────────────────────────────────────────────────────────────

export async function getEntrantByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(entrants).where(eq(entrants.userId, userId)).limit(1);
  return rows[0];
}

export async function getEntrantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(entrants).where(eq(entrants.id, id)).limit(1);
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
  // Join with users to get email for admin view
  const rows = await db
    .select({
      id: entrants.id,
      userId: entrants.userId,
      displayName: entrants.displayName,
      paid: entrants.paid,
      setsWon: entrants.setsWon,
      setsPlayed: entrants.setsPlayed,
      completed: entrants.completed,
      completedAt: entrants.completedAt,
      stripePaymentIntentId: entrants.stripePaymentIntentId,
      createdAt: entrants.createdAt,
      updatedAt: entrants.updatedAt,
      email: users.email,
      userName: users.name,
    })
    .from(entrants)
    .leftJoin(users, eq(entrants.userId, users.id))
    .orderBy(desc(entrants.setsWon));
  return rows;
}

export async function getLeaderboard() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(entrants).where(eq(entrants.paid, true));
  return rows.sort((a, b) => {
    if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
    if (a.completedAt && b.completedAt) {
      return a.completedAt.getTime() - b.completedAt.getTime();
    }
    return 0;
  });
}

/** Returns paid entrants who have not reported a set in the last 7 days */
export async function getInactiveEntrants(daysSince = 7) {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - daysSince * 24 * 60 * 60 * 1000);

  // Get all paid, non-completed entrants
  const paidEntrants = await db
    .select({
      id: entrants.id,
      userId: entrants.userId,
      displayName: entrants.displayName,
      setsWon: entrants.setsWon,
      email: users.email,
    })
    .from(entrants)
    .leftJoin(users, eq(entrants.userId, users.id))
    .where(and(eq(entrants.paid, true), eq(entrants.completed, false)));

  // Filter those with no recent set reports
  const inactive: typeof paidEntrants = [];
  for (const e of paidEntrants) {
    const recentSets = await db
      .select()
      .from(setReports)
      .where(and(eq(setReports.entrantId, e.id)))
      .orderBy(desc(setReports.createdAt))
      .limit(1);

    const lastSet = recentSets[0];
    if (!lastSet || lastSet.createdAt < cutoff) {
      inactive.push(e);
    }
  }
  return inactive;
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

export async function getAllSetReports() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: setReports.id,
      entrantId: setReports.entrantId,
      displayName: entrants.displayName,
      opponent: setReports.opponent,
      score: setReports.score,
      won: setReports.won,
      playedOn: setReports.playedOn,
      notes: setReports.notes,
      verified: setReports.verified,
      createdAt: setReports.createdAt,
    })
    .from(setReports)
    .leftJoin(entrants, eq(setReports.entrantId, entrants.id))
    .orderBy(desc(setReports.createdAt));
}

export async function verifySetReport(reportId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(setReports).set({ verified: true }).where(eq(setReports.id, reportId));
}

export async function adminDeleteSetReport(reportId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(setReports).where(eq(setReports.id, reportId)).limit(1);
  if (!rows[0]) return;
  const { entrantId } = rows[0];

  await db.delete(setReports).where(eq(setReports.id, reportId));

  // Recalculate totals
  const allSets = await db.select().from(setReports).where(eq(setReports.entrantId, entrantId));
  const setsPlayed = allSets.length;
  const setsWon = allSets.filter((s) => s.won).length;
  const completed = setsWon >= 50;
  await db.update(entrants).set({ setsPlayed, setsWon, completed }).where(eq(entrants.id, entrantId));
}

export async function addSetReport(data: InsertSetReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(setReports).values(data);

  const allSets = await db
    .select()
    .from(setReports)
    .where(eq(setReports.entrantId, data.entrantId));

  const setsPlayed = allSets.length;
  const setsWon = allSets.filter((s) => s.won).length;
  const completed = setsWon >= 50;

  const updateData: Partial<typeof entrants.$inferInsert> = { setsPlayed, setsWon, completed };

  if (completed) {
    const existing = await db.select().from(entrants).where(eq(entrants.id, data.entrantId)).limit(1);
    if (existing[0] && !existing[0].completedAt) {
      updateData.completedAt = new Date();
    }
  }

  await db.update(entrants).set(updateData).where(eq(entrants.id, data.entrantId));

  const updated = await db.select().from(entrants).where(eq(entrants.id, data.entrantId)).limit(1);
  return updated[0];
}

export async function deleteSetReport(reportId: number, entrantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(setReports)
    .where(and(eq(setReports.id, reportId), eq(setReports.entrantId, entrantId)));

  const allSets = await db.select().from(setReports).where(eq(setReports.entrantId, entrantId));
  const setsPlayed = allSets.length;
  const setsWon = allSets.filter((s) => s.won).length;
  const completed = setsWon >= 50;

  await db.update(entrants).set({ setsPlayed, setsWon, completed }).where(eq(entrants.id, entrantId));
}

// ── Partner Slots ─────────────────────────────────────────────────────────────

export async function getOpenPartnerSlots(excludeEntrantId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: partnerSlots.id,
      entrantId: partnerSlots.entrantId,
      displayName: entrants.displayName,
      setsWon: entrants.setsWon,
      slotDescription: partnerSlots.slotDescription,
      notes: partnerSlots.notes,
      open: partnerSlots.open,
      createdAt: partnerSlots.createdAt,
    })
    .from(partnerSlots)
    .leftJoin(entrants, eq(partnerSlots.entrantId, entrants.id))
    .where(eq(partnerSlots.open, true))
    .orderBy(desc(partnerSlots.createdAt));

  if (excludeEntrantId !== undefined) {
    return rows.filter((r) => r.entrantId !== excludeEntrantId);
  }
  return rows;
}

export async function getMyPartnerSlots(entrantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(partnerSlots)
    .where(eq(partnerSlots.entrantId, entrantId))
    .orderBy(desc(partnerSlots.createdAt));
}

export async function createPartnerSlot(data: InsertPartnerSlot) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(partnerSlots).values(data);
  const rows = await db
    .select()
    .from(partnerSlots)
    .where(eq(partnerSlots.entrantId, data.entrantId))
    .orderBy(desc(partnerSlots.createdAt))
    .limit(1);
  return rows[0];
}

export async function closePartnerSlot(slotId: number, entrantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(partnerSlots)
    .set({ open: false })
    .where(and(eq(partnerSlots.id, slotId), eq(partnerSlots.entrantId, entrantId)));
}

// ── Match Requests ─────────────────────────────────────────────────────────────

export async function createMatchRequest(data: InsertMatchRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(matchRequests).values(data);
  const rows = await db
    .select()
    .from(matchRequests)
    .where(
      and(
        eq(matchRequests.slotId, data.slotId),
        eq(matchRequests.fromEntrantId, data.fromEntrantId)
      )
    )
    .orderBy(desc(matchRequests.createdAt))
    .limit(1);
  return rows[0];
}

export async function getIncomingRequests(toEntrantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: matchRequests.id,
      slotId: matchRequests.slotId,
      fromEntrantId: matchRequests.fromEntrantId,
      fromDisplayName: entrants.displayName,
      fromSetsWon: entrants.setsWon,
      message: matchRequests.message,
      status: matchRequests.status,
      slotDescription: partnerSlots.slotDescription,
      createdAt: matchRequests.createdAt,
    })
    .from(matchRequests)
    .leftJoin(entrants, eq(matchRequests.fromEntrantId, entrants.id))
    .leftJoin(partnerSlots, eq(matchRequests.slotId, partnerSlots.id))
    .where(eq(matchRequests.toEntrantId, toEntrantId))
    .orderBy(desc(matchRequests.createdAt));
}

export async function getOutgoingRequests(fromEntrantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: matchRequests.id,
      slotId: matchRequests.slotId,
      toEntrantId: matchRequests.toEntrantId,
      toDisplayName: entrants.displayName,
      message: matchRequests.message,
      status: matchRequests.status,
      slotDescription: partnerSlots.slotDescription,
      createdAt: matchRequests.createdAt,
    })
    .from(matchRequests)
    .leftJoin(entrants, eq(matchRequests.toEntrantId, entrants.id))
    .leftJoin(partnerSlots, eq(matchRequests.slotId, partnerSlots.id))
    .where(eq(matchRequests.fromEntrantId, fromEntrantId))
    .orderBy(desc(matchRequests.createdAt));
}

export async function respondToMatchRequest(
  requestId: number,
  toEntrantId: number,
  status: "accepted" | "declined"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(matchRequests)
    .set({ status })
    .where(and(eq(matchRequests.id, requestId), eq(matchRequests.toEntrantId, toEntrantId)));

  // If accepted, close the slot so no more requests come in
  if (status === "accepted") {
    const rows = await db
      .select()
      .from(matchRequests)
      .where(eq(matchRequests.id, requestId))
      .limit(1);
    if (rows[0]) {
      await db
        .update(partnerSlots)
        .set({ open: false })
        .where(eq(partnerSlots.id, rows[0].slotId));
    }
  }
}
