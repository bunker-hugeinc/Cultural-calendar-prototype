import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefs, pitches, moments, merchants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaude } from "@/lib/ai";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
  const { pitchId } = await req.json();

  // Return existing brief if already generated
  const existing = await db.select().from(briefs)
    .where(eq(briefs.pitchId, pitchId)).limit(1);
  if (existing[0]) return NextResponse.json(existing[0]);

  const [pitch] = await db.select().from(pitches).where(eq(pitches.id, pitchId)).limit(1);
  if (!pitch) return NextResponse.json({ error: "Pitch not found" }, { status: 404 });

  const [moment] = pitch.momentId
    ? await db.select().from(moments).where(eq(moments.id, pitch.momentId)).limit(1)
    : [null];
  const [merchant] = pitch.merchantId
    ? await db.select().from(merchants).where(eq(merchants.id, pitch.merchantId!)).limit(1)
    : [null];

  const system = `CRITICAL: This tool is for Apple Pay only — NOT Apple Card, NOT Apple Cash.
NEVER mention: rewards, cash back, 2%, Daily Cash, APR, interest rates, credit limits.
Apple Pay is a contactless payment method accepted wherever NFC or online checkout supports it.
Apple Pay's value proposition: speed, security, privacy, broad merchant acceptance.

You are writing a Creative Brief for an Apple Pay partnership campaign.
This brief will be handed off to creative agencies and execution partners.
Write with the precision and clarity of a senior marketing strategist.
Return ONLY valid JSON. No markdown outside the JSON.`;

  const prompt = `Generate a complete Creative Brief for this approved Apple Pay partnership.

MOMENT: ${moment?.name ?? "TBD"}
DATE: ${moment?.startDate ?? "TBD"}
CATEGORY: ${moment?.category ?? "N/A"}
MOMENT DESCRIPTION: ${moment?.description ?? "N/A"}
OPPORTUNITY SUMMARY: ${moment?.opportunitySummaryCache ?? "N/A"}

MERCHANT PARTNER: ${merchant?.name ?? "TBD"}
MERCHANT CATEGORY: ${merchant?.category ?? "N/A"}

APPROVED PITCH CONTENT:
Partnership Overview: ${pitch.businessRationale ?? "N/A"}
Proposed Activation: ${pitch.offerMechanics ?? "N/A"}
Channel Strategy: ${pitch.channelStrategy ?? "N/A"}
Influencer Strategy: ${pitch.influencerStrategy ?? "N/A"}
Target Quarter: ${pitch.targetQuarter ?? "N/A"}

Return a JSON object:
{
  "toplineOverview": "<2-3 sentences. The single most important thing to know about this campaign — what it is, who it's for, and what it needs to achieve.>",
  "businessObjectives": "<3-4 sentences. What Apple Pay needs this campaign to accomplish. Frame in terms of payment adoption, merchant partnership activation, and audience reach. Be specific to this moment and merchant.>",
  "targetAudience": "<3-4 sentences. Describe the primary audience for this activation — demographics, psychographics, their relationship to both the moment and the merchant. Include any secondary audiences.>",
  "foundationalInsights": "<2-3 sentences. The core insight that makes this moment × merchant pairing powerful for Apple Pay. What behavior or cultural truth does this activation tap into?>",
  "messagingHierarchy": "<3-4 sentences. Primary message (what Apple Pay wants people to feel or do), secondary messages (supporting proof points), and the tone. Be specific to the moment.>",
  "creativeTacticalConsiderations": "<3-4 sentences. Specific creative directions, constraints, or opportunities. Include any Apple brand guidelines relevant to this activation, visual/tonal direction, and what to avoid.>",
  "deliverables": "<Bulleted list as a single string, newline-separated. List the expected creative deliverables: social assets, video specs, OOH if relevant, in-app assets, co-branded materials.>",
  "successMetrics": "<2-3 sentences. How this campaign's performance will be measured. Include both quantitative metrics (impressions, transaction lift, tap-to-pay adoption) and qualitative outcomes.>",
  "timingNotes": "<1-2 sentences. Key timing considerations, deadlines relative to the moment date, and any production lead times to flag.>"
}`;

  const text = await callClaude({
    system,
    user: prompt,
    model: "claude-sonnet-4-6",
    maxTokens: 2000,
  });

  let sections: Record<string, string> = {};
  try { sections = JSON.parse(text.trim()); } catch { sections = {}; }

  const [brief] = await db.insert(briefs).values({
    pitchId,
    momentId: pitch.momentId,
    merchantId: pitch.merchantId,
    ...sections,
    generatedAt: new Date(),
  }).returning();

  return NextResponse.json(brief);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[brief/generate]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
