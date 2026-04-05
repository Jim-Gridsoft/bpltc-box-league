import { eq, desc, and, asc, like, or, ne } from "drizzle-orm";
import { inArray } from "drizzle-orm";
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
  fixtures,
  InsertFixture,
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

/**
 * Permanently delete a season and ALL associated data in safe dependency order:
 * 1. fixtures (reference boxes + seasons)
 * 2. matches (reference boxes + seasons)
 * 3. box_members (reference boxes + season_entrants)
 * 4. boxes (reference seasons)
 * 5. partner_slots (reference season_entrants)
 * 6. match_requests (reference partner_slots — already deleted, but clean up by seasonEntrant)
 * 7. season_entrants (reference seasons)
 * 8. year_points rows where totalPoints would go to 0 (optional cleanup)
 * 9. seasons row itself
 */
export async function deleteSeason(seasonId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. Delete fixtures for this season
  await db.delete(fixtures).where(eq(fixtures.seasonId, seasonId));

  // 2. Delete matches for this season
  await db.delete(matches).where(eq(matches.seasonId, seasonId));

  // 3. Get all boxes for this season so we can delete box_members
  const seasonBoxes = await db.select().from(boxes).where(eq(boxes.seasonId, seasonId));
  const boxIds = seasonBoxes.map((b) => b.id);
  if (boxIds.length > 0) {
    await db.delete(boxMembers).where(inArray(boxMembers.boxId, boxIds));
  }

  // 4. Delete boxes
  await db.delete(boxes).where(eq(boxes.seasonId, seasonId));

  // 5. Get all season entrants so we can clean up partner slots
  const entrants = await db
    .select()
    .from(seasonEntrants)
    .where(eq(seasonEntrants.seasonId, seasonId));
  const entrantIds = entrants.map((e) => e.id);

  if (entrantIds.length > 0) {
    // 5a. Get partner slot IDs for these entrants
    const slots = await db
      .select()
      .from(partnerSlots)
      .where(inArray(partnerSlots.seasonEntrantId, entrantIds));
    const slotIds = slots.map((s) => s.id);

    // 5b. Delete match requests referencing those slots
    if (slotIds.length > 0) {
      await db.delete(matchRequests).where(inArray(matchRequests.slotId, slotIds));
    }

    // 5c. Delete partner slots
    await db.delete(partnerSlots).where(inArray(partnerSlots.seasonEntrantId, entrantIds));
  }

  // 6. Delete season entrants
  await db.delete(seasonEntrants).where(eq(seasonEntrants.seasonId, seasonId));

  // 7. Delete the season itself
  await db.delete(seasons).where(eq(seasons.id, seasonId));
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

/**
 * Get all matches for a season with player names resolved.
 * Used by the admin matches management table.
 */
export async function getAllMatchesBySeason(seasonId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(matches)
    .where(eq(matches.seasonId, seasonId))
    .orderBy(desc(matches.playedAt));

  if (rows.length === 0) return [];

  const allUserIds = new Set<number>();
  for (const m of rows) {
    allUserIds.add(m.player1Id);
    allUserIds.add(m.partner1Id);
    allUserIds.add(m.player2Id);
    allUserIds.add(m.partner2Id);
  }
  const userRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, Array.from(allUserIds)));
  const nameMap = new Map(userRows.map((u) => [u.id, u.name ?? "Unknown"]));

  return rows.map((m) => ({
    ...m,
    player1Name: nameMap.get(m.player1Id) ?? "Unknown",
    partner1Name: nameMap.get(m.partner1Id) ?? "Unknown",
    player2Name: nameMap.get(m.player2Id) ?? "Unknown",
    partner2Name: nameMap.get(m.partner2Id) ?? "Unknown",
  }));
}

