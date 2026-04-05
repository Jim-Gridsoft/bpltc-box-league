/**
 * Unit tests for the 2/1/0 points calculation logic.
 *
 * Points rules:
 *   - 2 pts: match win
 *   - 1 pt:  lost the match but won at least one set
 *   - 0 pts: lost the match 2-0 (won no sets)
 */

import { describe, expect, it } from "vitest";

// ── Inline the helper so we can test it in isolation ─────────────────────────
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
