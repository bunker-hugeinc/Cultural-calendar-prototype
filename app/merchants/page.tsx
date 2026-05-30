import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { merchants, pairingScores } from "@/lib/db/schema";
import { eq, and, gte, asc } from "drizzle-orm";

export const metadata: Metadata = { title: "Merchants" };
import { MerchantCard } from "@/components/merchant-card";
import { MerchantFilterBar } from "@/components/merchant-filter-bar";

export default async function MerchantsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const categoryFilter = category ?? "All";

  const allMerchants = await db.select().from(merchants).orderBy(asc(merchants.name));

  const filtered =
    categoryFilter === "All"
      ? allMerchants
      : allMerchants.filter((m) => m.category === categoryFilter);

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
            {categoryFilter !== "All" ? ` in ${categoryFilter}` : ""}
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
          <MerchantFilterBar />
        </Suspense>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg font-medium">No merchants found</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different category filter.</p>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
