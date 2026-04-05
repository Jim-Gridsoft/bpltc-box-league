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
