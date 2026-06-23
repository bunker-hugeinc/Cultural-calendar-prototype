import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { moments, pairingScores, merchants, pitches, momentMerchants } from "@/lib/db/schema";
import { eq, desc, ne } from "drizzle-orm";
import { MomentDetailFull } from "@/components/moment-detail-full";

export const dynamic = "force-dynamic";

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
      isOfficialSponsor: pairingScores.isOfficialSponsor,
    })
    .from(pairingScores)
    .innerJoin(merchants, eq(pairingScores.merchantId, merchants.id))
    .where(eq(pairingScores.momentId, id))
    .orderBy(desc(pairingScores.relevanceScore));

  // Load all merchants for the "add partner" modal (exclude dismissed)
  const allMerchantsForModal = await db
    .select({ id: merchants.id, name: merchants.name })
    .from(merchants)
    .where(ne(merchants.partnerStatus, "dismissed"))
    .orderBy(merchants.name);

  // Load directly-added partners (not via pitch)
  const directPartners = await db
    .select({
      id: momentMerchants.id,
      merchantId: momentMerchants.merchantId,
      merchantName: merchants.name,
      addedBy: momentMerchants.addedBy,
      notes: momentMerchants.notes,
      activationType: momentMerchants.activationType,
    })
    .from(momentMerchants)
    .innerJoin(merchants, eq(momentMerchants.merchantId, merchants.id))
    .where(eq(momentMerchants.momentId, id));

  const momentPitches = await db
    .select({
      id: pitches.id,
      status: pitches.status,
      targetQuarter: pitches.targetQuarter,
      createdAt: pitches.createdAt,
      updatedAt: pitches.updatedAt,
      merchantName: merchants.name,
      merchantCategory: merchants.category,
    })
    .from(pitches)
    .leftJoin(merchants, eq(pitches.merchantId, merchants.id))
    .where(eq(pitches.momentId, id))
    .orderBy(desc(pitches.updatedAt));

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
        approvedOffer: moment.approvedOffer,
        approvedMerchantId: moment.approvedMerchantId,
        approvedPitchId: moment.approvedPitchId,
      }}
      initialPairings={pairings}
      initialPitches={momentPitches}
      allMerchants={allMerchantsForModal}
      initialDirectPartners={directPartners}
    />
  );
}
