import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pitches, moments, merchants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaude } from "@/lib/ai";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function toAppleFQ(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  if (m >= 10) return `Q1 FY${y + 1}`;
  if (m >= 7)  return `Q4 FY${y}`;
  if (m >= 4)  return `Q3 FY${y}`;
  return `Q2 FY${y}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [pitch] = await db.select().from(pitches).where(eq(pitches.id, id)).limit(1);
  if (!pitch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [moment] = pitch.momentId
    ? await db.select().from(moments).where(eq(moments.id, pitch.momentId)).limit(1)
    : [null];
  const [merchant] = pitch.merchantId
    ? await db.select().from(merchants).where(eq(merchants.id, pitch.merchantId)).limit(1)
    : [null];

  const targetQuarter = moment?.startDate ? toAppleFQ(moment.startDate) : "TBD";
  const merchantName = merchant?.name ?? "the merchant";
  const momentName = moment?.name ?? "this moment";

  const system = `CRITICAL: This tool is for Apple Pay only — NOT Apple Card, NOT Apple Cash.
NEVER mention: rewards, cash back, 2%, Daily Cash, APR, interest rates, credit limits.
Apple Pay is a contactless payment method accepted wherever NFC or online checkout supports it.
Apple Pay's value proposition: speed, security, privacy, broad merchant acceptance.

You are generating a partnership pitch document on behalf of Apple Pay's Partner Marketing team.
The document will be sent TO the merchant to propose a co-marketing partnership.
Write every section as if Apple Pay is addressing the merchant directly.
Return ONLY valid JSON. No markdown, no explanation outside the JSON.`;

  const prompt = `Generate a complete partnership pitch document for:

MERCHANT: ${merchantName}
MERCHANT CATEGORY: ${merchant?.category ?? "N/A"}
MERCHANT DESCRIPTION: ${merchant?.notes ?? "N/A"}

MOMENT: ${momentName}
MOMENT DATE: ${moment?.startDate ?? "TBD"}
MOMENT CATEGORY: ${moment?.category ?? "N/A"}
MOMENT DESCRIPTION: ${moment?.description ?? "N/A"}
OPPORTUNITY SUMMARY: ${moment?.opportunitySummaryCache ?? "N/A"}

TARGET QUARTER: ${targetQuarter}

Return a JSON object with ALL of these fields:

{
  "partnershipOverview": "<3-4 sentences. Open with the commercial opportunity for ${merchantName}, then explain why this moment is the right timing, then explain why Apple Pay is the right partner. Written as if Apple Pay is presenting to ${merchantName}'s leadership team.>",
  "audienceReachNarrative": "<2-3 sentences. Describe the audience reach of this moment — scale, demographics, and why this audience profile matches ${merchantName}'s customer base. Include relevant scale signals if known.>",
  "transactionOpportunityNarrative": "<2-3 sentences. Describe the specific Apple Pay transaction types this partnership would enable for ${merchantName}'s customers. Focus on the friction Apple Pay removes and the purchase categories relevant to this moment and merchant.>",
  "coMarketingValueNarrative": "<2-3 sentences. Describe what ${merchantName} gains from being associated with Apple Pay — brand alignment, technology credibility, access to Apple's ecosystem, promotional visibility. Be specific to this merchant's brand positioning.>",
  "proposedActivation": "<2-3 sentences. Describe concretely what this partnership would look like in practice — what ${merchantName} would do, what Apple Pay would provide, and what the customer experience would be.>",
  "targetQuarter": "${targetQuarter}"
}`;

  let text: string;
  try {
    text = await callClaude({
      system,
      user: prompt,
      model: "claude-haiku-4-5-20251001",
      maxTokens: 1600,
    });
  } catch (err: any) {
    const msg = err?.message ?? "AI generation unavailable";
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  let sections: any = {};
  try {
    const cleaned = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
    sections = JSON.parse(cleaned);
  } catch { sections = {}; }

  const finalQuarter = sections.targetQuarter ?? targetQuarter;

  await db.update(pitches).set({
    businessRationale: sections.partnershipOverview ?? null,
    offerMechanics: sections.proposedActivation ?? null,
    targetQuarter: finalQuarter,
    audienceReachNarrative: sections.audienceReachNarrative ?? null,
    transactionOpportunityNarrative: sections.transactionOpportunityNarrative ?? null,
    coMarketingValueNarrative: sections.coMarketingValueNarrative ?? null,
    documentGeneratedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(pitches.id, id));

  return NextResponse.json({
    success: true,
    partnershipOverview: sections.partnershipOverview,
    audienceReachNarrative: sections.audienceReachNarrative,
    transactionOpportunityNarrative: sections.transactionOpportunityNarrative,
    coMarketingValueNarrative: sections.coMarketingValueNarrative,
    proposedActivation: sections.proposedActivation,
    targetQuarter: finalQuarter,
  });
}
