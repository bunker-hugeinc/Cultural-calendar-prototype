import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moments, merchants, pairingScores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { groq, parseJSON } from "@/lib/ai";
import { SCORE_SYSTEM_PROMPT } from "@/lib/prompts";

if (!process.env.GROQ_API_KEY) {
  console.warn("[score] GROQ_API_KEY is not set");
}

interface ScoringResult {
  merchantName: string;
  relevanceScore: number;
  campaignAngle: string;
  rationale: string;
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

  const allMerchants = await db.select().from(merchants);

  const userMessage = `Moment: ${moment.name}
Dates: ${moment.startDate}${moment.endDate ? ` to ${moment.endDate}` : ""}
Category: ${moment.category}
Description: ${moment.description}
Hook type: ${moment.hook ?? "unspecified"}

Merchants:
${allMerchants.map(m => `- ${m.name} (${m.category}): ${m.seasonalNotes ?? ""}`).join("\n")}`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: SCORE_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    max_tokens: 4096,
    temperature: 0.2,
  });

  const raw = completion.choices[0].message.content ?? "";
  let pairings: ScoringResult[];
  try {
    pairings = parseJSON<ScoringResult[]>(raw);
  } catch {
    console.error("[score] JSON parse failed:", raw.slice(0, 500));
    return NextResponse.json({ error: "AI returned invalid JSON", raw: raw.slice(0, 500) }, { status: 502 });
  }

  // Build merchant name → id map
  const merchantMap = new Map(allMerchants.map(m => [m.name.toLowerCase(), m.id]));

  let upserted = 0;
  for (const p of pairings) {
    const merchantId = merchantMap.get(p.merchantName.toLowerCase());
    if (!merchantId) continue; // skip if name doesn't match

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

  return NextResponse.json({ scored: upserted, pairings });
}
