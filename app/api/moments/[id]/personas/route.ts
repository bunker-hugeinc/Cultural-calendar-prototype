import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moments, pairingScores, merchants } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { callClaude, parseJSON } from "@/lib/ai";
import { PERSONAS_SYSTEM_PROMPT } from "@/lib/prompts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("[personas] ANTHROPIC_API_KEY is not set");
}

export interface InfluencerPersona {
  type: string;
  realExamples: string;
  audienceSize: string;
  contentStyle: string;
  whyThisMoment: string;
  campaignAngle: string;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "API key not configured. Add ANTHROPIC_API_KEY to .env.local." },
        { status: 503 }
      );
    }

    const { id } = await params;

    const moment = await db.query.moments.findFirst({ where: eq(moments.id, id) });
    if (!moment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const topPairings = await db
      .select({
        merchantName: merchants.name,
        campaignAngle: pairingScores.campaignAngle,
        relevanceScore: pairingScores.relevanceScore,
      })
      .from(pairingScores)
      .innerJoin(merchants, eq(pairingScores.merchantId, merchants.id))
      .where(eq(pairingScores.momentId, id))
      .orderBy(desc(pairingScores.relevanceScore))
      .limit(3);

    const topPairing = topPairings[0];
    const topMerchants = topPairings.map(p => p.merchantName);

    const userMessage = `Moment: ${moment.name}
Dates: ${moment.startDate} to ${moment.endDate ?? moment.startDate}
Category: ${moment.category}
Campaign angle: ${topPairing?.campaignAngle ?? moment.description}
Top merchant partners: ${topMerchants.join(", ") || "various partners"}
Hook type: ${moment.hook ?? "not specified"}

Generate 2–3 specific influencer personas for this exact moment and these specific merchants.`;

    const raw = await callClaude({
      system: PERSONAS_SYSTEM_PROMPT,
      user: userMessage,
      model: "claude-haiku-4-5-20251001",
      maxTokens: 1024,
      temperature: 0.3,
    });
    let personas: InfluencerPersona[];
    try {
      personas = parseJSON<InfluencerPersona[]>(raw);
    } catch {
      console.error("[personas] JSON parse failed:", raw.slice(0, 500));
      return NextResponse.json({ error: "AI returned invalid JSON", raw: raw.slice(0, 500) }, { status: 502 });
    }

    return NextResponse.json({ personas });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[personas] unhandled error:", message);
    return NextResponse.json(
      { error: "Failed to generate personas", details: message },
      { status: 500 }
    );
  }
}
