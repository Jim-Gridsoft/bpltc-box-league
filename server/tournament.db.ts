import { eq, desc, and, asc, like, or } from "drizzle-orm";
import { getDb } from "./db";
import {
  seasons,
  seasonEntrants,
  yearPoints,
  boxes,
  boxMembers,
  matches,
  partnerSlots,
  matchRequests,
  users,
  InsertSeason,
  InsertSeasonEntrant,
  InsertBox,
  InsertBoxMember,
  InsertMatch,
  InsertPartnerSlot,
  InsertMatchRequest,
} from "../drizzle/schema";

// ── Seasons ───────────────────────────────────────────────────────────────────

export async function getAllSeasons() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(seasons).orderBy(desc(seasons.startDate));
}

export async function getActiveSeason() {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(seasons)
    .where(eq(seasons.status, "active"))
    .limit(1);
  return rows[0];
}

export async function getOpenSeason() {
  const db = await getDb();
  if (!db) return undefined;
  // Returns a season that is open for registration OR active
  const rows = await db
    .select()
    .from(seasons)
    .orderBy(asc(seasons.startDate))
    .limit(10);
  return rows.find((s) => s.status === "registration" || s.status === "active");
}

export async function getSeasonById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(seasons).where(eq(seasons.id, id)).limit(1);
  return rows[0];
}

export async function createSeason(data: InsertSeason) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(seasons).values(data);
  const rows = await db.select().from(seasons).orderBy(desc(seasons.id)).limit(1);
  return rows[0];
}

export async function updateSeasonStatus(
  seasonId: number,
  status: "upcoming" | "registration" | "active" | "completed"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(seasons).set({ status }).where(eq(seasons.id, seasonId));
}

// ── Season Entrants ───────────────────────────────────────────────────────────

export async function getSeasonEntrantByUserId(userId: number, seasonId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(seasonEntrants)
    .where(and(eq(seasonEntrants.userId, userId), eq(seasonEntrants.seasonId, seasonId)))
    .limit(1);
  return rows[0];
}

export async function getSeasonEntrantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(seasonEntrants).where(eq(seasonEntrants.id, id)).limit(1);
  return rows[0];
}

export async function createSeasonEntrant(data: InsertSeasonEntrant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(seasonEntrants).values(data);
  const rows = await db
    .select()
    .from(seasonEntrants)
    .where(and(eq(seasonEntrants.userId, data.userId), eq(seasonEntrants.seasonId, data.seasonId)))
    .limit(1);
  return rows[0];
}

export async function markSeasonEntrantPaid(entrantId: number, stripePaymentIntentId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(seasonEntrants)
    .set({ paid: true, stripePaymentIntentId })
    .where(eq(seasonEntrants.id, entrantId));
}

export async function getAllSeasonEntrants(seasonId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: seasonEntrants.id,
      userId: seasonEntrants.userId,
      seasonId: seasonEntrants.seasonId,
      displayName: seasonEntrants.displayName,
      abilityRating: seasonEntrants.abilityRating,
      paid: seasonEntrants.paid,
      seasonPoints: seasonEntrants.seasonPoints,
      matchesPlayed: seasonEntrants.matchesPlayed,
      matchesWon: seasonEntrants.matchesWon,
      stripePaymentIntentId: seasonEntrants.stripePaymentIntentId,
      createdAt: seasonEntrants.createdAt,
      email: users.email,
    })
    .from(seasonEntrants)
    .leftJoin(users, eq(seasonEntrants.userId, users.id))
    .where(eq(seasonEntrants.seasonId, seasonId))
    .orderBy(desc(seasonEntrants.seasonPoints));
}

// ── Year Points ───────────────────────────────────────────────────────────────

export async function getYearLeaderboard(year: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: yearPoints.id,
      userId: yearPoints.userId,
      year: yearPoints.year,
      totalPoints: yearPoints.totalPoints,
      totalMatchesPlayed: yearPoints.totalMatchesPlayed,
      totalMatchesWon: yearPoints.totalMatchesWon,
      seasonsEntered: yearPoints.seasonsEntered,
      displayName: users.name,
    })
    .from(yearPoints)
    .leftJoin(users, eq(yearPoints.userId, users.id))
    .where(eq(yearPoints.year, year))
    .orderBy(desc(yearPoints.totalPoints));
}

