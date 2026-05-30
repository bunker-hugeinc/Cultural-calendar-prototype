import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pairingScores } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  // Aggregate counts per status in a single query
  const rows = await db
    .select({
      status: pairingScores.status,
      count: sql<number>`count(*)::int`,
    })
    .from(pairingScores)
    .groupBy(pairingScores.status);

  const counts: Record<string, number> = { draft: 0, in_review: 0, approved: 0, live: 0 };
  for (const row of rows) {
    if (row.status in counts) counts[row.status] = row.count;
  }

  return NextResponse.json(counts);
}
