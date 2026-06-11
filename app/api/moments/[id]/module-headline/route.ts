import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moments, pitches, merchants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaude } from "@/lib/ai";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const momentId = id;

  const [moment] = await db.select().from(moments).where(eq(moments.id, momentId)).limit(1);
  if (!moment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const approvedPitches = await db
    .select({ id: pitches.id, merchantId: pitches.merchantId })
    .from(pitches)
    .where(eq(pitches.momentId, momentId));

  const merchantNames = await Promise.all(
    approvedPitches.map(p =>
      p.merchantId
        ? db.select({ name: merchants.name }).from(merchants).where(eq(merchants.id, p.merchantId)).limit(1).then(r => r[0]?.name)
        : Promise.resolve(null)
    )
  );
  const names = merchantNames.filter(Boolean) as string[];

  const system = `CRITICAL: This tool is for Apple Pay only — NOT Apple Card, NOT Apple Cash.
NEVER mention: rewards, cash back, 2%, Daily Cash, APR, interest rates, credit limits.
You write punchy, short marketing copy in Apple's voice — confident, warm, direct. No exclamation marks.
Return ONLY valid JSON.`;

  const prompt = `Write a short headline and subhead for an Apple Pay promotional module.

MOMENT: ${moment.name}
DATE: ${moment.startDate ?? "TBD"}
CATEGORY: ${moment.category ?? "N/A"}
DESCRIPTION: ${moment.description ?? "N/A"}
PARTNER MERCHANTS: ${names.join(", ")}

The headline should capture the spirit of the moment and connect it to paying with Apple Pay.
Reference: Apple uses headlines like "Tap. Pay. Kickoff." or "Your game plan, sorted." — short, punchy, period-ended or action-oriented.

Return JSON:
{
  "headline": "<3-6 words, punchy, moment-specific, Apple voice>",
  "subhead": "<one sentence, 10-15 words, describes what customers can do with Apple Pay at these merchants during this moment>"
}`;

  const text = await callClaude({ system, user: prompt, model: "claude-haiku-4-5-20251001", maxTokens: 200 });
  try {
    return NextResponse.json(JSON.parse(text.trim()));
  } catch {
    return NextResponse.json({ headline: moment.name, subhead: `Pay with Apple Pay at ${names.join(", ")}.` });
  }
}
