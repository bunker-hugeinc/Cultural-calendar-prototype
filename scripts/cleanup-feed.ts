// Run with: npx tsx scripts/cleanup-feed.ts
import { db } from "@/lib/db";
import { feedCandidates } from "@/lib/db/schema";
import { and, lt, eq } from "drizzle-orm";

async function cleanup() {
  const result = await db
    .delete(feedCandidates)
    .where(
      and(
        lt(feedCandidates.startDate, "2027-08-01"),
        eq(feedCandidates.status, "pending")
      )
    )
    .returning({ id: feedCandidates.id, name: feedCandidates.name, startDate: feedCandidates.startDate });

  console.log(`Deleted ${result.length} stale pending candidates:`);
  result.forEach(r => console.log(`  - ${r.name} (${r.startDate})`));
  console.log("Done.");
}

cleanup().catch(console.error);
