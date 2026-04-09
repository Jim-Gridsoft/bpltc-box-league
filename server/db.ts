import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, disputes, InsertDispute } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(users.createdAt);
}

export async function setUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function createDispute(data: InsertDispute) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(disputes).values(data);
}

export async function getAllDisputes() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: disputes.id,
      userId: disputes.userId,
      subject: disputes.subject,
      description: disputes.description,
      matchId: disputes.matchId,
      fixtureId: disputes.fixtureId,
      status: disputes.status,
      adminNotes: disputes.adminNotes,
      createdAt: disputes.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(disputes)
    .leftJoin(users, eq(disputes.userId, users.id))
    .orderBy(desc(disputes.createdAt));
}

export async function updateDisputeStatus(
  disputeId: number,
  status: "open" | "resolved" | "closed",
  adminNotes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(disputes)
    .set({ status, ...(adminNotes !== undefined ? { adminNotes } : {}) })
    .where(eq(disputes.id, disputeId));
}

export async function getAdminEmails() {
  const db = await getDb();
  if (!db) return [];
  const admins = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.role, "admin"));
  return admins.filter((a) => !!a.email) as { email: string; name: string | null }[];
}

export async function updateUserProfile(userId: number, data: { name?: string; email?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.email !== undefined) updateSet.email = data.email;
  if (Object.keys(updateSet).length === 0) return;
  await db.update(users).set(updateSet).where(eq(users.id, userId));
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0] ?? null;
}

export async function updateUserPasswordHash(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}
