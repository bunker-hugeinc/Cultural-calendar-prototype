"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CalendarTimeline } from "@/components/calendar-timeline";
import { CalendarGrid } from "@/components/calendar-grid";

// ─── Suggested Moment Card ────────────────────────────────────────────────────
interface SuggestedCandidate {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  category: string;
  score: number;
  why: string;
}

const CAT_BG: Record<string, string> = {
  gather:  "rgba(52,199,89,0.12)",
  improve: "rgba(220,80,120,0.12)",
  excite:  "rgba(0,113,227,0.12)",
};
const CAT_TEXT: Record<string, string> = {
  gather: "#248a3d", improve: "#b03060", excite: "#0071e3",
};

function SuggestedMomentCard({ candidate: c }: { candidate: SuggestedCandidate }) {
  const scoreColor = c.score >= 7 ? "#34c759" : c.score >= 4 ? "#ff9f0a" : "#ff3b30";
  const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const dateRange = c.endDate && c.endDate !== c.startDate ? `${fmt(c.startDate)} – ${fmt(c.endDate)}` : fmt(c.startDate);

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "16px 18px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 20,
            fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "capitalize",
            background: CAT_BG[c.category] ?? "#f5f5f7",
            color: CAT_TEXT[c.category] ?? "#86868b",
          }}>{c.category}</span>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: scoreColor }}>
            {c.score.toFixed(1)}/10
          </span>
        </div>
        <h3 style={{ fontSize: "0.95rem", marginBottom: 3, lineHeight: 1.3 }}>{c.name}</h3>
        <p style={{ fontSize: "0.75rem", color: "#86868b", marginBottom: 10 }}>{dateRange}</p>
        <p style={{
          fontSize: "0.78rem", color: "#6e6e73", lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{c.why}</p>
      </div>
      <div style={{ borderTop: "1px solid #f0f0f5", padding: "10px 18px", marginTop: "auto" }}>
        <Link href={`/feed/${c.id}`} style={{ fontSize: "0.78rem", fontWeight: 500, color: "#0071e3", textDecoration: "none" }}>
          Evaluate &amp; Add →
        </Link>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CalendarMoment {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  category: string;
  score: number | null;
  ecommerceScore: number | null;
  audienceFit: number | null;
  whiteSpaceScore: number | null;
  description: string;
  hook: string | null;
  pitchCount?: number;
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function TimelineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="1" y1="4"  x2="13" y2="4" />
      <line x1="1" y1="7"  x2="10" y2="7" />
      <line x1="1" y1="10" x2="7"  y2="10" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="5" height="5" rx="1" />
      <rect x="8" y="1" width="5" height="5" rx="1" />
      <rect x="1" y="8" width="5" height="5" rx="1" />
      <rect x="8" y="8" width="5" height="5" rx="1" />
    </svg>
  );
}

// ─── Category filter ──────────────────────────────────────────────────────────
const CATEGORY_DOT: Record<string, string> = {
  gather:  "#34a853",
  improve: "#dc5078",
  excite:  "#0071e3",
};

const CATEGORIES = ["gather", "improve", "excite"] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [moments, setMoments] = useState<CalendarMoment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"timeline" | "grid">("timeline");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<SuggestedCandidate[]>([]);

  // Restore view preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("cultural-calendar-view") as "timeline" | "grid" | null;
    if (saved === "timeline" || saved === "grid") setView(saved);
  }, []);

  // Persist view preference
  useEffect(() => {
    localStorage.setItem("cultural-calendar-view", view);
  }, [view]);

  // Load moments + suggestions (reused on mount and when returning to the tab)
  const loadData = useCallback(() => {
    fetch("/api/moments", { cache: "no-store" })
      .then(r => r.json())
      .then((data: CalendarMoment[]) => {
        setMoments(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    fetch("/api/feed", { cache: "no-store" })
      .then(r => r.json())
      .then((rows: SuggestedCandidate[]) => {
        if (Array.isArray(rows)) setSuggested(rows.filter(c => (c as { status?: string }).status === "pending").slice(0, 6));
      })
      .catch(() => {});
  }, []);

  // Fetch on mount + whenever the calendar regains focus (so newly added
  // moments show up when you navigate back without a full reload).
  useEffect(() => {
    loadData();
    const onFocus = () => loadData();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [loadData]);

  async function handleRemoveMoment(id: string) {
    if (!window.confirm("Remove this moment from the calendar? This deletes the moment and its pitches.")) return;
    const prev = moments;
    setMoments(p => p.filter(m => m.id !== id)); // optimistic
    const res = await fetch(`/api/moments/${id}`, { method: "DELETE" });
    if (!res.ok) { setMoments(prev); window.alert("Couldn't remove that moment. Please try again."); }
  }

  const filteredMoments = categoryFilter
    ? moments.filter(m => m.category === categoryFilter)
    : moments;

  // Date range label
  const dateRangeLabel = (() => {
    if (moments.length === 0) return "";
    const sorted = [...moments].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const first = sorted[0].startDate;
    const last = sorted[sorted.length - 1].endDate ?? sorted[sorted.length - 1].startDate;
    const fmt = (d: string) => {
      const [y, m] = d.split("-").map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    };
    return `${fmt(first)} – ${fmt(last)}`;
  })();

  return (
    <div className="max-w-[1400px] mx-auto px-6">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="pt-10 pb-6 border-b border-apple-gray-100">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow mb-2">Partner Marketing</p>
            <h1 className="text-4xl font-semibold tracking-tight">Cultural Calendar</h1>
            <p className="text-apple-gray-400 mt-1 text-[15px]">
              {loading ? "Loading…" : `${moments.length} moments${dateRangeLabel ? ` · ${dateRangeLabel}` : ""}`}
            </p>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-apple-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                view === "timeline"
                  ? "bg-white text-apple-black shadow-sm"
                  : "text-apple-gray-400 hover:text-apple-black"
              }`}
            >
              <TimelineIcon className="w-3.5 h-3.5" />
              Timeline
            </button>
            <button
              onClick={() => setView("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                view === "grid"
                  ? "bg-white text-apple-black shadow-sm"
                  : "text-apple-gray-400 hover:text-apple-black"
              }`}
            >
              <GridIcon className="w-3.5 h-3.5" />
              Monthly
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 py-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              categoryFilter === null
                ? "bg-apple-black text-white"
                : "bg-white border border-apple-gray-200 text-apple-black hover:border-apple-gray-400"
            }`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? "bg-apple-black text-white"
                  : "bg-white border border-apple-gray-200 text-apple-black hover:border-apple-gray-400"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: categoryFilter === cat ? "white" : CATEGORY_DOT[cat] }}
              />
              {cat}
            </button>
          ))}
        </div>

        {/* Legend */}
        {!loading && moments.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-apple-gray-400 font-medium tracking-wide uppercase">Color = type · Badge = AI score</span>
          </div>
        )}
      </div>

      {/* ── View content ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-24 text-center">
          <p className="text-sm text-apple-gray-400">Loading calendar…</p>
        </div>
      ) : filteredMoments.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-base font-semibold text-apple-black mb-1">No moments match this filter.</p>
          <p className="text-sm text-apple-gray-400">Try selecting a different category.</p>
        </div>
      ) : view === "timeline" ? (
        <div className="py-6">
          <CalendarTimeline moments={filteredMoments} />
        </div>
      ) : (
        <div className="py-6">
          <CalendarGrid moments={filteredMoments} onRemove={handleRemoveMoment} />
        </div>
      )}

      {/* ── Suggested Moments — AI feed preview ──────────────────────── */}
      <div style={{ marginTop: 48, paddingBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
          <p className="eyebrow">AI SUGGESTIONS</p>
          <h2 style={{ fontSize: "1.4rem" }}>Suggested Moments</h2>
          <Link href="/feed" style={{ fontSize: "0.8rem", color: "#0071e3", marginLeft: "auto" }}>
            View all in Feed →
          </Link>
        </div>

        {suggested.length === 0 ? (
          <div className="card-p" style={{ textAlign: "center", color: "#86868b" }}>
            <p style={{ marginBottom: 12 }}>No suggested moments yet.</p>
            <Link href="/feed" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
              Go to Feed to generate suggestions
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {suggested.map(c => (
              <SuggestedMomentCard key={c.id} candidate={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
