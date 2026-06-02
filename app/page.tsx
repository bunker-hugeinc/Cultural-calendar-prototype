import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { moments, pairingScores, merchants } from "@/lib/db/schema";
import { eq, and, gte, lte, asc, inArray } from "drizzle-orm";
import { MomentCard } from "@/components/moment-card";
import { FilterBar } from "@/components/filter-bar";
import { PairingStatsStrip } from "@/components/pairing-stats-strip";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr: string, n: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function daysDiff(dateStr: string, from: string) {
  const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d).getTime(); };
  return Math.round((parse(dateStr) - parse(from)) / 86400000);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; days?: string; pairingStatus?: string }>;
}) {
  const { category, days, pairingStatus } = await searchParams;
  const categoryFilter = category ?? "All";
  const daysFilter = parseInt(days ?? "90", 10);
  const pairingStatusFilter = pairingStatus ?? null;

  const today = todayStr();
  const cutoff = addDays(today, daysFilter);

  // If filtering by pairingStatus, first find which momentIds have pairings in that status
  let statusMomentIds: string[] | null = null;
  if (pairingStatusFilter) {
    const statusRows = await db
      .select({ momentId: pairingScores.momentId })
      .from(pairingScores)
      .where(eq(pairingScores.status, pairingStatusFilter));
    statusMomentIds = [...new Set(statusRows.map(r => r.momentId))];
  }

  // Fetch moments in range
  const conditions = [gte(moments.startDate, today), lte(moments.startDate, cutoff)];
  if (categoryFilter !== "All") conditions.push(eq(moments.category, categoryFilter));
  if (statusMomentIds !== null && statusMomentIds.length > 0) {
    conditions.push(inArray(moments.id, statusMomentIds));
  }

  const rows =
    statusMomentIds !== null && statusMomentIds.length === 0
      ? [] // No moments match the status filter
      : await db
          .select()
          .from(moments)
          .where(and(...conditions))
          .orderBy(asc(moments.startDate));

  // Fetch top 3 pairings per moment
  const allPairings =
    rows.length > 0
      ? await db
          .select({
            momentId: pairingScores.momentId,
            merchantName: merchants.name,
            relevanceScore: pairingScores.relevanceScore,
          })
          .from(pairingScores)
          .innerJoin(merchants, eq(pairingScores.merchantId, merchants.id))
          .orderBy(asc(pairingScores.relevanceScore))
      : [];

  const pairingsByMoment: Record<string, { merchantName: string; relevanceScore: number }[]> = {};
  for (const p of allPairings) {
    if (!pairingsByMoment[p.momentId]) pairingsByMoment[p.momentId] = [];
    pairingsByMoment[p.momentId].push({ merchantName: p.merchantName, relevanceScore: p.relevanceScore });
  }
  for (const id of Object.keys(pairingsByMoment)) {
    pairingsByMoment[id].sort((a, b) => b.relevanceScore - a.relevanceScore);
    pairingsByMoment[id] = pairingsByMoment[id].slice(0, 3);
  }

  return (
    <div className="px-6 py-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="eyebrow mb-1">Campaign Planning</p>
          <h1>Upcoming Moments</h1>
          <p className="text-sm text-apple-gray-400 mt-1">
            {rows.length} moment{rows.length !== 1 ? "s" : ""} in range
          </p>
        </div>
        <Link href="/moments/new" className="btn-primary-apple">
          + Add Moment
        </Link>
      </div>

      {/* Pairing status strip */}
      <Suspense>
        <PairingStatsStrip />
      </Suspense>

      {/* Filters */}
      <div className="mb-8">
        <Suspense>
          <FilterBar />
        </Suspense>
      </div>

      {/* Grid */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg font-semibold text-apple-black">No moments in this range</p>
          <p className="text-sm text-apple-gray-400 mt-2">
            {pairingStatusFilter
              ? `No moments have pairings with status "${pairingStatusFilter.replace("_", " ")}".`
              : "Try expanding the date range or changing the category filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((m) => (
            <MomentCard
              key={m.id}
              id={m.id}
              name={m.name}
              startDate={m.startDate}
              endDate={m.endDate}
              category={m.category}
              daysAway={daysDiff(m.startDate, today)}
              topPairings={pairingsByMoment[m.id] ?? []}
              audienceRelevance={m.audienceRelevance}
              productConnection={m.productConnection}
              partnerAlignment={m.partnerAlignment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
