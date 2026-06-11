"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { CacheFooter } from "@/components/CacheFooter";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MerchantSignals {
  applePayAffinity: number;
  affinityRationale: string;
  transactionProfile: string;
  marketingOpenness: string;
  outreachApproach: string;
}

interface MomentMatch {
  momentId: string;
  momentName: string;
  momentCategory: string;
  momentStartDate: string;
  relevanceScore: number;
  campaignAngle: string;
  rationale: string;
}

interface Pairing {
  id: string;
  momentId: string;
  momentName: string;
  momentStartDate: string;
  momentCategory: string;
  relevanceScore: number;
  campaignAngle: string;
}

interface MerchantData {
  id: string;
  name: string;
  category: string;
  partnerGroup: string | null;
  partnerStatus: string;
  seasonalNotes: string | null;
  notes: string | null;
  merchantSignals: string | null;
  pastCampaignNotes: string | null;
}

interface Props {
  merchant: MerchantData;
  initialPairings: Pairing[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; bg: string; color: string; border: string }> = {
  existing:  { label: "Existing Partner", bg: "#f5f5f7",              color: "#1d1d1f", border: "#d2d2d7" },
  potential: { label: "Potential",        bg: "#e3f2fd",              color: "#0071e3", border: "rgba(0,113,227,0.3)" },
  in_review: { label: "In Review",        bg: "#fff8ec",              color: "#c47c00", border: "rgba(255,159,10,0.4)" },
  approved:  { label: "Approved",         bg: "rgba(52,199,89,0.1)",  color: "#248a3d", border: "rgba(52,199,89,0.4)" },
  dismissed: { label: "Dismissed",        bg: "rgba(255,59,48,0.08)", color: "#cc2200", border: "rgba(255,59,48,0.3)" },
};

const STATUS_OPTIONS = [
  { value: "existing",  label: "Existing Partner" },
  { value: "potential", label: "Potential" },
  { value: "in_review", label: "In Review" },
  { value: "approved",  label: "Approved" },
  { value: "dismissed", label: "Dismissed" },
];

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  gather:  { bg: "#e8f5e9", color: "#248a3d" },
  improve: { bg: "#fce4ec", color: "#dc5078" },
  excite:  { bg: "#e3f2fd", color: "#0071e3" },
};

function scoreColor(s: number) {
  return s >= 7 ? "#34c759" : s >= 4 ? "#ff9f0a" : "#ff3b30";
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  if (diff <= 30) return `In ${diff}d`;
  return `In ${Math.round(diff / 7)}w`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SignalCard({
  eyebrow, score, text, accent = false,
}: {
  eyebrow: string;
  score?: number;
  text: string;
  accent?: boolean;
}) {
  return (
    <div className="card-p" style={accent ? {
      background: "rgba(0,113,227,0.04)",
      border: "1px solid rgba(0,113,227,0.15)",
    } : {}}>
      <p className="eyebrow" style={{ marginBottom: 8, color: accent ? "#0071e3" : undefined }}>{eyebrow}</p>
      {score !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#e8e8ed" }}>
            <div style={{
              height: "100%", width: `${(score / 10) * 100}%`,
              background: scoreColor(score), borderRadius: 2,
            }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: "1rem", color: scoreColor(score) }}>{score.toFixed(1)}</span>
        </div>
      )}
      <p style={{ fontSize: "0.82rem", color: "#6e6e73", lineHeight: 1.6 }}>{text}</p>
    </div>
  );
}

