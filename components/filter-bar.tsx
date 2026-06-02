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
      {/* Category pills */}
      <div className="flex gap-1 rounded-full border border-apple-gray-200 bg-white p-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => update("category", cat)}
            className={`px-4 py-1 rounded-full text-sm font-medium transition-colors capitalize cursor-pointer ${
              category === cat
                ? "bg-apple-black text-white"
                : "text-apple-gray-400 hover:text-apple-black"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Date range select */}
      <select
        value={days}
        onChange={(e) => update("days", e.target.value)}
        className="rounded-full border border-apple-gray-200 bg-white px-4 py-1.5 text-sm text-apple-black appearance-none cursor-pointer"
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
