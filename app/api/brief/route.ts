import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const pitchId = req.nextUrl.searchParams.get("pitchId");
  if (!pitchId) return NextResponse.json(null);
  const [brief] = await db.select().from(briefs)
    .where(eq(briefs.pitchId, pitchId)).limit(1);
  return NextResponse.json(brief ?? null);
}

export async function PATCH(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  let body: any;
  if (contentType.includes("application/json")) {
    body = await req.json();
  } else {
    const text = await req.text();
    try { body = JSON.parse(text); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  }
  const { id, ...updates } = body;
  const allowed = [
    "toplineOverview", "businessObjectives", "targetAudience",
    "messagingHierarchy", "creativeTacticalConsiderations",
    "deliverables", "successMetrics", "timingNotes",
    "foundationalInsights", "status", "lastAutoSavedAt",
  ];
  const filtered: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (key in updates) filtered[key] = updates[key];
  }
  await db.update(briefs).set(filtered).where(eq(briefs.id, id));
  return NextResponse.json({ success: true });
}
