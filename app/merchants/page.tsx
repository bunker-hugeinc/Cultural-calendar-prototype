import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { merchants, pairingScores } from "@/lib/db/schema";
import { gte, asc } from "drizzle-orm";
import { MerchantCard } from "@/components/merchant-card";
import { MerchantFilterBar } from "@/components/merchant-filter-bar";

export const metadata: Metadata = { title: "Merchants" };

export default async function MerchantsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; group?: string }>;
}) {
  const { status, group } = await searchParams;
  const statusFilter = status ?? "All";
  const groupFilter = group ?? "All Groups";

  const allMerchants = await db.select().from(merchants).orderBy(asc(merchants.name));

  // Build status counts for the filter bar badges
  const statusCounts: Record<string, number> = {};
  for (const m of allMerchants) {
    const s = m.partnerStatus ?? "existing";
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }

  // Apply filters
  const filtered = allMerchants.filter((m) => {
    const matchStatus = statusFilter === "All" || (m.partnerStatus ?? "existing") === statusFilter;
    const matchGroup = groupFilter === "All Groups" || m.partnerGroup === groupFilter;
    return matchStatus && matchGroup;
  });

  // Count high-relevance pairings (score >= 7) per merchant
  const highRelevancePairings = await db
    .select({ merchantId: pairingScores.merchantId })
    .from(pairingScores)
    .where(gte(pairingScores.relevanceScore, 7));

  const countMap: Record<string, number> = {};
  for (const p of highRelevancePairings) {
    countMap[p.merchantId] = (countMap[p.merchantId] ?? 0) + 1;
  }

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Merchant Catalog</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} merchant{filtered.length !== 1 ? "s" : ""}
            {statusFilter !== "All" ? ` · ${statusFilter}` : ""}
            {groupFilter !== "All Groups" ? ` · ${groupFilter}` : ""}
          </p>
        </div>
        <Link
          href="/merchants/new"
          className="inline-flex items-center rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:bg-foreground/80 transition-colors"
        >
          + Add Merchant
        </Link>
      </div>

      <div className="mb-6">
        <Suspense>
          <MerchantFilterBar statusCounts={statusCounts} />
        </Suspense>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg font-medium">No merchants found</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different filter combination.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((m) => (
            <MerchantCard
              key={m.id}
              id={m.id}
              name={m.name}
              category={m.category}
              highRelevanceCount={countMap[m.id] ?? 0}
              partnerStatus={m.partnerStatus ?? "existing"}
              partnerGroup={m.partnerGroup}
            />
          ))}
        </div>
      )}
    </div>
  );
}
