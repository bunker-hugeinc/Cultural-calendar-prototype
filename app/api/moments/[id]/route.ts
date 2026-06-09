import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moments, pairingScores, merchants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
      ? `${existing.notes}\n\n${body._appendNotes}`
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
  await db.delete(moments).where(eq(moments.id, id));
  return new NextResponse(null, { status: 204 });
}
