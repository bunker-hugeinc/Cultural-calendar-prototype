export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moments } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(moments).orderBy(asc(moments.startDate));
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