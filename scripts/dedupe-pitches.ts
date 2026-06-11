import { db } from "../lib/db";
import { pitches } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import { asc } from "drizzle-orm";

async function run() {
  const all = await db.select().from(pitches).orderBy(asc(pitches.createdAt));
  const seen = new Map<string, string>();
  const toDelete: string[] = [];

  for (const pitch of all) {
    const key = `${pitch.momentId}-${pitch.merchantId}`;
    if (seen.has(key)) {
      toDelete.push(seen.get(key)!); // delete the older one
    }
    seen.set(key, pitch.id);
  }

  if (toDelete.length > 0) {
    for (const id of toDelete) {
      await db.delete(pitches).where(eq(pitches.id, id));
    }
    console.log(`Deleted ${toDelete.length} duplicate pitches.`);
  } else {
    console.log("No duplicates found.");
  }
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
