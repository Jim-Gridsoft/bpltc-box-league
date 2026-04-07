/**
 * adminSeed.ts
 *
 * Runs once at server startup. Promotes any email addresses listed in
 * ADMIN_SEED_EMAILS (comma-separated env var) or the hardcoded list below
 * to the "admin" role. Safe to run repeatedly — it is a no-op if the user
 * is already an admin or does not yet exist in the database.
 */

import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users } from "../drizzle/schema";

/** Hardcoded list of email addresses that should always be admins. */
const HARDCODED_ADMIN_EMAILS: string[] = [
  "jim@gridsoftsolutions.co.uk",
];

export async function runAdminSeed(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[AdminSeed] Database not available — skipping admin seed.");
    return;
  }

  // Merge hardcoded list with optional env var list
  const envEmails = (process.env.ADMIN_SEED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const allEmails = Array.from(
    new Set([...HARDCODED_ADMIN_EMAILS.map((e) => e.toLowerCase()), ...envEmails])
  );

  if (allEmails.length === 0) return;

  for (const email of allEmails) {
    try {
      const rows = await db
        .select({ id: users.id, role: users.role, email: users.email })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (rows.length === 0) {
        console.log(`[AdminSeed] User not found yet: ${email} — will be promoted on first sign-in if OWNER_OPEN_ID matches, or re-run on next restart.`);
        continue;
      }

      const user = rows[0];
      if (user.role === "admin") {
        console.log(`[AdminSeed] ${email} is already an admin — no change needed.`);
        continue;
      }

      await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
      console.log(`[AdminSeed] Promoted ${email} (id=${user.id}) to admin.`);
    } catch (err) {
      console.error(`[AdminSeed] Failed to promote ${email}:`, err);
    }
  }
}
