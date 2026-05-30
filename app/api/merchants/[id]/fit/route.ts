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

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const rows = await db
    .select({
      momentId:       moments.id,
      momentName:     moments.name,
      startDate:      moments.startDate,
      endDate:        moments.endDate,
      category:       moments.category,
      relevanceScore: pairingScores.relevanceScore,
      campaignAngle:  pairingScores.campaignAngle,
      rationale:      pairingScores.rationale,
    })
    .from(pairingScores)
    .innerJoin(moments, eq(pairingScores.momentId, moments.id))
    .where(eq(pairingScores.merchantId, id))
    .orderBy(desc(pairingScores.relevanceScore));

  // Filter to moments that haven't ended yet (startDate >= today counts as upcoming)
  const todayMs = new Date(today).getTime();
  const opportunities = rows
    .filter(r => {
      const endMs = new Date(r.endDate ?? r.startDate).getTime();
      return endMs >= todayMs;
    })
    .map(r => {
      const startMs = new Date(r.startDate).getTime();
      const daysUntil = Math.max(0, Math.round((startMs - todayMs) / 86400000));
      return { ...r, daysUntil };
    });

  return NextResponse.json({
    merchant: {
      id:            merchant.id,
      name:          merchant.name,
      category:      merchant.category,
      seasonalNotes: merchant.seasonalNotes,
    },
    opportunities,
  });
}
