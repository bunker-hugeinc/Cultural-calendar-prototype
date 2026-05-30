import Link from "next/link";

interface MerchantCardProps {
  id: string;
  name: string;
  category: string;
  highRelevanceCount: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Floral": "bg-pink-100 text-pink-700",
  "Beauty": "bg-rose-100 text-rose-700",
  "Apparel & Footwear": "bg-indigo-100 text-indigo-700",
  "Apparel": "bg-indigo-100 text-indigo-700",
  "Activewear": "bg-cyan-100 text-cyan-700",
  "Sneakers & Apparel": "bg-violet-100 text-violet-700",
  "Footwear": "bg-violet-100 text-violet-700",
  "Retail": "bg-blue-100 text-blue-700",
  "Electronics": "bg-sky-100 text-sky-700",
  "Food Delivery": "bg-orange-100 text-orange-700",
  "Grocery Delivery": "bg-green-100 text-green-700",
  "Dining": "bg-amber-100 text-amber-700",
  "Coffee & Dining": "bg-yellow-100 text-yellow-700",
  "Travel": "bg-teal-100 text-teal-700",
  "Travel & Lodging": "bg-teal-100 text-teal-700",
  "Rides": "bg-slate-100 text-slate-700",
  "Entertainment": "bg-purple-100 text-purple-700",
  "Sports Betting": "bg-red-100 text-red-700",
  "Sports Merch": "bg-red-100 text-red-700",
  "Home & Furniture": "bg-lime-100 text-lime-700",
  "Home Improvement": "bg-lime-100 text-lime-700",
  "Toys & Entertainment": "bg-fuchsia-100 text-fuchsia-700",
  "Social/Media": "bg-gray-100 text-gray-700",
  "Gifts & Marketplace": "bg-pink-100 text-pink-700",
};

export function MerchantCard({ id, name, category, highRelevanceCount }: MerchantCardProps) {
  const color = CATEGORY_COLORS[category] ?? "bg-gray-100 text-gray-700";

  return (
    <Link href={`/merchants/${id}`} className="block group">
      <div className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-snug group-hover:text-blue-600 transition-colors">{name}</h3>
          <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
            {category}
          </span>
        </div>
        <div className="mt-auto pt-2 border-t text-xs text-muted-foreground">
          {highRelevanceCount > 0 ? (
            <span>
              <span className="font-medium text-green-700">{highRelevanceCount}</span> high-relevance moment{highRelevanceCount !== 1 ? "s" : ""}
            </span>
          ) : (
            <span>No high-relevance moments</span>
          )}
        </div>
      </div>
    </Link>
  );
}
