export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { merchants } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(merchants).orderBy(asc(merchants.name));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const [created] = await db
    .insert(merchants)
    .values({
      name: body.name,
      category: body.category,
      seasonalNotes: body.seasonalNotes ?? null,
      notes: body.notes ?? null,
      partnerStatus: body.partnerStatus ?? "existing",
      partnerGroup: body.partnerGroup ?? null,
    })
    .returning();
  return NextResponse.json(created, { status: 201 });
}