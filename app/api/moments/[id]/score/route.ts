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

interface MomentScores {
  ecommerceScore: number;
  ecommerceRationale: string;
  audienceFit: number;
  audienceRationale: string;
  whiteSpaceScore: number;
  whiteSpaceRationale: string;
  overallRationale: string;
  whiteSpaceAnalysis?: string;
}

interface ScoringResult {
  merchantName: string;
  relevanceScore: number;
  campaignAngle: string;
  rationale: string;
}

interface ScoreResponse {
  momentScores: MomentScores;
  merchantPairings: ScoringResult[];
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

  const userMessage = `Moment: ${moment.name}
Dates: ${moment.startDate}${moment.endDate ? ` to ${moment.endDate}` : ""}
Category: ${moment.category}
Description: ${moment.description}
Hook type: ${moment.hook ?? "unspecified"}

Merchants:
${allMerchants.map(m => `- ${m.name} (${m.category}): ${m.seasonalNotes ?? ""}`).join("\n")}`;

  const raw = await callClaude({
    system: SCORE_SYSTEM_PROMPT,
    user: userMessage,
    model: "claude-haiku-4-5-20251001",
    maxTokens: 4096,
    temperature: 0.2,
  });

  let result: ScoreResponse;
  try {
    result = parseJSON<ScoreResponse>(raw);
  } catch {
    console.error("[score] JSON parse failed:", raw.slice(0, 500));
    return NextResponse.json({ error: "AI returned invalid JSON", raw: raw.slice(0, 500) }, { status: 502 });
  }

  const { momentScores, merchantPairings } = result;

  // Save moment sub-scores and rationale
  const overallScore = (momentScores.ecommerceScore + momentScores.audienceFit + momentScores.whiteSpaceScore) / 3;
  await db.update(moments)
    .set({
      ecommerceScore: momentScores.ecommerceScore,
      audienceFit: momentScores.audienceFit,
      whiteSpaceScore: momentScores.whiteSpaceScore,
      score: parseFloat(overallScore.toFixed(1)),
      scoreRationale: JSON.stringify({
        ecommerceRationale: momentScores.ecommerceRationale,
        audienceRationale: momentScores.audienceRationale,
        whiteSpaceRationale: momentScores.whiteSpaceRationale,
        overallRationale: momentScores.overallRationale,
        whiteSpaceAnalysis: momentScores.whiteSpaceAnalysis,
      }),
    })
    .where(eq(moments.id, id));

  // Build merchant name → id map
  const merchantMap = new Map(allMerchants.map(m => [m.name.toLowerCase(), m.id]));

  let upserted = 0;
  for (const p of merchantPairings) {
    const merchantId = merchantMap.get(p.merchantName.toLowerCase());
    if (!merchantId) continue;

    await db
      .insert(pairingScores)
      .values({
        momentId: id,
        merchantId,
        relevanceScore: p.relevanceScore,
        campaignAngle: p.campaignAngle,
        rationale: p.rationale,
      })
      .onConflictDoUpdate({
        target: [pairingScores.momentId, pairingScores.merchantId],
        set: {
          relevanceScore: p.relevanceScore,
          campaignAngle: p.campaignAngle,
          rationale: p.rationale,
        },
      });
    upserted++;
  }

  return NextResponse.json({ scored: upserted, pairings: merchantPairings });
}
