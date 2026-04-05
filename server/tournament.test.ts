import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock tournament DB helpers ────────────────────────────────────────────────
vi.mock("./tournament.db", () => ({
  getLeaderboard: vi.fn().mockResolvedValue([
    { id: 1, displayName: "A. Player", setsWon: 10, setsPlayed: 15, completed: false, completedAt: null },
  ]),
  getEntrantByUserId: vi.fn().mockResolvedValue(null),
  getEntrantById: vi.fn().mockResolvedValue(null),
  createEntrant: vi.fn().mockResolvedValue({
    id: 1, userId: 42, displayName: "T. Tester", paid: false,
    setsWon: 0, setsPlayed: 0, completed: false, completedAt: null,
    stripePaymentIntentId: null, createdAt: new Date(), updatedAt: new Date(),
  }),
  markEntrantPaid: vi.fn().mockResolvedValue(undefined),
  addSetReport: vi.fn().mockResolvedValue({ id: 1, completed: false }),
  deleteSetReport: vi.fn().mockResolvedValue(undefined),
  adminDeleteSetReport: vi.fn().mockResolvedValue(undefined),
  getAllEntrants: vi.fn().mockResolvedValue([]),
  getAllSetReports: vi.fn().mockResolvedValue([]),
  getSetReportsByEntrantId: vi.fn().mockResolvedValue([]),
  verifySetReport: vi.fn().mockResolvedValue(undefined),
  getOpenPartnerSlots: vi.fn().mockResolvedValue([]),
  getMyPartnerSlots: vi.fn().mockResolvedValue([]),
  createPartnerSlot: vi.fn().mockResolvedValue({ id: 1, entrantId: 1, slotDescription: "Saturday 10am", open: true }),
  closePartnerSlot: vi.fn().mockResolvedValue(undefined),
  createMatchRequest: vi.fn().mockResolvedValue({ id: 1, status: "pending" }),
  getIncomingRequests: vi.fn().mockResolvedValue([]),
  getOutgoingRequests: vi.fn().mockResolvedValue([]),
  respondToMatchRequest: vi.fn().mockResolvedValue(undefined),
}));

// Mock the notification helper so tests don't make real HTTP calls
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
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
      id: 42, openId: "test-open-id", name: "Test User", email: "test@example.com",
      loginMethod: "manus", role: "user",
      createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      ...overrides,
    },
    req: { protocol: "https", headers: { origin: "https://example.com" } } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function makeAdminCtx(): TrpcContext {
  return makeUserCtx({ role: "admin" });
}

const paidEntrant = {
  id: 1, userId: 42, displayName: "T. Tester", paid: true,
  setsWon: 5, setsPlayed: 8, completed: false, completedAt: null,
  stripePaymentIntentId: "pi_test", createdAt: new Date(), updatedAt: new Date(),
};

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
    vi.mocked(getEntrantByUserId).mockResolvedValueOnce(paidEntrant);
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.tournament.register({ displayName: "T. Tester" })).rejects.toThrow("already registered");
  });
});

describe("tournament.reportSet", () => {
  it("throws FORBIDDEN if entrant has not paid", async () => {
    const { getEntrantByUserId } = await import("./tournament.db");
    vi.mocked(getEntrantByUserId).mockResolvedValueOnce({ ...paidEntrant, paid: false });
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(
      caller.tournament.reportSet({ opponent: "B. Smith", score: "6-4", won: true, playedOn: new Date() })
    ).rejects.toThrow("entry fee");
  });

  it("records a set for a paid entrant", async () => {
    const { getEntrantByUserId } = await import("./tournament.db");
    vi.mocked(getEntrantByUserId).mockResolvedValueOnce(paidEntrant);
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.tournament.reportSet({
      opponent: "B. Smith", score: "6-4", won: true, playedOn: new Date(),
    });
    expect(result).toMatchObject({ id: 1 });
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

describe("tournament.adminVerifySet", () => {
  it("allows admin to verify a set report", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.tournament.adminVerifySet({ reportId: 1 });
    expect(result).toMatchObject({ success: true });
  });

  it("throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.tournament.adminVerifySet({ reportId: 1 })).rejects.toThrow();
  });
});

describe("tournament.adminMarkPaid", () => {
  it("allows admin to manually mark an entrant as paid", async () => {
    const { getEntrantById } = await import("./tournament.db");
    vi.mocked(getEntrantById).mockResolvedValueOnce(paidEntrant);
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.tournament.adminMarkPaid({ entrantId: 1 });
    expect(result).toMatchObject({ success: true });
  });

  it("throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.tournament.adminMarkPaid({ entrantId: 1 })).rejects.toThrow();
  });
});

describe("tournament.postPartnerSlot", () => {
  it("allows a paid entrant to post availability", async () => {
    const { getEntrantByUserId } = await import("./tournament.db");
    vi.mocked(getEntrantByUserId).mockResolvedValueOnce(paidEntrant);
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.tournament.postPartnerSlot({ slotDescription: "Saturday 10am–12pm" });
    expect(result).toMatchObject({ slotDescription: "Saturday 10am" });
  });

  it("throws FORBIDDEN for unpaid entrant", async () => {
    const { getEntrantByUserId } = await import("./tournament.db");
    vi.mocked(getEntrantByUserId).mockResolvedValueOnce({ ...paidEntrant, paid: false });
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(
      caller.tournament.postPartnerSlot({ slotDescription: "Saturday 10am–12pm" })
    ).rejects.toThrow();
  });
});

describe("tournament.sendMatchRequest", () => {
  it("throws BAD_REQUEST when requesting yourself", async () => {
    const { getEntrantByUserId } = await import("./tournament.db");
    vi.mocked(getEntrantByUserId).mockResolvedValueOnce(paidEntrant);
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(
      caller.tournament.sendMatchRequest({ slotId: 1, toEntrantId: 1 })
    ).rejects.toThrow("cannot request yourself");
  });

  it("sends a request to another entrant", async () => {
    const { getEntrantByUserId } = await import("./tournament.db");
    vi.mocked(getEntrantByUserId).mockResolvedValueOnce(paidEntrant);
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.tournament.sendMatchRequest({ slotId: 1, toEntrantId: 99, message: "Let's play!" });
    expect(result).toMatchObject({ status: "pending" });
  });
});

describe("tournament.respondToRequest", () => {
  it("accepts a match request", async () => {
    const { getEntrantByUserId } = await import("./tournament.db");
    vi.mocked(getEntrantByUserId).mockResolvedValueOnce(paidEntrant);
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.tournament.respondToRequest({ requestId: 1, status: "accepted" });
    expect(result).toMatchObject({ success: true });
  });

  it("declines a match request", async () => {
    const { getEntrantByUserId } = await import("./tournament.db");
    vi.mocked(getEntrantByUserId).mockResolvedValueOnce(paidEntrant);
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.tournament.respondToRequest({ requestId: 1, status: "declined" });
    expect(result).toMatchObject({ success: true });
  });
});
