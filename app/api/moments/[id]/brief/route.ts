import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { moments, pairingScores, merchants, feedCandidates, momentReviews } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { callClaude, parseJSON } from "@/lib/ai";
import { BRIEF_SYSTEM_PROMPT } from "@/lib/prompts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface BriefContent {
  toplineOverview: string;
  businessObjectives: string[];
  audience: string;
  deliverables: string[];
  successMetrics: string[];
  timingNotes: string;
  foundationalInsights: string;
  messagingHierarchy: string[];
  creativeTacticalConsiderations: string[];
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const moment = await db.query.moments.findFirst({ where: eq(moments.id, id) });
  if (!moment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured." },
      { status: 503 }
    );
  }

  // Top 5 pairings by relevance score
  const topPairings = await db
    .select({
      merchantName: merchants.name,
      merchantCategory: merchants.category,
      relevanceScore: pairingScores.relevanceScore,
      campaignAngle: pairingScores.campaignAngle,
      rationale: pairingScores.rationale,
    })
    .from(pairingScores)
    .innerJoin(merchants, eq(pairingScores.merchantId, merchants.id))
    .where(eq(pairingScores.momentId, id))
    .orderBy(desc(pairingScores.relevanceScore))
    .limit(5);

  // Look up review context via feedCandidateId FK (set during approval)
  // Fall back to name match for moments approved before Step 3 was deployed
  let reviewContext: {
    campaignName: string | null;
    targetQuarter: string | null;
    inspirationUrls: string[];
    notes: string | null;
    priorityMerchants: string[];
  } | null = null;

  const feedCandidateId = moment.feedCandidateId
    ?? (await db.query.feedCandidates.findFirst({
        where: sql`lower(${feedCandidates.name}) = lower(${moment.name}) AND ${feedCandidates.status} = 'added'`,
       }))?.id
    ?? null;

  if (feedCandidateId) {
    const review = await db.query.momentReviews.findFirst({
      where: eq(momentReviews.feedCandidateId, feedCandidateId),
      orderBy: [desc(momentReviews.submittedAt)],
    });
    if (review) {
      // Look up priority merchant names if IDs are stored
      let priorityMerchantNames: string[] = [];
      if (review.priorityMerchants) {
        const ids: string[] = JSON.parse(review.priorityMerchants);
        if (ids.length) {
          const rows = await db
            .select({ name: merchants.name })
            .from(merchants)
            .where(sql`${merchants.id} = ANY(ARRAY[${sql.join(ids.map(i => sql`${i}`), sql`, `)}]::text[])`);
          priorityMerchantNames = rows.map(r => r.name);
        }
      }
      reviewContext = {
        campaignName:      review.campaignName,
        targetQuarter:     review.targetQuarter,
        inspirationUrls:   review.inspirationUrls ? JSON.parse(review.inspirationUrls) : [],
        notes:             review.notes,
        priorityMerchants: priorityMerchantNames,
      };
    }
  }

  const userMessage = `
Moment: ${moment.name}
Dates: ${moment.startDate}${moment.endDate ? ` to ${moment.endDate}` : ""}
Category: ${moment.category}
Description: ${moment.description}
Hook type: ${moment.hook ?? "not specified"}

Top Merchant Pairings (by relevance score):
${topPairings.length
  ? topPairings.map(p => `- ${p.merchantName} (score: ${p.relevanceScore}): ${p.campaignAngle}`).join("\n")
  : "No pairings scored yet — use top Apple Pay merchant categories relevant to this moment."}

Sub-scores:
- eCommerce Fit: ${moment.ecommerceScore ?? "not scored"}
- Audience Fit: ${moment.audienceFit ?? "not scored"}
- White Space: ${moment.whiteSpaceScore ?? "not scored"}
${reviewContext?.campaignName ? `\nCampaign Name: ${reviewContext.campaignName}` : ""}
${reviewContext?.targetQuarter ? `Target Quarter: ${reviewContext.targetQuarter}` : ""}
${reviewContext?.priorityMerchants?.length ? `Priority Merchants: ${reviewContext.priorityMerchants.join(", ")}` : ""}
${reviewContext?.inspirationUrls?.length ? `Inspiration Campaign References: ${reviewContext.inspirationUrls.join(", ")}` : ""}
${reviewContext?.notes ? `Strategist Notes: ${reviewContext.notes}` : ""}
`.trim();

  const raw = await callClaude({
    system: BRIEF_SYSTEM_PROMPT,
    user: userMessage,
    model: "claude-sonnet-4-6",
    maxTokens: 2048,
    temperature: 0.3,
  });
  let briefContent: BriefContent;
  try {
    briefContent = parseJSON<BriefContent>(raw);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse brief content from AI response.", raw },
      { status: 500 }
    );
  }

  return NextResponse.json({
    moment: {
      name:               moment.name,
      startDate:          moment.startDate,
      endDate:            moment.endDate,
      category:           moment.category,
      description:        moment.description,
      hook:               moment.hook,
      score:          moment.score,
      ecommerceScore: moment.ecommerceScore,
      audienceFit:    moment.audienceFit,
      whiteSpaceScore: moment.whiteSpaceScore,
      quarter:        moment.quarter,
    },
    pairings: topPairings,
    briefContent,
    campaignName:   reviewContext?.campaignName   ?? null,
    targetQuarter:  reviewContext?.targetQuarter  ?? null,
    inspirationUrls: reviewContext?.inspirationUrls ?? [],
    generatedAt: new Date().toISOString(),
  });
}
