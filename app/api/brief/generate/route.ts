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

    const systemPrompt = `You are a campaign strategist for Apple Pay Partner Marketing.

Given a cultural moment, its approved merchant partner, and the pitch details, generate a complete Apple Pay Partner Marketing brief.

CRITICAL: This tool is for Apple Pay only — NOT Apple Card, NOT Apple Cash.
NEVER mention: rewards, cash back, 2%, Daily Cash, APR, interest rates, credit limits.
Apple Pay is a contactless payment method accepted wherever NFC or online checkout supports it.
Apple Pay's value proposition: speed, security, privacy, broad merchant acceptance.

Return a JSON object with exactly these fields — no markdown, no commentary:

{
  "toplineOverview": "2–3 sentence TL;DR of what this campaign is doing and why now. Be specific to the moment and merchant.",
  "businessObjectives": ["string", "string"],
  "audience": "1–2 sentences describing the primary audience including relevant behavioral insight.",
  "deliverables": ["string", "string"],
  "successMetrics": ["string", "string"],
  "timingNotes": "1–2 sentences on timing rationale based on the moment dates. Note any production lead time implications.",
  "additionalReferences": [],
  "foundationalInsights": "2–3 sentences of audience insight specific to this moment and merchant. Reference real behavioral patterns (habit inertia, convenience gaps, trust barriers).",
  "messagingHierarchy": ["Pillar label — 1-sentence rationale", "Pillar label — rationale"],
  "creativeTacticalConsiderations": ["string", "string"]
}

businessObjectives: 2–3 bullets on the business problem this campaign solves. Focus on Apple Pay adoption, spending uplift, or partner co-marketing goals.
deliverables: list what would be produced (e.g. "2 Discovery Cards (UK, FR, DE)", "Partner co-branded social assets").
successMetrics: 2–3 KPIs from: CID Provisions, Engagement Rate, CTR, Partner Redemptions, Spend Uplift, ROAS, App Opens, Wallet Adds.
messagingHierarchy: ordered list of 3–5 message pillars, most to least important. Each: "Label — 1-sentence rationale."
creativeTacticalConsiderations: 2–4 must-haves or watch-outs specific to this moment and merchant.`;

    const userMessage = `Moment: ${moment?.name ?? "Unknown"}
Dates: ${moment?.startDate ?? ""}${moment?.endDate ? ` to ${moment.endDate}` : ""}
Category: ${moment?.category ?? ""}
Description: ${moment?.description ?? ""}

Merchant Partner: ${merchant?.name ?? "Unknown"}
Merchant Category: ${merchant?.category ?? ""}

Partnership Angle: ${pitch.businessRationale ?? ""}
Offer Mechanics: ${pitch.offerMechanics ?? ""}
ROI Narrative: ${pitch.roiNarrative ?? ""}
Audience Reach: ${pitch.audienceReachNarrative ?? ""}
Target Quarter: ${pitch.targetQuarter ?? ""}`;

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
