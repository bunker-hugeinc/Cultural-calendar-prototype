/**
 * Remove duplicate feed candidates that accumulated before fuzzy dedup existed.
 *
 * Safe by default: prints what it WOULD delete (dry run).
 * To actually delete:   npx tsx scripts/dedupe-feed-candidates.ts --apply
 *
 * Strategy: group candidates by normalized name (see lib/dedupe). Within each
 * group keep the best row (added > pending > dismissed, then highest score,
 * then oldest) and delete the rest. Moments are left untouched — they can have
 * linked pitches, so clean those up via the app's Remove action instead.
 */
import "dotenv/config";
import { db } from "../lib/db";
import { feedCandidates } from "../lib/db/schema";
import { inArray } from "drizzle-orm";
import { normalizeMomentName } from "../lib/dedupe";

const STATUS_RANK: Record<string, number> = { added: 3, in_review: 2, pending: 1, dismissed: 0 };

async function main() {
  const apply = process.argv.includes("--apply");
  const rows = await db.select().from(feedCandidates);

  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = normalizeMomentName(r.name);
    if (!key) continue;
    const g = groups.get(key) ?? [];
    g.push(r);
    groups.set(key, g);
  }

  const toDelete: string[] = [];
  for (const [key, g] of groups) {
    if (g.length < 2) continue;
    const sorted = [...g].sort((a, b) => {
      const s = (STATUS_RANK[b.status] ?? 0) - (STATUS_RANK[a.status] ?? 0);
      if (s !== 0) return s;
      if (b.score !== a.score) return b.score - a.score;
      return (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
    });
    const keep = sorted[0];
    const drop = sorted.slice(1);
    console.log(`"${key}": keeping ${keep.name} [${keep.status} ${keep.score}], removing ${drop.length}`);
    toDelete.push(...drop.map(d => d.id));
  }

  console.log(`\n${groups.size} distinct names, ${toDelete.length} duplicate rows to remove.`);
  if (!apply) {
    console.log("Dry run — re-run with --apply to delete.");
    return;
  }
  if (toDelete.length > 0) {
    await db.delete(feedCandidates).where(inArray(feedCandidates.id, toDelete));
    console.log(`Deleted ${toDelete.length} duplicate feed candidates.`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
