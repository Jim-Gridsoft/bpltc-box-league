import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock tournament DB helpers ────────────────────────────────────────────────
vi.mock("./tournament.db", () => ({
  getLeaderboard: vi.fn().mockResolvedValue([
    {
      id: 1,
      displayName: "A. Player",
      setsWon: 10,
      setsPlayed: 15,
      completed: false,
      completedAt: null,
    },
  ]),
  getEntrantByUserId: vi.fn().mockResolvedValue(null),
  createEntrant: vi.fn().mockResolvedValue({
    id: 1,
    userId: 42,
    displayName: "T. Tester",
    paid: false,
    setsWon: 0,
    setsPlayed: 0,
    completed: false,
    completedAt: null,
    stripePaymentIntentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  markEntrantPaid: vi.fn().mockResolvedValue(undefined),
  addSetReport: vi.fn().mockResolvedValue({ id: 1 }),
  deleteSetReport: vi.fn().mockResolvedValue(undefined),
  getAllEntrants: vi.fn().mockResolvedValue([]),
  getSetReportsByEntrantId: vi.fn().mockResolvedValue([]),
}));

// ── Context helpers ────────────────────────────────────────────────────────────
function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function makeUserCtx(overrides: Partial<NonNullable<TrpcContext["user"]>> = {}): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "test-open-id",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...overrides,
    },
    req: { protocol: "https", headers: { origin: "https://example.com" } } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function makeAdminCtx(): TrpcContext {
  return makeUserCtx({ role: "admin" });
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("tournament.leaderboard", () => {
  it("returns leaderboard data publicly", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.tournament.leaderboard();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toMatchObject({ displayName: "A. Player", setsWon: 10 });
  });
});

describe("tournament.myEntry", () => {
  it("returns null when user has no entry", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.tournament.myEntry();
    expect(result).toBeNull();
  });

  it("throws UNAUTHORIZED when not logged in", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.tournament.myEntry()).rejects.toThrow();
  });
});

describe("tournament.register", () => {
  it("registers a new entrant successfully", async () => {
    const { getEntrantByUserId } = await import("./tournament.db");
    vi.mocked(getEntrantByUserId).mockResolvedValueOnce(null);

    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.tournament.register({ displayName: "T. Tester" });
    expect(result).toMatchObject({ displayName: "T. Tester", paid: false });
  });

  it("rejects display names shorter than 2 characters", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.tournament.register({ displayName: "X" })).rejects.toThrow();
  });

  it("throws CONFLICT if already registered", async () => {
    const { getEntrantByUserId } = await import("./tournament.db");
    vi.mocked(getEntrantByUserId).mockResolvedValueOnce({
      id: 1,
      userId: 42,
      displayName: "T. Tester",
      paid: true,
      setsWon: 0,
      setsPlayed: 0,
      completed: false,
      completedAt: null,
      stripePaymentIntentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.tournament.register({ displayName: "T. Tester" })).rejects.toThrow(
      "already registered"
    );
  });
});

describe("tournament.adminAllEntrants", () => {
  it("allows admin to fetch all entrants", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.tournament.adminAllEntrants();
    expect(Array.isArray(result)).toBe(true);
  });

  it("throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.tournament.adminAllEntrants()).rejects.toThrow();
  });
});
