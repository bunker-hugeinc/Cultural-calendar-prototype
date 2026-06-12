export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { merchants, moments, pairingScores } from "@/lib/db/schema";
import { eq, gte } from "drizzle-orm";
import { callClaude, parseJSON } from "@/lib/ai";
import { MERCHANT_MOMENTS_PROMPT } from "@/lib/prompts";

export const maxDuration = 60;

interface MomentMatch {
  momentId: string;
  relevanceScore: number;
  campaignAngle: string;
  rationale: string;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API key not configured." }, { status: 503 });
  }

  const { id } = await params;

  const [merchant, upcomingMoments] = await Promise.all([
    db.query.merchants.findFirst({ where: eq(merchants.id, id) }),
    db.select({
      id: moments.id,
      name: moments.name,
      startDate: moments.startDate,
      endDate: moments.endDate,
      category: moments.category,
      description: moments.description,
      hook: moments.hook,
    }).from(moments).where(gte(moments.startDate, todayStr())),
  ]);

  if (!merchant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (upcomingMoments.length === 0) return NextResponse.json({ matches: [] });

  const user = `Merchant: ${merchant.name}
Category: ${merchant.category}
Partner Group: ${merchant.partnerGroup ?? "Unknown"}
Seasonal Notes: ${merchant.seasonalNotes ?? "None"}

Upcoming Cultural Moments:
${upcomingMoments.map(m =>
  `- ID: ${m.id} | ${m.name} (${m.category}) | ${m.startDate}${m.endDate ? ` to ${m.endDate}` : ""} | ${m.description}`
).join("\n")}`;

  const raw = await callClaude({
    system: MERCHANT_MOMENTS_PROMPT,
    user,
    model: "claude-haiku-4-5-20251001",
    maxTokens: 4096,
    temperature: 0.2,
  });

  let matches: MomentMatch[];
  try {
    matches = parseJSON<MomentMatch[]>(raw);
  } catch {
    console.error("[score-moments] JSON parse failed:", raw.slice(0, 300));
    return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 502 });
  }

  // Upsert pairingScores for each match
  let upserted = 0;
  for (const m of matches) {
    const moment = upcomingMoments.find(u => u.id === m.momentId);
    if (!moment) continue;

    await db
      .insert(pairingScores)
      .values({
        momentId: m.momentId,
        merchantId: id,
        relevanceScore: m.relevanceScore,
        campaignAngle: m.campaignAngle,
        rationale: m.rationale,
      })
      .onConflictDoUpdate({
        target: [pairingScores.momentId, pairingScores.merchantId],
        set: {
          relevanceScore: m.relevanceScore,
          campaignAngle: m.campaignAngle,
          rationale: m.rationale,
        },
      });
    upserted++;
  }

  // Return full enriched matches with moment metadata
  const enriched = matches
    .map(m => {
      const moment = upcomingMoments.find(u => u.id === m.momentId);
      if (!moment) return null;
      return { ...m, momentName: moment.name, momentCategory: moment.category, momentStartDate: moment.startDate };
    })
    .filter(Boolean);

  return NextResponse.json({ matches: enriched, upserted });
}