export async function reportMatch(data: InsertMatch, fixtureId?: number) {
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
  const newMatch = rows[0];

  // If this result was submitted against a specific fixture, mark it as played
  if (fixtureId && newMatch) {
    await db
      .update(fixtures)
      .set({ status: "played", matchId: newMatch.id })
      .where(eq(fixtures.id, fixtureId));
  }

  return newMatch;
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

// ── Auto Box Creation & Fixture Generation ────────────────────────────────────

/**
 * Auto-create ability-seeded boxes for a season and assign all paid entrants.
 * Entrants are sorted by abilityRating (desc) and distributed into boxes of
 * targetBoxSize (default 6). Returns the created boxes with their members.
 */
export async function autoCreateBoxes(
  seasonId: number,
  targetBoxSize: number = 6
): Promise<{ boxId: number; name: string; level: number; members: { entrantId: number; displayName: string; abilityRating: number }[] }[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all paid entrants for the season, sorted by ability (best first)
  const entrants = await db
    .select()
    .from(seasonEntrants)
    .where(and(eq(seasonEntrants.seasonId, seasonId), eq(seasonEntrants.paid, true)))
    .orderBy(desc(seasonEntrants.abilityRating));

  if (entrants.length < 2) {
    throw new Error("Need at least 2 paid entrants to create boxes.");
  }

  // Remove any existing boxes and box members for this season
  const existingBoxes = await db
    .select({ id: boxes.id })
    .from(boxes)
    .where(eq(boxes.seasonId, seasonId));

  for (const box of existingBoxes) {
    await db.delete(boxMembers).where(eq(boxMembers.boxId, box.id));
    // Also delete fixtures for this box
    await db.delete(fixtures).where(eq(fixtures.boxId, box.id));
  }
  await db.delete(boxes).where(eq(boxes.seasonId, seasonId));

  // Divide entrants into groups of targetBoxSize
  const boxNames = ["Box A", "Box B", "Box C", "Box D", "Box E", "Box F", "Box G", "Box H"];
  const numBoxes = Math.ceil(entrants.length / targetBoxSize);
  const result: { boxId: number; name: string; level: number; members: { entrantId: number; displayName: string; abilityRating: number }[] }[] = [];

  for (let i = 0; i < numBoxes; i++) {
    const name = boxNames[i] ?? `Box ${i + 1}`;
    const level = i + 1;

    // Insert the box
    await db.insert(boxes).values({ seasonId, name, level });
    const boxRows = await db
      .select()
      .from(boxes)
      .where(and(eq(boxes.seasonId, seasonId), eq(boxes.level, level)))
      .orderBy(desc(boxes.createdAt))
      .limit(1);
    const box = boxRows[0];
    if (!box) continue;

    // Assign entrants to this box
    const slice = entrants.slice(i * targetBoxSize, (i + 1) * targetBoxSize);
    const members: { entrantId: number; displayName: string; abilityRating: number }[] = [];

    for (const entrant of slice) {
      await db.insert(boxMembers).values({ boxId: box.id, seasonEntrantId: entrant.id });
      members.push({ entrantId: entrant.id, displayName: entrant.displayName, abilityRating: entrant.abilityRating });
    }

    result.push({ boxId: box.id, name, level, members });
  }

  return result;
}

/**
 * Generate a round-robin fixture schedule for all boxes in a season.
 * Uses the "circle method" to produce a balanced schedule where every pair
 * of players meets exactly once as opponents, with rotating partners.
 *
 * For a box of N players (N must be even):
 *   - Each round has N/2 matches (N/4 doubles matches)
 *   - Total rounds = N - 1
 *
 * Returns the total number of fixtures created.
 */
export async function generateFixtures(seasonId: number): Promise<{ totalFixtures: number; boxCount: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all boxes for the season
  const seasonBoxes = await db
    .select()
    .from(boxes)
    .where(eq(boxes.seasonId, seasonId));

  if (seasonBoxes.length === 0) {
    throw new Error("No boxes found for this season. Create boxes first.");
  }

  let totalFixtures = 0;

  for (const box of seasonBoxes) {
    // Get all members of this box with their user IDs
    const members = await db
      .select({
        entrantId: boxMembers.seasonEntrantId,
        userId: seasonEntrants.userId,
        displayName: seasonEntrants.displayName,
      })
      .from(boxMembers)
      .leftJoin(seasonEntrants, eq(boxMembers.seasonEntrantId, seasonEntrants.id))
      .where(eq(boxMembers.boxId, box.id));

    const playerIds = members.map((m) => m.userId).filter((id): id is number => id !== null);

    if (playerIds.length < 4) continue; // Need at least 4 for doubles

    // Delete existing fixtures for this box
    await db.delete(fixtures).where(eq(fixtures.boxId, box.id));

    // Pad to even number if needed
    const players = [...playerIds];
    if (players.length % 2 !== 0) {
      players.push(-1); // bye placeholder
    }

    const n = players.length;
    const fixtureRows: InsertFixture[] = [];

    // Circle method: fix players[0], rotate the rest
    for (let round = 0; round < n - 1; round++) {
      // Build the round pairings using the circle method
      const roundPlayers = [players[0], ...players.slice(1).slice(round).concat(players.slice(1).slice(0, round))];

      // Pair them up: (0,n-1), (1,n-2), (2,n-3)...
      const pairs: [number, number][] = [];
      for (let i = 0; i < n / 2; i++) {
        const p1 = roundPlayers[i];
        const p2 = roundPlayers[n - 1 - i];
        if (p1 !== -1 && p2 !== -1) {
          pairs.push([p1, p2]);
        }
      }

      // Group pairs into doubles matches: pair[0] vs pair[1], pair[2] vs pair[3], etc.
      for (let m = 0; m + 1 < pairs.length; m += 2) {
        const teamA = pairs[m];
        const teamB = pairs[m + 1];
        if (teamA && teamB) {
          fixtureRows.push({
            boxId: box.id,
            seasonId,
            round: round + 1,
            teamAPlayer1: teamA[0],
            teamAPlayer2: teamA[1],
            teamBPlayer1: teamB[0],
            teamBPlayer2: teamB[1],
            status: "scheduled",
          });
        }
      }
    }

    if (fixtureRows.length > 0) {
      await db.insert(fixtures).values(fixtureRows);
      totalFixtures += fixtureRows.length;
    }
  }

  return { totalFixtures, boxCount: seasonBoxes.length };
}

/**
 * Get all fixtures for a box, with player display names resolved.
 */
export async function getFixturesByBox(boxId: number) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(fixtures)
    .where(eq(fixtures.boxId, boxId))
    .orderBy(fixtures.round, fixtures.id);

  // Resolve player names
  const allUserIds = new Set<number>();
  for (const f of rows) {
    allUserIds.add(f.teamAPlayer1);
    allUserIds.add(f.teamAPlayer2);
    allUserIds.add(f.teamBPlayer1);
    allUserIds.add(f.teamBPlayer2);
  }

  const userRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, Array.from(allUserIds)));

  const nameMap = new Map(userRows.map((u) => [u.id, u.name ?? "Unknown"]));

  return rows.map((f) => ({
    ...f,
    teamAPlayer1Name: nameMap.get(f.teamAPlayer1) ?? "Unknown",
    teamAPlayer2Name: nameMap.get(f.teamAPlayer2) ?? "Unknown",
    teamBPlayer1Name: nameMap.get(f.teamBPlayer1) ?? "Unknown",
    teamBPlayer2Name: nameMap.get(f.teamBPlayer2) ?? "Unknown",
  }));
}

