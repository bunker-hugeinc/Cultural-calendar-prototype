"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type PairingStatus = "draft" | "in_review" | "approved" | "live";

const CHIPS: { key: PairingStatus | "all"; label: string; bg: string; txt: string; border: string }[] = [
  { key: "all",      label: "All",       bg: "#f4f4f5", txt: "#52525b", border: "#e4e4e7" },
  { key: "draft",    label: "Draft",     bg: "#f4f4f5", txt: "#52525b", border: "#e4e4e7" },
  { key: "in_review",label: "In Review", bg: "#fef9c3", txt: "#854d0e", border: "#fde047" },
  { key: "approved", label: "Approved",  bg: "#dbeafe", txt: "#1e40af", border: "#93c5fd" },
  { key: "live",     label: "Live ✓",    bg: "#dcfce7", txt: "#15803d", border: "#86efac" },
];

const MONO = `"SF Pro Mono","SFMono-Regular",ui-monospace,monospace`;

interface Counts {
  draft: number;
  in_review: number;
  approved: number;
  live: number;
}

export function PairingStatsStrip() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeStatus = searchParams.get("pairingStatus") ?? "all";

  useEffect(() => {
    fetch("/api/pairings/stats")
      .then(r => r.json())
      .then(d => setCounts(d))
      .catch(() => {});
  }, []);

  function handleClick(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "all") {
      params.delete("pairingStatus");
    } else {
      params.set("pairingStatus", key);
    }
    router.push(`/?${params.toString()}`);
  }

  if (!counts) return null;

  const countFor = (key: string) => key === "all"
    ? Object.values(counts).reduce((a, b) => a + b, 0)
    : counts[key as keyof Counts] ?? 0;

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Eyebrow label so it's clear these are pairing counts, not moment counts */}
      <div style={{
        fontFamily: MONO,
        fontSize: 8,
        fontWeight: 500,
        letterSpacing: ".2em",
        textTransform: "uppercase",
        color: "#b0b0ba",
        marginBottom: 8,
      }}>
        Campaign Pairing Status · click to filter moments
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {CHIPS.map(chip => {
        const active = activeStatus === chip.key;
        const count = countFor(chip.key);
        return (
          <button
            key={chip.key}
            onClick={() => handleClick(chip.key)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "6px 12px",
              borderRadius: 8,
              border: `1px solid ${active ? chip.txt + "66" : chip.border}`,
              background: active ? chip.bg : "#fff",
              cursor: "pointer",
              transition: "all .15s",
              boxShadow: active ? `0 0 0 2px ${chip.txt}22` : "none",
            }}
          >
            <span style={{
              fontFamily: MONO,
              fontSize: 16,
              fontWeight: 700,
              color: chip.txt,
              lineHeight: 1,
            }}>
              {count}
            </span>
            <span style={{
              fontFamily: MONO,
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              color: active ? chip.txt : "#6e6e80",
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
