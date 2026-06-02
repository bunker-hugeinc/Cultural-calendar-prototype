"use client";

import { useState, useRef } from "react";
import { FeedSettingsPanel } from "./feed-settings-panel";

// ─── TYPES ───────────────────────────────────────────────────────────────────
export interface FeedCandidate {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  category: string;
  score: number;
  headline: string;
  body: string;
  why: string;
  hook: string;
  partners: string;  // JSON
  personas: string;  // JSON
  hashtags: string;  // JSON
  competing: string; // JSON
  status: string;
  newMerchantCount?: number;
}

interface Persona { t: string; h: string; d: string; }

interface ProactiveFeedProps {
  candidates: FeedCandidate[];
  onApprove: (id: string, name: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  onDiscovered: (newCandidates: FeedCandidate[]) => void;
}

type SortKey = "date" | "score" | "category";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const CAT_STYLE: Record<string, { pill: string; border: string; why: string }> = {
  gather:  { pill: "bg-gather/10 text-gather border-gather/30",   border: "border-l-gather",   why: "bg-gather/5 border border-gather/20 text-gather"   },
  improve: { pill: "bg-improve/10 text-improve border-improve/30", border: "border-l-improve",  why: "bg-improve/5 border border-improve/20 text-improve" },
  excite:  { pill: "bg-excite/10 text-excite border-excite/30",    border: "border-l-excite",   why: "bg-excite/5 border border-excite/20 text-excite"   },
};

function catStyle(category: string) {
  return CAT_STYLE[category as keyof typeof CAT_STYLE] ?? CAT_STYLE.gather;
}

function scoreColor(score: number): string {
  if (score >= 4)   return "text-apple-green";
  if (score >= 2.5) return "text-apple-amber";
  return "text-apple-red";
}

function formatRange(start: string, end: string | null): string {
  const fmt = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (!end || start === end) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

function parseJSON<T>(s: string, fallback: T): T {
  try { return JSON.parse(s); } catch { return fallback; }
}

// ─── FEED CARD ───────────────────────────────────────────────────────────────
function FeedCard({
  c,
  exiting,
  isNew,
  onApprove,
  onDismiss,
}: {
  c: FeedCandidate;
  exiting: boolean;
  isNew: boolean;
  newMerchantCount?: number;
  onApprove: () => void;
  onDismiss: () => void;
}) {
  const [busy, setBusy] = useState<"approve" | "dismiss" | null>(null);
  const cs = catStyle(c.category);
  const partners: string[] = parseJSON(c.partners, []);
  const personas: Persona[] = parseJSON(c.personas, []);
  const hashtags: string[] = parseJSON(c.hashtags, []);
  const competing: string[] = parseJSON(c.competing, []);
  const hooks = c.hook.split(",").map(h => h.trim()).filter(Boolean);

  async function handleApprove() {
    setBusy("approve");
    await onApprove();
    setBusy(null);
  }
  async function handleDismiss() {
    setBusy("dismiss");
    await onDismiss();
    setBusy(null);
  }

  return (
    <div className={`card-apple overflow-hidden border-l-4 ${cs.border} mb-3 transition-all duration-250 ${exiting ? "opacity-0 -translate-y-1" : "opacity-100 translate-y-0"}`}>
      {/* Two-column body */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-apple-gray-100">

        {/* Left column */}
        <div className="p-6 flex flex-col gap-4">
          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            {isNew && (
              <span className="badge-apple bg-apple-amber/10 text-apple-amber border border-apple-amber/30 text-[10px]">
                New
              </span>
            )}
            <span className={`badge-apple border capitalize ${cs.pill}`}>{c.category}</span>
            <span className={`text-xs font-semibold tabular-nums ${scoreColor(c.score)}`}>
              Score {c.score}/5
            </span>
            <span className="text-xs text-apple-gray-400">{formatRange(c.startDate, c.endDate)}</span>
          </div>

          {/* Moment name */}
          <h2 className="text-2xl font-bold tracking-tight text-apple-black leading-tight">
            {c.name}
          </h2>

          {/* Headline */}
          <p className="text-sm font-medium italic text-apple-gray-600 leading-snug">{c.headline}</p>

          {/* Body */}
          <p className="text-sm text-apple-gray-400 leading-relaxed">{c.body}</p>

          {/* Why this fits */}
          <div className={`rounded-xl p-4 ${cs.why}`}>
            <p className="eyebrow mb-1.5">Why this fits</p>
            <p className="text-xs leading-relaxed">{c.why}</p>
          </div>

          {/* Hook pills */}
          {hooks.length > 0 && (
            <div>
              <p className="eyebrow mb-2">Hook type</p>
              <div className="flex flex-wrap gap-1.5">
                {hooks.map(h => (
                  <span key={h} className="badge-apple border border-apple-gray-200 text-apple-gray-600 bg-white text-[10px]">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="p-6 flex flex-col gap-5">
          {/* Partner Recommendations */}
          {partners.length > 0 && (
            <div>
              <p className="eyebrow mb-2">Partner Recommendations</p>
              <div className="flex flex-wrap gap-1.5">
                {partners.map(p => (
                  <span key={p} className="badge-apple border border-apple-gray-200 text-apple-gray-600 bg-apple-gray-50">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Influencer Personas */}
          {personas.length > 0 && (
            <div>
              <p className="eyebrow mb-2">Influencer Personas</p>
              <div className="flex flex-col gap-3">
                {personas.map((p, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-apple-gray-100 border border-apple-gray-200 flex items-center justify-center text-[9px] font-semibold text-apple-gray-400 shrink-0">
                      {(p.h || p.t || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="eyebrow mb-0.5">{p.t}</p>
                      <p className="text-xs font-semibold text-apple-black">@{p.h}</p>
                      <p className="text-xs text-apple-gray-400 leading-relaxed">{p.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div>
              <p className="eyebrow mb-2">Hashtags</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {hashtags.map(h => (
                  <span key={h} className="text-xs text-apple-gray-400">{h}</span>
                ))}
              </div>
            </div>
          )}

          {/* Competing Brands */}
          {competing.length > 0 && (
            <div>
              <p className="eyebrow mb-2">Competing Payment Brands</p>
              <div className="flex flex-col gap-1.5">
                {competing.map(b => (
                  <div key={b} className="flex items-center gap-2 text-xs text-apple-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-apple-red/60 shrink-0" />
                    {b}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-apple-gray-100 px-6 py-3 bg-apple-gray-50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-apple-blue" />
          <span className="eyebrow">AI-identified · pending review</span>
          {(c.newMerchantCount ?? 0) > 0 && (
            <a
              href="/merchants?status=potential"
              className="badge-apple bg-apple-blue/10 text-apple-blue border border-apple-blue/20 text-[10px] no-underline"
            >
              + {c.newMerchantCount} new potential partner{c.newMerchantCount! > 1 ? "s" : ""}
            </a>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDismiss}
            disabled={busy !== null}
            className="btn-outline-apple disabled:opacity-50 text-xs"
          >
            {busy === "dismiss" ? "Dismissing…" : "Dismiss"}
          </button>
          <a
            href={`/feed/${c.id}/add-details`}
            className="badge-apple bg-gather/10 text-gather border border-gather/30 no-underline hover:opacity-80 transition-opacity px-4 py-2 rounded-full text-xs font-medium"
          >
            Add Details →
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function ProactiveFeed({ candidates, onApprove, onDismiss, onRestore, onDiscovered }: ProactiveFeedProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [dismissedOpen, setDismissedOpen] = useState(false);
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());

  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  function markNewIds(incoming: FeedCandidate[]) {
    onDiscovered(incoming);
    const ids = new Set(incoming.map(c => c.id));
    setNewIds(ids);
    setTimeout(() => setNewIds(new Set()), 5000);
  }

  async function handleDiscover() {
    const q = discoverQuery.trim();
    if (!q) return;
    setDiscovering(true);
    setDiscoverError(null);
    try {
      const res = await fetch("/api/feed/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDiscoverError(data.error ?? "Discovery failed");
      } else {
        markNewIds(data.candidates ?? []);
        setDiscoverQuery("");
      }
    } catch {
      setDiscoverError("Network error — please try again");
    } finally {
      setDiscovering(false);
    }
  }

  const pending        = candidates.filter(c => c.status === "pending");
  const inReviewCount  = candidates.filter(c => c.status === "in_review").length;
  const added          = candidates.filter(c => c.status === "added").length;
  const dismissedItems = candidates.filter(c => c.status === "dismissed");

  async function handleRestore(id: string) {
    setRestoringIds(prev => new Set([...prev, id]));
    await onRestore(id);
    setRestoringIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  }

  const sorted = [...pending].sort((a, b) => {
    const aNew = newIds.has(a.id) ? 0 : 1;
    const bNew = newIds.has(b.id) ? 0 : 1;
    if (aNew !== bNew) return aNew - bNew;
    if (sortKey === "score")    return b.score - a.score;
    if (sortKey === "category") return a.category.localeCompare(b.category);
    return a.startDate.localeCompare(b.startDate);
  });

  async function handleApprove(c: FeedCandidate) {
    setExitingIds(prev => new Set([...prev, c.id]));
    await onApprove(c.id, c.name);
    setTimeout(() => setExitingIds(prev => { const s = new Set(prev); s.delete(c.id); return s; }), 300);
  }

  async function handleDismiss(c: FeedCandidate) {
    setExitingIds(prev => new Set([...prev, c.id]));
    await onDismiss(c.id);
    setTimeout(() => setExitingIds(prev => { const s = new Set(prev); s.delete(c.id); return s; }), 300);
  }

  return (
    <div>
      {/* Section header */}
      <div className="flex items-end justify-between mb-6 gap-5 flex-wrap">
        <div>
          <p className="eyebrow mb-1">Proactive Moment Feed · AI-Identified</p>
          <h1>Suggested Moments</h1>
        </div>

        {/* Stats strip */}
        <div className="flex gap-6 items-center">
          {[
            { label: "Pending",   value: pending.length,        color: "text-apple-blue",  href: null },
            { label: "In Review", value: inReviewCount,         color: "text-apple-amber", href: "/review" },
            { label: "Added",     value: added,                 color: "text-apple-green", href: null },
            { label: "Dismissed", value: dismissedItems.length, color: "text-improve",     href: null },
          ].map(s => (
            <div key={s.label} className="text-right">
              {s.href ? (
                <a href={s.href} className={`text-3xl font-bold leading-none no-underline ${s.color}`}>{s.value}</a>
              ) : (
                <span className={`text-3xl font-bold leading-none ${s.color}`}>{s.value}</span>
              )}
              <p className="eyebrow mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Feed settings panel */}
      <FeedSettingsPanel onDiscovered={markNewIds} />

      {/* Discover input */}
      <div className="mb-5">
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={discoverQuery}
            onChange={e => setDiscoverQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !discovering && handleDiscover()}
            placeholder="Discover moments — try 'sports tentpoles Q3 2027' or 'wellness January 2028'"
            disabled={discovering}
            className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-apple-gray-200 bg-white text-apple-black placeholder:text-apple-gray-400 focus:outline-none focus:border-apple-blue disabled:opacity-60"
          />
          <button
            onClick={handleDiscover}
            disabled={discovering || !discoverQuery.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-apple-blue/30 bg-apple-blue/10 text-apple-blue text-xs font-medium disabled:opacity-50 cursor-pointer hover:bg-apple-blue/15 transition-colors whitespace-nowrap"
          >
            {discovering ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Discovering…
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                Discover
              </>
            )}
          </button>
        </div>
        {discoverError && (
          <p className="text-xs text-apple-red mt-1.5">{discoverError}</p>
        )}
      </div>

      {/* Sort controls */}
      <div className="flex gap-1.5 mb-5">
        {(["date", "score", "category"] as SortKey[]).map(key => (
          <button
            key={key}
            onClick={() => setSortKey(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors cursor-pointer ${
              sortKey === key
                ? "bg-apple-black text-white"
                : "border border-apple-gray-200 text-apple-gray-400 hover:text-apple-black"
            }`}
          >
            {key === "score" ? "Fit Score" : key}
          </button>
        ))}
      </div>

      {/* Cards */}
      {sorted.length === 0 ? (
        <div className="card-apple p-12 text-center">
          <p className="text-base font-semibold text-apple-black mb-1">All caught up</p>
          <p className="text-sm text-apple-gray-400">No pending moments — check back soon for new AI-identified candidates.</p>
        </div>
      ) : (
        sorted.map(c => (
          <FeedCard
            key={c.id}
            c={c}
            exiting={exitingIds.has(c.id)}
            isNew={newIds.has(c.id)}
            newMerchantCount={c.newMerchantCount ?? 0}
            onApprove={() => handleApprove(c)}
            onDismiss={() => handleDismiss(c)}
          />
        ))
      )}

      {/* Dismissed section */}
      {dismissedItems.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setDismissedOpen(o => !o)}
            className="flex items-center gap-2 w-full bg-transparent border-none cursor-pointer py-2 border-t border-apple-gray-100"
          >
            <span className="eyebrow">Dismissed ({dismissedItems.length})</span>
            <span className={`text-apple-gray-400 text-xs transition-transform duration-200 ${dismissedOpen ? "rotate-180" : ""}`}>▾</span>
          </button>

          {dismissedOpen && (
            <div className="mt-2 flex flex-col gap-1.5">
              {dismissedItems.map(c => {
                const cs = catStyle(c.category);
                const isRestoring = restoringIds.has(c.id);
                return (
                  <div key={c.id} className={`card-apple border-l-4 ${cs.border} px-4 py-3 flex items-center gap-3 transition-opacity ${isRestoring ? "opacity-50" : "opacity-100"}`}>
                    <span className={`badge-apple border capitalize text-[10px] ${cs.pill} shrink-0`}>{c.category}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-apple-black truncate">{c.name}</p>
                      <p className="text-xs text-apple-gray-400 mt-0.5">{formatRange(c.startDate, c.endDate)}</p>
                    </div>
                    <button
                      onClick={() => handleRestore(c.id)}
                      disabled={isRestoring}
                      className="btn-outline-apple text-xs shrink-0 disabled:opacity-50"
                    >
                      {isRestoring ? "Restoring…" : "Restore"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
