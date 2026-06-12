export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { moments, pairingScores, merchants, pitches, briefs, pitchMoments } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const moment = await db.query.moments.findFirst({ where: eq(moments.id, id) });
  if (!moment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pairings = await db
    .select({
      id: pairingScores.id,
      merchantId: pairingScores.merchantId,
      merchantName: merchants.name,
      merchantCategory: merchants.category,
      relevanceScore: pairingScores.relevanceScore,
      campaignAngle: pairingScores.campaignAngle,
      rationale: pairingScores.rationale,
    })
    .from(pairingScores)
    .innerJoin(merchants, eq(pairingScores.merchantId, merchants.id))
    .where(eq(pairingScores.momentId, id))
    .orderBy(pairingScores.relevanceScore);

  return NextResponse.json({ ...moment, pairings: pairings.reverse() });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // Special case: _appendNotes appends to existing notes without overwriting other fields
  if (body._appendNotes) {
    const existing = await db.query.moments.findFirst({ where: eq(moments.id, id) });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const newNotes = existing.notes
      ? `${existing.notes}

${body._appendNotes}`
      : body._appendNotes;
    const [updated] = await db
      .update(moments)
      .set({ notes: newNotes, updatedAt: new Date() })
      .where(eq(moments.id, id))
      .returning();
    return NextResponse.json(updated);
  }

  const [updated] = await db
    .update(moments)
    .set({
      name: body.name,
      startDate: body.startDate,
      endDate: body.endDate ?? null,
      category: body.category,
      description: body.description,
      hook: body.hook ?? null,
      score: body.score != null ? parseFloat(body.score) : null,
      notes: body.notes ?? null,
      ecommerceScore: body.ecommerceScore != null ? parseFloat(body.ecommerceScore) : undefined,
      audienceFit: body.audienceFit != null ? parseFloat(body.audienceFit) : undefined,
      whiteSpaceScore: body.whiteSpaceScore != null ? parseFloat(body.whiteSpaceScore) : undefined,
      // Persist generated detail so it isn't lost when a moment is saved
      // (the feed → calendar flow sends these). Only overwrite when provided.
      scoreRationale: body.scoreRationale ?? undefined,
      channelRecommendations: body.channelRecommendations ?? undefined,
      quarter: body.quarter ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(moments.id, id))
    .returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Delete dependents in FK-safe order (pitches/briefs/pitchMoments reference
  // moments without ON DELETE CASCADE; pairingScores cascades automatically).
  const momentPitches = await db.select({ id: pitches.id }).from(pitches).where(eq(pitches.momentId, id));
  const pitchIds = momentPitches.map(p => p.id);

  if (pitchIds.length > 0) {
    await db.delete(briefs).where(inArray(briefs.pitchId, pitchIds));
  }
  await db.delete(briefs).where(eq(briefs.momentId, id));
  await db.delete(pitchMoments).where(eq(pitchMoments.momentId, id));
  await db.delete(pitches).where(eq(pitches.momentId, id));
  await db.delete(moments).where(eq(moments.id, id));

  revalidatePath("/calendar");
  revalidatePath("/pitch");
  revalidatePath("/");
  return new NextResponse(null, { status: 204 });
}