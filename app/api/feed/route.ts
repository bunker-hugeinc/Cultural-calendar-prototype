import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedCandidates } from "@/lib/db/schema";
import { asc, gte, or, eq } from "drizzle-orm";

export async function GET() {
  // Show pending candidates only if they start at least 30 days from now.
  // Always show added/dismissed so they remain visible for status tracking.
  const today = new Date();
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;

  const rows = await db
    .select()
    .from(feedCandidates)
    .where(
      or(
        gte(feedCandidates.startDate, cutoffStr),
        eq(feedCandidates.status, "added"),
        eq(feedCandidates.status, "dismissed"),
        eq(feedCandidates.status, "in_review"),
      )
    )
    .orderBy(asc(feedCandidates.startDate));

  return NextResponse.json(rows);
}
