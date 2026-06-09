import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { pitches, pitchMoments, pitchMerchants, moments, merchants } from "@/lib/db/schema";
import { eq, inArray, asc } from "drizzle-orm";
import { PitchDetailClient } from "@/components/pitch-detail-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const pitch = await db.query.pitches.findFirst({ where: eq(pitches.id, id) });
  return { title: pitch?.title ?? "Pitch" };
}

export default async function PitchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const pitch = await db.query.pitches.findFirst({ where: eq(pitches.id, id) });
  if (!pitch) notFound();

  const [momentLinks, merchantLinks] = await Promise.all([
    db.select({ momentId: pitchMoments.momentId, isPrimary: pitchMoments.isPrimary })
      .from(pitchMoments).where(eq(pitchMoments.pitchId, id)),
    db.select({ merchantId: pitchMerchants.merchantId, isPrimary: pitchMerchants.isPrimary })
      .from(pitchMerchants).where(eq(pitchMerchants.pitchId, id)),
  ]);

  const momentIds = momentLinks.map(l => l.momentId);
  const merchantIds = merchantLinks.map(l => l.merchantId);

  const [momentRows, merchantRows, allMomentsRows, allMerchantsRows] = await Promise.all([
    momentIds.length ? db.select({ id: moments.id, name: moments.name, startDate: moments.startDate, category: moments.category, ecommerceScore: moments.ecommerceScore, audienceFit: moments.audienceFit, whiteSpaceScore: moments.whiteSpaceScore }).from(moments).where(inArray(moments.id, momentIds)) : Promise.resolve([]),
    merchantIds.length ? db.select({ id: merchants.id, name: merchants.name, category: merchants.category, partnerGroup: merchants.partnerGroup, merchantSignals: merchants.merchantSignals }).from(merchants).where(inArray(merchants.id, merchantIds)) : Promise.resolve([]),
    db.select({ id: moments.id, name: moments.name, startDate: moments.startDate }).from(moments).orderBy(asc(moments.startDate)),
    db.select({ id: merchants.id, name: merchants.name, category: merchants.category }).from(merchants).orderBy(asc(merchants.name)),
  ]);

  const pitchData = {
    id: pitch.id,
    title: pitch.title,
    type: pitch.type,
    status: pitch.status,
    situation: pitch.situation,
    campaignConcept: pitch.campaignConcept,
    campaignHeadline: pitch.campaignHeadline,
    keyMessages: pitch.keyMessages,
    channelStrategy: pitch.channelStrategy,
    influencerStrategy: pitch.influencerStrategy,
    nextSteps: pitch.nextSteps,
    targetQuarter: pitch.targetQuarter,
    moments: momentRows.map(m => ({
      ...m,
      isPrimary: momentLinks.find(l => l.momentId === m.id)?.isPrimary ?? false,
    })),
    merchants: merchantRows.map(m => ({
      ...m,
      isPrimary: merchantLinks.find(l => l.merchantId === m.id)?.isPrimary ?? false,
    })),
  };

  return (
    <PitchDetailClient
      pitch={pitchData}
      allMoments={allMomentsRows}
      allMerchants={allMerchantsRows}
    />
  );
}