export async function upsertYearPoints(
  userId: number,
  year: number,
  pointsDelta: number,
  won: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(yearPoints)
    .where(and(eq(yearPoints.userId, userId), eq(yearPoints.year, year)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(yearPoints)
      .set({
        totalPoints: existing[0].totalPoints + pointsDelta,
        totalMatchesPlayed: existing[0].totalMatchesPlayed + 1,
        totalMatchesWon: existing[0].totalMatchesWon + (won ? 1 : 0),
      })
      .where(eq(yearPoints.id, existing[0].id));
  } else {
    await db.insert(yearPoints).values({
      userId,
      year,
      totalPoints: pointsDelta,
      totalMatchesPlayed: 1,
      totalMatchesWon: won ? 1 : 0,
      seasonsEntered: 1,
    });
  }
}

// ── Boxes ─────────────────────────────────────────────────────────────────────

export async function getBoxesBySeason(seasonId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(boxes)
    .where(eq(boxes.seasonId, seasonId))
    .orderBy(asc(boxes.level));
}

export async function createBox(data: InsertBox) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(boxes).values(data);
  const rows = await db.select().from(boxes).orderBy(desc(boxes.id)).limit(1);
  return rows[0];
}

export async function getBoxWithMembers(boxId: number) {
  const db = await getDb();
  if (!db) return null;
  const box = await db.select().from(boxes).where(eq(boxes.id, boxId)).limit(1);
  if (!box[0]) return null;

  const members = await db
    .select({
      id: boxMembers.id,
      boxId: boxMembers.boxId,
      seasonEntrantId: boxMembers.seasonEntrantId,
      outcome: boxMembers.outcome,
      displayName: seasonEntrants.displayName,
      seasonPoints: seasonEntrants.seasonPoints,
      matchesPlayed: seasonEntrants.matchesPlayed,
      matchesWon: seasonEntrants.matchesWon,
      abilityRating: seasonEntrants.abilityRating,
      userId: seasonEntrants.userId,
    })
    .from(boxMembers)
    .leftJoin(seasonEntrants, eq(boxMembers.seasonEntrantId, seasonEntrants.id))
    .where(eq(boxMembers.boxId, boxId))
    .orderBy(desc(seasonEntrants.seasonPoints));

  return { ...box[0], members };
}

export async function getMyBox(seasonEntrantId: number) {
  const db = await getDb();
  if (!db) return null;
  const membership = await db
    .select()
    .from(boxMembers)
    .where(eq(boxMembers.seasonEntrantId, seasonEntrantId))
    .limit(1);
  if (!membership[0]) return null;
  return getBoxWithMembers(membership[0].boxId);
}

export async function addBoxMember(data: InsertBoxMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(boxMembers).values(data);
}

export async function setBoxMemberOutcome(
  boxMemberId: number,
  outcome: "promoted" | "stayed" | "relegated"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(boxMembers).set({ outcome }).where(eq(boxMembers.id, boxMemberId));
}

// ── Matches ───────────────────────────────────────────────────────────────────

export async function getMatchesByBox(boxId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(matches)
    .where(eq(matches.boxId, boxId))
    .orderBy(desc(matches.playedAt));
}

export async function getMatchesByUser(userId: number, seasonId?: number) {
  const db = await getDb();
  if (!db) return [];
  const condition = seasonId
    ? and(
        eq(matches.seasonId, seasonId),
        // User appears in any of the four player slots
      )
    : undefined;
  // Fetch all matches for the season and filter in JS (simpler than complex OR in Drizzle)
  const allMatches = seasonId
    ? await db.select().from(matches).where(eq(matches.seasonId, seasonId))
    : await db.select().from(matches);

  return allMatches.filter(
    (m) =>
      m.player1Id === userId ||
      m.partner1Id === userId ||
      m.player2Id === userId ||
      m.partner2Id === userId
  );
}

