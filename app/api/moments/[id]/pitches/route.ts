import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pitches, merchants } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const results = await db
    .select({
      id: pitches.id,
      status: pitches.status,
      targetQuarter: pitches.targetQuarter,
      createdAt: pitches.createdAt,
      updatedAt: pitches.updatedAt,
      merchantName: merchants.name,
      merchantCategory: merchants.category,
    })
    .from(pitches)
    .leftJoin(merchants, eq(pitches.merchantId, merchants.id))
    .where(eq(pitches.momentId, id))
    .orderBy(desc(pitches.updatedAt));

  return NextResponse.json({ pitches: results });
}
