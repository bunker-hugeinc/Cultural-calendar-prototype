import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { merchants, pairingScores, moments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const merchant = await db.query.merchants.findFirst({ where: eq(merchants.id, id) });
  return { title: merchant ? `${merchant.name} — Opportunities` : "Opportunities" };
}

function formatDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function dateRange(start: string, end: string | null) {
  if (!end || end === start) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function daysLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 30)  return `in ${days} days`;
  const months = Math.round(days / 30);
  return `in ${months} month${months > 1 ? "s" : ""}`;
}

const CAT_STYLES: Record<string, string> = {
  gather:  "bg-gather/10 text-gather",
  improve: "bg-improve/10 text-improve",
  excite:  "bg-excite/10 text-excite",
};

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 7 ? "text-apple-green"
    : score >= 4 ? "text-apple-amber"
    : "text-apple-red";
  return (
    <span className={`text-xs font-semibold tabular-nums ${color}`}>
      {score.toFixed(1)}
    </span>
  );
}

export default async function MerchantFitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const merchant = await db.query.merchants.findFirst({ where: eq(merchants.id, id) });
  if (!merchant) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const todayMs = new Date(today).getTime();

  const rows = await db
    .select({
      momentId:       moments.id,
      momentName:     moments.name,
      startDate:      moments.startDate,
      endDate:        moments.endDate,
      category:       moments.category,
      relevanceScore: pairingScores.relevanceScore,
      campaignAngle:  pairingScores.campaignAngle,
      rationale:      pairingScores.rationale,
    })
    .from(pairingScores)
    .innerJoin(moments, eq(pairingScores.momentId, moments.id))
    .where(eq(pairingScores.merchantId, id))
    .orderBy(desc(pairingScores.relevanceScore));

  const opportunities = rows
    .filter(r => new Date(r.endDate ?? r.startDate).getTime() >= todayMs)
    .map(r => ({
      ...r,
      daysUntil: Math.max(0, Math.round((new Date(r.startDate).getTime() - todayMs) / 86400000)),
    }));

  const high   = opportunities.filter(o => o.relevanceScore >= 7).length;
  const medium = opportunities.filter(o => o.relevanceScore >= 4 && o.relevanceScore < 7).length;
  const low    = opportunities.filter(o => o.relevanceScore < 4).length;

  return (
    <div className="px-6 py-10 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-8">
        <Link href={`/merchants/${id}`} className="text-sm text-apple-gray-400 hover:text-apple-black transition-colors no-underline">
          ← {merchant.name}
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <p className="eyebrow mb-1">Campaign opportunities</p>
        <h1>{merchant.name} — Best moments</h1>
        <p className="text-sm text-apple-gray-400 mt-1">
          Upcoming cultural moments sorted by Apple Pay relevance score
        </p>
      </div>

      {opportunities.length === 0 ? (
        <div className="card-apple p-12 text-center">
          <p className="text-base font-semibold text-apple-black mb-2">No scored opportunities yet</p>
          <p className="text-sm text-apple-gray-400 max-w-md mx-auto">
            Go to a moment detail page and click{" "}
            <span className="font-medium text-apple-black">"Score Against Merchants"</span>{" "}
            to generate opportunities for this merchant.
          </p>
        </div>
      ) : (
        <>
          {/* Score distribution */}
          <div className="flex gap-3 mb-6 flex-wrap">
            {[
              { label: "High fit",   value: high,   desc: "Score ≥ 7", color: "border-apple-green/30 bg-apple-green/5 text-apple-green" },
              { label: "Medium fit", value: medium, desc: "Score 4–6",  color: "border-apple-amber/30 bg-apple-amber/5 text-apple-amber" },
              { label: "Low fit",    value: low,    desc: "Score < 4",  color: "border-apple-red/30 bg-apple-red/5 text-apple-red"     },
            ].map(chip => (
              <div key={chip.label} className={`flex items-center gap-3 rounded-2xl border px-5 py-3 ${chip.color}`}>
                <span className="text-2xl font-bold tabular-nums">{chip.value}</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide">{chip.label}</p>
                  <p className="text-xs opacity-70">{chip.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Opportunities table */}
          <div className="card-apple overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-apple-gray-100 bg-apple-gray-50">
                  <th className="py-3 px-4 text-left eyebrow">Moment</th>
                  <th className="py-3 px-4 text-left eyebrow">Category</th>
                  <th className="py-3 px-4 text-left eyebrow">Date</th>
                  <th className="py-3 px-4 text-left eyebrow">Days away</th>
                  <th className="py-3 px-4 text-left eyebrow">Score</th>
                  <th className="py-3 px-4 text-left eyebrow">Campaign angle</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((o) => {
                  const catStyle = CAT_STYLES[o.category] ?? "bg-apple-gray-100 text-apple-gray-600";
                  const truncated = o.campaignAngle.length > 80 ? o.campaignAngle.slice(0, 79) + "…" : o.campaignAngle;
                  return (
                    <tr key={o.momentId} className="border-b border-apple-gray-100 last:border-0 hover:bg-apple-gray-50 transition-colors cursor-pointer">
                      <td className="py-3 px-4 text-sm font-semibold text-apple-black">
                        <Link href={`/moments/${o.momentId}`} className="hover:text-apple-blue transition-colors no-underline">
                          {o.momentName}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge-apple capitalize ${catStyle}`}>{o.category}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-apple-gray-400 whitespace-nowrap">
                        {dateRange(o.startDate, o.endDate)}
                      </td>
                      <td className="py-3 px-4 text-xs text-apple-gray-400 tabular-nums whitespace-nowrap">
                        {daysLabel(o.daysUntil)}
                      </td>
                      <td className="py-3 px-4">
                        <ScorePill score={o.relevanceScore} />
                      </td>
                      <td className="py-3 px-4 text-sm text-apple-gray-600 max-w-xs" title={o.campaignAngle}>
                        {truncated}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
