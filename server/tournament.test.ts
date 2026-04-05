import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock the tournament DB helpers ────────────────────────────────────────────
vi.mock("./tournament.db", () => ({
  getAllSeasons: vi.fn().mockResolvedValue([]),
  getOpenSeason: vi.fn().mockResolvedValue(null),
  getSeasonById: vi.fn().mockResolvedValue(null),
  createSeason: vi.fn().mockResolvedValue({ id: 1, name: "Spring 2026", status: "registration", year: 2026, quarter: "spring", startDate: new Date(), endDate: new Date(), registrationDeadline: new Date() }),
  updateSeasonStatus: vi.fn().mockResolvedValue(undefined),
  getSeasonEntrantByUserId: vi.fn().mockResolvedValue(null),
  getSeasonEntrantById: vi.fn().mockResolvedValue(null),
  createSeasonEntrant: vi.fn().mockResolvedValue({ id: 5, userId: 42, displayName: "Test Player", paid: false, abilityRating: 3, seasonPoints: 0, matchesPlayed: 0, matchesWon: 0 }),
  markSeasonEntrantPaid: vi.fn().mockResolvedValue(undefined),
  getAllSeasonEntrants: vi.fn().mockResolvedValue([]),
  getYearLeaderboard: vi.fn().mockResolvedValue([]),
  upsertYearPoints: vi.fn().mockResolvedValue(undefined),
  getBoxesBySeason: vi.fn().mockResolvedValue([]),
  createBox: vi.fn().mockResolvedValue({ id: 1, seasonId: 1, name: "Box 1", minAbility: 1, maxAbility: 5 }),
  getBoxWithMembers: vi.fn().mockResolvedValue(null),
  getMyBox: vi.fn().mockResolvedValue(null),
  addBoxMember: vi.fn().mockResolvedValue(undefined),
  setBoxMemberOutcome: vi.fn().mockResolvedValue(undefined),
  getMatchesByBox: vi.fn().mockResolvedValue([]),
  getMatchesByUser: vi.fn().mockResolvedValue([]),
  reportMatch: vi.fn().mockResolvedValue({ id: 1 }),
  verifyMatch: vi.fn().mockResolvedValue(undefined),
  deleteMatch: vi.fn().mockResolvedValue(undefined),
  getOpenPartnerSlots: vi.fn().mockResolvedValue([]),
  getMyPartnerSlots: vi.fn().mockResolvedValue([]),
  createPartnerSlot: vi.fn().mockResolvedValue({ id: 1, slotDescription: "Saturday 10am", open: true }),
  closePartnerSlot: vi.fn().mockResolvedValue(undefined),
  createMatchRequest: vi.fn().mockResolvedValue({ id: 1, status: "pending" }),
  getIncomingRequests: vi.fn().mockResolvedValue([]),
  getOutgoingRequests: vi.fn().mockResolvedValue([]),
  respondToMatchRequest: vi.fn().mockResolvedValue(undefined),
  getAllFixturesBySeason: vi.fn().mockResolvedValue([]),
}));

// Mock notification helper so tests don't make real HTTP calls
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// ── Context factories ─────────────────────────────────────────────────────────
function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeUserCtx(overrides: Partial<NonNullable<TrpcContext["user"]>> = {}): TrpcContext {
  return {
    user: {
      id: 42, openId: "test-open-id", name: "Test User", email: "test@bpltc.co.uk",
      loginMethod: "manus", role: "user",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      ...overrides,
    },
    req: { protocol: "https", headers: { origin: "https://example.com" } } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeAdminCtx(): TrpcContext {
  return makeUserCtx({ id: 1, openId: "admin-1", role: "admin" });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("tournament.seasons", () => {
  it("returns empty array when no seasons exist", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.tournament.seasons();
    expect(result).toEqual([]);
  });
});

describe("tournament.currentSeason", () => {
  it("returns null when no open season exists", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.tournament.currentSeason();
    expect(result).toBeNull();
  });
});

describe("tournament.seasonLeaderboard", () => {
  it("returns empty array when no paid entrants", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.tournament.seasonLeaderboard({ seasonId: 1 });
    expect(result).toEqual([]);
  });
});

describe("tournament.yearLeaderboard", () => {
  it("returns empty array when no year points", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.tournament.yearLeaderboard({ year: 2026 });
    expect(result).toEqual([]);
  });
});

describe("tournament.myEntry", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.tournament.myEntry({ seasonId: 1 })).rejects.toThrow();
  });

  it("returns null when user has no entry for the season", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.tournament.myEntry({ seasonId: 1 });
    expect(result).toBeNull();
  });
});

describe("tournament.register", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.tournament.register({ seasonId: 1, displayName: "Test", abilityRating: 3 })).rejects.toThrow();
  });

  it("registers a new player for an open season", async () => {
    const { getSeasonById, getSeasonEntrantByUserId } = await import("./tournament.db");
    vi.mocked(getSeasonById).mockResolvedValueOnce({
      id: 1, name: "Spring 2026", status: "registration", year: 2026, quarter: "spring",
      startDate: new Date(), endDate: new Date(), registrationDeadline: new Date(),
    } as any);
    vi.mocked(getSeasonEntrantByUserId).mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.tournament.register({ seasonId: 1, displayName: "Test Player", abilityRating: 3 });
    expect(result).toMatchObject({ displayName: "Test Player", paid: false });
  });

  it("throws CONFLICT if already registered for the season", async () => {
    const { getSeasonById, getSeasonEntrantByUserId } = await import("./tournament.db");
    vi.mocked(getSeasonById).mockResolvedValueOnce({
      id: 1, name: "Spring 2026", status: "registration", year: 2026, quarter: "spring",
      startDate: new Date(), endDate: new Date(), registrationDeadline: new Date(),
    } as any);
    vi.mocked(getSeasonEntrantByUserId).mockResolvedValueOnce({
      id: 5, userId: 42, displayName: "Test Player", paid: false, abilityRating: 3,
      seasonPoints: 0, matchesPlayed: 0, matchesWon: 0,
    } as any);
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.tournament.register({ seasonId: 1, displayName: "Test Player", abilityRating: 3 })).rejects.toThrow();
  });
});

