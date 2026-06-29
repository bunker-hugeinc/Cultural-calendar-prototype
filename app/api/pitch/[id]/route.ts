import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { pitches, briefs, moments } from "@/lib/db/schema";
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
  // Timestamp columns must be Date objects, not strings. The client sends these
  // as ISO strings; drizzle calls .toISOString() on the value, which throws on a
  // string and silently fails the entire update. Coerce them to Date here.
  const timestampFields = new Set(["sentAt", "approvedAt", "lastAutoSavedAt", "exportedAt"]);
  const updates: any = { updatedAt: new Date() };
  for (const key of allowed) {
    if (key in body) {
      if (timestampFields.has(key)) {
        const v = body[key];
        updates[key] = v == null ? null : (v instanceof Date ? v : new Date(v));
      } else {
        updates[key] = body[key];
      }
    }
  }
  try {
    await db.update(pitches).set(updates).where(eq(pitches.id, id));
  } catch (err) {
    console.error("[pitch PATCH] update failed", { id, fields: Object.keys(updates), err });
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
  // When status changes, refresh the views that display it. (Skip on plain
  // field autosaves so we don't thrash the cache on every keystroke.)
  if ("status" in body) {
    revalidatePath("/pitch");
    revalidatePath("/");
    const [row] = await db.select().from(pitches).where(eq(pitches.id, id)).limit(1);
    if (row?.momentId) {
      revalidatePath(`/moments/${row.momentId}`);
      // When approved, write offer details back to the moment
      if (body.status === "approved" && row.momentId) {
        await db.update(moments).set({
          approvedOffer: row.offerMechanics ?? null,
          approvedMerchantId: row.merchantId ?? null,
          approvedPitchId: id,
          updatedAt: new Date(),
        }).where(eq(moments.id, row.momentId));
      }
    }
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [pitch] = await db.select({ momentId: pitches.momentId, status: pitches.status }).from(pitches).where(eq(pitches.id, id)).limit(1);
  if (!pitch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pitch.status !== "draft") {
    return NextResponse.json({ error: "Only draft pitches can be deleted." }, { status: 403 });
  }
  // Delete dependent briefs first (no cascade on briefs.pitchId), then the pitch.
  await db.delete(briefs).where(eq(briefs.pitchId, id));
  await db.delete(pitches).where(eq(pitches.id, id));
  revalidatePath("/pitch");
  revalidatePath("/");
  if (pitch.momentId) revalidatePath(`/moments/${pitch.momentId}`);
  return NextResponse.json({ success: true });
}
