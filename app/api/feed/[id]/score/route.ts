export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { feedCandidates, merchants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaude, parseJSON } from "@/lib/ai";
import { SCORE_SYSTEM_PROMPT } from "@/lib/prompts";

// Evaluates a feed candidate with Claude without creating a moment record.
// Returns scores + merchant pairings for display only.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API key not configured." }, { status: 503 });
  }

  const { id } = await params;
  const candidate = await db.query.feedCandidates.findFirst({ where: eq(feedCandidates.id, id) });
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allMerchants = await db.select().from(merchants);

  const BATCH_SIZE = 15;
  const momentContext = `Moment: ${candidate.name}
Dates: ${candidate.startDate}${candidate.endDate ? ` to ${candidate.endDate}` : ""}
Category: ${candidate.category}
Description: ${candidate.body}
Hook type: ${candidate.hook ?? "unspecified"}`;

  const batches: typeof allMerchants[] = [];
  for (let i = 0; i < allMerchants.length; i += BATCH_SIZE) {
    batches.push(allMerchants.slice(i, i + BATCH_SIZE));
  }

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

  type MerchantPairing = { merchantName: string; relevanceScore: number; campaignAngle: string; rationale: string };
  type ScoreResult = {
    momentEvaluation: {
      ecommerceScore: number; ecommerceRationale: string;
      audienceFit: number; audienceRationale: string;
      whiteSpaceScore: number; whiteSpaceRationale: string;
      whiteSpaceAnalysis: string; overallRationale: string;
      channelRecommendations: unknown[];
    };
    merchantPairings: MerchantPairing[];
  };

  let result: ScoreResult;
  try {
    result = parseJSON<ScoreResult>(firstRaw);
  } catch {
    console.error("[feed/score] JSON parse failed:", firstRaw.slice(0, 500));
    return NextResponse.json({ error: "AI returned invalid JSON", raw: firstRaw.slice(0, 500) }, { status: 502 });
  }

  for (const raw of restRaws) {
    try {
      const extra = parseJSON<{ merchantPairings: MerchantPairing[] }>(raw);
      if (Array.isArray(extra?.merchantPairings)) {
        result.merchantPairings.push(...extra.merchantPairings);
      }
    } catch {
      console.warn("[feed/score] Skipping unparseable batch:", raw.slice(0, 200));
    }
  }

  // Enrich pairings with merchant IDs for later use
  const merchantMap = new Map(allMerchants.map(m => [m.name.toLowerCase(), m.id]));
  const pairings = result.merchantPairings
    .filter(p => p.relevanceScore >= 4)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .map(p => ({
      ...p,
      merchantId: merchantMap.get(p.merchantName.toLowerCase()) ?? null,
    }));

  return NextResponse.json({
    evaluation: result.momentEvaluation,
    pairings,
  });
}
