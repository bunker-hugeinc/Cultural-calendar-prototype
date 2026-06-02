import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedCandidates, momentReviews } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const candidate = await db.query.feedCandidates.findFirst({
    where: eq(feedCandidates.id, id),
  });
  if (!candidate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (candidate.status !== "in_review") {
    return NextResponse.json({ error: "Candidate is not in review" }, { status: 409 });
  }

  await db
    .update(feedCandidates)
    .set({ status: "pending" })
    .where(eq(feedCandidates.id, id));

  await db
    .update(momentReviews)
    .set({
      status:      "rejected",
      reviewedAt:  new Date(),
      reviewNotes: body.reviewNotes ?? null,
    })
    .where(eq(momentReviews.feedCandidateId, id));

  return NextResponse.json({ ok: true });
}
