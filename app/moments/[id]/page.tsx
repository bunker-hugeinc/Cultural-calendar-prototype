import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { moments, pairingScores, merchants } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { ScoreBadge } from "@/components/score-badge";
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

const CATEGORY_COLORS: Record<string, string> = {
  gather: "bg-blue-100 text-blue-700",
  improve: "bg-purple-100 text-purple-700",
  excite: "bg-orange-100 text-orange-700",
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
      status: pairingScores.status,
    })
    .from(pairingScores)
    .innerJoin(merchants, eq(pairingScores.merchantId, merchants.id))
    .where(eq(pairingScores.momentId, id))
    .orderBy(desc(pairingScores.relevanceScore));

  const categoryColor = CATEGORY_COLORS[moment.category] ?? "bg-gray-100 text-gray-700";
  const dateRange = moment.endDate && moment.endDate !== moment.startDate
    ? `${formatDate(moment.startDate)} – ${formatDate(moment.endDate)}`
    : formatDate(moment.startDate);

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold tracking-tight">{moment.name}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${categoryColor}`}>
              {moment.category}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{dateRange}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <BriefExport momentId={id} />
          <Link
            href={`/moments/${id}/edit`}
            className="shrink-0 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Edit Moment
          </Link>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-xl border bg-white p-6 mb-8 space-y-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
          <p className="text-sm">{moment.description}</p>
        </div>
        <div className="flex flex-wrap gap-6">
          {moment.hook && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Hook Type</p>
              <p className="text-sm">{moment.hook}</p>
            </div>
          )}
          {moment.score != null && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">V1 Signal Score</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{moment.score}/5</span>
                <ScoreBadge score={moment.score * 2} />
              </div>
            </div>
          )}
        </div>
        {moment.notes && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-muted-foreground">{moment.notes}</p>
          </div>
        )}
      </div>

      {/* Sub-scores */}
      <SubScoreCard
        momentId={id}
        audienceRelevance={moment.audienceRelevance ?? null}
        productConnection={moment.productConnection ?? null}
        partnerAlignment={moment.partnerAlignment ?? null}
      />

      {/* Pairings — client component handles Score button + refresh */}
      <MomentDetailClient momentId={id} initialPairings={pairings} />
    </div>
  );
}
