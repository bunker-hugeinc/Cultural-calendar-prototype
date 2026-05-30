"use client";

import { useRouter, useSearchParams } from "next/navigation";

const CATEGORIES = [
  "All",
  "Floral", "Beauty", "Apparel & Footwear", "Apparel", "Activewear",
  "Sneakers & Apparel", "Footwear", "Retail", "Electronics",
  "Food Delivery", "Grocery Delivery", "Dining", "Coffee & Dining",
  "Travel", "Travel & Lodging", "Rides", "Entertainment",
  "Sports Betting", "Sports Merch", "Home & Furniture", "Home Improvement",
  "Toys & Entertainment", "Social/Media", "Gifts & Marketplace",
];

export function MerchantFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "All";

  function update(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("category", value);
    router.push(`/merchants?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={category}
        onChange={(e) => update(e.target.value)}
        className="rounded-lg border bg-white px-3 py-1.5 text-sm text-foreground"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}