/**
 * Get all fixtures for a season that involve a specific user.
 */
export async function getMyFixtures(userId: number, seasonId: number) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(fixtures)
    .where(
      and(
        eq(fixtures.seasonId, seasonId),
        or(
          eq(fixtures.teamAPlayer1, userId),
          eq(fixtures.teamAPlayer2, userId),
          eq(fixtures.teamBPlayer1, userId),
          eq(fixtures.teamBPlayer2, userId)
        )
      )
    )
    .orderBy(fixtures.round, fixtures.id);

  // Resolve player names
  const allUserIds = new Set<number>();
  for (const f of rows) {
    allUserIds.add(f.teamAPlayer1);
    allUserIds.add(f.teamAPlayer2);
    allUserIds.add(f.teamBPlayer1);
    allUserIds.add(f.teamBPlayer2);
  }

  const userRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, Array.from(allUserIds)));

  const nameMap = new Map(userRows.map((u) => [u.id, u.name ?? "Unknown"]));

  return rows.map((f) => ({
    ...f,
    teamAPlayer1Name: nameMap.get(f.teamAPlayer1) ?? "Unknown",
    teamAPlayer2Name: nameMap.get(f.teamAPlayer2) ?? "Unknown",
    teamBPlayer1Name: nameMap.get(f.teamBPlayer1) ?? "Unknown",
    teamBPlayer2Name: nameMap.get(f.teamBPlayer2) ?? "Unknown",
  }));
}

/**
 * End a season: rank players in each box by seasonPoints (tiebreak: matchesWon, then matchesPlayed),
 * assign outcomes (promoted/stayed/relegated), update abilityRating for next-season seeding,
 * and mark the season as completed.
 *
 * Promotion rules:
 *   - Top player in each box is promoted (abilityRating +1), EXCEPT in Box A (level 1, already top)
 *   - Bottom player in each box is relegated (abilityRating -1), EXCEPT in the lowest box
 *   - All others stay
 *   - abilityRating is clamped to 1–10
 *
 * Returns a summary of outcomes per box.
 */
