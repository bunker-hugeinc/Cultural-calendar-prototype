export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pairingScores } from "@/lib/db/schema";

export async function POST(req: Request) {
  const body = await req.json();
  const [row] = await db
    .insert(pairingScores)
    .values({
      momentId: body.momentId,
      merchantId: body.merchantId,
      relevanceScore: body.relevanceScore,
      campaignAngle: body.campaignAngle,
      rationale: body.rationale ?? null,
    })
    .onConflictDoUpdate({
      target: [pairingScores.momentId, pairingScores.merchantId],
      set: {
        relevanceScore: body.relevanceScore,
        campaignAngle: body.campaignAngle,
        rationale: body.rationale ?? null,
      },
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}