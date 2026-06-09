import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const migration = readFileSync("drizzle/0001_perpetual_menace.sql", "utf8");
  const statements = migration.split("--> statement-breakpoint").map((s: string) => s.trim()).filter(Boolean);

  for (const stmt of statements) {
    try {
      await sql.query(stmt);
      console.log("OK:", stmt.slice(0, 70).replace(/\n/g, " "));
    } catch (e: any) {
      if (e.message?.includes("already exists") || e.message?.includes("does not exist") || e.message?.includes("duplicate")) {
        console.log("SKIP:", e.message.slice(0, 100));
      } else {
        console.error("ERR:", e.message);
      }
    }
  }
  console.log("Done.");
}

main();
