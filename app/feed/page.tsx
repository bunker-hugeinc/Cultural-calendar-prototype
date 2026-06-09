"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface FeedCandidate {
  id: string; name: string; startDate: string; endDate: string | null;
  category: string; score: number; headline: string; body: string; why: string;
  hook: string; partners: string; status: string;
}

const CAT_COLORS: Record<string, { pill: string; color: string }> = {
  gather:  { pill: "#e8f5e9", color: "#248a3d" },
  improve: { pill: "#fce4ec", color: "#dc5078" },
  excite:  { pill: "#e3f2fd", color: "#0071e3" },
};

function formatRange(start: string, end: string | null): string {
  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (!end || start === end) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

function ScoreChip({ score }: { score: number }) {
  const color = score >= 4 ? "#248a3d" : score >= 2.5 ? "#c47c00" : "#cc2200";
  const bg = score >= 4 ? "rgba(52,199,89,0.1)" : score >= 2.5 ? "rgba(255,159,10,0.1)" : "rgba(255,59,48,0.08)";
  return (
    <span style={{ fontSize: "0.78rem", fontWeight: 700, color, background: bg, padding: "3px 10px", borderRadius: 10 }}>
      {score.toFixed(1)}
    </span>
  );
}

const QUARTERS_DEFAULT = { timeWindow: "6m", categories: ["gather", "improve", "excite"] as string[], minScore: 3.0 };

export default function FeedPage() {
  const [candidates, setCandidates] = useState<FeedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [timeWindow, setTimeWindow] = useState("6m");
  const [categories, setCategories] = useState(["gather", "improve", "excite"]);
  const [minScore, setMinScore] = useState(3.0);
  const [priorityMerchants, setPriorityMerchants] = useState<string[]>([]);
  const [allMerchants, setAllMerchants] = useState<{ id: string; name: string }[]>([]);

  const loadFeed = useCallback(async () => {
    try {
      const r = await fetch("/api/feed");
      const rows = await r.json();
      setCandidates(Array.isArray(rows) ? rows : []);
    } catch { /* */ }
  }, []);

  useEffect(() => {
    Promise.all([
      loadFeed(),
      fetch("/api/merchants").then(r => r.json()).then(d => setAllMerchants(Array.isArray(d) ? d.map((m: { id: string; name: string }) => ({ id: m.id, name: m.name })) : [])),
    ]).finally(() => setLoading(false));
  }, [loadFeed]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleDiscover() {
    setDiscovering(true);
    try {
      const res = await fetch("/api/feed/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { timeWindow, categories, minScore, priorityMerchants } }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(`Error: ${data.error ?? "Discovery failed"}`); return; }
      const newOnes: FeedCandidate[] = data.candidates ?? [];
      if (newOnes.length === 0) {
        showToast("No new moments found — try a different time window or lower the min score.");
        return;
      }
      setCandidates(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const fresh = newOnes.filter(c => !existingIds.has(c.id));
        return [...fresh, ...prev];
      });
      showToast(`✓ ${newOnes.length} new moment${newOnes.length !== 1 ? "s" : ""} discovered`);
    } finally {
      setDiscovering(false);
    }
  }

  async function handleAdd(id: string) {
    const res = await fetch(`/api/feed/${id}/approve`, { method: "POST" });
    if (res.ok) {
      const { moment } = await res.json();
      setCandidates(prev => prev.filter(c => c.id !== id));
      showToast(`✓ Added to calendar — ${moment?.name ?? "moment"}`);
    }
  }

  async function handleDismiss(id: string) {
    await fetch(`/api/feed/${id}/dismiss`, { method: "POST" });
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: "dismissed" } : c));
  }

  async function handleRestore(id: string) {
    await fetch(`/api/feed/${id}/restore`, { method: "POST" });
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: "pending" } : c));
  }

  function toggleCategory(cat: string) {
    setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  }

  const pending = candidates.filter(c => c.status === "pending");
  const added = candidates.filter(c => c.status === "added");
  const dismissed = candidates.filter(c => c.status === "dismissed");

  if (loading) return (
    <div style={{ padding: "40px 24px", maxWidth: 800, margin: "0 auto" }}>
      <p style={{ color: "#86868b", fontSize: "0.85rem" }}>Loading feed…</p>
    </div>
  );

  return (
    <div style={{ padding: "40px 24px", maxWidth: 800, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p className="eyebrow" style={{ marginBottom: 6 }}>AI MOMENT DISCOVERY</p>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h1 style={{ fontSize: "1.8rem" }}>Proactive Moment Feed</h1>
          <button
            onClick={() => setSettingsOpen(v => !v)}
            style={{ background: "none", border: "1px solid #d2d2d7", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: "0.82rem", color: "#1d1d1f", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}
          >
            ⚙ Settings
          </button>
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          <span style={{ fontSize: "0.82rem", color: "#86868b" }}><strong style={{ color: "#1d1d1f" }}>{pending.length}</strong> suggestions</span>
          <span style={{ fontSize: "0.82rem", color: "#86868b" }}>·</span>
          <span style={{ fontSize: "0.82rem", color: "#86868b" }}><strong style={{ color: "#248a3d" }}>{added.length}</strong> added</span>
          <span style={{ fontSize: "0.82rem", color: "#86868b" }}>·</span>
          <span style={{ fontSize: "0.82rem", color: "#86868b" }}><strong style={{ color: "#86868b" }}>{dismissed.length}</strong> dismissed</span>
        </div>
      </div>

      {/* Settings panel */}
      {settingsOpen && (
        <div className="card-p" style={{ marginBottom: 20 }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>DISCOVERY SETTINGS</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>TIME WINDOW</label>
              {[["3m", "Next 3 months"], ["6m", "Next 6 months"], ["12m", "Next 12 months"]].map(([val, label]) => (
                <label key={val} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", marginBottom: 4, cursor: "pointer" }}>
                  <input type="radio" checked={timeWindow === val} onChange={() => setTimeWindow(val)} />
                  {label}
                </label>
              ))}
            </div>
            <div>
              <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>CATEGORIES</label>
              {["gather", "improve", "excite"].map(cat => (
                <label key={cat} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", marginBottom: 4, cursor: "pointer", textTransform: "capitalize" }}>
                  <input type="checkbox" checked={categories.includes(cat)} onChange={() => toggleCategory(cat)} />
                  {cat}
                </label>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="eyebrow" style={{ display: "block", marginBottom: 6 }}>
              MIN SCORE: <span style={{ color: "#0071e3" }}>{minScore.toFixed(1)}</span>
            </label>
            <input
              type="range" min={0} max={5} step={0.5} value={minScore}
              onChange={e => setMinScore(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "#0071e3" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#86868b" }}>
              <span>0.0</span><span>5.0</span>
            </div>
          </div>
          <button
            onClick={handleDiscover}
            disabled={discovering}
            className="btn btn-primary"
            style={{ opacity: discovering ? 0.6 : 1 }}
          >
            {discovering ? "Discovering…" : "Discover New Moments"}
          </button>
        </div>
      )}

      {/* Discover button (always visible when settings closed) */}
      {!settingsOpen && (
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={handleDiscover}
            disabled={discovering}
            className="btn btn-primary"
            style={{ opacity: discovering ? 0.6 : 1 }}
          >
            {discovering ? "Discovering…" : "Discover New Moments"}
          </button>
        </div>
      )}

      {/* Pending candidates */}
      {pending.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", border: "1px dashed #d2d2d7", borderRadius: 16 }}>
          <p style={{ fontSize: "0.9rem", color: "#86868b", marginBottom: 16 }}>No pending suggestions. Click Discover to find new moments.</p>
        </div>
      ) : (
        <div>
          {pending.map(c => {
            const cat = CAT_COLORS[c.category] ?? CAT_COLORS.gather;
            let partners: string[] = [];
            try { partners = JSON.parse(c.partners); } catch { /* */ }
            return (
              <div key={c.id} className="card" style={{ marginBottom: 12 }}>
                <div style={{ padding: "18px 20px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 10px", borderRadius: 10, background: cat.pill, color: cat.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {c.category}
                    </span>
                    <ScoreChip score={c.score} />
                  </div>
                  <h3 style={{ marginBottom: 4, lineHeight: 1.25 }}>{c.name}</h3>
                  <p style={{ fontSize: "0.8rem", color: "#86868b", marginBottom: 12 }}>
                    {formatRange(c.startDate, c.endDate)}
                  </p>
                  <p style={{ fontSize: "0.85rem", lineHeight: 1.5, color: "#1d1d1f", marginBottom: partners.length > 0 ? 14 : 0 }}>
                    {c.why}
                  </p>
                  {partners.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {partners.map(p => (
                        <span key={p} style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: 10, background: "#f5f5f7", color: "#6e6e73", border: "1px solid #e8e8ed" }}>{p}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ borderTop: "1px solid #f0f0f5", padding: "12px 20px", display: "flex", gap: 10 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => handleAdd(c.id)}>+ Add to Calendar</button>
                  <button className="btn btn-outline btn-sm" onClick={() => handleDismiss(c.id)}>Dismiss</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dismissed section */}
      {dismissed.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <button
            onClick={() => setShowDismissed(v => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.82rem", color: "#86868b", fontFamily: "inherit", padding: "4px 0", display: "flex", alignItems: "center", gap: 4 }}
          >
            {showDismissed ? "▾" : "▸"} Show dismissed ({dismissed.length})
          </button>
          {showDismissed && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {dismissed.map(c => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f5f5f7", borderRadius: 10 }}>
                  <span style={{ fontSize: "0.85rem", color: "#86868b" }}>{c.name}</span>
                  <button
                    onClick={() => handleRestore(c.id)}
                    className="btn btn-outline btn-sm"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", background: "#1d1d1f", color: "#fff", padding: "10px 18px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 500, zIndex: 200, boxShadow: "0 4px 20px rgba(0,0,0,.2)", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
