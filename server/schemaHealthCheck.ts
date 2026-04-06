import { sql } from "drizzle-orm";
import { getDb } from "./db";

/**
 * Expected schema: table name → required column names.
 * Add new columns here whenever the schema is extended.
 * The startup check will warn in the server log if any column is missing,
 * preventing silent SQL failures like the balancerEligiblePlayers incident.
 */
const EXPECTED_COLUMNS: Record<string, string[]> = {
  fixtures: [
    "id",
    "boxId",
    "seasonId",
    "round",
    "teamAPlayer1",
    "teamAPlayer2",
    "teamBPlayer1",
    "teamBPlayer2",
    "matchId",
    "status",
    "createdAt",
    "isBalancer",
    "balancerEligiblePlayers",
  ],
  matches: [
    "id",
    "boxId",
    "seasonId",
    "player1Id",
    "partner1Id",
    "player2Id",
    "partner2Id",
    "score",
    "winner",
    "playedAt",
    "notes",
    "verified",
    "createdAt",
  ],
  seasons: [
    "id",
    "name",
    "status",
    "startDate",
    "endDate",
    "entryFeeGBP",
    "maxEntrants",
    "description",
    "createdAt",
  ],
  users: ["id", "openId", "name", "email", "role", "createdAt"],
  season_entrants: [
    "id",
    "seasonId",
    "userId",
    "displayName",
    "abilityRating",
    "paid",
    "stripePaymentIntentId",
    "createdAt",
  ],
  boxes: ["id", "seasonId", "name", "level", "createdAt"],
  box_members: ["id", "boxId", "seasonEntrantId", "outcome", "createdAt"],
};

/**
 * Run at server startup. Queries information_schema to verify that all
 * expected columns exist in the live database. Logs a warning for any
 * missing column so the team can apply the migration before users hit errors.
 *
 * This is a non-fatal check — the server still starts even if columns are
 * missing, but the warnings make the problem immediately visible in logs.
 */
export async function runSchemaHealthCheck(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[SchemaHealthCheck] Database not available — skipping check.");
      return;
    }

    // Use Drizzle's sql helper — works with any underlying driver
    const rows = await db.execute(
      sql`SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() ORDER BY TABLE_NAME, ordinal_position`
    );

    // drizzle-orm/mysql2 with a connection string returns a [rows, fields] tuple.
    // The actual row data is at index 0.
    const raw: unknown = rows;
    let rowArray: { TABLE_NAME: string; COLUMN_NAME: string }[] = [];
    if (Array.isArray(raw)) {
      // Tuple format: [[{TABLE_NAME, COLUMN_NAME}, ...], fields]
      const first = (raw as any[])[0];
      if (Array.isArray(first)) {
        rowArray = first as { TABLE_NAME: string; COLUMN_NAME: string }[];
      } else {
        // Flat array of rows
        rowArray = raw as { TABLE_NAME: string; COLUMN_NAME: string }[];
      }
    } else if (raw && typeof raw === "object" && Array.isArray((raw as any).rows)) {
      rowArray = (raw as any).rows;
    }

    // Build a map: tableName → Set<columnName>
    const actualColumns: Record<string, Set<string>> = {};
    for (const row of rowArray) {
      const tbl = row.TABLE_NAME;
      if (!actualColumns[tbl]) actualColumns[tbl] = new Set();
      actualColumns[tbl].add(row.COLUMN_NAME);
    }

    let allOk = true;
    for (const [table, expectedCols] of Object.entries(EXPECTED_COLUMNS)) {
      const actual = actualColumns[table];
      if (!actual) {
        console.error(`[SchemaHealthCheck] ⚠️  Table '${table}' is MISSING from the database. Run pnpm db:push.`);
        allOk = false;
        continue;
      }
      for (const col of expectedCols) {
        if (!actual.has(col)) {
          console.error(
            `[SchemaHealthCheck] ⚠️  Column '${col}' is MISSING from table '${table}'. Run pnpm db:push or apply the migration manually.`
          );
          allOk = false;
        }
      }
    }

    if (allOk) {
      console.log("[SchemaHealthCheck] ✓ All expected schema columns are present.");
    } else {
      console.error("[SchemaHealthCheck] ⚠️  Schema drift detected — some columns are missing. See warnings above.");
    }
  } catch (err) {
    // Never crash the server — just warn
    console.warn("[SchemaHealthCheck] Could not complete schema check:", err instanceof Error ? err.message : err);
  }
}
