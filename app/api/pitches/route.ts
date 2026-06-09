import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pitches, pitchMoments, pitchMerchants, moments, merchants } from "@/lib/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export async function GET() {
  const rows = await db.select().from(pitches).orderBy(desc(pitches.updatedAt));

  if (rows.length === 0) return NextResponse.json([]);

  const pitchIds = rows.map(p => p.id);

  const [momentLinks, merchantLinks] = await Promise.all([
    db.select({ pitchId: pitchMoments.pitchId, momentId: pitchMoments.momentId, isPrimary: pitchMoments.isPrimary })
      .from(pitchMoments).where(inArray(pitchMoments.pitchId, pitchIds)),
    db.select({ pitchId: pitchMerchants.pitchId, merchantId: pitchMerchants.merchantId, isPrimary: pitchMerchants.isPrimary })
      .from(pitchMerchants).where(inArray(pitchMerchants.pitchId, pitchIds)),
  ]);

  const momentIds = [...new Set(momentLinks.map(l => l.momentId))];
  const merchantIds = [...new Set(merchantLinks.map(l => l.merchantId))];

  const [momentNames, merchantNames] = await Promise.all([
    momentIds.length ? db.select({ id: moments.id, name: moments.name }).from(moments).where(inArray(moments.id, momentIds)) : [],
    merchantIds.length ? db.select({ id: merchants.id, name: merchants.name }).from(merchants).where(inArray(merchants.id, merchantIds)) : [],
  ]);

  const momentNameMap = new Map(momentNames.map(m => [m.id, m.name]));
  const merchantNameMap = new Map(merchantNames.map(m => [m.id, m.name]));

  const enriched = rows.map(pitch => {
    const pm = momentLinks.filter(l => l.pitchId === pitch.id);
    const pmr = merchantLinks.filter(l => l.pitchId === pitch.id);
    const primaryMoment = pm.find(l => l.isPrimary) ?? pm[0];
    const primaryMerchant = pmr.find(l => l.isPrimary) ?? pmr[0];
    return {
      ...pitch,
      primaryMomentName: primaryMoment ? (momentNameMap.get(primaryMoment.momentId) ?? null) : null,
      primaryMerchantName: primaryMerchant ? (merchantNameMap.get(primaryMerchant.merchantId) ?? null) : null,
      momentCount: pm.length,
      merchantCount: pmr.length,
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const body = await req.json();
  const id = createId();

  const [pitch] = await db.insert(pitches).values({
    id,
    title: body.title ?? "Untitled Pitch",
    type: body.type ?? "moment_led",
    status: "draft",
    targetQuarter: body.targetQuarter ?? null,
  }).returning();

  // Link primary moment
  if (body.momentId) {
    await db.insert(pitchMoments).values({
      id: createId(),
      pitchId: id,
      momentId: body.momentId,
      isPrimary: true,
    }).onConflictDoNothing();
  }

  // Link primary merchant
  if (body.merchantId) {
    await db.insert(pitchMerchants).values({
      id: createId(),
      pitchId: id,
      merchantId: body.merchantId,
      isPrimary: true,
    }).onConflictDoNothing();
  }

  // Link additional merchants
  if (Array.isArray(body.merchantIds)) {
    for (const mid of body.merchantIds) {
      if (mid === body.merchantId) continue;
      await db.insert(pitchMerchants).values({
        id: createId(),
        pitchId: id,
        merchantId: mid,
        isPrimary: false,
      }).onConflictDoNothing();
    }
  }

  // Link additional moments
  if (Array.isArray(body.momentIds)) {
    for (const mid of body.momentIds) {
      if (mid === body.momentId) continue;
      await db.insert(pitchMoments).values({
        id: createId(),
        pitchId: id,
        momentId: mid,
        isPrimary: false,
      }).onConflictDoNothing();
    }
  }

  return NextResponse.json({ id: pitch.id });
}
