/**
 * Unit tests for the 2/1/0 points calculation logic,
 * including per-player balancer eligibility (Approach A).
 *
 * Points rules:
 *   - 2 pts: match win
 *   - 1 pt:  lost the match but won at least one set
 *   - 0 pts: lost the match 2-0 (won no sets)
 *
 * Balancer fixture rules (Approach A):
 *   - Players in balancerEligiblePlayers score normally (2/1/0)
 *   - Players NOT in balancerEligiblePlayers always score 0
 */

import { describe, expect, it } from "vitest";

// ── Inline the helpers so we can test them in isolation ───────────────────────

function countSetsWon(score: string | null): { teamA: number; teamB: number } {
  if (!score) return { teamA: 0, teamB: 0 };
  let a = 0, b = 0;
  for (const set of score.trim().split(/\s+/)) {
    const parts = set.split("-");
    if (parts.length !== 2) continue;
    const ga = parseInt(parts[0], 10);
    const gb = parseInt(parts[1], 10);
    if (isNaN(ga) || isNaN(gb)) continue;
    if (ga > gb) a++;
    else if (gb > ga) b++;
  }
  return { teamA: a, teamB: b };
}

function calcPoints(score: string | null, winner: "A" | "B"): { teamA: number; teamB: number } {
  const teamAWon = winner === "A";
  const setsWon = countSetsWon(score);
  const teamAPts = teamAWon ? 2 : setsWon.teamA > 0 ? 1 : 0;
  const teamBPts = !teamAWon ? 2 : setsWon.teamB > 0 ? 1 : 0;
  return { teamA: teamAPts, teamB: teamBPts };
}

/**
 * Per-player point calculation for balancer fixtures.
 * Mirrors the calcPts() function inside reportMatch.
 */
function calcPtsForPlayer(
  userId: number,
  won: boolean,
  setsWonByThisTeam: number,
  isBalancer: boolean,
  eligibleIds: number[]
): number {
  if (isBalancer && !eligibleIds.includes(userId)) return 0;
  return won ? 2 : setsWonByThisTeam > 0 ? 1 : 0;
}

// ── countSetsWon ──────────────────────────────────────────────────────────────

describe("countSetsWon", () => {
  it("returns 0-0 for null score", () => {
    expect(countSetsWon(null)).toEqual({ teamA: 0, teamB: 0 });
  });

  it("counts a 2-0 win correctly (6-3 6-2)", () => {
    expect(countSetsWon("6-3 6-2")).toEqual({ teamA: 2, teamB: 0 });
  });

  it("counts a 2-1 win correctly (6-3 4-6 6-5)", () => {
    expect(countSetsWon("6-3 4-6 6-5")).toEqual({ teamA: 2, teamB: 1 });
  });

  it("counts a 0-2 loss correctly (3-6 2-6)", () => {
    expect(countSetsWon("3-6 2-6")).toEqual({ teamA: 0, teamB: 2 });
  });

  it("handles tiebreak set 6-5 as a set win for team A", () => {
    expect(countSetsWon("6-5")).toEqual({ teamA: 1, teamB: 0 });
  });

  it("handles tiebreak set 5-6 as a set win for team B", () => {
    expect(countSetsWon("5-6")).toEqual({ teamA: 0, teamB: 1 });
  });
});

// ── calcPoints ────────────────────────────────────────────────────────────────

describe("calcPoints — 2/1/0 system", () => {
  it("2-0 win: winner gets 2, loser gets 0", () => {
    expect(calcPoints("6-3 6-2", "A")).toEqual({ teamA: 2, teamB: 0 });
  });

  it("2-0 win for team B: team B gets 2, team A gets 0", () => {
    expect(calcPoints("3-6 2-6", "B")).toEqual({ teamA: 0, teamB: 2 });
  });

  it("2-1 win: winner gets 2, loser gets 1 (won a set)", () => {
    expect(calcPoints("6-3 4-6 6-5", "A")).toEqual({ teamA: 2, teamB: 1 });
  });

  it("2-1 win for team B: team B gets 2, team A gets 1", () => {
    expect(calcPoints("3-6 6-4 5-6", "B")).toEqual({ teamA: 1, teamB: 2 });
  });

  it("null score with winner A: winner gets 2, loser gets 0", () => {
    expect(calcPoints(null, "A")).toEqual({ teamA: 2, teamB: 0 });
  });
});

