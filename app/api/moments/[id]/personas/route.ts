import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moments, pairingScores, merchants } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { groq, parseJSON } from "@/lib/ai";
import { PERSONAS_SYSTEM_PROMPT } from "@/lib/prompts";

export const maxDuration = 60;

if (!process.env.GROQ_API_KEY) {
  console.warn("[personas] GROQ_API_KEY is not set");
}

export interface InfluencerPersona {
  type: string;
  handleStyle: string;
  audienceSize: string;
  contentStyle: string;
  whyThisMoment: string;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "API key not configured. Add GROQ_API_KEY to .env.local." },
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

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: PERSONAS_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    max_tokens: 1024,
    temperature: 0.3,
  });

  const raw = completion.choices[0].message.content ?? "";
  let personas: InfluencerPersona[];
  try {
    personas = parseJSON<InfluencerPersona[]>(raw);
  } catch {
    console.error("[personas] JSON parse failed:", raw.slice(0, 500));
    return NextResponse.json({ error: "AI returned invalid JSON", raw: raw.slice(0, 500) }, { status: 502 });
  }

  return NextResponse.json({ personas });
}
