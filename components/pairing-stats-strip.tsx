"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type FilterStatus = "in_review" | "approved" | "live";

const CHIPS: { key: FilterStatus; label: string; activeClass: string }[] = [
  { key: "in_review", label: "In Review", activeClass: "bg-apple-amber/10 text-apple-amber border-apple-amber/30" },
  { key: "approved",  label: "Approved",  activeClass: "bg-apple-blue/10 text-apple-blue border-apple-blue/30"   },
  { key: "live",      label: "Live ✓",    activeClass: "bg-apple-green/10 text-apple-green border-apple-green/30" },
];

interface Counts {
  total: number;
  in_review: number;
  approved: number;
  live: number;
}

export function PairingStatsStrip() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeStatus = searchParams.get("pairingStatus") ?? null;

  useEffect(() => {
    fetch("/api/pairings/stats")
      .then(r => r.json())
      .then(d => setCounts(d))
      .catch(() => {});
  }, []);

  function handleClick(key: FilterStatus) {
    const params = new URLSearchParams(searchParams.toString());
    if (activeStatus === key) {
      params.delete("pairingStatus");
    } else {
      params.set("pairingStatus", key);
    }
    router.push(`/?${params.toString()}`);
  }

  if (!counts) return null;

  return (
    <div className="mb-5">
      <p className="eyebrow mb-2">Moments by Pairing Status — {counts.total} total</p>
      <div className="flex gap-2 flex-wrap">
        {CHIPS.map(chip => {
          const active = activeStatus === chip.key;
          const count = counts[chip.key];
          return (
            <button
              key={chip.key}
              onClick={() => handleClick(chip.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                active
                  ? chip.activeClass
                  : "border-apple-gray-200 text-apple-gray-400 hover:border-apple-gray-400 hover:text-apple-gray-600"
              }`}
            >
              <span className="font-semibold tabular-nums">{count}</span>
              <span className="uppercase tracking-wide text-[10px]">{chip.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