export async function reportMatch(data: InsertMatch) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(matches).values(data);

  // Award points: 2 for win, 1 for loss
  // Team A: player1 + partner1, Team B: player2 + partner2
  const teamAWon = data.winner === "A";
  const year = data.playedAt.getFullYear();

  const teamA = [data.player1Id, data.partner1Id];
  const teamB = [data.player2Id, data.partner2Id];

  for (const userId of teamA) {
    const entrant = await db
      .select()
      .from(seasonEntrants)
      .where(and(eq(seasonEntrants.userId, userId), eq(seasonEntrants.seasonId, data.seasonId)))
      .limit(1);
    if (entrant[0]) {
      const pts = teamAWon ? 2 : 1;
      await db
        .update(seasonEntrants)
        .set({
          seasonPoints: entrant[0].seasonPoints + pts,
          matchesPlayed: entrant[0].matchesPlayed + 1,
          matchesWon: entrant[0].matchesWon + (teamAWon ? 1 : 0),
        })
        .where(eq(seasonEntrants.id, entrant[0].id));
      await upsertYearPoints(userId, year, pts, teamAWon);
    }
  }

  for (const userId of teamB) {
    const entrant = await db
      .select()
      .from(seasonEntrants)
      .where(and(eq(seasonEntrants.userId, userId), eq(seasonEntrants.seasonId, data.seasonId)))
      .limit(1);
    if (entrant[0]) {
      const pts = teamAWon ? 1 : 2;
      await db
        .update(seasonEntrants)
        .set({
          seasonPoints: entrant[0].seasonPoints + pts,
          matchesPlayed: entrant[0].matchesPlayed + 1,
          matchesWon: entrant[0].matchesWon + (teamAWon ? 0 : 1),
        })
        .where(eq(seasonEntrants.id, entrant[0].id));
      await upsertYearPoints(userId, year, pts, !teamAWon);
    }
  }

  const rows = await db.select().from(matches).orderBy(desc(matches.id)).limit(1);
  return rows[0];
}

export async function verifyMatch(matchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(matches).set({ verified: true }).where(eq(matches.id, matchId));
}

export async function deleteMatch(matchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!rows[0]) return;
  const m = rows[0];

  await db.delete(matches).where(eq(matches.id, matchId));

  // Recalculate season points for all four players from remaining matches
  const allPlayers = [m.player1Id, m.partner1Id, m.player2Id, m.partner2Id];
  for (const userId of allPlayers) {
    const entrant = await db
      .select()
      .from(seasonEntrants)
      .where(and(eq(seasonEntrants.userId, userId), eq(seasonEntrants.seasonId, m.seasonId)))
      .limit(1);
    if (!entrant[0]) continue;

    const allMatchesForUser = await db
      .select()
      .from(matches)
      .where(eq(matches.seasonId, m.seasonId));

    const userMatches = allMatchesForUser.filter(
      (x) =>
        x.player1Id === userId ||
        x.partner1Id === userId ||
        x.player2Id === userId ||
        x.partner2Id === userId
    );

    let pts = 0;
    let won = 0;
    for (const um of userMatches) {
      const onTeamA = um.player1Id === userId || um.partner1Id === userId;
      const userWon = (onTeamA && um.winner === "A") || (!onTeamA && um.winner === "B");
      pts += userWon ? 2 : 1;
      if (userWon) won++;
    }

    await db
      .update(seasonEntrants)
      .set({ seasonPoints: pts, matchesPlayed: userMatches.length, matchesWon: won })
      .where(eq(seasonEntrants.id, entrant[0].id));
  }
}

// ── Partner Slots ─────────────────────────────────────────────────────────────

export async function getOpenPartnerSlots(excludeUserId?: number, seasonId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: partnerSlots.id,
      seasonEntrantId: partnerSlots.seasonEntrantId,
      userId: partnerSlots.userId,
      displayName: users.name,
      slotDescription: partnerSlots.slotDescription,
      notes: partnerSlots.notes,
      open: partnerSlots.open,
      createdAt: partnerSlots.createdAt,
    })
    .from(partnerSlots)
    .leftJoin(users, eq(partnerSlots.userId, users.id))
    .where(eq(partnerSlots.open, true))
    .orderBy(desc(partnerSlots.createdAt));

  return rows.filter((r) => r.userId !== excludeUserId);
}

