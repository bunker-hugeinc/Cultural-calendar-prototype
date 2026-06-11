import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moments, merchants, pitches } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { callClaude } from "@/lib/ai";
import { extractJSONSafe } from "@/lib/json-utils";
import { APPLE_PAY_CRITICAL } from "@/lib/prompts";
import { createId } from "@paralleldrive/cuid2";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function toAppleFQ(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  if (month >= 10) return `Q1 FY${year + 1}`;
  if (month >= 7) return `Q4 FY${year}`;
  if (month >= 4) return `Q3 FY${year}`;
  return `Q2 FY${year}`;
}

export async function POST(req: NextRequest) {
  const { momentId, merchantId } = await req.json();
  if (!momentId || !merchantId) {
    return NextResponse.json({ error: "momentId and merchantId required" }, { status: 400 });
  }

  const [[moment], [merchant]] = await Promise.all([
    db.select().from(moments).where(eq(moments.id, momentId)).limit(1),
    db.select().from(merchants).where(eq(merchants.id, merchantId)).limit(1),
  ]);
  if (!moment || !merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Return existing draft if already populated
  const existing = await db.select().from(pitches)
    .where(and(eq(pitches.momentId, momentId), eq(pitches.merchantId, merchantId)))
    .limit(1);

  if (existing[0]?.status === "draft" && existing[0]?.businessRationale) {
    return NextResponse.json({ pitchId: existing[0].id, fromCache: true });
  }

  const targetQuarter = moment.startDate ? toAppleFQ(moment.startDate) : "TBD";

  const opportunitySummary = moment.opportunitySummaryCache ?? moment.scoreRationale
    ? (() => { try { return JSON.parse(moment.scoreRationale!)?.opportunitySummary; } catch { return null; } })()
    : null;

  const system = `${APPLE_PAY_CRITICAL}

You are drafting a partnership pitch that will be sent to a merchant to request their participation in an Apple Pay campaign.
Write from the perspective of Apple Pay's marketing team reaching out to the merchant.
Return ONLY valid JSON.`;

  const prompt = `Draft a partnership pitch for the following moment × merchant pairing.

MOMENT: ${moment.name}
Date: ${moment.startDate ?? "TBD"}
Category: ${moment.category}
Description: ${moment.description}
${opportunitySummary ? `Opportunity Summary: ${opportunitySummary}` : ""}

MERCHANT: ${merchant.name}
Category: ${merchant.category}
${merchant.notes ? `Notes: ${merchant.notes}` : ""}

TARGET QUARTER: ${targetQuarter}

Return a JSON object — all fields written as if Apple Pay is reaching out TO the merchant:
{
  "businessRationale": "<3-4 sentences: Why this moment is the right time for an Apple Pay × ${merchant.name} activation. Lead with the commercial opportunity for the merchant.>",
  "offerMechanics": "<2-3 sentences: What the partnership activation would look like in practice. Describe what the merchant would need to do, what Apple Pay would provide, and what the customer experience would be.>",
  "influencerStrategy": "<2-3 sentences: How creator/influencer content would amplify the partnership.>",
  "channelStrategy": "<2-3 sentences: Which marketing channels would carry this activation and why they fit.>",
  "additionalNotes": "<1-2 sentences: Timing, exclusivity, or next-step considerations.>"
}`;

  const text = await callClaude({ system, user: prompt, model: "claude-haiku-4-5-20251001", maxTokens: 1200 });
  const sections: any = extractJSONSafe(text, {});

  let pitchId: string;
  if (existing[0]) {
    await db.update(pitches).set({
      ...sections,
      targetQuarter,
      updatedAt: new Date(),
    }).where(eq(pitches.id, existing[0].id));
    pitchId = existing[0].id;
  } else {
    const [newPitch] = await db.insert(pitches).values({
      id: createId(),
      title: `Apple Pay × ${merchant.name} — ${moment.name}`,
      type: "moment_led",
      status: "draft",
      momentId,
      merchantId,
      targetQuarter,
      businessRationale: sections.businessRationale ?? null,
      offerMechanics: sections.offerMechanics ?? null,
      influencerStrategy: sections.influencerStrategy ?? null,
      channelStrategy: sections.channelStrategy ?? null,
      additionalNotes: sections.additionalNotes ?? null,
    }).returning();
    pitchId = newPitch.id;
  }

  return NextResponse.json({ pitchId, fromCache: false });
}
