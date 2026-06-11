import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { moments, pairingScores, merchants } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { MomentDetailFull } from "@/components/moment-detail-full";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const moment = await db.query.moments.findFirst({ where: eq(moments.id, id) });
  return { title: moment?.name ?? "Moment" };
}

export default async function MomentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const moment = await db.query.moments.findFirst({ where: eq(moments.id, id) });
  if (!moment) notFound();

  const pairings = await db
    .select({
      id: pairingScores.id,
      merchantId: pairingScores.merchantId,
      merchantName: merchants.name,
      merchantCategory: merchants.category,
      merchantPartnerStatus: merchants.partnerStatus,
      relevanceScore: pairingScores.relevanceScore,
      campaignAngle: pairingScores.campaignAngle,
      rationale: pairingScores.rationale,
    })
    .from(pairingScores)
    .innerJoin(merchants, eq(pairingScores.merchantId, merchants.id))
    .where(eq(pairingScores.momentId, id))
    .orderBy(desc(pairingScores.relevanceScore));

  return (
    <MomentDetailFull
      moment={{
        id: moment.id,
        name: moment.name,
        startDate: moment.startDate,
        endDate: moment.endDate,
        category: moment.category,
        description: moment.description,
        hook: moment.hook,
        quarter: moment.quarter,
        score: moment.score,
        ecommerceScore: moment.ecommerceScore,
        audienceFit: moment.audienceFit,
        whiteSpaceScore: moment.whiteSpaceScore,
        scoreRationale: moment.scoreRationale,
        channelRecommendations: moment.channelRecommendations,
        notes: moment.notes,
      }}
      initialPairings={pairings}
    />
  );
}
