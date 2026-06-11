import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pitches } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [pitch] = await db.select().from(pitches).where(eq(pitches.id, id)).limit(1);
  if (!pitch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(pitch);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contentType = req.headers.get("content-type") ?? "";
  let body: any;
  if (contentType.includes("application/json")) {
    body = await req.json();
  } else {
    const text = await req.text();
    try { body = JSON.parse(text); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  }
  const allowed = [
    "businessRationale", "offerMechanics", "influencerStrategy", "channelStrategy",
    "additionalNotes", "status", "sentAt", "approvedAt", "title", "situation",
    "campaignConcept", "campaignHeadline", "keyMessages", "nextSteps", "targetQuarter",
    "audienceReachNarrative", "transactionOpportunityNarrative", "coMarketingValueNarrative",
    "roiNarrative", "lastAutoSavedAt", "exportedAt",
  ];
  const updates: any = { updatedAt: new Date() };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  await db.update(pitches).set(updates).where(eq(pitches.id, id));
  return NextResponse.json({ success: true });
}
