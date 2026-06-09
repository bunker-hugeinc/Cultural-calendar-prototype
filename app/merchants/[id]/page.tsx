import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { merchants, pairingScores, moments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { MerchantDetailFull } from "@/components/merchant-detail-full";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const merchant = await db.query.merchants.findFirst({ where: eq(merchants.id, id) });
  return { title: merchant?.name ?? "Merchant" };
}

export default async function MerchantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const merchant = await db.query.merchants.findFirst({ where: eq(merchants.id, id) });
  if (!merchant) notFound();

  const pairings = await db
    .select({
      id: pairingScores.id,
      momentId: pairingScores.momentId,
      momentName: moments.name,
      momentStartDate: moments.startDate,
      momentCategory: moments.category,
      relevanceScore: pairingScores.relevanceScore,
      campaignAngle: pairingScores.campaignAngle,
    })
    .from(pairingScores)
    .innerJoin(moments, eq(pairingScores.momentId, moments.id))
    .where(eq(pairingScores.merchantId, id))
    .orderBy(desc(pairingScores.relevanceScore));

  return (
    <MerchantDetailFull
      merchant={{
        id: merchant.id,
        name: merchant.name,
        category: merchant.category,
        partnerGroup: merchant.partnerGroup,
        partnerStatus: merchant.partnerStatus,
        seasonalNotes: merchant.seasonalNotes,
        notes: merchant.notes,
        merchantSignals: merchant.merchantSignals,
        pastCampaignNotes: merchant.pastCampaignNotes,
      }}
      initialPairings={pairings}
    />
  );
}
