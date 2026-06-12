import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moments } from "@/lib/db/schema";
import { callClaude } from "@/lib/ai";
import { APPLE_PAY_CRITICAL } from "@/lib/prompts";
import { extractJSONSafe } from "@/lib/json-utils";
import { isLikelyDuplicate } from "@/lib/dedupe";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Discovered {
  name: string;
  startDate: string;
  endDate: string | null;
  category: "gather" | "improve" | "excite";
  score: number;
  why: string;
}

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query?.trim()) return NextResponse.json({ results: [], discovered: [] });

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

  const today = new Date().toISOString().slice(0, 10);

  // 1) Rank existing moments already in the calendar.
  const rankSystem = `${APPLE_PAY_CRITICAL}

You are a marketing strategist helping Apple Pay find the best cultural moments for partnership campaigns.
Return ONLY valid JSON. No markdown, no explanation outside the JSON.`;
  const rankPrompt = `A user is searching for: "${query}"

Here are all available moments:
${momentList || "(none yet)"}

Return a JSON array of up to 6 of the MOST relevant existing moments. Each element:
{ "id": "<string id>", "relevanceScore": <0-100>, "reason": "<1-2 sentences>" }
Only include genuinely relevant matches. If nothing is relevant, return [].`;

  // 2) Discover real-world moments that match the query but aren't in the DB yet.
  const discoverSystem = `${APPLE_PAY_CRITICAL}

You identify REAL, specific, verifiable cultural / sports / entertainment / retail moments for Apple Pay partnership marketing. Today is ${today}. Only return real events with accurate upcoming dates. Return ONLY valid JSON.`;
  const discoverPrompt = `The user is searching for: "${query}"

Identify up to 4 REAL upcoming moments (after ${today}) that match this search and would suit an Apple Pay partnership. For a specific named event (e.g. a tournament, festival, holiday, product launch window), return that exact event with its real dates.

Return a JSON array. Each element:
{
  "name": "<official event name>",
  "startDate": "<YYYY-MM-DD, real upcoming date>",
  "endDate": "<YYYY-MM-DD or null>",
  "category": "gather" | "improve" | "excite",
  "score": <0-5 Apple Pay fit>,
  "why": "<1-2 sentences on the Apple Pay partnership angle>"
}
If you are unsure of exact dates, give your best estimate for the next occurrence. Return [] only if nothing real matches.`;

  const [rankText, discoverText] = await Promise.all([
    callClaude({ system: rankSystem, user: rankPrompt, model: "claude-haiku-4-5-20251001", maxTokens: 1024 }),
    callClaude({ system: discoverSystem, user: discoverPrompt, model: "claude-sonnet-4-6", maxTokens: 1024 }),
  ]);

  // Existing matches
  const ranked = extractJSONSafe<{ id: string; relevanceScore: number; reason: string }[]>(rankText, []);
  const results = (Array.isArray(ranked) ? ranked : [])
    .map(r => {
      const moment = allMoments.find(m => m.id === r.id);
      return moment ? { ...moment, relevanceScore: r.relevanceScore, reason: r.reason } : null;
    })
    .filter(Boolean);

  // Discovered (new) moments — drop anything that duplicates an existing moment or itself
  const existingNames = allMoments.map(m => m.name);
  const rawDiscovered = extractJSONSafe<Discovered[]>(discoverText, []);
  const discovered: Discovered[] = [];
  for (const d of Array.isArray(rawDiscovered) ? rawDiscovered : []) {
    if (!d?.name || !d?.startDate) continue;
    if (isLikelyDuplicate(d.name, existingNames)) continue;
    if (isLikelyDuplicate(d.name, discovered.map(x => x.name))) continue;
    discovered.push(d);
  }

  return NextResponse.json({ results, discovered, query });
}
