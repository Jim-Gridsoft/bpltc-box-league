import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  // Strip any dotenvx header lines from the URL
  const cleanUrl = url.split("\n").find(line => line.startsWith("mysql")) ?? url;
  console.log("Connecting to DB...");

  const conn = await mysql.createConnection(cleanUrl);

  // Check which columns are actually missing from seasons
  const [rows] = await conn.execute(
    "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'seasons'"
  ) as [{ COLUMN_NAME: string }[], unknown];

  const existing = new Set(rows.map(r => r.COLUMN_NAME));
  console.log("Existing seasons columns:", [...existing].join(", "));

  const toAdd: { name: string; def: string }[] = [
    { name: "entryFeeGBP", def: "INT NOT NULL DEFAULT 20" },
    { name: "maxEntrants", def: "INT NOT NULL DEFAULT 100" },
    { name: "description", def: "TEXT" },
  ];

  for (const col of toAdd) {
    if (!existing.has(col.name)) {
      console.log(`Adding column: ${col.name}`);
      await conn.execute(`ALTER TABLE seasons ADD COLUMN \`${col.name}\` ${col.def}`);
      console.log(`  ✓ Added ${col.name}`);
    } else {
      console.log(`  ✓ ${col.name} already exists`);
    }
  }

  // Verify final state
  const [after] = await conn.execute(
    "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'seasons'"
  ) as [{ COLUMN_NAME: string }[], unknown];
  console.log("seasons columns after fix:", after.map(r => r.COLUMN_NAME).join(", "));

  await conn.end();
  console.log("Done.");
}

main().catch(console.error);
