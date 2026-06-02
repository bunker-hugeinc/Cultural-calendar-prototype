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
  const body = await req.json();

  const candidate = await db.query.feedCandidates.findFirst({
    where: eq(feedCandidates.id, id),
  });
  if (!candidate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (candidate.status !== "pending") {
    return NextResponse.json({ error: "Candidate is not pending" }, { status: 409 });
  }

  const [review] = await db
    .insert(momentReviews)
    .values({
      feedCandidateId:     id,
      campaignName:        body.campaignName,
      lastYearCampaignUrl: body.lastYearCampaignUrl ?? null,
      inspirationUrls:     body.inspirationUrls?.length ? JSON.stringify(body.inspirationUrls) : null,
      notes:               body.notes ?? null,
      targetQuarter:       body.targetQuarter ?? null,
      priorityMerchants:   body.priorityMerchants?.length ? JSON.stringify(body.priorityMerchants) : null,
    })
    .returning();

  await db
    .update(feedCandidates)
    .set({ status: "in_review" })
    .where(eq(feedCandidates.id, id));

  return NextResponse.json({ review });
}
