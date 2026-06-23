import { db } from "../lib/db";
import { moments, pitches, briefs, momentMerchants } from "../lib/db/schema";
import { sql, eq, inArray } from "drizzle-orm";

async function dedupExact() {
  const result = await db.execute(sql`
    SELECT lower(name) as norm_name,
           array_agg(id ORDER BY created_at ASC) as ids,
           count(*) as cnt
    FROM moments
    GROUP BY lower(name)
    HAVING count(*) > 1
  `);

  console.log(`Found ${result.rows.length} duplicate group(s)`);
  if (result.rows.length === 0) {
    console.log("Nothing to clean up.");
    return;
  }

  for (const group of result.rows) {
    const ids = group.ids as string[];
    const keepId = ids[0];
    const deleteIds = ids.slice(1);

    console.log(`"${group.norm_name}": keeping ${keepId}, deleting ${deleteIds.length} duplicate(s)`);

    for (const id of deleteIds) {
      // Delete dependents in FK order
      const momentPitches = await db.select({ id: pitches.id }).from(pitches).where(eq(pitches.momentId, id));
      if (momentPitches.length > 0) {
        const pitchIds = momentPitches.map(p => p.id);
        await db.delete(briefs).where(inArray(briefs.pitchId, pitchIds)).catch(() => {});
        await db.delete(pitches).where(eq(pitches.momentId, id)).catch(() => {});
      }
      await db.delete(momentMerchants).where(eq(momentMerchants.momentId, id)).catch(() => {});
      await db.delete(moments).where(eq(moments.id, id));
    }
  }

  console.log("Done.");
}

dedupExact().catch(err => { console.error(err); process.exit(1); });
