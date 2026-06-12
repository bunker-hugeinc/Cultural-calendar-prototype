import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pitches, briefs } from "@/lib/db/schema";
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
    "pocName", "pocTitle", "pocEmail", "pocLinkedIn",
    "internalNotes", "campaignTiming",
  ];
  const updates: any = { updatedAt: new Date() };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  await db.update(pitches).set(updates).where(eq(pitches.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [pitch] = await db.select({ status: pitches.status }).from(pitches).where(eq(pitches.id, id)).limit(1);
  if (!pitch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pitch.status !== "draft") {
    return NextResponse.json({ error: "Only draft pitches can be deleted" }, { status: 400 });
  }
  await db.delete(briefs).where(eq(briefs.pitchId, id));
  await db.delete(pitches).where(eq(pitches.id, id));
  return NextResponse.json({ success: true });
}
