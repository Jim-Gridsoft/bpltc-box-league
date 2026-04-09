import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { tournamentRouter } from "./routers/tournament";
import { getAllUsers, setUserRole, createDispute, getAllDisputes, updateDisputeStatus, updateUserProfile, getUserById, updateUserPasswordHash } from "./db";
import { notifyOwner } from "./_core/notification";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getUserByEmail,
  createUserWithPassword,
  verifyPassword,
  hashPassword,
  createEmailSessionToken,
} from "./_core/emailAuth";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),

    /** Register a new account with email + password */
    register: publicProcedure
      .input(z.object({
        name: z.string().min(2).max(128),
        email: z.string().email(),
        password: z.string().min(8).max(128),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });
        }
        const user = await createUserWithPassword({
          name: input.name,
          email: input.email,
          password: input.password,
        });
        const token = await createEmailSessionToken(user.id, user.email!);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
      }),

    /** Sign in with email + password */
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
        }
        const valid = await verifyPassword(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
        }
        const token = await createEmailSessionToken(user.id, user.email!);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),

    /** Update the current user's display name and/or email */
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(2).max(128).optional(),
        email: z.string().email().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!input.name && !input.email) return { success: true };
        // If changing email, ensure it is not already taken by another account
        if (input.email && input.email !== ctx.user.email) {
          const existing = await getUserByEmail(input.email);
          if (existing && existing.id !== ctx.user.id) {
            throw new TRPCError({ code: "CONFLICT", message: "That email address is already in use by another account." });
          }
        }
        await updateUserProfile(ctx.user.id, { name: input.name, email: input.email });
        return { success: true };
      }),

    /** Change the current user's password (requires current password for verification) */
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).max(128),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserById(ctx.user.id);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Password change is not available for this account type." });
        }
        const valid = await verifyPassword(input.currentPassword, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect." });
        }
        const newHash = await hashPassword(input.newPassword);
        await updateUserPasswordHash(ctx.user.id, newHash);
        return { success: true };
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
        // Notify the owner via notification
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
