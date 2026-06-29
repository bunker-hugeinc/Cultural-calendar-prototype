import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { briefs, pitches, moments, merchants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { callClaude } from "@/lib/ai";
import { extractJSONSafe } from "@/lib/json-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { pitchId } = await req.json();
    if (!pitchId) return NextResponse.json({ error: "pitchId required" }, { status: 400 });

    const pitchRows = await db
      .select()
      .from(pitches)
      .leftJoin(merchants, eq(pitches.merchantId, merchants.id))
      .leftJoin(moments, eq(pitches.momentId, moments.id))
      .where(eq(pitches.id, pitchId))
      .limit(1);

    if (!pitchRows[0]) return NextResponse.json({ error: "Pitch not found" }, { status: 404 });

    const pitch = pitchRows[0].pitches;
    const merchant = pitchRows[0].merchants;
    const moment = pitchRows[0].moments;

    const systemPrompt = `You are an expert marketing strategist specializing in partnership and sponsorship briefs for Apple Pay.

You will receive structured context about a sponsorship moment, a merchant partner, and the pitch intent. You must return a complete creative brief in valid JSON covering all 10 fields.

APPLE PAY ACCURACY RULES — MANDATORY:
Never use: "rewards program", "cash back", "cashback", "Daily Cash", "APR", "interest rate", "exclusive rewards", "exclusive offers".
Apple Pay is described only as: fast, secure, frictionless checkout; tap to pay; seamless in-store/in-app payments; privacy-first transactions.`;

    const userMessage = `Generate a complete creative brief for the following Apple Pay sponsorship opportunity.

MOMENT: ${moment?.name ?? "Unknown"}
DATE/TIMING: ${moment?.startDate ?? ""}${moment?.endDate ? ` – ${moment.endDate}` : ""}
CATEGORY: ${moment?.category ?? ""}
DESCRIPTION: ${moment?.description ?? "Not available"}

MERCHANT PARTNER: ${merchant?.name ?? "Unknown"}
MERCHANT CATEGORY: ${merchant?.category ?? ""}

PITCH OVERVIEW: ${pitch.businessRationale ?? ""}
OFFER MECHANICS: ${pitch.offerMechanics ?? ""}
AUDIENCE REACH: ${pitch.audienceReachNarrative ?? ""}
TARGET QUARTER: ${pitch.targetQuarter ?? ""}

Return a JSON object with exactly these 10 keys:

{
  "toplineOverview": "2–3 sentence executive summary of the sponsorship opportunity. Why this moment, why this merchant, why Apple Pay.",
  "businessObjectives": ["bullet string 1", "bullet string 2", "bullet string 3"],
  "audience": "2–3 sentences describing the primary and secondary audience. Include demographic, behavioral, and psychographic signals relevant to this moment.",
  "deliverables": ["deliverable 1", "deliverable 2", "deliverable 3", "deliverable 4"],
  "successMetrics": ["metric 1", "metric 2", "metric 3"],
  "timingNotes": "1–2 sentences on timing considerations: when assets are due, approval lead time, key campaign windows relative to the moment date.",
  "additionalReferences": [],
  "foundationalInsights": "2–4 sentences of strategic insight grounding the brief. What cultural, behavioral, or market trend makes this moment uniquely relevant for Apple Pay right now?",
  "messagingHierarchy": ["Primary: [message]\\n• [support 1]\\n• [support 2]", "pillar 2 — rationale", "pillar 3 — rationale"],
  "creativeTacticalConsiderations": ["tactical recommendation 1", "tactical recommendation 2", "tactical recommendation 3"]
}

businessObjectives: 2–3 bullets on the business problem this campaign solves. Focus on Apple Pay provisioning, spending uplift, or partner co-marketing goals.
deliverables: 4–6 specific content or activation deliverables (e.g. co-branded social content, in-store signage, push notification, email banner, event activation).
successMetrics: 3–5 measurable KPIs (e.g. tap-to-pay transaction volume, merchant co-marketing reach, impressions, new user acquisition). Choose from: CID Provisions, Engagement Rate, CTR, Partner Redemptions, Spend Uplift, ROAS, App Opens, Wallet Adds.
messagingHierarchy: ordered list of 3–5 message pillars, most to least important. Each: "Label — 1-sentence rationale."
creativeTacticalConsiderations: 3–5 tactical recommendations for how the campaign should come to life creatively. Focus on channel, format, and Apple Pay integration point.

Return ONLY the JSON object. No markdown, no code fences, no explanation.`;

    const raw = await callClaude({
      system: systemPrompt,
      user: userMessage,
      model: "claude-sonnet-4-6",
      maxTokens: 2048,
      temperature: 0.3,
    });

    const content = extractJSONSafe<Record<string, unknown> | null>(raw, null);
    if (!content) return NextResponse.json({ error: "AI returned invalid JSON. Try again." }, { status: 500 });

    const existingBrief = await db.select().from(briefs).where(eq(briefs.pitchId, pitchId)).limit(1);

    const str = (v: unknown) => (typeof v === "string" ? v : "");
    const arr = (v: unknown) => JSON.stringify(Array.isArray(v) ? v : []);

    const briefData = {
      toplineOverview: str(content.toplineOverview),
      businessObjectives: arr(content.businessObjectives),
      audience: str(content.audience),
      deliverables: arr(content.deliverables),
      successMetrics: arr(content.successMetrics),
      timingNotes: str(content.timingNotes),
      additionalReferences: arr(content.additionalReferences),
      foundationalInsights: str(content.foundationalInsights),
      messagingHierarchy: arr(content.messagingHierarchy),
      creativeTacticalConsiderations: arr(content.creativeTacticalConsiderations),
      generatedAt: new Date(),
      updatedAt: new Date(),
    };

    let briefId: string;
    if (existingBrief[0]) {
      await db.update(briefs).set(briefData).where(eq(briefs.pitchId, pitchId));
      briefId = existingBrief[0].id;
    } else {
      briefId = crypto.randomUUID();
      await db.insert(briefs).values({
        id: briefId,
        pitchId,
        momentId: pitch.momentId,
        merchantId: pitch.merchantId,
        ...briefData,
        status: "draft",
      });
    }

    return NextResponse.json({
      id: briefId,
      pitchId,
      ...content,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[brief/generate]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
