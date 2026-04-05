import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  addSetReport,
  adminDeleteSetReport,
  closePartnerSlot,
  createEntrant,
  createMatchRequest,
  createPartnerSlot,
  deleteSetReport,
  getAllEntrants,
  getAllSetReports,
  getEntrantById,
  getEntrantByUserId,
  getIncomingRequests,
  getLeaderboard,
  getMyPartnerSlots,
  getOpenPartnerSlots,
  getOutgoingRequests,
  getSetReportsByEntrantId,
  markEntrantPaid,
  respondToMatchRequest,
  verifySetReport,
} from "../tournament.db";
import { TOURNAMENT_ENTRY } from "../products";
import Stripe from "stripe";
import { notifyOwner } from "../_core/notification";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-03-31.basil" });
}

/** Simple in-process email via owner notification (no external SMTP required) */
async function sendEmail(to: string, subject: string, body: string) {
  // In production this would call an SMTP/SendGrid/SES service.
  // For now we notify the club owner and log to console.
  console.log(`[Email] To: ${to} | Subject: ${subject}`);
  await notifyOwner({ title: `Email sent → ${to}`, content: `**${subject}**\n\n${body}` });
}

export const tournamentRouter = router({
  // ── Public: leaderboard ────────────────────────────────────────────────────
  leaderboard: publicProcedure.query(async () => {
    return getLeaderboard();
  }),

  // ── Protected: get my entrant record ──────────────────────────────────────
  myEntry: protectedProcedure.query(async ({ ctx }) => {
    return getEntrantByUserId(ctx.user.id) ?? null;
  }),

  // ── Protected: register for the tournament ────────────────────────────────
  register: protectedProcedure
    .input(z.object({ displayName: z.string().min(2).max(128) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getEntrantByUserId(ctx.user.id);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already registered for this tournament.",
        });
      }
      const entrant = await createEntrant({
        userId: ctx.user.id,
        displayName: input.displayName,
        paid: false,
      });
      return entrant;
    }),

  // ── Protected: create Stripe checkout session ─────────────────────────────
  createCheckout: protectedProcedure.mutation(async ({ ctx }) => {
    const entrant = await getEntrantByUserId(ctx.user.id);
    if (!entrant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Please register first." });
    }
    if (entrant.paid) {
      throw new TRPCError({ code: "CONFLICT", message: "Entry fee already paid." });
    }

    const stripe = getStripe();
    const origin = (ctx.req.headers.origin as string) || "https://tennisspon-ptkxsipn.manus.space";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: ctx.user.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: TOURNAMENT_ENTRY.currency,
            product_data: {
              name: TOURNAMENT_ENTRY.name,
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
        customer_email: ctx.user.email ?? "",
        customer_name: ctx.user.name ?? "",
      },
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?payment=success`,
      cancel_url: `${origin}/dashboard?payment=cancelled`,
    });

    return { url: session.url };
  }),

  // ── Protected: report a set ───────────────────────────────────────────────
  reportSet: protectedProcedure
    .input(
      z.object({
        opponent: z.string().min(2).max(256),
        score: z.string().min(1).max(32),
        won: z.boolean(),
        playedOn: z.date(),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const entrant = await getEntrantByUserId(ctx.user.id);
      if (!entrant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "You are not registered." });
      }
      if (!entrant.paid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Please complete your entry fee payment before reporting sets.",
        });
      }
      const updated = await addSetReport({
        entrantId: entrant.id,
        opponent: input.opponent,
        score: input.score,
        won: input.won,
        playedOn: input.playedOn,
        notes: input.notes ?? null,
      });

      // Notify when player reaches 50 sets
      if (updated?.completed && !entrant.completed && ctx.user.email) {
        await sendEmail(
          ctx.user.email,
          "🎾 Congratulations — Challenge Complete!",
          `Dear ${entrant.displayName},\n\nYou have reached 50 sets won in the BPLTC Men's Doubles Ladder 2026. Congratulations!\n\nCheck the leaderboard to see your final ranking.\n\nBramhall Park Lawn Tennis Club`
        );
      }

      return updated;
    }),

  // ── Protected: get my set history ─────────────────────────────────────────
  mySetHistory: protectedProcedure.query(async ({ ctx }) => {
    const entrant = await getEntrantByUserId(ctx.user.id);
    if (!entrant) return [];
    return getSetReportsByEntrantId(entrant.id);
  }),

  // ── Protected: delete a set report ────────────────────────────────────────
  deleteSet: protectedProcedure
    .input(z.object({ reportId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const entrant = await getEntrantByUserId(ctx.user.id);
      if (!entrant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "You are not registered." });
      }
      await deleteSetReport(input.reportId, entrant.id);
      return { success: true };
    }),

  // ════════════════════════════════════════════════════════════════════════════
  // ADMIN PROCEDURES
  // ════════════════════════════════════════════════════════════════════════════

  adminAllEntrants: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return getAllEntrants();
  }),

  adminAllSetReports: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return getAllSetReports();
  }),

  adminVerifySet: protectedProcedure
    .input(z.object({ reportId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await verifySetReport(input.reportId);
      return { success: true };
    }),

  adminDeleteSet: protectedProcedure
    .input(z.object({ reportId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await adminDeleteSetReport(input.reportId);
      return { success: true };
    }),

  adminMarkPaid: protectedProcedure
    .input(z.object({ entrantId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await markEntrantPaid(input.entrantId, "manual-admin");
      // Send confirmation email
      const entrant = await getEntrantById(input.entrantId);
      if (entrant) {
        // Notify owner
        await notifyOwner({
          title: "Entry manually marked as paid",
          content: `Admin manually marked entrant **${entrant.displayName}** (ID: ${entrant.id}) as paid.`,
        });
      }
      return { success: true };
    }),

  // ════════════════════════════════════════════════════════════════════════════
  // PARTNER PAIRING PROCEDURES
  // ════════════════════════════════════════════════════════════════════════════

  /** List all open partner slots (excluding the current player's own slots) */
  partnerSlots: protectedProcedure.query(async ({ ctx }) => {
    const entrant = await getEntrantByUserId(ctx.user.id);
    return getOpenPartnerSlots(entrant?.id);
  }),

  /** Get the current player's own posted slots */
  myPartnerSlots: protectedProcedure.query(async ({ ctx }) => {
    const entrant = await getEntrantByUserId(ctx.user.id);
    if (!entrant?.paid) return [];
    return getMyPartnerSlots(entrant.id);
  }),

  /** Post a new availability slot */
  postPartnerSlot: protectedProcedure
    .input(
      z.object({
        slotDescription: z.string().min(5).max(256),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const entrant = await getEntrantByUserId(ctx.user.id);
      if (!entrant?.paid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be a paid entrant to post availability.",
        });
      }
      return createPartnerSlot({
        entrantId: entrant.id,
        slotDescription: input.slotDescription,
        notes: input.notes ?? null,
      });
    }),

  /** Close / withdraw an availability slot */
  closePartnerSlot: protectedProcedure
    .input(z.object({ slotId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const entrant = await getEntrantByUserId(ctx.user.id);
      if (!entrant) throw new TRPCError({ code: "NOT_FOUND" });
      await closePartnerSlot(input.slotId, entrant.id);
      return { success: true };
    }),

  /** Send a match request to the owner of a slot */
  sendMatchRequest: protectedProcedure
    .input(
      z.object({
        slotId: z.number(),
        toEntrantId: z.number(),
        message: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const entrant = await getEntrantByUserId(ctx.user.id);
      if (!entrant?.paid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be a paid entrant to send match requests.",
        });
      }
      if (entrant.id === input.toEntrantId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot request yourself." });
      }
      const req = await createMatchRequest({
        slotId: input.slotId,
        toEntrantId: input.toEntrantId,
        fromEntrantId: entrant.id,
        message: input.message ?? null,
      });
      // Notify the recipient via owner notification (stand-in for direct email)
      await notifyOwner({
        title: `New match request from ${entrant.displayName}`,
        content: `**${entrant.displayName}** has sent a match request to entrant ID ${input.toEntrantId}.\n\nMessage: ${input.message ?? "(none)"}`,
      });
      return req;
    }),

  /** Get incoming match requests for the current player */
  incomingRequests: protectedProcedure.query(async ({ ctx }) => {
    const entrant = await getEntrantByUserId(ctx.user.id);
    if (!entrant) return [];
    return getIncomingRequests(entrant.id);
  }),

  /** Get outgoing match requests sent by the current player */
  outgoingRequests: protectedProcedure.query(async ({ ctx }) => {
    const entrant = await getEntrantByUserId(ctx.user.id);
    if (!entrant) return [];
    return getOutgoingRequests(entrant.id);
  }),

  /** Accept or decline a match request */
  respondToRequest: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        status: z.enum(["accepted", "declined"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const entrant = await getEntrantByUserId(ctx.user.id);
      if (!entrant) throw new TRPCError({ code: "NOT_FOUND" });
      await respondToMatchRequest(input.requestId, entrant.id, input.status);
      return { success: true };
    }),
});
