export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moments, merchants, pairingScores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaude, parseJSON } from "@/lib/ai";
import { SCORE_SYSTEM_PROMPT } from "@/lib/prompts";

export const maxDuration = 60;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("[score] ANTHROPIC_API_KEY is not set");
}

interface MomentEvaluation {
  opportunitySummary: string;
  ecommerceScore: number;
  ecommerceRationale: string;
  audienceFit: number;
  audienceRationale: string;
  whiteSpaceScore: number;
  whiteSpaceRationale: string;
  whiteSpaceAnalysis: string;
  overallRationale: string;
  channelRecommendations: ChannelRec[];
}

interface ChannelRec {
  channel: string;
  channelLabel: string;
  recommended: boolean;
  rationale: string;
  suggestedFormat: string;
}

interface MerchantPairing {
  merchantName: string;
  relevanceScore: number;
  offerType: string;
  campaignAngle: string;
  rationale: string;
}

interface ScoreResponse {
  momentEvaluation: MomentEvaluation;
  merchantPairings: MerchantPairing[];
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "API key not configured. Add ANTHROPIC_API_KEY to .env.local." },
      { status: 503 }
    );
  }

  const { id } = await params;

  const moment = await db.query.moments.findFirst({ where: eq(moments.id, id) });
  if (!moment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allMerchants = await db.select().from(merchants);

  const BATCH_SIZE = 15;
  const momentContext = `Moment: ${moment.name}
Dates: ${moment.startDate}${moment.endDate ? ` to ${moment.endDate}` : ""}
Category: ${moment.category}
Description: ${moment.description}
Hook type: ${moment.hook ?? "unspecified"}`;

  // Score moment evaluation + first batch together, remaining batches in parallel
  const batches: typeof allMerchants[] = [];
  for (let i = 0; i < allMerchants.length; i += BATCH_SIZE) {
    batches.push(allMerchants.slice(i, i + BATCH_SIZE));
  }

  // First batch includes the moment evaluation; subsequent batches are merchant-only
  const MERCHANT_ONLY_SYSTEM = `${SCORE_SYSTEM_PROMPT}

For this call you are scoring ONLY the merchantPairings array — do NOT re-score the moment. Return:
{ "merchantPairings": [ ...PART 2 ] }`;

  const [firstRaw, ...restRaws] = await Promise.all([
    callClaude({
      system: SCORE_SYSTEM_PROMPT,
      user: `${momentContext}\n\nMerchants:\n${batches[0].map(m => `- ${m.name} (${m.category}): ${m.seasonalNotes ?? ""}`).join("\n")}`,
      model: "claude-haiku-4-5-20251001",
      maxTokens: 8192,
      temperature: 0.2,
    }),
    ...batches.slice(1).map(batch =>
      callClaude({
        system: MERCHANT_ONLY_SYSTEM,
        user: `${momentContext}\n\nMerchants:\n${batch.map(m => `- ${m.name} (${m.category}): ${m.seasonalNotes ?? ""}`).join("\n")}`,
        model: "claude-haiku-4-5-20251001",
        maxTokens: 4096,
        temperature: 0.2,
      })
    ),
  ]);

  let result: ScoreResponse;
  try {
    result = parseJSON<ScoreResponse>(firstRaw);
  } catch {
    console.error("[score] JSON parse failed on first batch:", firstRaw.slice(0, 500));
    return NextResponse.json({ error: "AI returned invalid JSON", raw: firstRaw.slice(0, 500) }, { status: 502 });
  }

  // Merge merchant pairings from additional batches
  for (const raw of restRaws) {
    try {
      const extra = parseJSON<{ merchantPairings: MerchantPairing[] }>(raw);
      if (Array.isArray(extra?.merchantPairings)) {
        result.merchantPairings.push(...extra.merchantPairings);
      }
    } catch {
      console.warn("[score] Skipping unparseable batch:", raw.slice(0, 200));
    }
  }

  const { momentEvaluation, merchantPairings } = result;

  // Identify top merchant for merchant-specific channel context
  const topMerchant = merchantPairings[0];

  // Re-generate channel recs with top merchant context if we have one
  let channelRecs = momentEvaluation.channelRecommendations;
  if (topMerchant) {
    const channelSystem = `CRITICAL: This tool is for Apple Pay only — NOT Apple Card, NOT Apple Cash.
NEVER mention: rewards, cash back, 2%, Daily Cash, APR, interest rates, credit limits.
Apple Pay is a contactless payment method accepted wherever NFC or online checkout supports it.
Apple Pay's value proposition: speed, security, privacy, broad merchant acceptance.

You are a campaign strategist for Apple Pay Partner Marketing.

Generate 4 channel recommendations for an Apple Pay × merchant partnership activation. These should be specific to the merchant × moment combination.

- "apple_owned": Apple-controlled channels (Wallet notifications, App Store, Apple.com)
- "partner_owned": List the ACTUAL channels this specific merchant is known to use (their app, email list, in-store, social). Do not use generic descriptions — be specific to this merchant's known channels.
- "external": Paid media, social ads, OOH relevant to this moment
- "influencer": Whether this merchant category typically uses influencer marketing and whether they likely have existing spokesperson relationships. If the merchant already has athlete/creator relationships, note that activations should leverage existing partnerships.

Return a JSON array of exactly 4 items:
[{ "channel": "apple_owned"|"partner_owned"|"external"|"influencer", "channelLabel": string, "recommended": boolean, "rationale": string, "suggestedFormat": string }]

Return valid JSON only. No markdown.`;

    const channelMsg = `Moment: ${moment.name}
Top merchant partner: ${topMerchant.merchantName}
Campaign angle: ${topMerchant.campaignAngle}
Offer type: ${topMerchant.offerType}`;

    try {
      const channelRaw = await callClaude({
        system: channelSystem,
        user: channelMsg,
        model: "claude-haiku-4-5-20251001",
        maxTokens: 1024,
        temperature: 0.2,
      });
      const parsed = parseJSON<ChannelRec[]>(channelRaw);
      if (Array.isArray(parsed)) channelRecs = parsed;
    } catch {
      // Fall back to the recs from the main scoring call
    }
  }

  const overallScore = (momentEvaluation.ecommerceScore + momentEvaluation.audienceFit + momentEvaluation.whiteSpaceScore) / 3;

  await db.update(moments)
    .set({
      ecommerceScore: momentEvaluation.ecommerceScore,
      audienceFit: momentEvaluation.audienceFit,
      whiteSpaceScore: momentEvaluation.whiteSpaceScore,
      score: parseFloat(overallScore.toFixed(1)),
      scoreRationale: JSON.stringify({
        opportunitySummary: momentEvaluation.opportunitySummary,
        ecommerceRationale: momentEvaluation.ecommerceRationale,
        audienceRationale: momentEvaluation.audienceRationale,
        whiteSpaceRationale: momentEvaluation.whiteSpaceRationale,
        whiteSpaceAnalysis: momentEvaluation.whiteSpaceAnalysis,
        overallRationale: momentEvaluation.overallRationale,
      }),
      channelRecommendations: JSON.stringify(channelRecs),
    })
    .where(eq(moments.id, id));

  const merchantMap = new Map(allMerchants.map(m => [m.name.toLowerCase(), m.id]));

  let upserted = 0;
  for (const p of merchantPairings) {
    const merchantId = merchantMap.get(p.merchantName.toLowerCase());
    if (!merchantId) continue;

    // Store offerType + rationale as JSON
    const rationaleJson = JSON.stringify({ text: p.rationale, offerType: p.offerType ?? "" });

    await db
      .insert(pairingScores)
      .values({
        momentId: id,
        merchantId,
        relevanceScore: p.relevanceScore,
        campaignAngle: p.campaignAngle,
        rationale: rationaleJson,
      })
      .onConflictDoUpdate({
        target: [pairingScores.momentId, pairingScores.merchantId],
        set: {
          relevanceScore: p.relevanceScore,
          campaignAngle: p.campaignAngle,
          rationale: rationaleJson,
        },
      });
    upserted++;
  }

  return NextResponse.json({ scored: upserted, pairings: merchantPairings });
}
