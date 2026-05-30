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

const CAT_COLORS: Record<string, string> = {
  gather:  "bg-green-100 text-green-700",
  improve: "bg-pink-100 text-pink-700",
  excite:  "bg-blue-100 text-blue-700",
};

const MONO = `"SF Pro Mono","SFMono-Regular",ui-monospace,monospace`;

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 7 ? "bg-green-100 text-green-700 border-green-200"
    : score >= 4 ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-red-100 text-red-700 border-red-200";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${color}`}
      style={{ fontFamily: MONO }}>
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
    <div className="px-6 py-8 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href={`/merchants/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← {merchant.name}
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-2"
          style={{ fontFamily: MONO }}>
          Campaign Opportunities
        </p>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {merchant.name} — Best Moments
        </h1>
        <p className="text-sm text-muted-foreground">
          Upcoming cultural moments sorted by Apple Pay relevance score
        </p>
      </div>

      {opportunities.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-base font-medium text-foreground mb-2">No scored opportunities yet</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Go to a moment detail page and click{" "}
            <span className="font-medium text-foreground">"Score Against Merchants"</span>{" "}
            to generate opportunities for this merchant.
          </p>
        </div>
      ) : (
        <>
          {/* Score distribution */}
          <div className="flex gap-4 mb-6 flex-wrap">
            {[
              { label: "High fit",   value: high,   desc: "Score ≥ 7", color: "border-green-200 bg-green-50 text-green-700" },
              { label: "Medium fit", value: medium, desc: "Score 4–6",  color: "border-amber-200 bg-amber-50 text-amber-700" },
              { label: "Low fit",    value: low,    desc: "Score < 4",  color: "border-red-200 bg-red-50 text-red-700" },
            ].map(chip => (
              <div key={chip.label}
                className={`flex items-center gap-3 rounded-xl border px-5 py-3 ${chip.color}`}>
                <span className="text-2xl font-bold" style={{ fontFamily: MONO }}>{chip.value}</span>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide">{chip.label}</div>
                  <div className="text-xs opacity-70">{chip.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Opportunities table */}
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Moment</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Days Away</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Score</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Campaign Angle</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((o, i) => {
                  const catColor = CAT_COLORS[o.category] ?? "bg-gray-100 text-gray-700";
                  const truncated = o.campaignAngle.length > 80
                    ? o.campaignAngle.slice(0, 79) + "…"
                    : o.campaignAngle;
                  return (
                    <tr key={o.momentId}
                      className={`border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="py-3 px-4 text-sm font-semibold">
                        <Link href={`/moments/${o.momentId}`}
                          className="hover:text-blue-600 transition-colors">
                          {o.momentName}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${catColor}`}>
                          {o.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground whitespace-nowrap">
                        {dateRange(o.startDate, o.endDate)}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground whitespace-nowrap"
                        style={{ fontFamily: MONO, fontSize: 11 }}>
                        {daysLabel(o.daysUntil)}
                      </td>
                      <td className="py-3 px-4">
                        <ScorePill score={o.relevanceScore} />
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs"
                        title={o.campaignAngle}>
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
