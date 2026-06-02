import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { merchants, pairingScores, moments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { ScoreBadge } from "@/components/score-badge";
import { MerchantStatusPanel } from "@/components/merchant-status-panel";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const merchant = await db.query.merchants.findFirst({ where: eq(merchants.id, id) });
  return { title: merchant?.name ?? "Merchant" };
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const CATEGORY_COLORS: Record<string, string> = {
  gather: "bg-blue-100 text-blue-700",
  improve: "bg-purple-100 text-purple-700",
  excite: "bg-orange-100 text-orange-700",
};

export default async function MerchantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/merchants" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Merchant Catalog
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{merchant.name}</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{merchant.category}</span>
            <Link
              href={`/merchants/${id}/fit`}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Opportunities →
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/merchants/${id}/fit`}
            className="shrink-0 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            View Opportunities
          </Link>
          <Link
            href={`/merchants/${id}/edit`}
            className="shrink-0 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Edit Merchant
          </Link>
        </div>
      </div>

      {/* Partner Status Panel */}
      <MerchantStatusPanel
        merchantId={id}
        initialStatus={merchant.partnerStatus ?? "existing"}
        initialGroup={merchant.partnerGroup ?? null}
      />

      {/* Details card */}
      {(merchant.seasonalNotes || merchant.notes) && (
        <div className="rounded-xl border bg-white p-6 mb-8 space-y-4">
          {merchant.seasonalNotes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Seasonal Notes</p>
              <p className="text-sm">{merchant.seasonalNotes}</p>
            </div>
          )}
          {merchant.notes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-muted-foreground">{merchant.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Top moments table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Top Moments
          <span className="ml-2 text-sm font-normal text-muted-foreground">({pairings.length})</span>
        </h2>

        {pairings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No moments paired with this merchant yet.</p>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Moment</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Score</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Campaign Angle</th>
                </tr>
              </thead>
              <tbody>
                {pairings.map((p) => {
                  const catColor = CATEGORY_COLORS[p.momentCategory] ?? "bg-gray-100 text-gray-700";
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium">
                        <Link href={`/moments/${p.momentId}`} className="hover:text-blue-600 transition-colors">
                          {p.momentName}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(p.momentStartDate)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${catColor}`}>
                          {p.momentCategory}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <ScoreBadge score={p.relevanceScore} />
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs truncate">
                        {p.campaignAngle}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
