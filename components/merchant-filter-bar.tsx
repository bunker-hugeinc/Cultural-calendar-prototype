"use client";

import { useRouter, useSearchParams } from "next/navigation";

const STATUSES = [
  { value: "All", label: "All" },
  { value: "existing", label: "Existing" },
  { value: "potential", label: "Potential" },
  { value: "in_review", label: "In Review" },
  { value: "approved", label: "Approved" },
  { value: "dismissed", label: "Dismissed" },
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
    <div className="space-y-2">
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
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                active
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s.label}
              <span className={`inline-flex items-center justify-center rounded-full text-xs px-1.5 py-0.5 min-w-[1.25rem] ${
                active ? "bg-background/20 text-background" : "bg-background text-foreground"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {GROUPS.map((g) => {
          const active = group === g;
          return (
            <button
              key={g}
              onClick={() => update("group", g)}
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-foreground/80 text-background"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
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
