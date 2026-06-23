export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moments, pitches } from "@/lib/db/schema";
import { asc, eq, sql } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select({
      id: moments.id,
      name: moments.name,
      startDate: moments.startDate,
      endDate: moments.endDate,
      category: moments.category,
      description: moments.description,
      hook: moments.hook,
      quarter: moments.quarter,
      score: moments.score,
      ecommerceScore: moments.ecommerceScore,
      audienceFit: moments.audienceFit,
      whiteSpaceScore: moments.whiteSpaceScore,
      scoreRationale: moments.scoreRationale,
      channelRecommendations: moments.channelRecommendations,
      notes: moments.notes,
      createdAt: moments.createdAt,
      updatedAt: moments.updatedAt,
      approvedOffer: moments.approvedOffer,
      pitchCount: sql<number>`(SELECT COUNT(*) FROM pitches WHERE pitches.moment_id = ${moments.id})`.as("pitch_count"),
    })
    .from(moments)
    .orderBy(asc(moments.startDate));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const [created] = await db
    .insert(moments)
    .values({
      name: body.name,
      startDate: body.startDate,
      endDate: body.endDate ?? null,
      category: body.category,
      description: body.description,
      hook: body.hook ?? null,
      score: body.score != null ? parseFloat(body.score) : null,
      notes: body.notes ?? null,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}