/**
 * Migration runner for Heroku/production deployments.
 *
 * Strategy:
 * - 0000_full_schema.sql: Complete schema for fresh databases (CREATE TABLE IF NOT EXISTS)
 * - 0001_* through 0008_*: Legacy incremental migrations from Manus era — skipped on fresh
 *   databases because 0000_full_schema.sql already includes all their changes.
 * - 0009_add_password_hash.sql and later: New incremental migrations applied after full schema.
 *
 * The runner tracks applied migrations in a `_migrations` table.
 * Each SQL statement is executed individually so a single failure never blocks the rest.
 */
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

const MIGRATIONS_TABLE = "_migrations";

// Legacy incremental files that are fully superseded by 0000_full_schema.sql.
// These are skipped on fresh databases but marked as applied so they don't run later.
const LEGACY_MIGRATIONS = new Set([
  "0000_greedy_nightmare.sql",
  "0001_far_war_machine.sql",
  "0002_sad_the_captain.sql",
  "0003_seasonal_box_league.sql",
  "0004_add_fixtures.sql",
  "0004_mushy_tyrannus.sql",
  "0005_tiny_talos.sql",
  "0006_flowery_stone_men.sql",
  "0007_pretty_warlock.sql",
  "0008_faithful_invisible_woman.sql",
]);

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

async function markApplied(filename: string) {
  const db = await getDb();
  if (!db) return;
  await db.execute(
    sql.raw(`INSERT IGNORE INTO \`${MIGRATIONS_TABLE}\` (filename) VALUES ('${filename}')`)
  );
}

async function applyMigration(filename: string, sqlContent: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Split on Drizzle's statement-breakpoint marker and semicolons.
  // Filter out comment-only lines and empty statements.
  const statements = sqlContent
    .split(/;|-->\s*statement-breakpoint/)
    .map((s) => s.trim())
    .filter((s) => {
      if (!s) return false;
      // Remove pure comment lines
      const nonComment = s.replace(/--[^\n]*/g, "").trim();
      return nonComment.length > 0;
    });

  let appliedCount = 0;
  let skippedCount = 0;

  for (const statement of statements) {
    try {
      await db.execute(sql.raw(statement));
      appliedCount++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const errCode = (err as { code?: string }).code ?? "";
      // Idempotent: skip "already exists" type errors
      if (
        errCode === "ER_DUP_FIELDNAME" ||
        errCode === "ER_TABLE_EXISTS_ERROR" ||
        errCode === "ER_DUP_KEYNAME" ||
        msg.includes("Duplicate column") ||
        msg.includes("already exists") ||
        msg.includes("Duplicate key")
      ) {
        skippedCount++;
      } else {
        // Log but continue — don't let one bad statement block the rest
        console.warn(`[Migration] Warning in ${filename}: ${msg.split("\n")[0]}`);
        skippedCount++;
      }
    }
  }

  await markApplied(filename);
  console.log(
    `[Migration] Applied: ${filename} (${appliedCount} statements executed, ${skippedCount} skipped)`
  );
}

export async function runMigrations() {
  const db = await getDb();
  if (!db) {
    console.log("[Migration] No database available, skipping migrations");
    return;
  }

  // Resolve migrations directory relative to the project root
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

    // If the full schema has been applied, skip legacy incremental migrations
    if (LEGACY_MIGRATIONS.has(file) && applied.has("0000_full_schema.sql")) {
      console.log(`[Migration] Skipping legacy migration (covered by full schema): ${file}`);
      await markApplied(file);
      continue;
    }

    const content = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    await applyMigration(file, content);
  }

  console.log("[Migration] All migrations up to date");
}
