"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PitchRow {
  id: string;
  title: string;
  status: string;
  targetQuarter: string | null;
  momentId: string | null;
  merchantId: string | null;
  updatedAt: string | null;
  lastAutoSavedAt: string | null;
  primaryMomentName: string | null;
  primaryMerchantName: string | null;
}

const STATUS_META: Record<string, { label: string; bg: string; color: string; border: string }> = {
  draft:    { label: "Draft",    bg: "#f5f5f7",             color: "#6e6e73", border: "#d2d2d7" },
  sent:     { label: "Sent",     bg: "#e3f2fd",             color: "#0071e3", border: "#b3d9fb" },
  approved: { label: "Approved", bg: "rgba(52,199,89,0.1)", color: "#248a3d", border: "#b3e6c1" },
  rejected: { label: "Rejected", bg: "rgba(255,59,48,0.1)", color: "#cc2200", border: "#ffbcb8" },
  ready:    { label: "Ready",    bg: "rgba(52,199,89,0.1)", color: "#248a3d", border: "#b3e6c1" },
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PitchListPage() {
  const [pitches, setPitches] = useState<PitchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch("/api/pitches")
      .then(r => r.json())
      .then(setPitches)
      .finally(() => setLoading(false));
  }, []);

  const groups: Record<string, PitchRow[]> = { approved: [], sent: [], draft: [], ready: [], rejected: [] };
  for (const p of pitches) {
    const bucket = groups[p.status] ? p.status : "draft";
    groups[bucket].push(p);
  }
  const groupOrder = ["approved", "sent", "draft", "ready", "rejected"];
  const nonEmpty = groupOrder.filter(g => groups[g]?.length > 0);

  return (
    <div style={{ padding: "40px 24px", maxWidth: 900, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 4 }}>PITCH BUILDER</p>
          <h1>Partnership Pitches</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
        >
          + New Pitch
        </button>
      </div>

      {/* New Pitch Modal */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "white", borderRadius: 16, padding: 32, maxWidth: 420, width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
            }}
          >
            <p className="eyebrow" style={{ marginBottom: 8 }}>NEW PITCH</p>
            <h2 style={{ fontSize: "1.2rem", marginBottom: 8 }}>Where would you like to start?</h2>
            <p style={{ fontSize: "0.88rem", color: "#6e6e73", marginBottom: 24, lineHeight: 1.6 }}>
              Every pitch needs a moment. Browse the calendar or merchant catalog to find a pairing, then use "Build Pitch →".
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link
                href="/calendar"
                onClick={() => setShowModal(false)}
                className="btn btn-primary"
                style={{ textDecoration: "none", textAlign: "center" }}
              >
                Start from a Moment →
              </Link>
              <Link
                href="/merchants"
                onClick={() => setShowModal(false)}
                className="btn btn-outline"
                style={{ textDecoration: "none", textAlign: "center" }}
              >
                Start from a Merchant →
              </Link>
            </div>
            <button
              onClick={() => setShowModal(false)}
              style={{ marginTop: 16, fontSize: "0.8rem", color: "#86868b", background: "none", border: "none", cursor: "pointer", width: "100%" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p style={{ color: "#86868b" }}>Loading pitches…</p>
      ) : pitches.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 24px" }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>NO PITCHES YET</p>
          <h2 style={{ marginBottom: 8, fontSize: "1.3rem" }}>Start building a pitch</h2>
          <p style={{ fontSize: "0.9rem", color: "#86868b", marginBottom: 32 }}>
            Browse a moment or merchant, then click "Build Pitch →" to auto-generate a partnership document.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/calendar" className="btn btn-primary" style={{ textDecoration: "none" }}>Start with a moment →</Link>
            <Link href="/merchants" className="btn btn-outline" style={{ textDecoration: "none" }}>Start with a merchant →</Link>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {nonEmpty.map(group => (
            <div key={group}>
              <p className="eyebrow" style={{ marginBottom: 12 }}>
                {STATUS_META[group]?.label.toUpperCase() ?? group.toUpperCase()} ({groups[group].length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {groups[group].map(pitch => {
                  const meta = STATUS_META[pitch.status] ?? STATUS_META.draft;
                  const mchName = pitch.primaryMerchantName;
                  const mmtName = pitch.primaryMomentName;
                  const saved = pitch.lastAutoSavedAt || pitch.updatedAt;
                  return (
                    <div key={pitch.id} className="card-p" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1d1d1f", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {mchName ? `Apple Pay × ${mchName}` : pitch.title}
                        </h3>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          {mmtName && <span style={{ fontSize: "0.75rem", color: "#6e6e73" }}>📅 {mmtName}</span>}
                          {pitch.targetQuarter && (
                            <span style={{ fontSize: "0.72rem", padding: "1px 8px", borderRadius: 10, background: "#f5f5f7", color: "#6e6e73", fontWeight: 600 }}>
                              {pitch.targetQuarter}
                            </span>
                          )}
                          {saved && <span style={{ fontSize: "0.72rem", color: "#aeaeb2" }}>{timeAgo(saved)}</span>}
                        </div>
                      </div>
                      <span style={{
                        fontSize: "0.65rem", fontWeight: 700, padding: "2px 9px", borderRadius: 20, flexShrink: 0,
                        background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
                      }}>
                        {meta.label}
                      </span>
                      <Link
                        href={`/pitch/${pitch.id}`}
                        style={{ fontSize: "0.82rem", color: "#0071e3", fontWeight: 600, flexShrink: 0, textDecoration: "none" }}
                      >
                        Continue →
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