function MomentRow({
  match, selected, onToggle,
}: {
  match: MomentMatch;
  selected: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_COLORS[match.momentCategory] ?? { bg: "#f5f5f7", color: "#86868b" };
  const sc = match.relevanceScore;

  return (
    <>
      <tr
        style={{
          borderBottom: expanded ? "none" : "1px solid #f0f0f5",
          background: selected ? "rgba(0,113,227,0.04)" : "white",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(v => !v)}
      >
        <td style={{ padding: "10px 12px" }} onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            style={{ cursor: "pointer", width: 14, height: 14, accentColor: "#0071e3" }}
          />
        </td>
        <td style={{ padding: "10px 14px", fontWeight: 600, fontSize: "0.88rem", color: "#1d1d1f" }}>
          <Link href={`/moments/${match.momentId}`} onClick={e => e.stopPropagation()} style={{ color: "#1d1d1f", textDecoration: "none" }}>
            {match.momentName}
          </Link>
        </td>
        <td style={{ padding: "10px 14px" }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: cat.bg, color: cat.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {match.momentCategory}
          </span>
        </td>
        <td style={{ padding: "10px 14px", fontSize: "0.82rem", color: "#86868b", whiteSpace: "nowrap" }}>
          {formatDate(match.momentStartDate)}
        </td>
        <td style={{ padding: "10px 14px", fontSize: "0.78rem", color: sc <= 30 ? "#0071e3" : "#86868b", fontWeight: 500 }}>
          {daysUntil(match.momentStartDate)}
        </td>
        <td style={{ padding: "10px 14px" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: scoreColor(sc), background: `${scoreColor(sc)}18`, padding: "2px 8px", borderRadius: 8 }}>
            {sc.toFixed(1)}
          </span>
        </td>
        <td style={{ padding: "10px 14px", fontSize: "0.82rem", color: "#1d1d1f", lineHeight: 1.4, maxWidth: 280 }}>
          {match.campaignAngle}
        </td>
      </tr>
      {expanded && match.rationale && (
        <tr style={{ borderBottom: "1px solid #f0f0f5", background: selected ? "rgba(0,113,227,0.04)" : "#fafafa" }}>
          <td />
          <td colSpan={6} style={{ padding: "8px 14px 14px", fontSize: "0.8rem", color: "#6e6e73", lineHeight: 1.6 }}>
            {match.rationale}
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MerchantDetailFull({ merchant, initialPairings }: Props) {
  // Parse stored signals
  let initSignals: MerchantSignals | null = null;
  try { if (merchant.merchantSignals) initSignals = JSON.parse(merchant.merchantSignals); } catch { /* */ }

  // Pairings → MomentMatch shape
  const initMatches: MomentMatch[] = initialPairings.map(p => ({
    momentId: p.momentId,
    momentName: p.momentName,
    momentCategory: p.momentCategory,
    momentStartDate: p.momentStartDate,
    relevanceScore: p.relevanceScore,
    campaignAngle: p.campaignAngle,
    rationale: "",
  }));

  // State
  const [signals, setSignals] = useState<MerchantSignals | null>(initSignals);
  const [signalingLoading, setSignalingLoading] = useState(false);
  const [signalingError, setSignalingError] = useState<string | null>(null);

  const [matches, setMatches] = useState<MomentMatch[]>(initMatches);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [status, setStatus] = useState(merchant.partnerStatus);
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  const [competitorData, setCompetitorData] = useState<{
    competitorsDetected: Array<{ brand: string; category: string; activationMethod: string; dominance: string }>;
    overallRisk: string; keyInsight: string; whiteSpace: string;
  } | null>(null);
  const [competitorFromCache, setCompetitorFromCache] = useState(false);
  const [competitorGeneratedAt, setCompetitorGeneratedAt] = useState<string | null>(null);
  const [loadingCompetitor, setLoadingCompetitor] = useState(false);

  const loadCompetitor = useCallback(async (refresh = false) => {
    setLoadingCompetitor(true);
    try {
      const res = await fetch(`/api/merchants/${merchant.id}/competitor${refresh ? "?refresh=true" : ""}`);
      const data = await res.json();
      setCompetitorData(data);
      setCompetitorFromCache(data.fromCache ?? false);
      setCompetitorGeneratedAt(data.generatedAt ?? null);
    } finally {
      setLoadingCompetitor(false);
    }
  }, [merchant.id]);

  const [campaignNotes, setCampaignNotes] = useState(merchant.pastCampaignNotes ?? "");
  const [notesSaving, setNotesSaving] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleGenerateSignals() {
    setSignalingLoading(true);
    setSignalingError(null);
    try {
      const res = await fetch(`/api/merchants/${merchant.id}/signals`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setSignalingError(data.error ?? "Failed"); return; }
      setSignals(data.signals);
    } catch (e) {
      setSignalingError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSignalingLoading(false);
    }
  }

  async function handleFindMoments() {
    setMatchLoading(true);
    setMatchError(null);
    try {
      const res = await fetch(`/api/merchants/${merchant.id}/score-moments`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setMatchError(data.error ?? "Failed"); return; }
      setMatches(data.matches ?? []);
    } catch (e) {
      setMatchError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setMatchLoading(false);
    }
  }

  async function handleStatusChange(next: string) {
    setStatus(next);
    setStatusOpen(false);
    await fetch(`/api/merchants/${merchant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerStatus: next }),
    });
  }

  function handleNotesChange(val: string) {
    setCampaignNotes(val);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      setNotesSaving(true);
      await fetch(`/api/merchants/${merchant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pastCampaignNotes: val }),
      });
      setNotesSaving(false);
    }, 800);
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const sm = STATUS_META[status] ?? STATUS_META.existing;
  const selectedMatches = matches.filter(m => selected.has(m.momentId));
  const primaryMomentId = selectedMatches[0]?.momentId ?? null;
  const pitchUrl = `/pitch/new?merchantId=${merchant.id}${
    primaryMomentId ? `&momentId=${primaryMomentId}` : ""
  }`;

  return (
    <div style={{ padding: "32px 24px", maxWidth: 1000, margin: "0 auto" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 8 }}>
        <Link href="/merchants" style={{ fontSize: "0.82rem", color: "#86868b", textDecoration: "none" }}>
          ← Merchant Catalog
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 32 }}>
        <div>
          {/* Status badge with dropdown */}
          <div ref={statusRef} style={{ position: "relative", display: "inline-block", marginBottom: 8 }}>
            <button
              onClick={() => setStatusOpen(v => !v)}
              style={{
                fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", padding: "3px 10px 3px 10px",
                borderRadius: 10, border: `1px solid ${sm.border}`,
                background: sm.bg, color: sm.color,
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
              }}
            >
              {sm.label}
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1.5 3L4 5.5L6.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {statusOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50,
                background: "white", border: "1px solid rgba(0,0,0,.1)", borderRadius: 10,
                boxShadow: "0 4px 20px rgba(0,0,0,.12)", overflow: "hidden", minWidth: 160,
              }}>
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "9px 14px", fontSize: "0.82rem",
                      fontWeight: status === opt.value ? 600 : 400,
                      color: status === opt.value ? "#0071e3" : "#1d1d1f",
                      background: status === opt.value ? "rgba(0,113,227,0.06)" : "transparent",
                      border: "none", cursor: "pointer",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <h1 style={{ marginBottom: 4 }}>{merchant.name}</h1>
          <p style={{ fontSize: "0.85rem", color: "#86868b" }}>
            {merchant.category}
            {merchant.partnerGroup && <span style={{ marginLeft: 8 }}>· {merchant.partnerGroup}</span>}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <Link href={pitchUrl} className="btn btn-primary" style={{ textDecoration: "none" }}>
            Build Pitch →
          </Link>
          <Link href={`/merchants/${merchant.id}/edit`} className="btn btn-outline" style={{ textDecoration: "none" }}>
            Edit
          </Link>
        </div>
      </div>

      {/* ── Section 1: Merchant Signals ──────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <p className="eyebrow">MERCHANT SIGNALS</p>
          {signals && (
            <button
              onClick={handleGenerateSignals}
              disabled={signalingLoading}
              style={{ fontSize: "0.78rem", color: "#0071e3", background: "none", border: "none", cursor: "pointer", opacity: signalingLoading ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              {signalingLoading && <span className="spinner" />}
              {signalingLoading ? "Generating signals…" : "Re-evaluate"}
            </button>
          )}
        </div>

        {signalingLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", background: "rgba(52,199,89,0.06)", border: "1px solid rgba(52,199,89,0.2)", borderRadius: 12, marginBottom: 12 }}>
            <span className="spinner" style={{ color: "#248a3d" }} />
            <span style={{ fontSize: "0.85rem", color: "#248a3d", fontWeight: 500 }}>Generating merchant signals — Apple Pay affinity, transaction profile, and outreach approach…</span>
          </div>
        )}
        {signalingError && (
          <p style={{ fontSize: "0.82rem", color: "#cc2200", marginBottom: 12 }}>{signalingError}</p>
        )}

        {signals ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <SignalCard
              eyebrow="APPLE PAY AFFINITY"
              score={signals.applePayAffinity}
              text={signals.affinityRationale}
            />
            <SignalCard
              eyebrow="TRANSACTION PROFILE"
              text={signals.transactionProfile}
            />
            <SignalCard
              eyebrow="MARKETING OPENNESS"
              text={signals.marketingOpenness}
            />
            <SignalCard
              eyebrow="OUTREACH APPROACH"
              text={signals.outreachApproach}
              accent
            />
          </div>
        ) : (
          <div className="card-p" style={{ textAlign: "center", padding: "32px", background: "rgba(52,199,89,0.04)", border: "1px solid rgba(52,199,89,0.15)" }}>
            <p className="eyebrow" style={{ color: "#248a3d", marginBottom: 10 }}>MERCHANT EVALUATION</p>
            <h3 style={{ marginBottom: 8 }}>Generate merchant signals</h3>
            <p style={{ fontSize: "0.85rem", color: "#86868b", marginBottom: 20 }}>
              Claude will assess Apple Pay affinity, transaction profile, marketing openness, and suggest the best outreach approach for this partner.
            </p>
            <button className="btn btn-primary" onClick={handleGenerateSignals} disabled={signalingLoading} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              {signalingLoading && <span className="spinner" />}
              {signalingLoading ? "Generating merchant signals…" : "Evaluate with Claude"}
            </button>
          </div>
        )}

        {/* Past Campaign Notes */}
        <div className="card-p" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
            <p className="eyebrow">PAST CAMPAIGN NOTES</p>
            {notesSaving && <span style={{ fontSize: "0.72rem", color: "#86868b" }}>Saving…</span>}
          </div>
          <textarea
            value={campaignNotes}
            onChange={e => handleNotesChange(e.target.value)}
            placeholder="Add BD insights, data science notes, or past campaign history here..."
            rows={4}
            style={{
              width: "100%", fontSize: "0.85rem", color: "#1d1d1f", lineHeight: 1.6,
              border: "none", outline: "none", resize: "vertical",
              background: "transparent", fontFamily: "inherit",
            }}
          />
        </div>
      </div>

      {/* ── Section: Competitor Landscape ────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>COMPETITOR LANDSCAPE</p>
        {competitorData ? (
          <div className="card-p" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700,
                background: competitorData.overallRisk === "high" ? "#ffe9e8" : competitorData.overallRisk === "medium" ? "#fff3e0" : competitorData.overallRisk === "low" ? "#fffde7" : "#e8f5e9",
                color: competitorData.overallRisk === "high" ? "#cc2200" : competitorData.overallRisk === "medium" ? "#c47c00" : competitorData.overallRisk === "low" ? "#a36500" : "#248a3d",
              }}>
                {competitorData.overallRisk === "none" ? "No competitor presence" : `${competitorData.overallRisk} competitive risk`}
              </span>
            </div>
            {competitorData.competitorsDetected.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {competitorData.competitorsDetected.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: "0.85rem" }}>
                    <span style={{
                      flexShrink: 0, padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700,
                      background: c.dominance === "dominant" ? "#ffe9e8" : c.dominance === "significant" ? "#fff3e0" : "#f5f5f7",
                      color: c.dominance === "dominant" ? "#cc2200" : c.dominance === "significant" ? "#c47c00" : "#6e6e73",
                    }}>{c.dominance}</span>
                    <div>
                      <span style={{ fontWeight: 600, color: "#1d1d1f" }}>{c.brand}</span>
                      <span style={{ color: "#86868b", margin: "0 6px" }}>·</span>
                      <span style={{ color: "#86868b", textTransform: "capitalize" }}>{c.category.replace(/_/g, " ")}</span>
                      <p style={{ fontSize: "0.78rem", color: "#6e6e73", marginTop: 2 }}>{c.activationMethod}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, paddingTop: 12, borderTop: "1px solid #f0f0f5" }}>
              <div>
                <p className="eyebrow" style={{ marginBottom: 6 }}>KEY INSIGHT</p>
                <p style={{ fontSize: "0.82rem", color: "#1d1d1f", lineHeight: 1.6 }}>{competitorData.keyInsight}</p>
              </div>
              <div>
                <p className="eyebrow" style={{ color: "#248a3d", marginBottom: 6 }}>WHITE SPACE</p>
                <p style={{ fontSize: "0.82rem", color: "#1d1d1f", lineHeight: 1.6 }}>{competitorData.whiteSpace}</p>
              </div>
            </div>
            <CacheFooter fromCache={competitorFromCache} generatedAt={competitorGeneratedAt} onRegenerate={() => loadCompetitor(true)} isRegenerating={loadingCompetitor} />
          </div>
        ) : (
          <button
            onClick={() => loadCompetitor(false)}
            disabled={loadingCompetitor}
            className="btn btn-outline"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {loadingCompetitor && <span className="spinner" />}
            {loadingCompetitor ? "Analyzing…" : "Analyze Competitor Landscape"}
          </button>
        )}
      </div>

      {/* ── Section 2: Top Moments ───────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <p className="eyebrow">TOP MOMENTS</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", color: "#86868b" }}>
              {matches.length} moment{matches.length !== 1 ? "s" : ""} scored
            </span>
            <button
              onClick={handleFindMoments}
              disabled={matchLoading}
              className="btn btn-outline"
              style={{ fontSize: "0.78rem", padding: "4px 12px", opacity: matchLoading ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {matchLoading && <span className="spinner" />}
              {matchLoading ? "Claude is scoring moments…" : matches.length > 0 ? "Re-score" : "Find Matching Moments"}
            </button>
          </div>
        </div>

        {matchLoading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", background: "rgba(0,113,227,0.04)", border: "1px solid rgba(0,113,227,0.15)", borderRadius: 12, marginBottom: 12 }}>
            <span className="spinner" style={{ color: "#0071e3" }} />
            <span style={{ fontSize: "0.85rem", color: "#0071e3", fontWeight: 500 }}>Claude is scoring all upcoming moments against this merchant…</span>
          </div>
        )}
        {matchError && (
          <div style={{ padding: "10px 14px", background: "#fff5f5", border: "1px solid #ffc7c5", borderRadius: 10, fontSize: "0.82rem", color: "#cc2200", marginBottom: 12 }}>{matchError}</div>
        )}

        {matches.length > 0 ? (
          <>
            <div className="card-apple" style={{ overflow: "hidden", marginBottom: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f0f0f5", background: "#fafafa" }}>
                    <th style={{ width: 32, padding: "10px 12px" }} />
                    <th style={{ padding: "10px 14px", textAlign: "left" }} className="eyebrow">Moment</th>
                    <th style={{ padding: "10px 14px", textAlign: "left" }} className="eyebrow">Category</th>
                    <th style={{ padding: "10px 14px", textAlign: "left" }} className="eyebrow">Date</th>
                    <th style={{ padding: "10px 14px", textAlign: "left" }} className="eyebrow">Timing</th>
                    <th style={{ padding: "10px 14px", textAlign: "left" }} className="eyebrow">Score</th>
                    <th style={{ padding: "10px 14px", textAlign: "left" }} className="eyebrow">Campaign Angle</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map(m => (
                    <MomentRow
                      key={m.momentId}
                      match={m}
                      selected={selected.has(m.momentId)}
                      onToggle={() => toggleSelect(m.momentId)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {selected.size > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#1d1d1f", borderRadius: 12 }}>
                <span style={{ fontSize: "0.85rem", color: "white" }}>
                  {selected.size} moment{selected.size !== 1 ? "s" : ""} selected
                </span>
                <Link href={pitchUrl} style={{
                  fontSize: "0.85rem", fontWeight: 600, color: "white",
                  background: "#0071e3", padding: "7px 16px", borderRadius: 8,
                  textDecoration: "none",
                }}>
                  Build Pitch with Selected →
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="card-p" style={{ textAlign: "center", padding: "24px", background: "rgba(0,113,227,0.04)", border: "1px solid rgba(0,113,227,0.15)" }}>
            <p style={{ fontSize: "0.85rem", color: "#86868b", marginBottom: 16 }}>
              No moments scored for this merchant yet.
            </p>
            <button className="btn btn-blue" onClick={handleFindMoments} disabled={matchLoading}>
              {matchLoading ? "Finding…" : "Find Matching Moments"}
            </button>
          </div>
        )}
      </div>

      {/* ── Section 3: Merchant Context ─────────────────────────────────────── */}
      {(merchant.seasonalNotes || merchant.notes) && (
        <div style={{ marginBottom: 28 }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>MERCHANT CONTEXT</p>
          <div className="card-p" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {merchant.seasonalNotes && (
              <div>
                <p className="eyebrow" style={{ marginBottom: 6 }}>Seasonal Notes</p>
                <p style={{ fontSize: "0.9rem", color: "#1d1d1f", lineHeight: 1.6 }}>{merchant.seasonalNotes}</p>
              </div>
            )}
            {merchant.notes && (
              <div style={merchant.seasonalNotes ? { borderTop: "1px solid #f0f0f5", paddingTop: 16 } : {}}>
                <p className="eyebrow" style={{ marginBottom: 6 }}>Notes</p>
                <p style={{ fontSize: "0.9rem", color: "#6e6e73", lineHeight: 1.6 }}>{merchant.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
