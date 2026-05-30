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
}

interface Persona { t: string; h: string; d: string; }

interface ProactiveFeedProps {
  candidates: FeedCandidate[];
  onApprove: (id: string, name: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
  onDiscovered: (newCandidates: FeedCandidate[]) => void;
}

type SortKey = "date" | "score" | "category";

// ─── STYLES ──────────────────────────────────────────────────────────────────
const MONO = `"SF Pro Mono","SFMono-Regular",ui-monospace,monospace`;
const SANS = `-apple-system,"SF Pro Text",BlinkMacSystemFont,sans-serif`;
const DISP = `"SF Pro Display",-apple-system,BlinkMacSystemFont,sans-serif`;

const CAT = {
  gather:  { bg: "rgba(52,168,83,.1)",   bd: "rgba(52,168,83,.55)", txt: "#1a6b2e", solid: "#34a853" },
  improve: { bg: "rgba(220,80,120,.09)", bd: "rgba(220,80,120,.5)", txt: "#9c2050", solid: "#dc5078" },
  excite:  { bg: "rgba(37,99,235,.09)",  bd: "rgba(37,99,235,.48)", txt: "#1a3fa8", solid: "#2563eb" },
} as const;

function catStyle(category: string) {
  return CAT[category as keyof typeof CAT] ?? CAT.gather;
}

function scoreStyle(score: number): { bg: string; txt: string } {
  if (score >= 4)   return { bg: "rgba(22,163,74,.1)",   txt: "#15803d" };
  if (score >= 2.5) return { bg: "rgba(217,119,6,.1)",   txt: "#b45309" };
  return               { bg: "rgba(220,38,38,.1)",   txt: "#dc2626" };
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

// ─── CARD ────────────────────────────────────────────────────────────────────
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
  onApprove: () => void;
  onDismiss: () => void;
}) {
  const [busy, setBusy] = useState<"approve" | "dismiss" | null>(null);
  const cs = catStyle(c.category);
  const ss = scoreStyle(c.score);
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
    <div style={{
      background: "#fff",
      border: "1px solid rgba(0,0,0,.1)",
      borderLeft: `3px solid ${cs.solid}`,
      borderRadius: 12,
      overflow: "hidden",
      opacity: exiting ? 0 : 1,
      transform: exiting ? "translateY(-4px)" : "none",
      transition: "opacity .25s, transform .25s",
      marginBottom: 12,
    }}>
      {/* Two-column body */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: 0 }}>

        {/* Left column */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Meta row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {isNew && (
              <span style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 600, letterSpacing: ".18em", textTransform: "uppercase", padding: "3px 9px", borderRadius: 4, background: "rgba(234,179,8,.15)", color: "#854d0e", border: "1px solid rgba(234,179,8,.4)" }}>
                New
              </span>
            )}
            <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 500, letterSpacing: ".18em", textTransform: "uppercase", padding: "3px 9px", borderRadius: 4, background: cs.bg, color: cs.txt, border: `1px solid ${cs.bd}` }}>
              {c.category}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 500, letterSpacing: ".08em", padding: "3px 8px", borderRadius: 4, background: ss.bg, color: ss.txt, border: `1px solid ${ss.txt}33` }}>
              Score {c.score} / 5
            </span>
            <span style={{ fontFamily: MONO, fontSize: 8, color: "#6e6e80", letterSpacing: ".06em" }}>
              {formatRange(c.startDate, c.endDate)}
            </span>
          </div>

          {/* Moment name */}
          <div style={{ fontFamily: DISP, fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: "-.02em", color: "#111" }}>
            {c.name}
          </div>

          {/* Headline */}
          <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, fontStyle: "italic", color: cs.txt, lineHeight: 1.4 }}>
            {c.headline}
          </div>

          {/* Body */}
          <div style={{ fontFamily: SANS, fontSize: 12, color: "#6e6e80", lineHeight: 1.75 }}>
            {c.body}
          </div>

          {/* Why this fits */}
          <div style={{ background: "rgba(37,99,235,.06)", border: "1px solid rgba(37,99,235,.18)", borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase", color: "#6e6e80", marginBottom: 5 }}>
              Why this fits
            </div>
            <div style={{ fontFamily: SANS, fontSize: 12, color: "#1a3fa8", lineHeight: 1.6 }}>
              {c.why}
            </div>
          </div>

          {/* Hook pills */}
          {hooks.length > 0 && (
            <div>
              <div style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase", color: "#b0b0ba", marginBottom: 6 }}>
                Hook type
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {hooks.map(h => (
                  <span key={h} style={{ fontFamily: MONO, fontSize: 8, letterSpacing: ".1em", textTransform: "uppercase", padding: "4px 9px", borderRadius: 20, border: "1px solid rgba(0,0,0,.1)", color: "#6e6e80", background: "#f5f5f7" }}>
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ background: "rgba(0,0,0,.08)" }} />

        {/* Right column */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Partner Recommendations */}
          {partners.length > 0 && (
            <div>
              <div style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase", color: "#b0b0ba", marginBottom: 8 }}>
                Partner Recommendations
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {partners.map(p => (
                  <span key={p} style={{ fontFamily: SANS, fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(0,0,0,.1)", background: "#f5f5f7", color: "#333" }}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Influencer Personas */}
          {personas.length > 0 && (
            <div>
              <div style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase", color: "#b0b0ba", marginBottom: 8 }}>
                Influencer Personas
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {personas.map((p, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0 10px" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f0f0f4", border: "1px solid rgba(0,0,0,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontSize: 9, fontWeight: 600, color: "#6e6e80", flexShrink: 0 }}>
                      {(p.h || p.t || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".1em", color: "#b0b0ba", marginBottom: 2 }}>{p.t}</div>
                      <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 600, color: "#111", marginBottom: 2 }}>@{p.h}</div>
                      <div style={{ fontFamily: SANS, fontSize: 11, color: "#6e6e80", lineHeight: 1.5 }}>{p.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div>
              <div style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase", color: "#b0b0ba", marginBottom: 6 }}>
                Hashtags
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {hashtags.map(h => (
                  <span key={h} style={{ fontFamily: MONO, fontSize: 9.5, color: "#6e6e80", letterSpacing: ".02em" }}>{h}</span>
                ))}
              </div>
            </div>
          )}

          {/* Competing Brands */}
          {competing.length > 0 && (
            <div>
              <div style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase", color: "#b0b0ba", marginBottom: 6 }}>
                Competing Payment Brands
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {competing.map(b => (
                  <div key={b} style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: SANS, fontSize: 11, color: "#6e6e80" }}>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#ef4444", opacity: .6, flexShrink: 0, display: "inline-block" }} />
                    {b}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid rgba(0,0,0,.08)", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafafa" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 500, letterSpacing: ".14em", textTransform: "uppercase", color: "#6e6e80" }}>
            AI-identified · pending review
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleDismiss}
            disabled={busy !== null}
            style={{ fontFamily: MONO, fontSize: 8, fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(0,0,0,.12)", background: "#fff", color: "#6e6e80", cursor: busy ? "default" : "pointer", opacity: busy === "dismiss" ? 0.5 : 1, transition: "all .15s" }}>
            {busy === "dismiss" ? "Dismissing…" : "Dismiss"}
          </button>
          <button
            onClick={handleApprove}
            disabled={busy !== null}
            style={{ fontFamily: MONO, fontSize: 8, fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(52,168,83,.4)", background: "rgba(52,168,83,.1)", color: "#1a6b2e", cursor: busy ? "default" : "pointer", opacity: busy === "approve" ? 0.5 : 1, transition: "all .15s" }}>
            {busy === "approve" ? "Adding…" : "+ Add to Calendar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function ProactiveFeed({ candidates, onApprove, onDismiss, onDiscovered }: ProactiveFeedProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());

  // Discover UI state
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

  const pending   = candidates.filter(c => c.status === "pending");
  const added     = candidates.filter(c => c.status === "added").length;
  const dismissed = candidates.filter(c => c.status === "dismissed").length;

  const sorted = [...pending].sort((a, b) => {
    // New cards always float to top
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

  const sortBtnStyle = (key: SortKey): React.CSSProperties => ({
    fontFamily: MONO, fontSize: 8, fontWeight: 500, letterSpacing: ".14em", textTransform: "uppercase",
    padding: "5px 12px", borderRadius: 20, cursor: "pointer", transition: "all .15s",
    border: sortKey === key ? "1px solid #111" : "1px solid rgba(0,0,0,.1)",
    background: sortKey === key ? "#111" : "#fff",
    color: sortKey === key ? "#fff" : "#6e6e80",
  });

  return (
    <div>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22, gap: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 8.5, fontWeight: 500, letterSpacing: ".22em", textTransform: "uppercase", color: "#b0b0ba", marginBottom: 4 }}>
            Proactive Moment Feed · AI-Identified
          </div>
          <div style={{ fontFamily: DISP, fontSize: 38, fontWeight: 800, letterSpacing: "-.01em", color: "#111", lineHeight: 1 }}>
            Suggested Moments
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {[
            { label: "Pending",   value: pending.length,   color: "#1a3fa8" },
            { label: "Added",     value: added,            color: "#1a6b2e" },
            { label: "Dismissed", value: dismissed,        color: "#9c2050" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "right" }}>
              <div style={{ fontFamily: DISP, fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 500, letterSpacing: ".14em", textTransform: "uppercase", color: "#b0b0ba", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feed settings panel */}
      <FeedSettingsPanel onDiscovered={markNewIds} />

      {/* Discover input — free-text fallback */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            ref={inputRef}
            type="text"
            value={discoverQuery}
            onChange={e => setDiscoverQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !discovering && handleDiscover()}
            placeholder="Discover moments — try 'sports tentpoles Q3 2027' or 'wellness January 2028'"
            disabled={discovering}
            style={{
              flex: 1,
              fontFamily: SANS,
              fontSize: 13,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid rgba(0,0,0,.12)",
              background: "#fff",
              color: "#111",
              outline: "none",
              opacity: discovering ? 0.6 : 1,
            }}
          />
          <button
            onClick={handleDiscover}
            disabled={discovering || !discoverQuery.trim()}
            style={{
              fontFamily: MONO,
              fontSize: 8,
              fontWeight: 500,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              padding: "10px 18px",
              borderRadius: 8,
              border: "1px solid rgba(37,99,235,.4)",
              background: discovering ? "rgba(37,99,235,.08)" : "rgba(37,99,235,.1)",
              color: "#1a3fa8",
              cursor: (discovering || !discoverQuery.trim()) ? "default" : "pointer",
              opacity: (discovering || !discoverQuery.trim()) ? 0.5 : 1,
              transition: "all .15s",
              display: "flex",
              alignItems: "center",
              gap: 7,
              whiteSpace: "nowrap",
            }}
          >
            {discovering ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ animation: "spin .8s linear infinite" }}>
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
          <div style={{ fontFamily: SANS, fontSize: 12, color: "#dc2626", marginTop: 6 }}>
            {discoverError}
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Sort controls */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        <button style={sortBtnStyle("date")}     onClick={() => setSortKey("date")}>Date</button>
        <button style={sortBtnStyle("score")}    onClick={() => setSortKey("score")}>Fit Score</button>
        <button style={sortBtnStyle("category")} onClick={() => setSortKey("category")}>Category</button>
      </div>

      {/* Cards */}
      {sorted.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,.1)", borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontFamily: DISP, fontSize: 18, fontWeight: 600, color: "#111", marginBottom: 6 }}>All caught up</div>
          <div style={{ fontFamily: SANS, fontSize: 13, color: "#6e6e80" }}>No pending moments — check back soon for new AI-identified candidates.</div>
        </div>
      ) : (
        sorted.map(c => (
          <FeedCard
            key={c.id}
            c={c}
            exiting={exitingIds.has(c.id)}
            isNew={newIds.has(c.id)}
            onApprove={() => handleApprove(c)}
            onDismiss={() => handleDismiss(c)}
          />
        ))
      )}
    </div>
  );
}
