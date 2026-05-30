import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moments, pairingScores } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  // Total distinct moments that have at least one pairing
  const [{ total }] = await db
    .select({ total: sql<number>`count(distinct id)::int` })
    .from(moments);

  // Count distinct moments that have at least one pairing at each status
  const rows = await db
    .select({
      status: pairingScores.status,
      momentCount: sql<number>`count(distinct ${pairingScores.momentId})::int`,
    })
    .from(pairingScores)
    .groupBy(pairingScores.status);

  const counts: Record<string, number> = { in_review: 0, approved: 0, live: 0 };
  for (const row of rows) {
    if (row.status in counts) counts[row.status] = row.momentCount;
  }

  return NextResponse.json({ total, ...counts });
}
