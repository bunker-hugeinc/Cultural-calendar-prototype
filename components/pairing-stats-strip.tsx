"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type FilterStatus = "in_review" | "approved" | "live";

const CHIPS: { key: FilterStatus; label: string; bg: string; txt: string; border: string }[] = [
  { key: "in_review", label: "In Review", bg: "#fef9c3", txt: "#854d0e", border: "#fde047" },
  { key: "approved",  label: "Approved",  bg: "#dbeafe", txt: "#1e40af", border: "#93c5fd" },
  { key: "live",      label: "Live ✓",    bg: "#dcfce7", txt: "#15803d", border: "#86efac" },
];

const MONO = `"SF Pro Mono","SFMono-Regular",ui-monospace,monospace`;

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
    <div style={{ marginBottom: 20 }}>
      {/* Eyebrow */}
      <div style={{
        fontFamily: MONO,
        fontSize: 8,
        fontWeight: 500,
        letterSpacing: ".2em",
        textTransform: "uppercase",
        color: "#b0b0ba",
        marginBottom: 6,
      }}>
        Moments by Pairing Status — {counts.total} total
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {CHIPS.map(chip => {
          const active = activeStatus === chip.key;
          const count = counts[chip.key];
          return (
            <button
              key={chip.key}
              onClick={() => handleClick(chip.key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                borderRadius: 6,
                border: `1px solid ${active ? chip.txt + "55" : chip.border}`,
                background: active ? chip.bg : "transparent",
                cursor: "pointer",
                transition: "all .15s",
                boxShadow: active ? `0 0 0 2px ${chip.txt}18` : "none",
              }}
            >
              <span style={{
                fontFamily: MONO,
                fontSize: 11,
                fontWeight: 600,
                color: active ? chip.txt : "#71717a",
                lineHeight: 1,
              }}>
                {count}
              </span>
              <span style={{
                fontFamily: MONO,
                fontSize: 8,
                fontWeight: 500,
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: active ? chip.txt : "#a1a1aa",
              }}>
                {chip.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
