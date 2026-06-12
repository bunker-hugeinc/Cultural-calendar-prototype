export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedCandidates, moments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

  await db
    .update(feedCandidates)
    .set({ status: "added" })
    .where(eq(feedCandidates.id, id));

  const [newMoment] = await db
    .insert(moments)
    .values({
      name: candidate.name,
      startDate: candidate.startDate,
      endDate: candidate.endDate ?? null,
      category: candidate.category,
      description: candidate.body,
      hook: candidate.hook,
      score: candidate.score,
      feedCandidateId: candidate.id,
    })
    .returning();

  return NextResponse.json({ moment: newMoment });
}