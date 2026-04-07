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
      phoneNumber: seasonEntrants.phoneNumber,
      shareContact: seasonEntrants.shareContact,
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

  // Check if this is a balancer fixture and load eligible player IDs
  let isBalancerFixture = false;
  let balancerEligibleSet = new Set<number>(); // players who score points in this balancer
  if (fixtureId) {
    const fixtureRows = await db
      .select({ isBalancer: fixtures.isBalancer, balancerEligiblePlayers: fixtures.balancerEligiblePlayers })
      .from(fixtures)
      .where(eq(fixtures.id, fixtureId))
      .limit(1);
    const fixtureRow = fixtureRows[0];
    if (fixtureRow) {
      isBalancerFixture = fixtureRow.isBalancer;
      if (isBalancerFixture && fixtureRow.balancerEligiblePlayers) {
        try {
          const ids: number[] = JSON.parse(fixtureRow.balancerEligiblePlayers);
          balancerEligibleSet = new Set(ids);
        } catch {
          // malformed JSON — fall back to 0 pts for all
        }
      }
    }
  }

  /**
   * Determine how many points a player earns.
   * - Non-balancer fixture: standard 2/1/0 logic.
   * - Balancer fixture: standard 2/1/0 only if the player is in balancerEligibleSet;
   *   otherwise 0 pts (they were already at the max match count).
   */
  function calcPts(userId: number, won: boolean, setsWonByThisTeam: number): number {
    if (isBalancerFixture && !balancerEligibleSet.has(userId)) return 0;
    return won ? 2 : (setsWonByThisTeam > 0 ? 1 : 0);
  }

  // Award points: 2 for win, 1 for winning at least one set but losing, 0 for losing 2-0
  // Team A: player1 + partner1, Team B: player2 + partner2
  const teamAWon = data.winner === "A";
  const year = data.playedAt.getFullYear();

  // Parse the score string (e.g. "6-3 4-6 6-5") to count sets won by each team
  function countSetsWon(score: string | null): { teamA: number; teamB: number } {
    if (!score) return { teamA: 0, teamB: 0 };
    let a = 0, b = 0;
    for (const set of score.trim().split(/\s+/)) {
      const parts = set.split("-");
      if (parts.length !== 2) continue;
      const ga = parseInt(parts[0], 10);
      const gb = parseInt(parts[1], 10);
      if (isNaN(ga) || isNaN(gb)) continue;
      if (ga > gb) a++; else if (gb > ga) b++;
    }
    return { teamA: a, teamB: b };
  }
  const setsWon = countSetsWon(data.score ?? null);

  const teamA = [data.player1Id, data.partner1Id];
  const teamB = [data.player2Id, data.partner2Id];

  for (const userId of teamA) {
    const entrant = await db
      .select()
      .from(seasonEntrants)
      .where(and(eq(seasonEntrants.userId, userId), eq(seasonEntrants.seasonId, data.seasonId)))
      .limit(1);
    if (entrant[0]) {
      const pts = calcPts(userId, teamAWon, setsWon.teamA);
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
      const pts = calcPts(userId, !teamAWon, setsWon.teamB);
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
      if (userWon) {
        pts += 2;
        won++;
      } else {
        // Count sets won by this user's team from the score string
        let setsWonByUser = 0;
        if (um.score) {
          for (const set of um.score.trim().split(/\s+/)) {
            const parts = set.split("-");
            if (parts.length !== 2) continue;
            const g0 = parseInt(parts[0], 10);
            const g1 = parseInt(parts[1], 10);
            if (isNaN(g0) || isNaN(g1)) continue;
            // If onTeamA, team A score is parts[0]; else parts[1]
            const userGames = onTeamA ? g0 : g1;
            const oppGames = onTeamA ? g1 : g0;
            if (userGames > oppGames) setsWonByUser++;
          }
        }
        pts += setsWonByUser > 0 ? 1 : 0;
      }
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
 * Pure helper: compute the size of each box given n players and a target box size.
 *
 * Rules:
 *   - Every box must have at least 4 members (minimum to play doubles).
 *   - Boxes are as balanced as possible (sizes differ by at most 1).
 *   - Ability-rating order is preserved: box 1 gets the strongest players.
 *
 * Algorithm:
 *   numBoxes = min(ceil(n / targetBoxSize), floor(n / 4))
 *   Players are then distributed evenly: the first (n % numBoxes) boxes get
 *   one extra player each.
 *
 * @returns Array of box sizes in order (box 1 first, strongest players first).
 */
export function computeBoxSizes(n: number, targetBoxSize: number = 6): number[] {
  if (n < 4) return []; // Not enough players for even one box
  const naturalBoxes = Math.ceil(n / targetBoxSize);
  const maxBoxesForMin4 = Math.max(1, Math.floor(n / 4));
  const numBoxes = Math.min(naturalBoxes, maxBoxesForMin4);
  const base = Math.floor(n / numBoxes);
  const remainder = n % numBoxes;
  return Array.from({ length: numBoxes }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Auto-create ability-seeded boxes for a season and assign all paid entrants.
 * Entrants are sorted by abilityRating (desc) and distributed into boxes of
 * targetBoxSize (default 6). Every box is guaranteed to have at least 4 members.
 * Returns the created boxes with their members.
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

  // Compute box sizes using the minimum-4 rule (see computeBoxSizes above).
  const boxSizes = computeBoxSizes(entrants.length, targetBoxSize);
  const numBoxes = boxSizes.length;

  const boxNames = ["Box A", "Box B", "Box C", "Box D", "Box E", "Box F", "Box G", "Box H"];
  const result: { boxId: number; name: string; level: number; members: { entrantId: number; displayName: string; abilityRating: number }[] }[] = [];

  let entrantOffset = 0;
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

    // Assign entrants to this box (ability-rating order is preserved because
    // entrants were sorted descending by abilityRating above)
    const slice = entrants.slice(entrantOffset, entrantOffset + boxSizes[i]);
    entrantOffset += boxSizes[i];
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
 * Generate a balanced doubles fixture schedule for all boxes in a season.
 *
 * Algorithm:
 *   Phase 1 — Greedy unique scheduling:
 *     Generate every possible doubles fixture (C(n,4) × 3 team splits).
 *     Assign fixtures to rounds greedily, always prioritising players with
 *     the fewest matches so far. Stop when every player has played (n-1) matches.
 *
 *   Phase 2 — Balancer pass:
 *     If any players still have fewer matches than the maximum after Phase 1,
 *     add extra fixtures flagged as `isBalancer = true`. Balancer matches are
 *     played normally but award 0 points to all four players. This ensures
 *     every player in the box plays exactly the same number of matches.
 *
 * Result: every player plays the same number of matches regardless of box size.
 */
export async function generateFixtures(seasonId: number): Promise<{ totalFixtures: number; boxCount: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const seasonBoxes = await db
    .select()
    .from(boxes)
    .where(eq(boxes.seasonId, seasonId));

  if (seasonBoxes.length === 0) {
    throw new Error("No boxes found for this season. Create boxes first.");
  }

  let totalFixtures = 0;

  for (const box of seasonBoxes) {
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
    if (playerIds.length < 4) continue;

    await db.delete(fixtures).where(eq(fixtures.boxId, box.id));

    const scheduled = buildBalancedSchedule(playerIds);
    const fixtureRows: InsertFixture[] = scheduled.map((f) => ({
      boxId: box.id,
      seasonId,
      round: f.round,
      teamAPlayer1: f.teamA[0],
      teamAPlayer2: f.teamA[1],
      teamBPlayer1: f.teamB[0],
      teamBPlayer2: f.teamB[1],
      status: "scheduled" as const,
      isBalancer: f.isBalancer,
      // Persist eligible player IDs as a JSON string (null for non-balancer fixtures)
      balancerEligiblePlayers: f.isBalancer
        ? JSON.stringify(f.balancerEligiblePlayers)
        : null,
    }));

    if (fixtureRows.length > 0) {
      await db.insert(fixtures).values(fixtureRows);
      totalFixtures += fixtureRows.length;
    }
  }

  return { totalFixtures, boxCount: seasonBoxes.length };
}

// ── Balanced schedule builder (pure function, no DB access) ───────────────────

interface ScheduledFixture {
  teamA: [number, number];
  teamB: [number, number];
  round: number;
  isBalancer: boolean;
  /**
   * For balancer fixtures: the subset of the four player IDs who were below
   * the maximum match count at the time the fixture was created.
   * Only these players score points when the match is reported.
   * Empty array means all four were already at max (0 pts for everyone).
   */
  balancerEligiblePlayers: number[];
}

/**
 * Build a maximally-varied doubles schedule for a set of player IDs.
 *
 * Goals (in priority order):
 *  1. Every player plays exactly the same number of matches (n-1 regular + balancers if needed).
 *  2. No two players are partnered more times than necessary.
 *  3. No two players face each other as opponents more times than necessary.
 *
 * Algorithm:
 *  - Generate all C(n,4)×3 possible fixture splits.
 *  - Score each candidate by its repetition penalty:
 *      partnerPenalty = (existing partner count for each team pair) × 10
 *      opponentPenalty = sum of existing opponent counts across the 4 cross-pairs
 *  - In each round, greedily pick the lowest-score fixture that doesn't reuse
 *    a player already assigned in that round and doesn't exceed the target.
 *  - After Phase 1, add balancer fixtures for any players below the max count,
 *    again choosing the lowest-repetition combo.
 */
export function buildBalancedSchedule(playerIds: number[]): ScheduledFixture[] {
  const n = playerIds.length;
  if (n < 4) return [];

  const target = n - 1; // target matches per player

  // Generate all unique doubles fixtures (C(n,4) × 3 team splits)
  const allCombos: { teamA: [number, number]; teamB: [number, number] }[] = [];
  for (let a = 0; a < n; a++)
  for (let b = a + 1; b < n; b++)
  for (let c = b + 1; c < n; c++)
  for (let d = c + 1; d < n; d++) {
    const four = [playerIds[a], playerIds[b], playerIds[c], playerIds[d]];
    allCombos.push({ teamA: [four[0], four[1]], teamB: [four[2], four[3]] });
    allCombos.push({ teamA: [four[0], four[2]], teamB: [four[1], four[3]] });
    allCombos.push({ teamA: [four[0], four[3]], teamB: [four[1], four[2]] });
  }

  const matchCount: Record<number, number> = {};
  const partnerCount: Record<string, number> = {};
  const opponentCount: Record<string, number> = {};
  playerIds.forEach((p) => (matchCount[p] = 0));

  const pk = (x: number, y: number) => `${Math.min(x, y)}-${Math.max(x, y)}`;
  const getP = (a: number, b: number) => partnerCount[pk(a, b)] ?? 0;
  const getO = (a: number, b: number) => opponentCount[pk(a, b)] ?? 0;

  /** Score a fixture by how much repetition it adds (lower = more varied). */
  const scoreFixture = (f: { teamA: [number, number]; teamB: [number, number] }) => {
    const [a, b] = f.teamA;
    const [c, d] = f.teamB;
    // Partner repetition is weighted 10× because it is the most noticeable
    const partnerPenalty = (getP(a, b) + getP(c, d)) * 10;
    const oppPenalty = getO(a, c) + getO(a, d) + getO(b, c) + getO(b, d);
    return partnerPenalty + oppPenalty;
  };

  const updateCounts = (f: { teamA: [number, number]; teamB: [number, number] }) => {
    const [a, b] = f.teamA;
    const [c, d] = f.teamB;
    matchCount[a]++; matchCount[b]++; matchCount[c]++; matchCount[d]++;
    partnerCount[pk(a, b)] = (partnerCount[pk(a, b)] ?? 0) + 1;
    partnerCount[pk(c, d)] = (partnerCount[pk(c, d)] ?? 0) + 1;
    opponentCount[pk(a, c)] = (opponentCount[pk(a, c)] ?? 0) + 1;
    opponentCount[pk(a, d)] = (opponentCount[pk(a, d)] ?? 0) + 1;
    opponentCount[pk(b, c)] = (opponentCount[pk(b, c)] ?? 0) + 1;
    opponentCount[pk(b, d)] = (opponentCount[pk(b, d)] ?? 0) + 1;
  };

  const scheduled: ScheduledFixture[] = [];
  const usedIndices = new Set<number>();
  let round = 1;

  // ── Phase 1: maximally-varied scheduling ────────────────────────────────────
  while (true) {
    if (playerIds.every((p) => matchCount[p] >= target)) break;

    const inRound = new Set<number>();
    let addedInRound = false;

    // Score and sort all unused combos: lowest repetition penalty first,
    // then fewest total matches (to keep counts balanced across players).
    const candidates = allCombos
      .map((f, i) => ({ f, i, score: scoreFixture(f), matchSum: [...f.teamA, ...f.teamB].reduce((s, p) => s + matchCount[p], 0) }))
      .filter(({ i }) => !usedIndices.has(i))
      .sort((a, b) => a.score - b.score || a.matchSum - b.matchSum);

    for (const { f, i } of candidates) {
      const involved = [...f.teamA, ...f.teamB];
      if (involved.some((p) => inRound.has(p))) continue;
      if (involved.every((p) => matchCount[p] >= target)) continue;

      involved.forEach((p) => inRound.add(p));
      scheduled.push({ ...f, round, isBalancer: false, balancerEligiblePlayers: [] });
      usedIndices.add(i);
      updateCounts(f);
      addedInRound = true;
    }

    if (!addedInRound) break;
    round++;
  }

  // ── Phase 2: balancer pass ──────────────────────────────────────────────────
  let safetyLimit = 100;
  while (safetyLimit-- > 0) {
    const counts = Object.values(matchCount);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    if (maxCount === minCount) break;

    const needMore = playerIds.filter((p) => matchCount[p] < maxCount);
    if (needMore.length === 0) break;

    // Prefer fixtures where ALL 4 players are under-count (avoids overshooting).
    // Fall back to fixtures with at least one under-count player only if needed.
    const allFour = allCombos
      .map((f, i) => ({ f, i, score: scoreFixture(f) }))
      .filter(({ f }) => [...f.teamA, ...f.teamB].every((p) => needMore.includes(p)))
      .sort((a, b) => a.score - b.score);

    const someFour = allCombos
      .map((f, i) => ({ f, i, score: scoreFixture(f) }))
      .filter(({ f }) => [...f.teamA, ...f.teamB].some((p) => needMore.includes(p)))
      .sort((a, b) => a.score - b.score);

    const chosen = (allFour.length > 0 ? allFour : someFour)[0];
    if (!chosen) break;

    const involved = [...chosen.f.teamA, ...chosen.f.teamB];
    const eligiblePlayers = involved.filter((p) => matchCount[p] < maxCount);

    scheduled.push({ ...chosen.f, round, isBalancer: true, balancerEligiblePlayers: eligiblePlayers });
    updateCounts(chosen.f);
    round++;
  }

  return scheduled;
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

/**
 * Get ALL fixtures for a season, grouped by box, with player display names resolved.
 * Used by the admin panel to display every scheduled and played fixture across all boxes.
 */
export async function getAllFixturesBySeason(seasonId: number): Promise<
  {
    boxId: number;
    boxName: string;
    boxLevel: number;
    fixtures: {
      id: number;
      round: number;
      status: string;
      teamAPlayer1: number;
      teamAPlayer2: number;
      teamBPlayer1: number;
      teamBPlayer2: number;
      teamAPlayer1Name: string;
      teamAPlayer2Name: string;
      teamBPlayer1Name: string;
      teamBPlayer2Name: string;
      // entrant IDs (needed for reportMatch)
      teamAEntrant1: number;
      teamAEntrant2: number;
      teamBEntrant1: number;
      teamBEntrant2: number;
      /** True if this is a balancer fixture — 0 points awarded */
      isBalancer: boolean;
    }[];
  }[]
> {
  const db = await getDb();
  if (!db) return [];

  // Get all boxes for the season
  const seasonBoxes = await db
    .select()
    .from(boxes)
    .where(eq(boxes.seasonId, seasonId))
    .orderBy(boxes.level);

  const result = [];

  for (const box of seasonBoxes) {
    const rows = await db
      .select()
      .from(fixtures)
      .where(eq(fixtures.boxId, box.id))
      .orderBy(fixtures.round, fixtures.id);

    if (rows.length === 0) {
      result.push({ boxId: box.id, boxName: box.name, boxLevel: box.level, fixtures: [] });
      continue;
    }

    // Collect all user IDs
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

    // Resolve entrant IDs (seasonEntrant.id) for each player userId in this season
    const entrantRows = await db
      .select({ id: seasonEntrants.id, userId: seasonEntrants.userId })
      .from(seasonEntrants)
      .where(
        and(
          eq(seasonEntrants.seasonId, seasonId),
          inArray(seasonEntrants.userId, Array.from(allUserIds))
        )
      );
    const entrantMap = new Map(entrantRows.map((e) => [e.userId, e.id]));

    result.push({
      boxId: box.id,
      boxName: box.name,
      boxLevel: box.level,
      fixtures: rows.map((f) => ({
        id: f.id,
        round: f.round,
        status: f.status,
        teamAPlayer1: f.teamAPlayer1,
        teamAPlayer2: f.teamAPlayer2,
        teamBPlayer1: f.teamBPlayer1,
        teamBPlayer2: f.teamBPlayer2,
        teamAPlayer1Name: nameMap.get(f.teamAPlayer1) ?? "Unknown",
        teamAPlayer2Name: nameMap.get(f.teamAPlayer2) ?? "Unknown",
        teamBPlayer1Name: nameMap.get(f.teamBPlayer1) ?? "Unknown",
        teamBPlayer2Name: nameMap.get(f.teamBPlayer2) ?? "Unknown",
        teamAEntrant1: entrantMap.get(f.teamAPlayer1) ?? 0,
        teamAEntrant2: entrantMap.get(f.teamAPlayer2) ?? 0,
        teamBEntrant1: entrantMap.get(f.teamBPlayer1) ?? 0,
        teamBEntrant2: entrantMap.get(f.teamBPlayer2) ?? 0,
        isBalancer: f.isBalancer,
      })),
    });
  }

  return result;
}

// ── Sandbox Reset + Regenerate ────────────────────────────────────────────────

/**
 * Reset all sandbox test data for a season AND immediately regenerate fixtures.
 * Convenience wrapper: sandboxResetSeason → clear boxes → autoCreateBoxes → generateFixtures.
 * Returns the reset result plus the new fixture generation summary.
 */
export async function sandboxResetAndRegenerate(seasonId: number): Promise<{
  deletedUsers: number;
  totalFixtures: number;
  boxCount: number;
  balanceSummary: { playerId: number; playerName: string; totalMatches: number; balancerMatches: number }[];
}> {
  // Step 1: Reset all sandbox test data (removes synthetic users + their records)
  const resetResult = await sandboxResetSeason(seasonId);

  // Step 2: Clear existing boxes and fixtures for this season
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existingBoxes = await db.select({ id: boxes.id }).from(boxes).where(eq(boxes.seasonId, seasonId));
  for (const box of existingBoxes) {
    await db.delete(fixtures).where(eq(fixtures.boxId, box.id));
    await db.delete(boxMembers).where(eq(boxMembers.boxId, box.id));
  }
  await db.delete(boxes).where(eq(boxes.seasonId, seasonId));

  // Step 3: Auto-create boxes from remaining paid entrants
  await autoCreateBoxes(seasonId);

  // Step 4: Generate balanced fixtures
  const genResult = await generateFixtures(seasonId);

  // Step 5: Build balance summary
  const summary = await getFixtureBalanceSummary(seasonId);

  return {
    deletedUsers: resetResult.deletedUsers,
    totalFixtures: genResult.totalFixtures,
    boxCount: genResult.boxCount,
    balanceSummary: summary,
  };
}

// ── Fixture Balance Summary ───────────────────────────────────────────────────

/**
 * Returns a per-player summary of how many fixtures they have been assigned
 * in a season, broken down by regular vs balancer matches.
 * Used by the admin to verify the schedule is fair before the season starts.
 */
export async function getFixtureBalanceSummary(seasonId: number): Promise<
  { playerId: number; playerName: string; totalMatches: number; balancerMatches: number }[]
> {
  const db = await getDb();
  if (!db) return [];

  const allFixtures = await db
    .select()
    .from(fixtures)
    .where(eq(fixtures.seasonId, seasonId));

  if (allFixtures.length === 0) return [];

  // Count appearances per player
  const countMap: Record<number, { total: number; balancer: number }> = {};
  for (const f of allFixtures) {
    const players = [f.teamAPlayer1, f.teamAPlayer2, f.teamBPlayer1, f.teamBPlayer2];
    for (const pid of players) {
      if (!countMap[pid]) countMap[pid] = { total: 0, balancer: 0 };
      countMap[pid].total++;
      if (f.isBalancer) countMap[pid].balancer++;
    }
  }

  // Resolve player names
  const playerIds = Object.keys(countMap).map(Number);
  const userRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, playerIds));
  const nameMap = new Map(userRows.map((u) => [u.id, u.name ?? "Unknown"]));

  return playerIds
    .map((pid) => ({
      playerId: pid,
      playerName: nameMap.get(pid) ?? "Unknown",
      totalMatches: countMap[pid].total,
      balancerMatches: countMap[pid].balancer,
    }))
    .sort((a, b) => a.playerName.localeCompare(b.playerName));
}

// ── Fixture Schedule Summary (for notifications) ─────────────────────────────

/**
 * Build a per-player fixture schedule summary for a season.
 * Returns an array of { playerName, boxName, fixtures[] } objects
 * suitable for sending as a notification or email.
 */
export async function buildFixtureScheduleSummary(seasonId: number): Promise<
  {
    playerId: number;
    playerName: string;
    boxName: string;
    fixtures: {
      round: number;
      partner: string;
      opponents: string;
      isBalancer: boolean;
    }[];
  }[]
> {
  const allBoxes = await getAllFixturesBySeason(seasonId);
  const playerMap: Record<
    number,
    {
      playerId: number;
      playerName: string;
      boxName: string;
      fixtures: { round: number; partner: string; opponents: string; isBalancer: boolean }[];
    }
  > = {};

  for (const box of allBoxes) {
    for (const f of box.fixtures) {
      const teams: [number, number, string, string, string, string][] = [
        // [playerId, partnerId, partnerName, opp1, opp2, isBalancer]
        [f.teamAPlayer1, f.teamAPlayer2, f.teamAPlayer2Name, f.teamBPlayer1Name, f.teamBPlayer2Name, String(f.isBalancer)],
        [f.teamAPlayer2, f.teamAPlayer1, f.teamAPlayer1Name, f.teamBPlayer1Name, f.teamBPlayer2Name, String(f.isBalancer)],
        [f.teamBPlayer1, f.teamBPlayer2, f.teamBPlayer2Name, f.teamAPlayer1Name, f.teamAPlayer2Name, String(f.isBalancer)],
        [f.teamBPlayer2, f.teamBPlayer1, f.teamBPlayer1Name, f.teamAPlayer1Name, f.teamAPlayer2Name, String(f.isBalancer)],
      ];

      for (const [pid, , partnerName, opp1, opp2, isBalStr] of teams) {
        if (!playerMap[pid]) {
          // Determine player name from the fixture
          const names: Record<number, string> = {
            [f.teamAPlayer1]: f.teamAPlayer1Name,
            [f.teamAPlayer2]: f.teamAPlayer2Name,
            [f.teamBPlayer1]: f.teamBPlayer1Name,
            [f.teamBPlayer2]: f.teamBPlayer2Name,
          };
          playerMap[pid] = {
            playerId: pid,
            playerName: names[pid] ?? "Unknown",
            boxName: box.boxName,
            fixtures: [],
          };
        }
        playerMap[pid].fixtures.push({
          round: f.round,
          partner: partnerName,
          opponents: `${opp1} & ${opp2}`,
          isBalancer: isBalStr === "true",
        });
      }
    }
  }

  return Object.values(playerMap).sort((a, b) => a.playerName.localeCompare(b.playerName));
}

// ── Remove Player ─────────────────────────────────────────────────────────────

/**
 * Remove a player from a season, cascading through all related data.
 *
 * Cascade order:
 *   1. Find the season entrant record (throws if not found).
 *   2. Reverse year_points for every match the player participated in.
 *   3. Recalculate season points for the other three players in each match
 *      (they keep their points; we just remove the deleted player's contribution).
 *   4. Delete all matches the player was involved in.
 *   5. Delete all fixtures the player was assigned to.
 *   6. Delete the box_members record.
 *   7. Delete partner_slots and match_requests for this player in this season.
 *   8. Delete the season_entrant record.
 *
 * Returns a summary of what was deleted.
 */
export async function removePlayerFromSeason(
  seasonEntrantId: number
): Promise<{
  displayName: string;
  matchesDeleted: number;
  fixturesDeleted: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. Fetch the entrant
  const entrantRows = await db
    .select()
    .from(seasonEntrants)
    .where(eq(seasonEntrants.id, seasonEntrantId))
    .limit(1);
  const entrant = entrantRows[0];
  if (!entrant) throw new Error("Season entrant not found.");

  const { userId, seasonId, displayName } = entrant;

  // 2. Find all matches involving this player
  const allSeasonMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.seasonId, seasonId));

  const playerMatches = allSeasonMatches.filter(
    (m) =>
      m.player1Id === userId ||
      m.partner1Id === userId ||
      m.player2Id === userId ||
      m.partner2Id === userId
  );

  // 3. Reverse year_points for the removed player and recalculate for others
  const seasonYear = new Date().getFullYear(); // approximate; use season year if available
  const seasonRows = await db
    .select()
    .from(seasons)
    .where(eq(seasons.id, seasonId))
    .limit(1);
  const year = seasonRows[0]?.year ?? new Date().getFullYear();

  for (const m of playerMatches) {
    const otherPlayers = [m.player1Id, m.partner1Id, m.player2Id, m.partner2Id].filter(
      (pid) => pid !== userId
    );

    // Reverse year_points for the removed player for this match
    const onTeamA = m.player1Id === userId || m.partner1Id === userId;
    const playerWon = (onTeamA && m.winner === "A") || (!onTeamA && m.winner === "B");
    let playerPts = 0;
    if (playerWon) {
      playerPts = 2;
    } else {
      let setsWon = 0;
      if (m.score) {
        for (const set of m.score.trim().split(/\s+/)) {
          const parts = set.split("-");
          if (parts.length !== 2) continue;
          const g0 = parseInt(parts[0], 10);
          const g1 = parseInt(parts[1], 10);
          if (isNaN(g0) || isNaN(g1)) continue;
          const userGames = onTeamA ? g0 : g1;
          const oppGames = onTeamA ? g1 : g0;
          if (userGames > oppGames) setsWon++;
        }
      }
      playerPts = setsWon > 0 ? 1 : 0;
    }

    const existingYP = await db
      .select()
      .from(yearPoints)
      .where(and(eq(yearPoints.userId, userId), eq(yearPoints.year, year)))
      .limit(1);
    if (existingYP[0]) {
      await db
        .update(yearPoints)
        .set({
          totalPoints: Math.max(0, existingYP[0].totalPoints - playerPts),
          totalMatchesPlayed: Math.max(0, existingYP[0].totalMatchesPlayed - 1),
          totalMatchesWon: Math.max(0, existingYP[0].totalMatchesWon - (playerWon ? 1 : 0)),
        })
        .where(eq(yearPoints.id, existingYP[0].id));
    }

    // Recalculate season points for the other three players in this match
    // (their points are unaffected — the match is simply removed from their history)
    for (const pid of otherPlayers) {
      const otherEntrant = await db
        .select()
        .from(seasonEntrants)
        .where(and(eq(seasonEntrants.userId, pid), eq(seasonEntrants.seasonId, seasonId)))
        .limit(1);
      if (!otherEntrant[0]) continue;

      // Remaining matches for this player after removing the deleted player's matches
      const remainingMatches = allSeasonMatches.filter(
        (x) =>
          (x.player1Id === pid ||
            x.partner1Id === pid ||
            x.player2Id === pid ||
            x.partner2Id === pid) &&
          // Exclude matches that are about to be deleted (those involving the removed player)
          x.player1Id !== userId &&
          x.partner1Id !== userId &&
          x.player2Id !== userId &&
          x.partner2Id !== userId
      );

      let pts = 0;
      let won = 0;
      for (const um of remainingMatches) {
        const onA = um.player1Id === pid || um.partner1Id === pid;
        const userWon = (onA && um.winner === "A") || (!onA && um.winner === "B");
        if (userWon) {
          pts += 2;
          won++;
        } else {
          let setsWonByUser = 0;
          if (um.score) {
            for (const set of um.score.trim().split(/\s+/)) {
              const parts = set.split("-");
              if (parts.length !== 2) continue;
              const g0 = parseInt(parts[0], 10);
              const g1 = parseInt(parts[1], 10);
              if (isNaN(g0) || isNaN(g1)) continue;
              const userGames = onA ? g0 : g1;
              const oppGames = onA ? g1 : g0;
              if (userGames > oppGames) setsWonByUser++;
            }
          }
          pts += setsWonByUser > 0 ? 1 : 0;
        }
      }

      await db
        .update(seasonEntrants)
        .set({ seasonPoints: pts, matchesPlayed: remainingMatches.length, matchesWon: won })
        .where(eq(seasonEntrants.id, otherEntrant[0].id));
    }
  }

  // 4. Delete all matches involving this player
  const matchesDeleted = playerMatches.length;
  for (const m of playerMatches) {
    await db.delete(matches).where(eq(matches.id, m.id));
  }

  // 5. Delete all fixtures involving this player (by userId in any slot)
  const playerFixtures = await db
    .select()
    .from(fixtures)
    .where(
      and(
        eq(fixtures.seasonId, seasonId),
        // We can't use OR in drizzle easily for 4 columns, so fetch all and filter
      )
    );
  // Fetch all season fixtures and filter in JS
  const allSeasonFixtures = await db
    .select()
    .from(fixtures)
    .where(eq(fixtures.seasonId, seasonId));

  const fixturesToDelete = allSeasonFixtures.filter(
    (f) =>
      f.teamAPlayer1 === userId ||
      f.teamAPlayer2 === userId ||
      f.teamBPlayer1 === userId ||
      f.teamBPlayer2 === userId
  );

  const fixturesDeleted = fixturesToDelete.length;
  for (const f of fixturesToDelete) {
    await db.delete(fixtures).where(eq(fixtures.id, f.id));
  }

  // 6. Delete box_members record
  await db
    .delete(boxMembers)
    .where(eq(boxMembers.seasonEntrantId, seasonEntrantId));

  // 7. Delete partner_slots and match_requests for this player in this season
  const slots = await db
    .select()
    .from(partnerSlots)
    .where(
      and(eq(partnerSlots.seasonEntrantId, seasonEntrantId))
    );
  for (const slot of slots) {
    await db.delete(matchRequests).where(eq(matchRequests.slotId, slot.id));
    await db.delete(partnerSlots).where(eq(partnerSlots.id, slot.id));
  }
  // Also delete match requests sent by or to this user
  await db.delete(matchRequests).where(eq(matchRequests.fromUserId, userId));
  await db.delete(matchRequests).where(eq(matchRequests.toUserId, userId));

  // 8. Delete the season entrant record
  await db.delete(seasonEntrants).where(eq(seasonEntrants.id, seasonEntrantId));

  return { displayName, matchesDeleted, fixturesDeleted };
}

/**
 * Fetch a preview of what will be deleted when removing a player from a season.
 * Used to show the admin a summary before confirming.
 */
export async function getRemovePlayerPreview(
  seasonEntrantId: number
): Promise<{
  displayName: string;
  matchCount: number;
  fixtureCount: number;
  isPaid: boolean;
  hasPlayedMatches: boolean;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const entrantRows = await db
    .select()
    .from(seasonEntrants)
    .where(eq(seasonEntrants.id, seasonEntrantId))
    .limit(1);
  const entrant = entrantRows[0];
  if (!entrant) throw new Error("Season entrant not found.");

  const { userId, seasonId, displayName, paid, matchesPlayed } = entrant;

  const allSeasonMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.seasonId, seasonId));

  const playerMatchCount = allSeasonMatches.filter(
    (m) =>
      m.player1Id === userId ||
      m.partner1Id === userId ||
      m.player2Id === userId ||
      m.partner2Id === userId
  ).length;

  const allSeasonFixtures = await db
    .select()
    .from(fixtures)
    .where(eq(fixtures.seasonId, seasonId));

  const playerFixtureCount = allSeasonFixtures.filter(
    (f) =>
      f.teamAPlayer1 === userId ||
      f.teamAPlayer2 === userId ||
      f.teamBPlayer1 === userId ||
      f.teamBPlayer2 === userId
  ).length;

  return {
    displayName,
    matchCount: playerMatchCount,
    fixtureCount: playerFixtureCount,
    isPaid: paid,
    hasPlayedMatches: matchesPlayed > 0,
  };
}

