import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getAllSeasons,
  getActiveSeason,
  getOpenSeason,
  getSeasonById,
  createSeason,
  updateSeasonStatus,
  getSeasonEntrantByUserId,
  getSeasonEntrantById,
  createSeasonEntrant,
  markSeasonEntrantPaid,
  getAllSeasonEntrants,
  getYearLeaderboard,
  getBoxesBySeason,
  createBox,
  getBoxWithMembers,
  getMyBox,
  addBoxMember,
  setBoxMemberOutcome,
  getMatchesByBox,
  getMatchesByUser,
  reportMatch,
  verifyMatch,
  deleteMatch,
  getOpenPartnerSlots,
  getMyPartnerSlots,
  createPartnerSlot,
  closePartnerSlot,
  createMatchRequest,
  getIncomingRequests,
  getOutgoingRequests,
  respondToMatchRequest,
  sandboxRegisterAndPay,
  sandboxSeedPlayers,
  sandboxResetSeason,
  autoCreateBoxes,
  generateFixtures,
  getFixturesByBox,
  getMyFixtures,
} from "../tournament.db";
import { TOURNAMENT_ENTRY } from "../products";
import Stripe from "stripe";
import { notifyOwner } from "../_core/notification";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-03-31.basil" });
}

export const tournamentRouter = router({
  // ── Seasons (public) ────────────────────────────────────────────────────────

  /** List all seasons */
  seasons: publicProcedure.query(async () => {
    return getAllSeasons();
  }),

  /** Get the currently open/active season */
  currentSeason: publicProcedure.query(async () => {
    return (await getOpenSeason()) ?? null;
  }),

  // ── Season Entry ────────────────────────────────────────────────────────────

  /** Get the current user's entry for a given season */
  myEntry: protectedProcedure
    .input(z.object({ seasonId: z.number() }))
    .query(async ({ ctx, input }) => {
      return (await getSeasonEntrantByUserId(ctx.user.id, input.seasonId)) ?? null;
    }),

  /** Register for a season */
  register: protectedProcedure
    .input(
      z.object({
        seasonId: z.number(),
        displayName: z.string().min(2).max(128),
        abilityRating: z.number().int().min(1).max(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const season = await getSeasonById(input.seasonId);
      if (!season) throw new TRPCError({ code: "NOT_FOUND", message: "Season not found." });
      if (season.status !== "registration" && season.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Registration is not open for this season.",
        });
      }
      const existing = await getSeasonEntrantByUserId(ctx.user.id, input.seasonId);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already registered for this season.",
        });
      }
      return createSeasonEntrant({
        seasonId: input.seasonId,
        userId: ctx.user.id,
        displayName: input.displayName,
        abilityRating: input.abilityRating,
        paid: false,
      });
    }),

  /** Create a Stripe checkout session for the £20 entry fee */
  createCheckout: protectedProcedure
    .input(z.object({ seasonId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const entrant = await getSeasonEntrantByUserId(ctx.user.id, input.seasonId);
      if (!entrant) throw new TRPCError({ code: "NOT_FOUND", message: "Please register first." });
      if (entrant.paid) throw new TRPCError({ code: "CONFLICT", message: "Entry fee already paid." });

      const stripe = getStripe();
      const origin =
        (ctx.req.headers.origin as string) || "https://tennisspon-ptkxsipn.manus.space";
      const season = await getSeasonById(input.seasonId);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: ctx.user.email ?? undefined,
        line_items: [
          {
            price_data: {
              currency: TOURNAMENT_ENTRY.currency,
              product_data: {
                name: `${TOURNAMENT_ENTRY.name} — ${season?.name ?? "Season"}`,
                description: TOURNAMENT_ENTRY.description,
              },
              unit_amount: TOURNAMENT_ENTRY.amount,
            },
            quantity: 1,
          },
        ],
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          entrant_id: entrant.id.toString(),
          season_id: input.seasonId.toString(),
          customer_email: ctx.user.email ?? "",
          customer_name: ctx.user.name ?? "",
        },
        allow_promotion_codes: true,
        success_url: `${origin}/my-season?payment=success`,
        cancel_url: `${origin}/my-season?payment=cancelled`,
      });

      return { url: session.url };
    }),

  // ── Leaderboards ────────────────────────────────────────────────────────────

  /** Season leaderboard — all paid entrants ranked by season points */
  seasonLeaderboard: publicProcedure
    .input(z.object({ seasonId: z.number() }))
    .query(async ({ input }) => {
      const entrants = await getAllSeasonEntrants(input.seasonId);
      return entrants.filter((e) => e.paid);
    }),

  /** Year-long accumulator leaderboard */
  yearLeaderboard: publicProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ input }) => {
      return getYearLeaderboard(input.year);
    }),

  // ── Boxes ────────────────────────────────────────────────────────────────────

  /** Get all boxes for a season */
  seasonBoxes: publicProcedure
    .input(z.object({ seasonId: z.number() }))
    .query(async ({ input }) => {
      return getBoxesBySeason(input.seasonId);
    }),

  /** Get a box with its members and standings */
  boxDetail: publicProcedure
    .input(z.object({ boxId: z.number() }))
    .query(async ({ input }) => {
      return getBoxWithMembers(input.boxId);
    }),

  /** Get the current user's box for a season */
  myBox: protectedProcedure
    .input(z.object({ seasonId: z.number() }))
    .query(async ({ ctx, input }) => {
      const entrant = await getSeasonEntrantByUserId(ctx.user.id, input.seasonId);
      if (!entrant) return null;
      return getMyBox(entrant.id);
    }),

  // ── Matches ──────────────────────────────────────────────────────────────────

  /** Get all matches in a box */
  boxMatches: publicProcedure
    .input(z.object({ boxId: z.number() }))
    .query(async ({ input }) => {
      return getMatchesByBox(input.boxId);
    }),

  /** Get the current user's matches for a season */
  myMatches: protectedProcedure
    .input(z.object({ seasonId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getMatchesByUser(ctx.user.id, input.seasonId);
    }),

  /**
   * Report a doubles match result.
   * All four players must be paid entrants in the same box.
   * Rotating partner rule: player1 and partner1 must not have been partners
   * more than once already in this season (enforced as a warning, not a hard block).
   */
  reportMatch: protectedProcedure
    .input(
      z.object({
        seasonId: z.number(),
        boxId: z.number(),
        partner1Id: z.number(), // reporter's partner (userId)
        player2Id: z.number(), // opponent 1 (userId)
        partner2Id: z.number(), // opponent 2 (userId)
        score: z.string().min(1).max(64),
        winner: z.enum(["A", "B"]),
        playedAt: z.date(),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const entrant = await getSeasonEntrantByUserId(ctx.user.id, input.seasonId);
      if (!entrant?.paid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be a paid entrant to report matches.",
        });
      }

      // Validate all four players are distinct
      const ids = [ctx.user.id, input.partner1Id, input.player2Id, input.partner2Id];
      if (new Set(ids).size !== 4) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "All four players must be different people.",
        });
      }

      const match = await reportMatch({
        boxId: input.boxId,
        seasonId: input.seasonId,
        player1Id: ctx.user.id,
        partner1Id: input.partner1Id,
        player2Id: input.player2Id,
        partner2Id: input.partner2Id,
        score: input.score,
        winner: input.winner,
        playedAt: input.playedAt,
        notes: input.notes ?? null,
      });

      await notifyOwner({
        title: "Match result reported",
        content: `A match was reported in Box ${input.boxId} (Season ${input.seasonId}). Score: ${input.score}. Winner: Team ${input.winner}.`,
      });

      return match;
    }),

  // ════════════════════════════════════════════════════════════════════════════
  // ADMIN PROCEDURES
  // ════════════════════════════════════════════════════════════════════════════

  /** Create a new season */
  adminCreateSeason: protectedProcedure
    .input(
      z.object({
        name: z.string().min(3).max(64),
        year: z.number().int(),
        quarter: z.enum(["spring", "summer", "autumn", "winter"]),
        startDate: z.date(),
        endDate: z.date(),
        registrationDeadline: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return createSeason({ ...input, status: "upcoming" });
    }),

  /** Update season status */
  adminUpdateSeasonStatus: protectedProcedure
    .input(
      z.object({
        seasonId: z.number(),
        status: z.enum(["upcoming", "registration", "active", "completed"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await updateSeasonStatus(input.seasonId, input.status);
      return { success: true };
    }),

  /** Get all entrants for a season (admin) */
  adminSeasonEntrants: protectedProcedure
    .input(z.object({ seasonId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllSeasonEntrants(input.seasonId);
    }),

  /** Manually mark an entrant as paid */
  adminMarkPaid: protectedProcedure
    .input(z.object({ entrantId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await markSeasonEntrantPaid(input.entrantId, "manual-admin");
      const entrant = await getSeasonEntrantById(input.entrantId);
      await notifyOwner({
        title: "Entry manually marked as paid",
        content: `Admin manually marked **${entrant?.displayName ?? "unknown"}** as paid.`,
      });
      return { success: true };
    }),

  /** Create a box for a season */
  adminCreateBox: protectedProcedure
    .input(
      z.object({
        seasonId: z.number(),
        name: z.string().min(1).max(32),
        level: z.number().int().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return createBox(input);
    }),

  /** Assign a season entrant to a box */
  adminAddBoxMember: protectedProcedure
    .input(z.object({ boxId: z.number(), seasonEntrantId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await addBoxMember({ boxId: input.boxId, seasonEntrantId: input.seasonEntrantId });
      return { success: true };
    }),

  /** Set end-of-season outcome for a box member */
  adminSetOutcome: protectedProcedure
    .input(
      z.object({
        boxMemberId: z.number(),
        outcome: z.enum(["promoted", "stayed", "relegated"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await setBoxMemberOutcome(input.boxMemberId, input.outcome);
      return { success: true };
    }),

  /** Verify a match result */
  adminVerifyMatch: protectedProcedure
    .input(z.object({ matchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await verifyMatch(input.matchId);
      return { success: true };
    }),

  /** Delete a match result and recalculate points */
  adminDeleteMatch: protectedProcedure
    .input(z.object({ matchId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await deleteMatch(input.matchId);
      return { success: true };
    }),

  // ════════════════════════════════════════════════════════════════════════════
  // PARTNER FINDER
  // ════════════════════════════════════════════════════════════════════════════

  partnerSlots: protectedProcedure.query(async ({ ctx }) => {
    return getOpenPartnerSlots(ctx.user.id);
  }),

  myPartnerSlots: protectedProcedure.query(async ({ ctx }) => {
    return getMyPartnerSlots(ctx.user.id);
  }),

  postPartnerSlot: protectedProcedure
    .input(
      z.object({
        seasonId: z.number(),
        slotDescription: z.string().min(5).max(256),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const entrant = await getSeasonEntrantByUserId(ctx.user.id, input.seasonId);
      if (!entrant?.paid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be a paid entrant to post availability.",
        });
      }
      return createPartnerSlot({
        seasonEntrantId: entrant.id,
        userId: ctx.user.id,
        slotDescription: input.slotDescription,
        notes: input.notes ?? null,
      });
    }),

  closePartnerSlot: protectedProcedure
    .input(z.object({ slotId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await closePartnerSlot(input.slotId, ctx.user.id);
      return { success: true };
    }),

  sendMatchRequest: protectedProcedure
    .input(
      z.object({
        slotId: z.number(),
        toUserId: z.number(),
        message: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.toUserId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot request yourself." });
      }
      const req = await createMatchRequest({
        slotId: input.slotId,
        toUserId: input.toUserId,
        fromUserId: ctx.user.id,
        message: input.message ?? null,
      });
      await notifyOwner({
        title: `New match request from user ${ctx.user.id}`,
        content: `User **${ctx.user.name ?? ctx.user.id}** sent a match request.\n\nMessage: ${input.message ?? "(none)"}`,
      });
      return req;
    }),

  incomingRequests: protectedProcedure.query(async ({ ctx }) => {
    return getIncomingRequests(ctx.user.id);
  }),

  outgoingRequests: protectedProcedure.query(async ({ ctx }) => {
    return getOutgoingRequests(ctx.user.id);
  }),

  respondToRequest: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        status: z.enum(["accepted", "declined"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await respondToMatchRequest(input.requestId, ctx.user.id, input.status);
      return { success: true };
    }),

  // ════════════════════════════════════════════════════════════════════════════
  // SANDBOX / DEMO MODE PROCEDURES
  // ════════════════════════════════════════════════════════════════════════════

  // ════════════════════════════════════════════════════════════════════════════
  // BOX CREATION & FIXTURE GENERATION
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Auto-create ability-seeded boxes for a season and assign all paid entrants.
   * Admin only. Clears existing boxes and fixtures before recreating.
   */
  adminAutoCreateBoxes: protectedProcedure
    .input(
      z.object({
        seasonId: z.number(),
        targetBoxSize: z.number().int().min(4).max(12).default(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const result = await autoCreateBoxes(input.seasonId, input.targetBoxSize);
      await notifyOwner({
        title: `Boxes created for season ${input.seasonId}`,
        content: `${result.length} boxes created with ${result.reduce((s, b) => s + b.members.length, 0)} total players.`,
      });
      return result;
    }),

  /**
   * Generate round-robin fixture schedule for all boxes in a season.
   * Admin only. Clears existing fixtures before regenerating.
   */
  adminGenerateFixtures: protectedProcedure
    .input(z.object({ seasonId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const result = await generateFixtures(input.seasonId);
      await notifyOwner({
        title: `Fixtures generated for season ${input.seasonId}`,
        content: `${result.totalFixtures} fixtures generated across ${result.boxCount} boxes.`,
      });
      return result;
    }),

  /** Get all fixtures for a specific box (public) */
  boxFixtures: publicProcedure
    .input(z.object({ boxId: z.number() }))
    .query(async ({ input }) => {
      return getFixturesByBox(input.boxId);
    }),

  /** Get all fixtures for the current user in a season */
  myFixtures: protectedProcedure
    .input(z.object({ seasonId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getMyFixtures(ctx.user.id, input.seasonId);
    }),

  /**
   * Register the current user for a season and mark them as paid instantly,
   * bypassing Stripe. Admin-only in production; available to all in sandbox.
   */
  sandboxRegister: protectedProcedure
    .input(
      z.object({
        seasonId: z.number(),
        displayName: z.string().min(2).max(128),
        abilityRating: z.number().int().min(1).max(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const season = await getSeasonById(input.seasonId);
      if (!season) throw new TRPCError({ code: "NOT_FOUND", message: "Season not found." });
      return sandboxRegisterAndPay(
        ctx.user.id,
        input.seasonId,
        input.displayName,
        input.abilityRating
      );
    }),

  /**
   * Seed N synthetic test players into a season (admin only).
   * All test players are created as paid entrants with random names and ability ratings.
   */
  sandboxSeedPlayers: protectedProcedure
    .input(
      z.object({
        seasonId: z.number(),
        count: z.number().int().min(1).max(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const created = await sandboxSeedPlayers(input.seasonId, input.count);
      return { created: created.length, players: created };
    }),

  /**
   * Reset all sandbox test data for a season (admin only).
   * Removes all synthetic users, their entrant records, matches, and partner data.
   * Does NOT remove real user registrations.
   */
  sandboxReset: protectedProcedure
    .input(z.object({ seasonId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return sandboxResetSeason(input.seasonId);
    }),
});
