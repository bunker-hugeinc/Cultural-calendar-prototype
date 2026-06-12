import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pitches, pitchMoments, pitchMerchants, moments, merchants, pairingScores } from "@/lib/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { callClaude, parseJSON } from "@/lib/ai";
import { BRIEF_GENERATION_PROMPT } from "@/lib/prompts";

export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const pitch = await db.query.pitches.findFirst({ where: eq(pitches.id, id) });
  if (!pitch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [momentLinks, merchantLinks] = await Promise.all([
    db.select({ momentId: pitchMoments.momentId, isPrimary: pitchMoments.isPrimary })
      .from(pitchMoments).where(eq(pitchMoments.pitchId, id)),
    db.select({ merchantId: pitchMerchants.merchantId, isPrimary: pitchMerchants.isPrimary })
      .from(pitchMerchants).where(eq(pitchMerchants.pitchId, id)),
  ]);

  const momentIds = momentLinks.map(l => l.momentId);
  const merchantIds = merchantLinks.map(l => l.merchantId);

  const [momentRows, merchantRows] = await Promise.all([
    momentIds.length
      ? db.select({ id: moments.id, name: moments.name, startDate: moments.startDate, endDate: moments.endDate, category: moments.category, score: moments.score, ecommerceScore: moments.ecommerceScore, audienceFit: moments.audienceFit, whiteSpaceScore: moments.whiteSpaceScore, scoreRationale: moments.scoreRationale })
          .from(moments).where(inArray(moments.id, momentIds))
      : Promise.resolve([]),
    merchantIds.length
      ? db.select({ id: merchants.id, name: merchants.name, category: merchants.category, partnerGroup: merchants.partnerGroup, merchantSignals: merchants.merchantSignals })
          .from(merchants).where(inArray(merchants.id, merchantIds))
      : Promise.resolve([]),
  ]);

  // Get top 5 pairings across all moments in this pitch
  let pairingRows: { merchantName: string; relevanceScore: number; campaignAngle: string }[] = [];
  if (momentIds.length) {
    const rawPairings = await db
      .select({
        merchantName: merchants.name,
        relevanceScore: pairingScores.relevanceScore,
        campaignAngle: pairingScores.campaignAngle,
      })
      .from(pairingScores)
      .innerJoin(merchants, eq(pairingScores.merchantId, merchants.id))
      .where(inArray(pairingScores.momentId, momentIds))
      .orderBy(desc(pairingScores.relevanceScore))
      .limit(5);
    pairingRows = rawPairings;
  }

  // Parse stored JSON fields
  let keyMessages: string[] = [];
  try { if (pitch.keyMessages) keyMessages = JSON.parse(pitch.keyMessages); } catch { /* */ }
  let channelStrategy: unknown[] = [];
  try { if (pitch.channelStrategy) channelStrategy = JSON.parse(pitch.channelStrategy); } catch { /* */ }
  let influencerStrategy: unknown[] = [];
  try { if (pitch.influencerStrategy) influencerStrategy = JSON.parse(pitch.influencerStrategy); } catch { /* */ }

  // Build Claude context
  const primaryMoment = momentRows.find(m => momentLinks.find(l => l.momentId === m.id)?.isPrimary) ?? momentRows[0];
  const primaryMerchant = merchantRows.find(m => merchantLinks.find(l => l.merchantId === m.id)?.isPrimary) ?? merchantRows[0];

  let momentCtx = "No moment linked.";
  if (primaryMoment) {
    let rationale: Record<string, string> = {};
    try { if (primaryMoment.scoreRationale) rationale = JSON.parse(primaryMoment.scoreRationale); } catch { /* */ }
    momentCtx = `Moment: ${primaryMoment.name}
Dates: ${primaryMoment.startDate}${primaryMoment.endDate ? ` to ${primaryMoment.endDate}` : ""}
Category: ${primaryMoment.category}
eCommerce Score: ${primaryMoment.ecommerceScore ?? "unscored"} — ${rationale.ecommerceRationale ?? ""}
Audience Fit: ${primaryMoment.audienceFit ?? "unscored"} — ${rationale.audienceRationale ?? ""}
White Space: ${primaryMoment.whiteSpaceScore ?? "unscored"} — ${rationale.whiteSpaceRationale ?? ""}
${rationale.whiteSpaceAnalysis ? `White Space Analysis: ${rationale.whiteSpaceAnalysis}` : ""}`;
  }

  let merchantCtx = "No merchant linked.";
  if (primaryMerchant) {
    let signals: Record<string, string | number> = {};
    try { if (primaryMerchant.merchantSignals) signals = JSON.parse(primaryMerchant.merchantSignals); } catch { /* */ }
    merchantCtx = `Merchant: ${primaryMerchant.name}
Category: ${primaryMerchant.category}
Partner Group: ${primaryMerchant.partnerGroup ?? "Unknown"}
Apple Pay Affinity: ${signals.applePayAffinity ?? "unscored"} — ${signals.affinityRationale ?? ""}
Transaction Profile: ${signals.transactionProfile ?? ""}
Marketing Openness: ${signals.marketingOpenness ?? ""}`;
  }

  const pitchCtx = `Pitch Title: ${pitch.title}
Target Quarter: ${pitch.targetQuarter ?? "not set"}
${pitch.situation ? `Situation: ${pitch.situation}` : ""}
${pitch.campaignHeadline ? `Campaign Headline: ${pitch.campaignHeadline}` : ""}
${pitch.campaignConcept ? `Campaign Concept: ${pitch.campaignConcept}` : ""}
${keyMessages.length ? `Key Messages:\n${keyMessages.map((m, i) => `${i + 1}. ${m}`).join("\n")}` : ""}
${channelStrategy.length ? `Channel Strategy: ${JSON.stringify(channelStrategy)}` : ""}
${pairingRows.length ? `Top Merchant Pairings:\n${pairingRows.map(p => `- ${p.merchantName}: ${p.campaignAngle}`).join("\n")}` : ""}`;

  // Call Claude to generate structured brief content
  let briefContent: {
    toplineOverview: string;
    businessObjectives: string[];
    audience: string;
    deliverables: string[];
    successMetrics: string[];
    timingNotes: string;
    foundationalInsights: string;
    messagingHierarchy: string[];
    creativeTacticalConsiderations: string[];
  };

  try {
    const raw = await callClaude({
      system: BRIEF_GENERATION_PROMPT,
      user: `${pitchCtx}\n\n${momentCtx}\n\n${merchantCtx}`,
      model: "claude-sonnet-4-6",
      maxTokens: 2048,
      temperature: 0.3,
    });
    briefContent = parseJSON(raw);
  } catch {
    // Fallback: use pitch content where available
    briefContent = {
      toplineOverview: pitch.situation ?? `${pitch.title} — a partnership campaign opportunity.`,
      businessObjectives: ["Drive Apple Pay provisioning among target audience", "Generate incremental spend via partner co-marketing"],
      audience: "Apple device owners who haven't yet provisioned Apple Pay, or light Apple Pay users.",
      deliverables: ["Partner co-branded assets", "Discovery card content"],
      successMetrics: ["CID Provisions", "Engagement Rate", "Partner Redemptions"],
      timingNotes: pitch.targetQuarter ? `Targeting ${pitch.targetQuarter}.` : "Timing TBD.",
      foundationalInsights: "See pitch situation for foundational insights.",
      messagingHierarchy: keyMessages.length ? keyMessages : ["Core message TBD"],
      creativeTacticalConsiderations: ["Must include CID-linked CTAs pointing to Wallet"],
    };
  }

  return NextResponse.json({
    pitch: {
      title: pitch.title,
      type: pitch.type,
      status: pitch.status,
      situation: pitch.situation,
      campaignConcept: pitch.campaignConcept,
      campaignHeadline: pitch.campaignHeadline,
      keyMessages,
      channelStrategy,
      influencerStrategy,
      nextSteps: pitch.nextSteps,
      targetQuarter: pitch.targetQuarter,
    },
    moments: momentRows.map(m => ({
      name: m.name,
      startDate: m.startDate,
      endDate: m.endDate,
      category: m.category,
      score: m.score,
      ecommerceScore: m.ecommerceScore,
      audienceFit: m.audienceFit,
      whiteSpaceScore: m.whiteSpaceScore,
    })),
    merchants: merchantRows.map(m => ({
      name: m.name,
      category: m.category,
      partnerGroup: m.partnerGroup,
    })),
    pairings: pairingRows,
    briefContent,
    generatedAt: new Date().toISOString(),
  });
}
