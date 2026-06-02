"use client";

import { useRouter, useSearchParams } from "next/navigation";

const STATUSES = [
  { value: "All",       label: "All"        },
  { value: "existing",  label: "Partners"   },
  { value: "potential", label: "Potential"  },
  { value: "in_review", label: "In Review"  },
  { value: "approved",  label: "Approved"   },
  { value: "dismissed", label: "Dismissed"  },
];

const GROUPS = [
  "All Groups",
  "Travel & Staying",
  "Clothing",
  "Delivery & Rides",
  "Big Stores",
  "Sports & Entertainment",
  "Food",
  "Misc",
  "Kids",
];

interface MerchantFilterBarProps {
  statusCounts: Record<string, number>;
}

export function MerchantFilterBar({ statusCounts }: MerchantFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "All";
  const group = searchParams.get("group") ?? "All Groups";

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/merchants?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const count = s.value === "All"
            ? Object.values(statusCounts).reduce((a, b) => a + b, 0)
            : (statusCounts[s.value] ?? 0);
          const active = status === s.value;
          return (
            <button
              key={s.value}
              onClick={() => update("status", s.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                active
                  ? "bg-apple-black text-white"
                  : "border border-apple-gray-200 text-apple-gray-400 hover:text-apple-black hover:border-apple-gray-400"
              }`}
            >
              {s.label}
              <span className={`text-xs tabular-nums font-semibold ${active ? "text-white/70" : "text-apple-gray-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Group pills */}
      <div className="flex flex-wrap gap-1.5">
        {GROUPS.map((g) => {
          const active = group === g;
          return (
            <button
              key={g}
              onClick={() => update("group", g)}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                active
                  ? "bg-apple-black text-white"
                  : "border border-apple-gray-100 text-apple-gray-400 hover:text-apple-black hover:border-apple-gray-200"
              }`}
            >
              {g}
            </button>
          );
        })}
      </div>
    </div>
  );
}