export async function endSeason(seasonId: number): Promise<{
  boxId: number;
  boxName: string;
  level: number;
  outcomes: { entrantId: number; userId: number; displayName: string; rank: number; points: number; outcome: "promoted" | "stayed" | "relegated"; newAbilityRating: number }[];
}[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all boxes for the season ordered by level (1 = top box)
  const seasonBoxes = await db
    .select()
    .from(boxes)
    .where(eq(boxes.seasonId, seasonId))
    .orderBy(boxes.level);

  if (seasonBoxes.length === 0) throw new Error("No boxes found for this season.");

  const totalBoxes = seasonBoxes.length;
  const summary: {
    boxId: number;
    boxName: string;
    level: number;
    outcomes: { entrantId: number; userId: number; displayName: string; rank: number; points: number; outcome: "promoted" | "stayed" | "relegated"; newAbilityRating: number }[];
  }[] = [];

  for (const box of seasonBoxes) {
    // Get all members of this box with their season stats
    const members = await db
      .select({
        boxMemberId: boxMembers.id,
        seasonEntrantId: boxMembers.seasonEntrantId,
        userId: seasonEntrants.userId,
        displayName: seasonEntrants.displayName,
        seasonPoints: seasonEntrants.seasonPoints,
        matchesWon: seasonEntrants.matchesWon,
        matchesPlayed: seasonEntrants.matchesPlayed,
        abilityRating: seasonEntrants.abilityRating,
      })
      .from(boxMembers)
      .leftJoin(seasonEntrants, eq(boxMembers.seasonEntrantId, seasonEntrants.id))
      .where(eq(boxMembers.boxId, box.id));

    // Sort by: seasonPoints desc, matchesWon desc, matchesPlayed asc (more played = tiebreak favour)
    const ranked = members
      .filter((m) => m.userId !== null)
      .sort((a, b) => {
        const aPts = a.seasonPoints ?? 0;
        const bPts = b.seasonPoints ?? 0;
        const aWon = a.matchesWon ?? 0;
        const bWon = b.matchesWon ?? 0;
        const aPlayed = a.matchesPlayed ?? 0;
        const bPlayed = b.matchesPlayed ?? 0;
        if (bPts !== aPts) return bPts - aPts;
        if (bWon !== aWon) return bWon - aWon;
        return aPlayed - bPlayed;
      });

    const boxOutcomes: typeof summary[0]["outcomes"] = [];

    for (let i = 0; i < ranked.length; i++) {
      const m = ranked[i];
      const rank = i + 1;
      const isTop = rank === 1;
      const isBottom = rank === ranked.length;

      let outcome: "promoted" | "stayed" | "relegated";
      if (isTop && box.level > 1) {
        outcome = "promoted"; // Top player moves up (not applicable in Box A)
      } else if (isBottom && box.level < totalBoxes) {
        outcome = "relegated"; // Bottom player moves down (not applicable in lowest box)
      } else {
        outcome = "stayed";
      }

      // Update abilityRating: promoted +1, relegated -1, stayed unchanged, clamped 1–10
      const currentRating = m.abilityRating ?? 3;
      const ratingDelta = outcome === "promoted" ? 1 : outcome === "relegated" ? -1 : 0;
      const newAbilityRating = Math.max(1, Math.min(10, currentRating + ratingDelta));

      // Persist outcome on box_members
      await db
        .update(boxMembers)
        .set({ outcome })
        .where(eq(boxMembers.id, m.boxMemberId));

      // Update abilityRating on season_entrants (so next season's seeding uses it)
      await db
        .update(seasonEntrants)
        .set({ abilityRating: newAbilityRating })
        .where(eq(seasonEntrants.id, m.seasonEntrantId));

      // Also update abilityRating on the user's NEXT season entrant record if one exists,
      // so the rating carries forward automatically when they register for the next season.
      // We do this by updating the user's most recent season_entrant for any future season.
      const futureEntrants = await db
        .select()
        .from(seasonEntrants)
        .where(and(eq(seasonEntrants.userId, m.userId!), ne(seasonEntrants.seasonId, seasonId)));
      for (const fe of futureEntrants) {
        await db
          .update(seasonEntrants)
          .set({ abilityRating: newAbilityRating })
          .where(eq(seasonEntrants.id, fe.id));
      }

      boxOutcomes.push({
        entrantId: m.seasonEntrantId,
        userId: m.userId!,
        displayName: m.displayName ?? "Unknown",
        rank,
        points: m.seasonPoints ?? 0,
        outcome,
        newAbilityRating,
      });
    }

    summary.push({ boxId: box.id, boxName: box.name, level: box.level, outcomes: boxOutcomes });
  }

  // Mark the season as completed
  await db.update(seasons).set({ status: "completed" }).where(eq(seasons.id, seasonId));

  return summary;
}