export async function getMyPartnerSlots(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(partnerSlots)
    .where(eq(partnerSlots.userId, userId))
    .orderBy(desc(partnerSlots.createdAt));
}

export async function createPartnerSlot(data: InsertPartnerSlot) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(partnerSlots).values(data);
  const rows = await db
    .select()
    .from(partnerSlots)
    .where(eq(partnerSlots.userId, data.userId))
    .orderBy(desc(partnerSlots.createdAt))
    .limit(1);
  return rows[0];
}

export async function closePartnerSlot(slotId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(partnerSlots)
    .set({ open: false })
    .where(and(eq(partnerSlots.id, slotId), eq(partnerSlots.userId, userId)));
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
      and(eq(matchRequests.slotId, data.slotId), eq(matchRequests.fromUserId, data.fromUserId))
    )
    .orderBy(desc(matchRequests.createdAt))
    .limit(1);
  return rows[0];
}

export async function getIncomingRequests(toUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: matchRequests.id,
      slotId: matchRequests.slotId,
      fromUserId: matchRequests.fromUserId,
      fromDisplayName: users.name,
      message: matchRequests.message,
      status: matchRequests.status,
      slotDescription: partnerSlots.slotDescription,
      createdAt: matchRequests.createdAt,
    })
    .from(matchRequests)
    .leftJoin(users, eq(matchRequests.fromUserId, users.id))
    .leftJoin(partnerSlots, eq(matchRequests.slotId, partnerSlots.id))
    .where(eq(matchRequests.toUserId, toUserId))
    .orderBy(desc(matchRequests.createdAt));
}

export async function getOutgoingRequests(fromUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: matchRequests.id,
      slotId: matchRequests.slotId,
      toUserId: matchRequests.toUserId,
      toDisplayName: users.name,
      message: matchRequests.message,
      status: matchRequests.status,
      slotDescription: partnerSlots.slotDescription,
      createdAt: matchRequests.createdAt,
    })
    .from(matchRequests)
    .leftJoin(users, eq(matchRequests.toUserId, users.id))
    .leftJoin(partnerSlots, eq(matchRequests.slotId, partnerSlots.id))
    .where(eq(matchRequests.fromUserId, fromUserId))
    .orderBy(desc(matchRequests.createdAt));
}

