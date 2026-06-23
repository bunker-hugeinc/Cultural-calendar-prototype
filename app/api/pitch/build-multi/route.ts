import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pitches, moments, merchants, momentMerchants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { callClaude } from "@/lib/ai";
import { extractJSONSafe } from "@/lib/json-utils";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function toAppleFQ(dateStr: string): string {
  const d = new Date(dateStr);
  const m = d.getMonth() + 1;
  const y = d.getFullYear();
  if (m >= 10) return `Q1 FY${y + 1}`;
  if (m >= 7)  return `Q4 FY${y}`;
  if (m >= 4)  return `Q3 FY${y}`;
  return `Q2 FY${y}`;
}

async function generatePitchForMerchant(moment: typeof moments.$inferSelect, merchant: typeof merchants.$inferSelect, targetQuarter: string) {
  const system = `CRITICAL: This tool is for Apple Pay only — NOT Apple Card, NOT Apple Cash.
NEVER mention: rewards, cash back, 2%, Daily Cash, APR, interest rates, credit limits.
Apple Pay is a contactless payment method accepted wherever NFC or online checkout supports it.
Apple Pay's value proposition: speed, security, privacy, broad merchant acceptance.

You are drafting a partnership pitch from Apple Pay's Partner Marketing team to a merchant.
Return ONLY valid JSON.`;

  const prompt = `Draft a partnership pitch for Apple Pay × ${merchant.name} during ${moment.name}.

MOMENT: ${moment.name} | ${moment.startDate ?? "TBD"} | ${moment.category ?? "N/A"}
DESCRIPTION: ${moment.description ?? "N/A"}
OPPORTUNITY: ${moment.opportunitySummaryCache ?? "N/A"}

MERCHANT: ${merchant.name} | ${merchant.category ?? "N/A"}
DESCRIPTION: ${merchant.seasonalNotes ?? "N/A"}

TARGET QUARTER: ${targetQuarter}

Return JSON with UNIQUE copy specific to ${merchant.name}'s brand, products, and customer relationship with Apple Pay:
{
  "businessRationale": "<3-4 sentences written to ${merchant.name}'s leadership. Lead with commercial opportunity specific to ${merchant.name}.>",
  "offerMechanics": "<2-3 sentences describing the specific activation for ${merchant.name} customers.>",
  "influencerStrategy": "<2-3 sentences on creator amplification for this specific merchant × moment.>",
  "channelStrategy": "<2-3 sentences on which channels fit this merchant's audience.>",
  "audienceReachNarrative": "<2-3 sentences on audience scale and fit for ${merchant.name}.>",
  "transactionOpportunityNarrative": "<2-3 sentences on the Apple Pay transactions this enables for ${merchant.name}'s customers.>",
  "coMarketingValueNarrative": "<2-3 sentences on what ${merchant.name} specifically gains from the Apple Pay association.>"
}`;

  const text = await callClaude({ system, user: prompt, model: "claude-haiku-4-5-20251001", maxTokens: 1200 });
  return extractJSONSafe(text, {});
}

export async function POST(req: NextRequest) {
  const { momentId, merchantIds } = await req.json();
  if (!momentId || !Array.isArray(merchantIds) || merchantIds.length === 0) {
    return NextResponse.json({ error: "momentId and merchantIds required" }, { status: 400 });
  }

  const [moment] = await db.select().from(moments).where(eq(moments.id, momentId)).limit(1);
  if (!moment) return NextResponse.json({ error: "Moment not found" }, { status: 404 });

  const targetQuarter = moment.startDate ? toAppleFQ(moment.startDate) : "TBD";

  const allMerchants = await Promise.all(
    merchantIds.map((id: string) =>
      db.select().from(merchants).where(eq(merchants.id, id)).limit(1).then(r => r[0])
    )
  );

  const validMerchants = allMerchants.filter(Boolean);

  // Generate pitches concurrently
  const pitchData = await Promise.all(
    validMerchants.map(merchant => generatePitchForMerchant(moment, merchant, targetQuarter))
  );

  // Insert all pitches and associate merchants
  const created = await Promise.all(
    validMerchants.map(async (merchant, i) => {
      const [pitch] = await db.insert(pitches).values({
        title: `Apple Pay × ${merchant.name} — ${moment.name}`,
        type: "moment_led",
        status: "draft",
        momentId,
        merchantId: merchant.id,
        targetQuarter,
        ...pitchData[i],
        documentGeneratedAt: new Date(),
      }).returning();
      await db.insert(momentMerchants).values({
        id: createId(),
        momentId,
        merchantId: merchant.id,
        addedBy: "pitch",
        activationType: "new",
      }).onConflictDoNothing();
      return pitch;
    })
  );

  return NextResponse.json({
    pitches: created.map(p => ({ id: p.id, merchantId: p.merchantId })),
    firstPitchId: created[0]?.id,
  });
}
