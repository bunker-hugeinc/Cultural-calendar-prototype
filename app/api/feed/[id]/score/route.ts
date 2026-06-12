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

  const userMessage = `Moment: ${candidate.name}
Dates: ${candidate.startDate}${candidate.endDate ? ` to ${candidate.endDate}` : ""}
Category: ${candidate.category}
Description: ${candidate.body}
Hook type: ${candidate.hook ?? "unspecified"}

Merchants:
${allMerchants.map(m => `- ${m.name} (${m.category}): ${m.seasonalNotes ?? ""}`).join("\n")}`;

  const raw = await callClaude({
    system: SCORE_SYSTEM_PROMPT,
    user: userMessage,
    model: "claude-haiku-4-5-20251001",
    maxTokens: 6000,
    temperature: 0.2,
  });

  let result: {
    momentEvaluation: {
      ecommerceScore: number; ecommerceRationale: string;
      audienceFit: number; audienceRationale: string;
      whiteSpaceScore: number; whiteSpaceRationale: string;
      whiteSpaceAnalysis: string; overallRationale: string;
      channelRecommendations: unknown[];
    };
    merchantPairings: { merchantName: string; relevanceScore: number; campaignAngle: string; rationale: string }[];
  };

  try {
    result = parseJSON(raw);
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 502 });
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