describe("tournament.seasonBoxes", () => {
  it("returns empty array when no boxes exist", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.tournament.seasonBoxes({ seasonId: 1 });
    expect(result).toEqual([]);
  });
});

describe("tournament.boxMatches", () => {
  it("returns empty array when no matches in box", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.tournament.boxMatches({ boxId: 1 });
    expect(result).toEqual([]);
  });
});

describe("tournament.partnerSlots", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.tournament.partnerSlots()).rejects.toThrow();
  });

  it("returns empty array when no open slots", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.tournament.partnerSlots();
    expect(result).toEqual([]);
  });
});

describe("tournament.postPartnerSlot", () => {
  it("throws UNAUTHORIZED when not logged in", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.tournament.postPartnerSlot({ seasonId: 1, slotDescription: "Saturday 10am" })).rejects.toThrow();
  });

  it("creates a slot for a paid entrant", async () => {
    const { getSeasonEntrantByUserId } = await import("./tournament.db");
    vi.mocked(getSeasonEntrantByUserId).mockResolvedValueOnce({
      id: 5, userId: 42, displayName: "Test Player", paid: true, abilityRating: 3,
      seasonPoints: 0, matchesPlayed: 0, matchesWon: 0,
    } as any);
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.tournament.postPartnerSlot({ seasonId: 1, slotDescription: "Saturday 10am" });
    expect(result).toMatchObject({ id: 1 });
  });

  it("throws FORBIDDEN for unpaid entrant", async () => {
    const { getSeasonEntrantByUserId } = await import("./tournament.db");
    vi.mocked(getSeasonEntrantByUserId).mockResolvedValueOnce({
      id: 5, userId: 42, displayName: "Test Player", paid: false, abilityRating: 3,
      seasonPoints: 0, matchesPlayed: 0, matchesWon: 0,
    } as any);
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.tournament.postPartnerSlot({ seasonId: 1, slotDescription: "Saturday 10am" })).rejects.toThrow("paid entrant");
  });
});

describe("tournament.adminCreateSeason (admin only)", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.tournament.adminCreateSeason({
      name: "Summer 2026", year: 2026, quarter: "summer",
      startDate: new Date(), endDate: new Date(), registrationDeadline: new Date(),
    })).rejects.toThrow();
  });

  it("allows admin to create a season", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.tournament.adminCreateSeason({
      name: "Summer 2026", year: 2026, quarter: "summer",
      startDate: new Date(), endDate: new Date(), registrationDeadline: new Date(),
    });
    expect(result).toMatchObject({ name: "Spring 2026" });
  });
});

describe("tournament.adminSeasonEntrants (admin only)", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.tournament.adminSeasonEntrants({ seasonId: 1 })).rejects.toThrow();
  });

  it("allows admin to list entrants for a season", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.tournament.adminSeasonEntrants({ seasonId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("tournament.adminMarkPaid (admin only)", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.tournament.adminMarkPaid({ entrantId: 1 })).rejects.toThrow();
  });

  it("allows admin to mark an entrant as paid", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.tournament.adminMarkPaid({ entrantId: 1 });
    expect(result).toMatchObject({ success: true });
  });
});

describe("tournament.adminUpdateSeasonStatus (admin only)", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.tournament.adminUpdateSeasonStatus({ seasonId: 1, status: "active" })).rejects.toThrow();
  });

  it("allows admin to update season status", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.tournament.adminUpdateSeasonStatus({ seasonId: 1, status: "active" });
    expect(result).toMatchObject({ success: true });
  });
});

describe("tournament.adminCreateBox (admin only)", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.tournament.adminCreateBox({ seasonId: 1, name: "Box A", level: 1 })).rejects.toThrow();
  });

  it("allows admin to create a box", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.tournament.adminCreateBox({ seasonId: 1, name: "Box A", level: 1 });
    expect(result).toMatchObject({ name: "Box 1" });
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];
    const ctx: TrpcContext = {
      user: {
        id: 1, openId: "test-user", name: "Test", email: "test@example.com",
        loginMethod: "manus", role: "user",
        createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
  });
});

describe("tournament.adminAllFixtures (admin only)", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.tournament.adminAllFixtures({ seasonId: 1 })).rejects.toThrow();
  });

  it("returns empty array when no fixtures exist for the season", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.tournament.adminAllFixtures({ seasonId: 1 });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

describe("tournament.adminReportMatch (admin only)", () => {
  const validInput = {
    seasonId: 1,
    boxId: 1,
    fixtureId: 10,
    player1Id: 1,
    partner1Id: 2,
    player2Id: 3,
    partner2Id: 4,
    score: "6-3 6-2",
    winner: "A" as const,
    playedAt: new Date(),
  };

  it("throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.tournament.adminReportMatch(validInput)).rejects.toThrow();
  });

  it("throws BAD_REQUEST when player IDs are not all distinct", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    await expect(
      caller.tournament.adminReportMatch({ ...validInput, partner1Id: 1 }) // duplicate player1Id
    ).rejects.toThrow("All four players must be different people.");
  });

  it("allows admin to report a match result for any fixture", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.tournament.adminReportMatch(validInput);
    expect(result).toMatchObject({ id: 1 });
  });
});
