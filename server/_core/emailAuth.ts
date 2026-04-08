import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { ENV } from "./env";
import { SignJWT, jwtVerify } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import { v4 as uuidv4 } from "uuid";

const BCRYPT_ROUNDS = 12;

function getSessionSecret() {
  const secret = ENV.cookieSecret || ENV.jwtSecret;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

// ── Password helpers ─────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── Session helpers ──────────────────────────────────────────────────────────

export async function createEmailSessionToken(userId: number, email: string): Promise<string> {
  const secretKey = getSessionSecret();
  const issuedAt = Date.now();
  const expirationSeconds = Math.floor((issuedAt + ONE_YEAR_MS) / 1000);
  return new SignJWT({ sub: String(userId), email, type: "email" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

export async function verifyEmailSession(
  cookieHeader: string | undefined
): Promise<{ userId: number; email: string } | null> {
  if (!cookieHeader) return null;
  const cookies = parseCookieHeader(cookieHeader);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const secretKey = getSessionSecret();
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    const sub = payload.sub as string | undefined;
    const email = payload.email as string | undefined;
    const type = payload.type as string | undefined;
    if (!sub || !email || type !== "email") return null;
    return { userId: parseInt(sub, 10), email };
  } catch {
    return null;
  }
}

// ── DB helpers ───────────────────────────────────────────────────────────────

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim()));
  return rows[0] ?? null;
}

export async function createUserWithPassword(opts: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const passwordHash = await hashPassword(opts.password);
  const openId = `email:${uuidv4()}`;
  await db.insert(users).values({
    openId,
    name: opts.name,
    email: opts.email.toLowerCase().trim(),
    passwordHash,
    loginMethod: "email",
    lastSignedIn: new Date(),
  });
  const created = await getUserByEmail(opts.email);
  if (!created) throw new Error("Failed to create user");
  return created;
}

// ── Request authenticator (used by tRPC context) ─────────────────────────────

export async function authenticateEmailRequest(req: Request): Promise<User | null> {
  const session = await verifyEmailSession(req.headers.cookie);
  if (!session) return null;
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(users).where(eq(users.id, session.userId));
  const user = rows[0] ?? null;
  if (!user) return null;
  // Update lastSignedIn
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
  return user;
}
