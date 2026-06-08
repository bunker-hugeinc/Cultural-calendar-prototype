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

  const CAT_COLORS: Record<string, string> = {
    gather: "#248a3d", improve: "#b03060", excite: "#0071e3",
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      {/* Category chips */}
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => update("category", cat)}
          className={`chip${category === cat ? " chip-on" : ""}`}
        >
          {cat !== "All" && (
            <span style={{
              width: 7, height: 7, borderRadius: "50%", flexShrink: 0, display: "inline-block",
              background: category === cat ? "white" : (CAT_COLORS[cat] ?? "#86868b"),
            }} />
          )}
          {cat === "All" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
        </button>
      ))}

      {/* Date range chips */}
      {DATE_RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => update("days", r.value)}
          className={`chip${days === r.value ? " chip-on" : ""}`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
