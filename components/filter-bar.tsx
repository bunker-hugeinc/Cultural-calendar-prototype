"use client";

import { useRouter, useSearchParams } from "next/navigation";

const CATEGORIES = ["All", "gather", "improve", "excite"];
const DATE_RANGES = [
  { label: "Next 30 days", value: "30" },
  { label: "Next 60 days", value: "60" },
  { label: "Next 90 days", value: "90" },
];

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "All";
  const days = searchParams.get("days") ?? "90";

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex gap-1 rounded-lg border bg-white p-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => update("category", cat)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors capitalize ${
              category === cat
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <select
        value={days}
        onChange={(e) => update("days", e.target.value)}
        className="rounded-lg border bg-white px-3 py-1.5 text-sm text-foreground"
      >
        {DATE_RANGES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
    </div>
  );
}
