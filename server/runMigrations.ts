/**
 * Lightweight migration runner for Heroku.
 * Applies any pending schema changes by running raw SQL migration files
 * in the /drizzle directory in alphabetical order.
 * Tracks applied migrations in a `_migrations` table.
 */
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

const MIGRATIONS_TABLE = "_migrations";

async function ensureMigrationsTable() {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS \`${MIGRATIONS_TABLE}\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      appliedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `));
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const db = await getDb();
  if (!db) return new Set();
  const rows = await db.execute(sql.raw(`SELECT filename FROM \`${MIGRATIONS_TABLE}\``));
  const applied = new Set<string>();
  const result = rows[0] as unknown as Array<{ filename: string }>;
  for (const row of result) {
    applied.add(row.filename);
  }
  return applied;
}

async function applyMigration(filename: string, sqlContent: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Split on semicolons to handle multi-statement migrations
  const statements = sqlContent
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const statement of statements) {
    await db.execute(sql.raw(statement));
  }
  await db.execute(
    sql.raw(`INSERT INTO \`${MIGRATIONS_TABLE}\` (filename) VALUES ('${filename}')`)
  );
  console.log(`[Migration] Applied: ${filename}`);
}

export async function runMigrations() {
  const db = await getDb();
  if (!db) {
    console.log("[Migration] No database available, skipping migrations");
    return;
  }

  // Resolve migrations directory relative to the project root
  // In production (dist/index.js), __dirname is dist/, so go up one level
  const possibleDirs = [
    path.resolve(process.cwd(), "drizzle"),
    path.resolve(import.meta.dirname, "..", "drizzle"),
  ];
  const migrationsDir = possibleDirs.find((d) => fs.existsSync(d));

  if (!migrationsDir) {
    console.log("[Migration] No drizzle directory found, skipping migrations");
    return;
  }

  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  // Get all .sql files sorted alphabetically
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      continue; // Already applied
    }
    const content = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    try {
      await applyMigration(file, content);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Ignore "column already exists" errors (idempotent)
      if (msg.includes("Duplicate column") || msg.includes("already exists")) {
        console.log(`[Migration] Skipping ${file} (already applied at DB level)`);
        const dbInner = await getDb();
        if (dbInner) {
          await dbInner.execute(
            sql.raw(`INSERT IGNORE INTO \`${MIGRATIONS_TABLE}\` (filename) VALUES ('${file}')`)
          );
        }
      } else {
        console.error(`[Migration] Failed to apply ${file}:`, msg);
        throw err;
      }
    }
  }

  console.log("[Migration] All migrations up to date");
}