// ── Contact Sharing ───────────────────────────────────────────────────────────

/**
 * Returns the contact details of all box-mates who have consented to sharing.
 * Only returns players in the same box as the requesting user.
 * The requesting user's own entry is excluded.
 */
export async function getBoxContacts(
  boxId: number,
  requestingUserId: number
): Promise<{ displayName: string; email: string | null; phoneNumber: string | null }[]> {
  const db = await getDb();
  if (!db) return [];

  // Get all box members with their entrant and user info
  const rows = await db
    .select({
      displayName: seasonEntrants.displayName,
      email: users.email,
      phoneNumber: seasonEntrants.phoneNumber,
      shareContact: seasonEntrants.shareContact,
      userId: seasonEntrants.userId,
    })
    .from(boxMembers)
    .innerJoin(seasonEntrants, eq(boxMembers.seasonEntrantId, seasonEntrants.id))
    .innerJoin(users, eq(seasonEntrants.userId, users.id))
    .where(eq(boxMembers.boxId, boxId));

  // Only return consented members, excluding the requesting user
  return rows
    .filter((r) => r.shareContact && r.userId !== requestingUserId)
    .map((r) => ({
      displayName: r.displayName,
      email: r.email ?? null,
      phoneNumber: r.phoneNumber ?? null,
    }));
}

/**
 * Update a player's contact sharing preferences for a specific season entrant record.
 * Only the owning user may update their own preferences.
 */
export async function updateContactPreferences(
  seasonEntrantId: number,
  userId: number,
  phoneNumber: string | null,
  shareContact: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify ownership
  const rows = await db
    .select()
    .from(seasonEntrants)
    .where(and(eq(seasonEntrants.id, seasonEntrantId), eq(seasonEntrants.userId, userId)))
    .limit(1);
  if (!rows[0]) throw new Error("Season entrant not found or access denied.");

  await db
    .update(seasonEntrants)
    .set({ phoneNumber: phoneNumber ?? null, shareContact })
    .where(eq(seasonEntrants.id, seasonEntrantId));
}
