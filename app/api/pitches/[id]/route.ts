import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pitches, pitchMoments, pitchMerchants, moments, merchants } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pitch = await db.query.pitches.findFirst({ where: eq(pitches.id, id) });
  if (!pitch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [momentLinks, merchantLinks] = await Promise.all([
    db.select({ id: pitchMoments.id, momentId: pitchMoments.momentId, isPrimary: pitchMoments.isPrimary })
      .from(pitchMoments).where(eq(pitchMoments.pitchId, id)),
    db.select({ id: pitchMerchants.id, merchantId: pitchMerchants.merchantId, isPrimary: pitchMerchants.isPrimary })
      .from(pitchMerchants).where(eq(pitchMerchants.pitchId, id)),
  ]);

  const momentIds = momentLinks.map(l => l.momentId);
  const merchantIds = merchantLinks.map(l => l.merchantId);

  const [momentRows, merchantRows] = await Promise.all([
    momentIds.length ? db.select({ id: moments.id, name: moments.name, startDate: moments.startDate, category: moments.category, ecommerceScore: moments.ecommerceScore, audienceFit: moments.audienceFit, whiteSpaceScore: moments.whiteSpaceScore, scoreRationale: moments.scoreRationale, channelRecommendations: moments.channelRecommendations, description: moments.description, hook: moments.hook }).from(moments).where(inArray(moments.id, momentIds)) : [],
    merchantIds.length ? db.select({ id: merchants.id, name: merchants.name, category: merchants.category, partnerGroup: merchants.partnerGroup, merchantSignals: merchants.merchantSignals }).from(merchants).where(inArray(merchants.id, merchantIds)) : [],
  ]);

  return NextResponse.json({
    ...pitch,
    moments: momentRows.map(m => ({
      ...m,
      isPrimary: momentLinks.find(l => l.momentId === m.id)?.isPrimary ?? false,
    })),
    merchants: merchantRows.map(m => ({
      ...m,
      isPrimary: merchantLinks.find(l => l.merchantId === m.id)?.isPrimary ?? false,
    })),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const fields = ["title", "status", "situation", "campaignConcept", "campaignHeadline", "keyMessages", "channelStrategy", "influencerStrategy", "nextSteps", "targetQuarter", "attachments"];
  for (const f of fields) {
    if (body[f] !== undefined) updates[f] = body[f];
  }

  const [updated] = await db.update(pitches).set(updates).where(eq(pitches.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Handle moment add/remove
  if (body.addMomentId) {
    await db.insert(pitchMoments).values({ id: createId(), pitchId: id, momentId: body.addMomentId, isPrimary: false }).onConflictDoNothing();
  }
  if (body.removeMomentId) {
    await db.delete(pitchMoments).where(eq(pitchMoments.momentId, body.removeMomentId));
  }
  if (body.addMerchantId) {
    await db.insert(pitchMerchants).values({ id: createId(), pitchId: id, merchantId: body.addMerchantId, isPrimary: false }).onConflictDoNothing();
  }
  if (body.removeMerchantId) {
    await db.delete(pitchMerchants).where(eq(pitchMerchants.merchantId, body.removeMerchantId));
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(pitches).where(eq(pitches.id, id));
  return new NextResponse(null, { status: 204 });
}
