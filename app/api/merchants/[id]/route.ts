export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { merchants, pairingScores, moments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const merchant = await db.query.merchants.findFirst({ where: eq(merchants.id, id) });
  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pairings = await db
    .select({
      id: pairingScores.id,
      momentId: pairingScores.momentId,
      momentName: moments.name,
      momentStartDate: moments.startDate,
      momentCategory: moments.category,
      relevanceScore: pairingScores.relevanceScore,
      campaignAngle: pairingScores.campaignAngle,
    })
    .from(pairingScores)
    .innerJoin(moments, eq(pairingScores.momentId, moments.id))
    .where(eq(pairingScores.merchantId, id))
    .orderBy(desc(pairingScores.relevanceScore));

  return NextResponse.json({ ...merchant, pairings });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const [updated] = await db
    .update(merchants)
    .set({
      name: body.name,
      category: body.category,
      seasonalNotes: body.seasonalNotes ?? null,
      notes: body.notes ?? null,
      partnerGroup: body.partnerGroup ?? null,
      updatedAt: new Date(),
    })
    .where(eq(merchants.id, id))
    .returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.partnerGroup !== undefined) updates.partnerGroup = body.partnerGroup;
  if (body.partnerStatus !== undefined) updates.partnerStatus = body.partnerStatus;
  if (body.name !== undefined) updates.name = body.name;
  if (body.seasonalNotes !== undefined) updates.seasonalNotes = body.seasonalNotes;
  if (body.pastCampaignNotes !== undefined) updates.pastCampaignNotes = body.pastCampaignNotes;
  const [updated] = await db.update(merchants).set(updates).where(eq(merchants.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(merchants).where(eq(merchants.id, id));
  return new NextResponse(null, { status: 204 });
}