// ── calcPtsForPlayer — Approach A balancer eligibility ────────────────────────

describe("calcPtsForPlayer — Approach A balancer eligibility", () => {
  // Non-balancer fixtures: all players score normally regardless of eligibleIds
  it("non-balancer: winning player scores 2 pts", () => {
    expect(calcPtsForPlayer(1, true, 2, false, [])).toBe(2);
  });

  it("non-balancer: losing player who won a set scores 1 pt", () => {
    expect(calcPtsForPlayer(2, false, 1, false, [])).toBe(1);
  });

  it("non-balancer: losing player who won no sets scores 0 pts", () => {
    expect(calcPtsForPlayer(3, false, 0, false, [])).toBe(0);
  });

  // Balancer fixtures: eligible players score normally
  it("balancer: eligible winning player scores 2 pts", () => {
    expect(calcPtsForPlayer(10, true, 2, true, [10, 11])).toBe(2);
  });

  it("balancer: eligible losing player who won a set scores 1 pt", () => {
    expect(calcPtsForPlayer(11, false, 1, true, [10, 11])).toBe(1);
  });

  it("balancer: eligible losing player who won no sets scores 0 pts", () => {
    expect(calcPtsForPlayer(11, false, 0, true, [10, 11])).toBe(0);
  });

  // Balancer fixtures: ineligible players always score 0
  it("balancer: ineligible winning player scores 0 pts", () => {
    expect(calcPtsForPlayer(20, true, 2, true, [10, 11])).toBe(0);
  });

  it("balancer: ineligible losing player who won a set still scores 0 pts", () => {
    expect(calcPtsForPlayer(20, false, 1, true, [10, 11])).toBe(0);
  });

  it("balancer: ineligible losing player who won no sets scores 0 pts", () => {
    expect(calcPtsForPlayer(20, false, 0, true, [10, 11])).toBe(0);
  });

  // Edge cases
  it("balancer: empty eligibleIds means all players score 0", () => {
    expect(calcPtsForPlayer(1, true, 2, true, [])).toBe(0);
    expect(calcPtsForPlayer(2, false, 1, true, [])).toBe(0);
  });

  it("balancer: all four players eligible — same as normal fixture", () => {
    const eligible = [1, 2, 3, 4];
    expect(calcPtsForPlayer(1, true, 2, true, eligible)).toBe(2);
    expect(calcPtsForPlayer(2, true, 2, true, eligible)).toBe(2);
    expect(calcPtsForPlayer(3, false, 1, true, eligible)).toBe(1);
    expect(calcPtsForPlayer(4, false, 0, true, eligible)).toBe(0);
  });
});

// ── buildBalancedSchedule — pairing variation ─────────────────────────────────
// Inline the algorithm so tests run without DB dependencies.

interface ScheduledFixture {
  teamA: [number, number];
  teamB: [number, number];
  round: number;
  isBalancer: boolean;
  balancerEligiblePlayers: number[];
}

