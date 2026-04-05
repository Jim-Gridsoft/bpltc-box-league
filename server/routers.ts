import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { tournamentRouter } from "./routers/tournament";
import { getAllUsers, setUserRole, createDispute, getAllDisputes, updateDisputeStatus, getAdminEmails } from "./db";
import { notifyOwner } from "./_core/notification";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  tournament: tournamentRouter,

  adminUsers: router({
    /** List all registered users — admin only */
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllUsers();
    }),

    /** Promote or demote a user — admin only, cannot change own role */
    setRole: protectedProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        if (ctx.user.id === input.userId)
          throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot change your own admin role." });
        await setUserRole(input.userId, input.role);
        return { success: true };
      }),
  }),

  disputes: router({
    /** Submit a dispute or contact-admin message */
    submit: protectedProcedure
      .input(z.object({
        subject: z.string().min(3).max(256),
        description: z.string().min(10).max(5000),
        matchId: z.number().optional(),
        fixtureId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createDispute({
          userId: ctx.user.id,
          subject: input.subject,
          description: input.description,
          matchId: input.matchId ?? null,
          fixtureId: input.fixtureId ?? null,
        });
        // Notify the owner via Manus notification
        await notifyOwner({
          title: `🎾 Dispute / Admin Contact: ${input.subject}`,
          content: `From: ${ctx.user.name ?? ctx.user.email ?? "Unknown player"}\n\n${input.description}${
            input.matchId ? `\n\nMatch ID: ${input.matchId}` : ""
          }${
            input.fixtureId ? `\nFixture ID: ${input.fixtureId}` : ""
          }`,
        }).catch(() => {}); // non-fatal
        return { success: true };
      }),

    /** List all disputes — admin only */
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllDisputes();
    }),

    /** Update dispute status and add admin notes — admin only */
    updateStatus: protectedProcedure
      .input(z.object({
        disputeId: z.number(),
        status: z.enum(["open", "resolved", "closed"]),
        adminNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await updateDisputeStatus(input.disputeId, input.status, input.adminNotes);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
