import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moments, pairingScores } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  const [{ total }] = await db
    .select({ total: sql<number>`count(distinct id)::int` })
    .from(moments);

  const [{ paired }] = await db
    .select({ paired: sql<number>`count(distinct ${pairingScores.momentId})::int` })
    .from(pairingScores);

  return NextResponse.json({ total, paired });
}
