import { beforeEach, describe, expect, it, vi } from "vitest";
import { tournamentRouter } from "./routers/tournament";
import type { TrpcContext } from "./_core/context";

// Preserve all unrelated helper exports while replacing the helpers exercised here.
vi.mock("./tournament.db", async () => {
  const actual = await vi.importActual<typeof import("./tournament.db")>("./tournament.db");
  return {
    ...actual,
    getSeasonById: vi.fn(),
    restoreSeasonEntrantByName: vi.fn(),
    moveSeasonEntrantToBox: vi.fn(),
    getSeasonEntrantById: vi.fn(),
  };
});

import * as tournamentDb from "./tournament.db";

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
      id: 42,
      openId: "test-open-id",
      name: "Test User",
      email: "test@bpltc.co.uk",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...overrides,
    },
    req: { protocol: "https", headers: { origin: "https://example.com" } } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeAdminCtx(): TrpcContext {
  return makeUserCtx({ id: 1, openId: "admin-1", role: "admin" });
}

const openSeason = {
  id: 7,
  name: "Spring 2026",
  status: "active",
  year: 2026,
  quarter: "spring",
  startDate: new Date("2026-03-01"),
  endDate: new Date("2026-05-31"),
  registrationDeadline: new Date("2026-02-28"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tournament.adminRestoreSeasonEntrant", () => {
  const validInput = { seasonId: 7, displayName: "Alex Player", abilityRating: 4 };

  it("denies unauthenticated callers", async () => {
    const caller = tournamentRouter.createCaller(makePublicCtx());

    await expect(caller.adminRestoreSeasonEntrant(validInput)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(tournamentDb.getSeasonById).not.toHaveBeenCalled();
    expect(tournamentDb.restoreSeasonEntrantByName).not.toHaveBeenCalled();
  });

  it("denies non-admin callers", async () => {
    const caller = tournamentRouter.createCaller(makeUserCtx());

    await expect(caller.adminRestoreSeasonEntrant(validInput)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(tournamentDb.getSeasonById).not.toHaveBeenCalled();
    expect(tournamentDb.restoreSeasonEntrantByName).not.toHaveBeenCalled();
  });

  it("rejects invalid input without calling database helpers", async () => {
    const caller = tournamentRouter.createCaller(makeAdminCtx());

    await expect(
      caller.adminRestoreSeasonEntrant({ ...validInput, displayName: "A" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(tournamentDb.getSeasonById).not.toHaveBeenCalled();
    expect(tournamentDb.restoreSeasonEntrantByName).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND when the season does not exist", async () => {
    vi.mocked(tournamentDb.getSeasonById).mockResolvedValueOnce(undefined);
    const caller = tournamentRouter.createCaller(makeAdminCtx());

    await expect(caller.adminRestoreSeasonEntrant(validInput)).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Season not found.",
    });
    expect(tournamentDb.getSeasonById).toHaveBeenCalledWith(validInput.seasonId);
    expect(tournamentDb.restoreSeasonEntrantByName).not.toHaveBeenCalled();
  });

  it("rejects restoration into a completed season", async () => {
    vi.mocked(tournamentDb.getSeasonById).mockResolvedValueOnce({ ...openSeason, status: "completed" } as never);
    const caller = tournamentRouter.createCaller(makeAdminCtx());

    await expect(caller.adminRestoreSeasonEntrant(validInput)).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Cannot restore an entrant to a completed season.",
    });
    expect(tournamentDb.restoreSeasonEntrantByName).not.toHaveBeenCalled();
  });

  it("delegates a valid restoration with the exact input", async () => {
    const restoredEntrant = { id: 19, seasonId: 7, displayName: "Alex Player", abilityRating: 4, paid: true };
    vi.mocked(tournamentDb.getSeasonById).mockResolvedValueOnce(openSeason as never);
    vi.mocked(tournamentDb.restoreSeasonEntrantByName).mockResolvedValueOnce(restoredEntrant as never);
    const caller = tournamentRouter.createCaller(makeAdminCtx());

    await expect(caller.adminRestoreSeasonEntrant(validInput)).resolves.toBe(restoredEntrant);
    expect(tournamentDb.getSeasonById).toHaveBeenCalledWith(7);
    expect(tournamentDb.restoreSeasonEntrantByName).toHaveBeenCalledTimes(1);
    expect(tournamentDb.restoreSeasonEntrantByName).toHaveBeenCalledWith(7, "Alex Player", 4);
  });
});

describe("tournament.adminMoveEntrantToBox", () => {
  const validInput = { seasonEntrantId: 19, targetBoxId: 3 };

  it("denies unauthenticated callers", async () => {
    const caller = tournamentRouter.createCaller(makePublicCtx());

    await expect(caller.adminMoveEntrantToBox(validInput)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(tournamentDb.moveSeasonEntrantToBox).not.toHaveBeenCalled();
  });

  it("denies non-admin callers", async () => {
    const caller = tournamentRouter.createCaller(makeUserCtx());

    await expect(caller.adminMoveEntrantToBox(validInput)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(tournamentDb.moveSeasonEntrantToBox).not.toHaveBeenCalled();
  });

  it("rejects invalid input without calling the movement helper", async () => {
    const caller = tournamentRouter.createCaller(makeAdminCtx());

    await expect(
      caller.adminMoveEntrantToBox({ seasonEntrantId: 19, targetBoxId: "3" as unknown as number })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(tournamentDb.moveSeasonEntrantToBox).not.toHaveBeenCalled();
  });

  it("delegates a valid movement with the exact input", async () => {
    const moveResult = { previousBoxId: 2, targetBoxId: 3 };
    vi.mocked(tournamentDb.moveSeasonEntrantToBox).mockResolvedValueOnce(moveResult as never);
    const caller = tournamentRouter.createCaller(makeAdminCtx());

    await expect(caller.adminMoveEntrantToBox(validInput)).resolves.toBe(moveResult);
    expect(tournamentDb.moveSeasonEntrantToBox).toHaveBeenCalledTimes(1);
    expect(tournamentDb.moveSeasonEntrantToBox).toHaveBeenCalledWith(19, 3);
  });
});
