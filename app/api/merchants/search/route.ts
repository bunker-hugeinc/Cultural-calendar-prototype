import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { merchants } from "@/lib/db/schema";
import { callClaude } from "@/lib/ai";
import { APPLE_PAY_CRITICAL } from "@/lib/prompts";
import { createId } from "@paralleldrive/cuid2";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query?.trim()) return NextResponse.json({ matches: [], recommendations: [] });

  const allMerchants = await db.select({
    id: merchants.id,
    name: merchants.name,
    category: merchants.category,
    notes: merchants.notes,
  }).from(merchants);

  const merchantList = allMerchants.map(m =>
    `ID:${m.id} | ${m.name} | ${m.category} | ${m.notes ?? ""}`
  ).join("\n");

  const system = `${APPLE_PAY_CRITICAL}

You are a marketing strategist helping Apple Pay identify the best merchant partners.
Return ONLY valid JSON. No markdown, no explanation outside the JSON.`;

  const prompt = `A user is searching for merchants: "${query}"

Available merchants in the catalog:
${merchantList}

Return a JSON object with two arrays:

1. "matches": Top 5 existing merchants from the catalog most relevant to this search.
   Each: { "id": "<string>", "relevanceScore": <0-100>, "reason": "<1-2 sentences>" }

2. "recommendations": Up to 3 merchants NOT in the catalog that would be ideal Apple Pay partners for this query.
   These are suggested additions. Each: { "name": "<string>", "category": "<string>", "rationale": "<2-3 sentences on why they'd be a strong Apple Pay partner for this search>" }

Return ONLY the JSON object. No other text.`;

  const text = await callClaude({ system, user: prompt, model: "claude-haiku-4-5-20251001", maxTokens: 1200 });

  const { extractJSONSafe } = await import("@/lib/json-utils");
  const parsed: { matches: any[]; recommendations: any[] } = extractJSONSafe(text, { matches: [], recommendations: [] });

  const enrichedMatches = (parsed.matches || []).map((r: any) => {
    const merchant = allMerchants.find(m => m.id === r.id);
    return { ...merchant, relevanceScore: r.relevanceScore, reason: r.reason };
  }).filter((r: any) => r.id);

  return NextResponse.json({
    matches: enrichedMatches,
    recommendations: parsed.recommendations || [],
    query,
  });
}

export async function PUT(req: NextRequest) {
  // Add recommended (suggested) merchant to catalog
  const { name, category, rationale } = await req.json();
  if (!name || !category) return NextResponse.json({ error: "name and category required" }, { status: 400 });

  const [newMerchant] = await db.insert(merchants).values({
    id: createId(),
    name,
    category,
    notes: rationale ?? null,
    partnerStatus: "potential",
  }).returning();

  return NextResponse.json(newMerchant);
}
