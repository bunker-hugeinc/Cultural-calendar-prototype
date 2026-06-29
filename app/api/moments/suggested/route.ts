export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedCandidates } from "@/lib/db/schema";
import { eq, gte, and, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") ?? "8");

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const suggested = await db
    .select()
    .from(feedCandidates)
    .where(
      and(
        eq(feedCandidates.status, "pending"),
        gte(feedCandidates.startDate, todayStr),
      )
    )
    .orderBy(desc(feedCandidates.score))
    .limit(limit);

  return NextResponse.json({ moments: suggested });
}
