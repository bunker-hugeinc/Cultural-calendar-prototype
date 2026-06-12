"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export interface PitchRow {
  id: string;
  title: string;
  type: string;
  status: string;
  targetQuarter: string | null;
  updatedAt: string | null;
  primaryMomentName: string | null;
  primaryMerchantName: string | null;
}

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  draft:    { label: "Draft",    bg: "#f5f5f7",             color: "#6e6e73" },
  sent:     { label: "Sent",     bg: "#e3f2fd",             color: "#0071e3" },
  approved: { label: "Approved", bg: "rgba(52,199,89,0.12)", color: "#248a3d" },
  rejected: { label: "Rejected", bg: "rgba(255,59,48,0.1)",  color: "#cc2200" },
  ready:    { label: "Ready",    bg: "rgba(52,199,89,0.12)", color: "#248a3d" },
};

const FILTERS = ["all", "draft", "sent", "approved", "rejected"] as const;
type Filter = (typeof FILTERS)[number];

function formatDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function PitchListClient({ initialPitches }: { initialPitches: PitchRow[] }) {
  const router = useRouter();
  const [pitches, setPitches] = useState<PitchRow[]>(initialPitches);
  const [filter, setFilter] = useState<Filter>("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, id: string, title: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/pitch/${id}`, { method: "DELETE" });
      if (!res.ok) { window.alert("Delete failed. Please try again."); return; }
      setPitches(prev => prev.filter(p => p.id !== id));
      router.refresh();
    } finally {
      setDeleting(null);
    }
  }

  const counts: Record<Filter, number> = {
    all: pitches.length,
    draft: pitches.filter(p => p.status === "draft").length,
    sent: pitches.filter(p => p.status === "sent").length,
    approved: pitches.filter(p => p.status === "approved").length,
    rejected: pitches.filter(p => p.status === "rejected").length,
  };

  const visible = filter === "all" ? pitches : pitches.filter(p => p.status === filter);

  return (
    <>
      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {FILTERS.map(f => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: "0.8rem", fontWeight: 600, padding: "5px 12px", borderRadius: 20,
                border: active ? "1px solid #1d1d1f" : "1px solid #e8e8ed",
                background: active ? "#1d1d1f" : "white",
                color: active ? "white" : "#6e6e73",
                cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
              }}
            >
              {f} <span style={{ opacity: 0.6 }}>{counts[f]}</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <p style={{ fontSize: "0.9rem", color: "#86868b", padding: "24px 0" }}>
          No {filter === "all" ? "" : filter + " "}pitches.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visible.map(pitch => {
            const meta = STATUS_META[pitch.status] ?? STATUS_META.draft;
            return (
              <Link key={pitch.id} href={`/pitch/${pitch.id}`} style={{ textDecoration: "none" }}>
                <div className="card-p" style={{ display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1d1d1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>
                      {pitch.title}
                    </h3>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      {pitch.primaryMomentName && (
                        <span style={{ fontSize: "0.75rem", color: "#6e6e73" }}>📅 {pitch.primaryMomentName}</span>
                      )}
                      {pitch.primaryMerchantName && (
                        <span style={{ fontSize: "0.75rem", color: "#6e6e73" }}>🏪 {pitch.primaryMerchantName}</span>
                      )}
                      {pitch.targetQuarter && (
                        <span style={{ fontSize: "0.75rem", color: "#86868b" }}>{pitch.targetQuarter}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                      background: pitch.type === "moment_led" ? "#e3f2fd" : "#e8f5e9",
                      color: pitch.type === "moment_led" ? "#0071e3" : "#248a3d",
                    }}>
                      {pitch.type === "moment_led" ? "Moment-Led" : "Merchant-Led"}
                    </span>
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                      background: meta.bg, color: meta.color,
                    }}>
                      {meta.label}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#86868b" }}>{formatDate(pitch.updatedAt)}</span>
                    <button
                      onClick={e => handleDelete(e, pitch.id, pitch.title)}
                      disabled={deleting === pitch.id}
                      title="Delete pitch"
                      style={{
                        background: "none", border: "none", cursor: "pointer", padding: "4px 6px",
                        color: "#cc2200", fontSize: "0.95rem", opacity: deleting === pitch.id ? 0.4 : 0.7,
                        lineHeight: 1,
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
