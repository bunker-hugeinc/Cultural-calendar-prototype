import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { moments, pairingScores, merchants } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { MomentDetailClient } from "@/components/moment-detail-client";
import { BriefExport } from "@/components/brief-export";
import { SubScoreCard } from "@/components/sub-score-card";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const moment = await db.query.moments.findFirst({ where: eq(moments.id, id) });
  return { title: moment?.name ?? "Moment" };
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

const CATEGORY_STYLES: Record<string, string> = {
  gather:  "bg-gather/10 text-gather",
  improve: "bg-improve/10 text-improve",
  excite:  "bg-excite/10 text-excite",
};

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
      relevanceScore: pairingScores.relevanceScore,
      campaignAngle: pairingScores.campaignAngle,
      rationale: pairingScores.rationale,
    })
    .from(pairingScores)
    .innerJoin(merchants, eq(pairingScores.merchantId, merchants.id))
    .where(eq(pairingScores.momentId, id))
    .orderBy(desc(pairingScores.relevanceScore));

  const [{ merchantCount }] = await db.select({ merchantCount: count() }).from(merchants);

  const categoryStyle = CATEGORY_STYLES[moment.category] ?? "bg-apple-gray-100 text-apple-gray-600";
  const dateRange = moment.endDate && moment.endDate !== moment.startDate
    ? `${formatDate(moment.startDate)} – ${formatDate(moment.endDate)}`
    : formatDate(moment.startDate);

  return (
    <div className="px-6 py-10 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-8">
        <Link href="/" className="text-sm text-apple-gray-400 hover:text-apple-black transition-colors no-underline">
          ← Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">{moment.category}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <h1>{moment.name}</h1>
            <span className={`badge-apple capitalize ${categoryStyle}`}>
              {moment.category}
            </span>
          </div>
          <p className="text-sm text-apple-gray-400">{dateRange}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <BriefExport momentId={id} />
          <Link href={`/moments/${id}/edit`} className="btn-outline-apple no-underline">
            Edit
          </Link>
        </div>
      </div>

      {/* Details card */}
      <div className="card-apple p-6 mb-6">
        <div className="grid grid-cols-1 gap-5">
          <div>
            <p className="eyebrow mb-1">Description</p>
            <p className="text-sm text-apple-black leading-relaxed">{moment.description}</p>
          </div>

          <div className="flex flex-wrap gap-8 section-rule">
            {moment.hook && (
              <div>
                <p className="eyebrow mb-1">Hook Type</p>
                <p className="text-sm text-apple-black">{moment.hook}</p>
              </div>
            )}
            {moment.score != null && (
              <div>
                <p className="eyebrow mb-1">Signal Score</p>
                <p className="text-sm font-semibold text-apple-black">{moment.score}/5</p>
              </div>
            )}
          </div>

          {moment.notes && (
            <div className="section-rule">
              <p className="eyebrow mb-1">Notes</p>
              <p className="text-sm text-apple-gray-600">{moment.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sub-scores */}
      <SubScoreCard
        momentId={id}
        ecommerceScore={moment.ecommerceScore ?? null}
        audienceFit={moment.audienceFit ?? null}
        whiteSpaceScore={moment.whiteSpaceScore ?? null}
        scoreRationale={moment.scoreRationale ?? null}
      />

      {/* Pairings + Influencer — client component */}
      <MomentDetailClient momentId={id} merchantCount={merchantCount} initialPairings={pairings} />
    </div>
  );
}
