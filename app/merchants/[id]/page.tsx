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

const CATEGORY_STYLES: Record<string, string> = {
  gather:  "bg-gather/10 text-gather",
  improve: "bg-improve/10 text-improve",
  excite:  "bg-excite/10 text-excite",
};

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
    <div className="px-6 py-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <Link href="/merchants" className="text-sm text-apple-gray-400 hover:text-apple-black transition-colors no-underline">
          ← Merchant catalog
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <p className="eyebrow mb-0.5">Partner Network</p>
          <h1>{merchant.name}</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-apple-gray-400">{merchant.category}</span>
            <Link href={`/merchants/${id}/fit`} className="text-sm font-medium text-apple-blue no-underline hover:opacity-80">
              Opportunities →
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/merchants/${id}/fit`} className="btn-outline-apple no-underline">
            Opportunities
          </Link>
          <Link href={`/merchants/${id}/edit`} className="btn-outline-apple no-underline">
            Edit
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
        <div className="card-apple p-6 mb-8 space-y-4">
          {merchant.seasonalNotes && (
            <div>
              <p className="eyebrow mb-1">Seasonal notes</p>
              <p className="text-sm text-apple-black">{merchant.seasonalNotes}</p>
            </div>
          )}
          {merchant.notes && (
            <div className={merchant.seasonalNotes ? "section-rule" : ""}>
              <p className="eyebrow mb-1">Notes</p>
              <p className="text-sm text-apple-gray-600">{merchant.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Top moments table */}
      <div>
        <div className="flex items-baseline gap-2 mb-4">
          <p className="eyebrow">Top moments</p>
          <span className="text-xs text-apple-gray-400">({pairings.length})</span>
        </div>

        {pairings.length === 0 ? (
          <div className="card-apple p-8 text-center">
            <p className="text-sm text-apple-gray-400">No moments paired with this merchant yet.</p>
          </div>
        ) : (
          <div className="card-apple overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-apple-gray-100 bg-apple-gray-50">
                  <th className="py-3 px-4 text-left eyebrow">Moment</th>
                  <th className="py-3 px-4 text-left eyebrow">Date</th>
                  <th className="py-3 px-4 text-left eyebrow">Category</th>
                  <th className="py-3 px-4 text-left eyebrow">Score</th>
                  <th className="py-3 px-4 text-left eyebrow">Campaign angle</th>
                </tr>
              </thead>
              <tbody>
                {pairings.map((p) => {
                  const catStyle = CATEGORY_STYLES[p.momentCategory] ?? "bg-apple-gray-100 text-apple-gray-600";
                  return (
                    <tr key={p.id} className="border-b border-apple-gray-100 last:border-0 hover:bg-apple-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-apple-black">
                        <Link href={`/moments/${p.momentId}`} className="hover:text-apple-blue transition-colors no-underline">
                          {p.momentName}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-sm text-apple-gray-400 whitespace-nowrap">
                        {formatDate(p.momentStartDate)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge-apple capitalize ${catStyle}`}>{p.momentCategory}</span>
                      </td>
                      <td className="py-3 px-4">
                        <ScoreBadge score={p.relevanceScore} />
                      </td>
                      <td className="py-3 px-4 text-sm text-apple-gray-600 max-w-xs truncate">
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
