import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moments, pairingScores, merchants } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const moment = await db.query.moments.findFirst({ where: eq(moments.id, id) });
  if (!moment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pairings = await db
    .select({
      merchantName: merchants.name,
      merchantCategory: merchants.category,
      relevanceScore: pairingScores.relevanceScore,
      campaignAngle: pairingScores.campaignAngle,
      rationale: pairingScores.rationale,
    })
    .from(pairingScores)
    .innerJoin(merchants, eq(pairingScores.merchantId, merchants.id))
    .where(eq(pairingScores.momentId, id))
    .orderBy(desc(pairingScores.relevanceScore))
    .limit(5);

  return NextResponse.json({
    moment: {
      name:        moment.name,
      startDate:   moment.startDate,
      endDate:     moment.endDate,
      category:    moment.category,
      description: moment.description,
      hook:        moment.hook,
      score:       moment.score,
    },
    pairings,
    generatedAt: new Date().toISOString(),
  });
}
