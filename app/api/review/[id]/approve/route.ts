import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedCandidates, momentReviews, moments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const candidate = await db.query.feedCandidates.findFirst({
    where: eq(feedCandidates.id, id),
  });
  if (!candidate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (candidate.status !== "in_review") {
    return NextResponse.json({ error: "Candidate is not in review" }, { status: 409 });
  }

  const [moment] = await db
    .insert(moments)
    .values({
      name:            candidate.name,
      startDate:       candidate.startDate,
      endDate:         candidate.endDate ?? undefined,
      category:        candidate.category,
      description:     candidate.body,
      hook:            candidate.hook,
      score:           candidate.score,
      feedCandidateId: id,
    })
    .returning();

  await db
    .update(feedCandidates)
    .set({ status: "added" })
    .where(eq(feedCandidates.id, id));

  await db
    .update(momentReviews)
    .set({ status: "approved", reviewedAt: new Date() })
    .where(eq(momentReviews.feedCandidateId, id));

  return NextResponse.json({ moment });
}