function buildBalancedScheduleTest(playerIds: number[]): ScheduledFixture[] {
  const n = playerIds.length;
  if (n < 4) return [];
  const target = n - 1;
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
  const scoreFixture = (f: { teamA: [number, number]; teamB: [number, number] }) => {
    const [a, b] = f.teamA; const [c, d] = f.teamB;
    return (getP(a, b) + getP(c, d)) * 10 + getO(a, c) + getO(a, d) + getO(b, c) + getO(b, d);
  };
  const updateCounts = (f: { teamA: [number, number]; teamB: [number, number] }) => {
    const [a, b] = f.teamA; const [c, d] = f.teamB;
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
  while (true) {
    if (playerIds.every((p) => matchCount[p] >= target)) break;
    const inRound = new Set<number>();
    let addedInRound = false;
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
  let safetyLimit = 100;
  while (safetyLimit-- > 0) {
    const counts = Object.values(matchCount);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    if (maxCount === minCount) break;
    const needMore = playerIds.filter((p) => matchCount[p] < maxCount);
    if (needMore.length === 0) break;
    // Prefer fixtures where ALL 4 players are under-count (avoids overshooting).
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

function analyseSchedule(playerIds: number[], fixtures: ScheduledFixture[]) {
  const pk = (x: number, y: number) => `${Math.min(x, y)}-${Math.max(x, y)}`;
  const matchCounts: Record<number, number> = {};
  const partnerCounts: Record<string, number> = {};
  playerIds.forEach((p) => (matchCounts[p] = 0));
  for (const f of fixtures) {
    const [a, b] = f.teamA; const [c, d] = f.teamB;
    matchCounts[a]++; matchCounts[b]++; matchCounts[c]++; matchCounts[d]++;
    partnerCounts[pk(a, b)] = (partnerCounts[pk(a, b)] ?? 0) + 1;
    partnerCounts[pk(c, d)] = (partnerCounts[pk(c, d)] ?? 0) + 1;
  }
  const matchVals = Object.values(matchCounts);
  const partnerVals = Object.values(partnerCounts);
  return {
    minMatches: Math.min(...matchVals),
    maxMatches: Math.max(...matchVals),
    maxPartnerRepeats: Math.max(...partnerVals),
  };
}

describe("buildBalancedSchedule — pairing variation", () => {
  it("n=4: every player plays 3 matches, no partner repeats", () => {
    const players = [1, 2, 3, 4];
    const fixtures = buildBalancedScheduleTest(players);
    const { minMatches, maxMatches, maxPartnerRepeats } = analyseSchedule(players, fixtures);
    expect(minMatches).toBe(3);
    expect(maxMatches).toBe(3);
    expect(maxPartnerRepeats).toBe(1);
  });

  it("n=5: every player plays 4 matches, no partner repeats (max=1)", () => {
    const players = [1, 2, 3, 4, 5];
    const fixtures = buildBalancedScheduleTest(players);
    const { minMatches, maxMatches, maxPartnerRepeats } = analyseSchedule(players, fixtures);
    expect(minMatches).toBe(4);
    expect(maxMatches).toBe(4);
    expect(maxPartnerRepeats).toBe(1);
  });

  it("n=6: partner repeats capped at 2 (mathematical minimum)", () => {
    const players = [1, 2, 3, 4, 5, 6];
    const fixtures = buildBalancedScheduleTest(players);
    const { maxPartnerRepeats } = analyseSchedule(players, fixtures);
    expect(maxPartnerRepeats).toBeLessThanOrEqual(2);
  });

  it("n=7: partner repeats capped at 2", () => {
    const players = [1, 2, 3, 4, 5, 6, 7];
    const fixtures = buildBalancedScheduleTest(players);
    const { maxPartnerRepeats } = analyseSchedule(players, fixtures);
    expect(maxPartnerRepeats).toBeLessThanOrEqual(2);
  });

  it("n=8: every player plays 7 matches, no partner repeats (max=1)", () => {
    const players = [1, 2, 3, 4, 5, 6, 7, 8];
    const fixtures = buildBalancedScheduleTest(players);
    const { minMatches, maxMatches, maxPartnerRepeats } = analyseSchedule(players, fixtures);
    expect(minMatches).toBe(7);
    expect(maxMatches).toBe(7);
    expect(maxPartnerRepeats).toBe(1);
  });

  it("n=4: returns 3 fixtures total", () => {
    expect(buildBalancedScheduleTest([1, 2, 3, 4]).length).toBe(3);
  });

  it("n=5: returns 5 fixtures total", () => {
    expect(buildBalancedScheduleTest([1, 2, 3, 4, 5]).length).toBe(5);
  });
});
