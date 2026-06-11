import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pitches, pitchMoments, pitchMerchants, moments, merchants } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { callClaude, parseJSON } from "@/lib/ai";
import { PITCH_SITUATION_PROMPT, PITCH_CONCEPT_PROMPT, APPLE_PAY_CRITICAL } from "@/lib/prompts";

export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "API key not configured." }, { status: 503 });
  }

  const { id } = await params;
  const body = await req.json();
  const section: string = body.section ?? "situation";

  const pitch = await db.query.pitches.findFirst({ where: eq(pitches.id, id) });
  if (!pitch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Load associated moments and merchants
  const [momentLinks, merchantLinks] = await Promise.all([
    db.select({ momentId: pitchMoments.momentId, isPrimary: pitchMoments.isPrimary })
      .from(pitchMoments).where(eq(pitchMoments.pitchId, id)),
    db.select({ merchantId: pitchMerchants.merchantId, isPrimary: pitchMerchants.isPrimary })
      .from(pitchMerchants).where(eq(pitchMerchants.pitchId, id)),
  ]);

  const primaryMomentId = momentLinks.find(l => l.isPrimary)?.momentId ?? momentLinks[0]?.momentId;
  const primaryMerchantId = merchantLinks.find(l => l.isPrimary)?.merchantId ?? merchantLinks[0]?.merchantId;

  const [moment, merchant] = await Promise.all([
    primaryMomentId ? db.query.moments.findFirst({ where: eq(moments.id, primaryMomentId) }) : Promise.resolve(null),
    primaryMerchantId ? db.query.merchants.findFirst({ where: eq(merchants.id, primaryMerchantId) }) : Promise.resolve(null),
  ]);

  // Build shared context
  let momentCtx = "No moment linked.";
  if (moment) {
    let rationale: Record<string, string> = {};
    try { if (moment.scoreRationale) rationale = JSON.parse(moment.scoreRationale); } catch { /* */ }
    momentCtx = `Moment: ${moment.name}
Dates: ${moment.startDate}${moment.endDate ? ` to ${moment.endDate}` : ""}
Category: ${moment.category}
Description: ${moment.description}
eCommerce Score: ${moment.ecommerceScore ?? "not scored"} — ${rationale.ecommerceRationale ?? ""}
Audience Fit: ${moment.audienceFit ?? "not scored"} — ${rationale.audienceRationale ?? ""}
White Space: ${moment.whiteSpaceScore ?? "not scored"} — ${rationale.whiteSpaceRationale ?? ""}
${rationale.whiteSpaceAnalysis ? `White Space Analysis: ${rationale.whiteSpaceAnalysis}` : ""}
Overall: ${rationale.overallRationale ?? ""}`;
  }

  let merchantCtx = "No merchant linked.";
  if (merchant) {
    let signals: Record<string, string | number> = {};
    try { if (merchant.merchantSignals) signals = JSON.parse(merchant.merchantSignals); } catch { /* */ }
    merchantCtx = `Merchant: ${merchant.name}
Category: ${merchant.category}
Partner Group: ${merchant.partnerGroup ?? "Unknown"}
Apple Pay Affinity: ${signals.applePayAffinity ?? "not scored"} — ${signals.affinityRationale ?? ""}
Transaction Profile: ${signals.transactionProfile ?? ""}
Marketing Openness: ${signals.marketingOpenness ?? ""}
Outreach Approach: ${signals.outreachApproach ?? ""}`;
  }

  if (section === "situation") {
    const raw = await callClaude({
      system: PITCH_SITUATION_PROMPT,
      user: `${momentCtx}\n\n${merchantCtx}`,
      model: "claude-sonnet-4-6",
      maxTokens: 600,
      temperature: 0.3,
    });

    await db.update(pitches).set({ situation: raw.trim(), updatedAt: new Date() }).where(eq(pitches.id, id));
    return NextResponse.json({ situation: raw.trim() });
  }

  if (section === "concept") {
    const raw = await callClaude({
      system: PITCH_CONCEPT_PROMPT,
      user: `${momentCtx}\n\n${merchantCtx}`,
      model: "claude-sonnet-4-6",
      maxTokens: 512,
      temperature: 0.4,
    });

    let concept: { headline: string; description: string; keyMessages: string[] };
    try {
      concept = parseJSON(raw);
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 502 });
    }

    await db.update(pitches).set({
      campaignHeadline: concept.headline,
      campaignConcept: concept.description,
      keyMessages: JSON.stringify(concept.keyMessages),
      updatedAt: new Date(),
    }).where(eq(pitches.id, id));

    return NextResponse.json({ headline: concept.headline, description: concept.description, keyMessages: concept.keyMessages });
  }

  if (section === "channels") {
    // Use moment's channelRecommendations if available
    let channels = null;
    if (moment?.channelRecommendations) {
      try { channels = JSON.parse(moment.channelRecommendations); } catch { /* */ }
    }

    if (channels) {
      await db.update(pitches).set({ channelStrategy: JSON.stringify(channels), updatedAt: new Date() }).where(eq(pitches.id, id));
      return NextResponse.json({ channels });
    }

    // Fallback: generate from scratch
    const raw = await callClaude({
      system: "You are a campaign strategist for Apple Pay Partner Marketing. Return a JSON array of 4 channel recommendations (apple_owned, partner_owned, external, influencer). Each: { channel, channelLabel, recommended: boolean, rationale, suggestedFormat }. Return valid JSON only.",
      user: `${momentCtx}\n\n${merchantCtx}`,
      model: "claude-haiku-4-5-20251001",
      maxTokens: 1024,
      temperature: 0.3,
    });

    try {
      channels = parseJSON(raw);
      await db.update(pitches).set({ channelStrategy: JSON.stringify(channels), updatedAt: new Date() }).where(eq(pitches.id, id));
      return NextResponse.json({ channels });
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 502 });
    }
  }

  if (section === "influencers") {
    // Call the moment's personas endpoint if moment exists
    if (moment) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/moments/${moment.id}/personas`, { method: "POST" });
      const data = await res.json();
      if (data.personas) {
        await db.update(pitches).set({ influencerStrategy: JSON.stringify(data.personas), updatedAt: new Date() }).where(eq(pitches.id, id));
        return NextResponse.json({ influencers: data.personas });
      }
    }
    return NextResponse.json({ error: "Could not generate influencer strategy" }, { status: 502 });
  }

  if (section === "all") {
    const results: Record<string, unknown> = {};

    // Run situation + concept in parallel, then channels + influencers
    const [sitRaw, conRaw] = await Promise.all([
      callClaude({ system: PITCH_SITUATION_PROMPT, user: `${momentCtx}\n\n${merchantCtx}`, model: "claude-sonnet-4-6", maxTokens: 512, temperature: 0.3 }),
      callClaude({ system: PITCH_CONCEPT_PROMPT, user: `${momentCtx}\n\n${merchantCtx}`, model: "claude-sonnet-4-6", maxTokens: 512, temperature: 0.4 }),
    ]);

    results.situation = sitRaw.trim();

    let concept: { headline: string; description: string; keyMessages: string[] } | null = null;
    try {
      concept = parseJSON<{ headline: string; description: string; keyMessages: string[] }>(conRaw);
      results.headline = concept.headline;
      results.description = concept.description;
      results.keyMessages = concept.keyMessages;
    } catch { /* concept stays null */ }

    // Channels
    let channels: unknown = null;
    if (moment?.channelRecommendations) {
      try { channels = JSON.parse(moment.channelRecommendations); } catch { /* */ }
    }
    if (!channels) {
      try {
        const chRaw = await callClaude({
          system: `${APPLE_PAY_CRITICAL}\n\nYou are a campaign strategist for Apple Pay Partner Marketing. Return a JSON array of 4 channel recommendations (apple_owned, partner_owned, external, influencer). Each: { channel, channelLabel, recommended: boolean, rationale, suggestedFormat }. Return valid JSON only.`,
          user: `${momentCtx}\n\n${merchantCtx}`,
          model: "claude-haiku-4-5-20251001",
          maxTokens: 1024,
          temperature: 0.3,
        });
        channels = parseJSON(chRaw);
      } catch { /* */ }
    }
    if (channels) results.channels = channels;

    // Influencers
    let influencers: unknown = null;
    if (primaryMomentId) {
      try {
        const infRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/moments/${primaryMomentId}/personas`, { method: "POST" });
        const infData = await infRes.json();
        if (infData.personas) influencers = infData.personas;
      } catch { /* */ }
    }
    if (influencers) results.influencers = influencers;

    // Persist everything
    await db.update(pitches).set({
      situation: sitRaw.trim(),
      ...(concept ? {
        campaignHeadline: concept.headline,
        campaignConcept: concept.description,
        keyMessages: JSON.stringify(concept.keyMessages),
      } : {}),
      ...(channels ? { channelStrategy: JSON.stringify(channels) } : {}),
      ...(influencers ? { influencerStrategy: JSON.stringify(influencers) } : {}),
      updatedAt: new Date(),
    }).where(eq(pitches.id, id));

    return NextResponse.json(results);
  }

  return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 });
}
