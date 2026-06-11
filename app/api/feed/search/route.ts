import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moments } from "@/lib/db/schema";
import { callClaude } from "@/lib/ai";
import { APPLE_PAY_CRITICAL } from "@/lib/prompts";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query?.trim()) return NextResponse.json({ results: [] });

  const allMoments = await db.select({
    id: moments.id,
    name: moments.name,
    startDate: moments.startDate,
    category: moments.category,
    description: moments.description,
    audienceFit: moments.audienceFit,
    ecommerceScore: moments.ecommerceScore,
  }).from(moments);

  const momentList = allMoments.map(m =>
    `ID:${m.id} | ${m.name} | ${m.startDate} | ${m.category} | ${m.description ?? ""}`
  ).join("\n");

  const system = `${APPLE_PAY_CRITICAL}

You are a marketing strategist helping Apple Pay find the best cultural moments for partnership campaigns.
Return ONLY valid JSON. No markdown, no explanation outside the JSON.`;

  const prompt = `A user is searching for: "${query}"

Here are all available moments:
${momentList}

Return a JSON array of the 6 most relevant moments for this search query. Each element:
{
  "id": "<string id>",
  "relevanceScore": <0-100>,
  "reason": "<1-2 sentences explaining why this moment fits the search>"
}

Rank by relevance to the search intent. Consider: audience alignment, category match, timing, brand fit with Apple Pay, cultural resonance, ecommerce opportunity. Return only the JSON array.`;

  const text = await callClaude({ system, user: prompt, model: "claude-haiku-4-5-20251001", maxTokens: 1024 });

  const { extractJSONSafe } = await import("@/lib/json-utils");
  const parsedResults = extractJSONSafe<any>(text, []);
  const results: { id: string; relevanceScore: number; reason: string }[] = Array.isArray(parsedResults) ? parsedResults : [];

  const enriched = results.map(r => {
    const moment = allMoments.find(m => m.id === r.id);
    return { ...moment, relevanceScore: r.relevanceScore, reason: r.reason };
  }).filter(r => r.id);

  return NextResponse.json({ results: enriched, query });
}