export async function respondToMatchRequest(
  requestId: number,
  toUserId: number,
  status: "accepted" | "declined"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(matchRequests)
    .set({ status })
    .where(and(eq(matchRequests.id, requestId), eq(matchRequests.toUserId, toUserId)));

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

// ── Sandbox / Demo Helpers ────────────────────────────────────────────────────

const SANDBOX_FIRST_NAMES = [
  "Alex", "Ben", "Chris", "Dan", "Ed", "Finn", "George", "Harry",
  "Ian", "Jack", "Karl", "Liam", "Matt", "Nick", "Oliver", "Pete",
  "Quentin", "Rob", "Sam", "Tom", "Umar", "Vic", "Will", "Xander",
  "Yusuf", "Zach",
];
const SANDBOX_LAST_NAMES = [
  "Smith", "Jones", "Taylor", "Brown", "Wilson", "Evans", "Thomas",
  "Roberts", "Johnson", "Walker", "Wright", "Thompson", "White", "Hughes",
  "Edwards", "Green", "Hall", "Lewis", "Harris", "Clarke",
];

function randomName() {
  const f = SANDBOX_FIRST_NAMES[Math.floor(Math.random() * SANDBOX_FIRST_NAMES.length)];
  const l = SANDBOX_LAST_NAMES[Math.floor(Math.random() * SANDBOX_LAST_NAMES.length)];
  return `${f} ${l}`;
}

/**
 * Immediately register the real user for a season and mark them as paid —
 * no Stripe involved. Used in sandbox/demo mode.
 */
export async function sandboxRegisterAndPay(
  userId: number,
  seasonId: number,
  displayName: string,
  abilityRating: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Upsert: if already registered just mark paid
  const existing = await db
    .select()
    .from(seasonEntrants)
    .where(and(eq(seasonEntrants.userId, userId), eq(seasonEntrants.seasonId, seasonId)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(seasonEntrants)
      .set({ paid: true, stripePaymentIntentId: "sandbox-free" })
      .where(eq(seasonEntrants.id, existing[0].id));
    return existing[0];
  }

  await db.insert(seasonEntrants).values({
    seasonId,
    userId,
    displayName,
    abilityRating,
    paid: true,
    stripePaymentIntentId: "sandbox-free",
  });

  const rows = await db
    .select()
    .from(seasonEntrants)
    .where(and(eq(seasonEntrants.userId, userId), eq(seasonEntrants.seasonId, seasonId)))
    .limit(1);
  return rows[0];
}

/**
 * Create N synthetic test-player users and register them as paid entrants
 * for the given season. Test users have openId prefixed with "sandbox-test-".
 */
export async function sandboxSeedPlayers(seasonId: number, count: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const created: { displayName: string; abilityRating: number }[] = [];

  for (let i = 0; i < count; i++) {
    const displayName = randomName();
    const abilityRating = Math.floor(Math.random() * 5) + 1;
    const openId = `sandbox-test-${seasonId}-${Date.now()}-${i}`;

    // Create or reuse a synthetic user row
    await db.insert(users).values({
      openId,
      name: displayName,
      email: `${openId}@sandbox.bpltc.test`,
      loginMethod: "sandbox",
      role: "user",
    }).onDuplicateKeyUpdate({ set: { name: displayName } });

    const userRows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    const user = userRows[0];
    if (!user) continue;

    // Check not already registered
    const existing = await db
      .select()
      .from(seasonEntrants)
      .where(and(eq(seasonEntrants.userId, user.id), eq(seasonEntrants.seasonId, seasonId)))
      .limit(1);

    if (!existing[0]) {
      await db.insert(seasonEntrants).values({
        seasonId,
        userId: user.id,
        displayName,
        abilityRating,
        paid: true,
        stripePaymentIntentId: "sandbox-seeded",
      });
    }

    created.push({ displayName, abilityRating });
  }

  return created;
}

/**
 * Delete all sandbox test data for a season:
 * - All matches reported by sandbox users
 * - All season_entrant rows for sandbox users
 * - All sandbox user rows (openId starts with "sandbox-test-")
 * Does NOT delete real user registrations.
 */
export async function sandboxResetSeason(seasonId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Find all sandbox user IDs for this season
  const sandboxUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.openId, `sandbox-test-${seasonId}-%`));

  const sandboxUserIds = sandboxUsers.map((u) => u.id);

  if (sandboxUserIds.length > 0) {
    // Delete matches involving sandbox users
    for (const uid of sandboxUserIds) {
      await db.delete(matches).where(
        or(
          eq(matches.player1Id, uid),
          eq(matches.partner1Id, uid),
          eq(matches.player2Id, uid),
          eq(matches.partner2Id, uid)
        )
      );
      // Delete partner slots
      await db.delete(partnerSlots).where(eq(partnerSlots.userId, uid));
      // Delete match requests
      await db.delete(matchRequests).where(
        or(eq(matchRequests.fromUserId, uid), eq(matchRequests.toUserId, uid))
      );
      // Delete season entrant rows
      await db.delete(seasonEntrants).where(
        and(eq(seasonEntrants.userId, uid), eq(seasonEntrants.seasonId, seasonId))
      );
      // Delete the synthetic user
      await db.delete(users).where(eq(users.id, uid));
    }
  }

  // Also reset the real user's sandbox-free registration if present
  await db
    .delete(seasonEntrants)
    .where(
      and(
        eq(seasonEntrants.seasonId, seasonId),
        eq(seasonEntrants.stripePaymentIntentId, "sandbox-free")
      )
    );

  return { deletedUsers: sandboxUserIds.length };
}
