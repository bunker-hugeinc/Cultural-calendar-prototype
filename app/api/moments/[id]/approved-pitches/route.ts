import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pitches, merchants } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const momentId = id;

  const approved = await db.select({
    id: pitches.id,
    merchantId: pitches.merchantId,
    offerMechanics: pitches.offerMechanics,
    status: pitches.status,
    merchant: {
      name: merchants.name,
      category: merchants.category,
    },
  })
  .from(pitches)
  .leftJoin(merchants, eq(pitches.merchantId, merchants.id))
  .where(and(eq(pitches.momentId, momentId), eq(pitches.status, "approved")));

  return NextResponse.json({ pitches: approved });
}
