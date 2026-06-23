// Run with: npx tsx scripts/dedup-moments.ts
// Finds and removes semantically duplicate moments from the DB.
import { db } from "../lib/db";
import { moments, pitches, briefs } from "../lib/db/schema";
import { eq, inArray } from "drizzle-orm";

async function dedupMoments() {
  const all = await db.select().from(moments).orderBy(moments.name);
  console.log(`Found ${all.length} moments`);

  // Normalize: strip year and common sport suffixes to find base name
  function normalize(name: string): string {
    return name
      .replace(/\b(20\d{2}|season|start|tip.?off|kickoff|opening|week|day)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  const groups: Record<string, typeof all> = {};
  for (const m of all) {
    const base = normalize(m.name);
    if (!groups[base]) groups[base] = [];
    groups[base].push(m);
  }

  const toDelete: string[] = [];
  for (const [base, group] of Object.entries(groups)) {
    if (group.length > 1) {
      console.log(`\nPossible duplicates for "${base}":`);
      group.forEach(m => console.log(`  - [${m.id}] ${m.name} (score: ${m.score ?? "unscored"})`));
      // Keep the one with the highest score or most data; delete the rest
      const sorted = [...group].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      const keep = sorted[0];
      const dupes = sorted.slice(1);
      console.log(`  → Keeping: ${keep.name}`);
      dupes.forEach(d => {
        console.log(`  → Deleting: ${d.name}`);
        toDelete.push(d.id);
      });
    }
  }

  if (toDelete.length > 0) {
    console.log(`\nDeleting ${toDelete.length} duplicate moment(s)…`);
    for (const id of toDelete) {
      // Delete briefs → pitches → moment (FK chain)
      const momentPitches = await db.select({ id: pitches.id }).from(pitches).where(eq(pitches.momentId, id));
      if (momentPitches.length > 0) {
        const pitchIds = momentPitches.map(p => p.id);
        await db.delete(briefs).where(inArray(briefs.pitchId, pitchIds));
        await db.delete(pitches).where(eq(pitches.momentId, id));
      }
      await db.delete(moments).where(eq(moments.id, id));
      console.log(`  Deleted moment ${id}`);
    }
    console.log("Done.");
  } else {
    console.log("\nNo duplicates found.");
  }
}

dedupMoments().catch(console.error);
