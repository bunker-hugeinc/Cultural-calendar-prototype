"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Counts {
  total: number;
  draft: number;
  in_review: number;
  approved: number;
  live: number;
}

const SEGMENTS: { label: string; key: keyof Counts | null; filter: string | null }[] = [
  { label: "ALL PAIRINGS", key: "total",     filter: null       },
  { label: "DRAFT",        key: "draft",     filter: "draft"    },
  { label: "IN REVIEW",    key: "in_review", filter: "in_review"},
  { label: "APPROVED",     key: "approved",  filter: "approved" },
  { label: "LIVE",         key: "live",      filter: "live"     },
];

export function PairingStatsStrip() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeFilter = searchParams.get("pairingStatus") ?? null;

  useEffect(() => {
    fetch("/api/pairings/stats")
      .then(r => r.json())
      .then(d => setCounts(d))
      .catch(() => {});
  }, []);

  function handleClick(filter: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === null || activeFilter === filter) {
      params.delete("pairingStatus");
    } else {
      params.set("pairingStatus", filter);
    }
    router.push(`/?${params.toString()}`);
  }

  if (!counts) return null;

  return (
    <div style={{ display: "flex", gap: 1, marginBottom: 24, background: "white", borderRadius: 16, border: "1px solid #e8e8ed", overflow: "hidden" }}>
      {SEGMENTS.map(({ label, key, filter }, i) => {
        const value = key ? counts[key] : 0;
        const isActive = filter === null ? activeFilter === null : activeFilter === filter;
        return (
          <button
            key={label}
            onClick={() => handleClick(filter)}
            style={{
              flex: 1, padding: "16px 12px", border: "none",
              background: isActive ? "#f5f5f7" : "white",
              borderBottom: isActive ? "2px solid #1d1d1f" : "2px solid transparent",
              borderRight: i < SEGMENTS.length - 1 ? "1px solid #e8e8ed" : "none",
              cursor: "pointer", fontFamily: "inherit", textAlign: "center",
              transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1d1d1f", lineHeight: 1 }}>{value}</div>
            <div className="eyebrow" style={{ marginTop: 4 }}>{label}</div>
          </button>
        );
      })}
    </div>
  );
}
