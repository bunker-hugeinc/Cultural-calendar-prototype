import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedCandidates, momentReviews } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select()
    .from(feedCandidates)
    .leftJoin(momentReviews, eq(momentReviews.feedCandidateId, feedCandidates.id))
    .where(eq(feedCandidates.status, "in_review"))
    .orderBy(feedCandidates.startDate);

  const items = rows.map(({ feed_candidates: c, moment_reviews: r }) => ({
    candidate: c,
    review: r,
  }));

  return NextResponse.json(items);
}
