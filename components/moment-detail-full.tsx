"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InfluencerPanel } from "@/components/influencer-panel";
import { CacheFooter } from "@/components/CacheFooter";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Pairing {
  id: string;
  merchantId: string;
  merchantName: string;
  merchantCategory: string;
  merchantPartnerStatus?: string | null;
  relevanceScore: number;
  campaignAngle: string;
  rationale: string | null;
}

interface ParsedRationale {
  text: string;
  offerType: string;
}

function parseRationale(raw: string | null): ParsedRationale {
  if (!raw) return { text: "", offerType: "" };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "text" in parsed) {
      return { text: parsed.text ?? "", offerType: parsed.offerType ?? "" };
    }
  } catch { /* */ }
  return { text: raw, offerType: "" };
}

interface ChannelRec {
  channel: string;
  channelLabel: string;
  recommended: boolean;
  rationale: string;
  suggestedFormat: string;
}

interface ScoreRationale {
  opportunitySummary?: string;
  ecommerceRationale?: string;
  audienceRationale?: string;
  whiteSpaceRationale?: string;
  whiteSpaceAnalysis?: string;
  overallRationale?: string;
}

interface MomentData {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  category: string;
  description: string;
  hook: string | null;
  quarter: string | null;
  score: number | null;
  ecommerceScore: number | null;
  audienceFit: number | null;
  whiteSpaceScore: number | null;
  scoreRationale: string | null;
  channelRecommendations: string | null;
  notes: string | null;
}

interface PitchSummary {
  id: string;
  status: string;
  targetQuarter: string | null;
  createdAt: string;
  updatedAt: string;
  merchantName: string | null;
  merchantCategory: string | null;
}

interface Props {
  moment: MomentData;
  initialPairings: Pairing[];
  initialPitches?: PitchSummary[];
}

// ── Progress message ──────────────────────────────────────────────────────────

const EVAL_STAGES = [
  "Analyzing moment signals…",
  "Scoring ecommerce potential…",
  "Evaluating audience alignment…",
  "Mapping competitor landscape…",
  "Finalizing recommendations…",
];

function ProgressMessage({ stages }: { stages?: string[] }) {
  const list = stages ?? EVAL_STAGES;
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setStage(prev => (prev + 1) % list.length), 4000);
    return () => clearInterval(interval);
  }, [list.length]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 14, height: 14, border: "2px solid #0071e3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ fontSize: "0.85rem", color: "#0071e3", fontWeight: 500 }}>{list[stage]}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Score helpers ──────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score == null) return "#d2d2d7";
  if (score >= 7) return "#34c759";
  if (score >= 4) return "#ff9f0a";
  return "#ff3b30";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreCard({
  eyebrow, label, score, rationale,
}: {
  eyebrow: string;
  label: string;
  score: number | null;
  rationale?: string;
}) {
  const color = scoreColor(score);
  return (
    <div className="card-p">
      <p className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</p>
      <p style={{ fontWeight: 600, marginBottom: 10, fontSize: "0.9rem", color: "#1d1d1f" }}>{label}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#e8e8ed" }}>
          <div style={{
            height: "100%",
            width: `${((score ?? 0) / 10) * 100}%`,
            background: color, borderRadius: 2,
            transition: "width 0.4s ease",
          }} />
        </div>
        <span style={{ fontWeight: 700, fontSize: "1.1rem", color, minWidth: 32, textAlign: "right" }}>
          {score != null ? score.toFixed(1) : "–"}
        </span>
      </div>
      {rationale && (
        <p style={{ fontSize: "0.75rem", color: "#6e6e73", lineHeight: 1.6 }}>{rationale}</p>
      )}
    </div>
  );
}

function CategoryPill({ category }: { category: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    gather:  { bg: "#e8f5e9", text: "#248a3d" },
    improve: { bg: "#fce4ec", text: "#dc5078" },
    excite:  { bg: "#e3f2fd", text: "#0071e3" },
  };
  const s = colors[category] ?? { bg: "#f5f5f7", text: "#86868b" };
  return (
    <span style={{
      fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em",
      textTransform: "uppercase", padding: "3px 10px", borderRadius: 10,
      background: s.bg, color: s.text,
    }}>
      {category}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface CompetitorData {
  competitorsDetected: Array<{ brand: string; category: string; activationMethod: string; dominance: string }>;
  overallRisk: "high" | "medium" | "low" | "none";
  keyInsight: string;
  whiteSpace: string;
}

export function MomentDetailFull({ moment, initialPairings, initialPitches = [] }: Props) {
  const router = useRouter();
  const [pairings, setPairings] = useState<Pairing[]>(initialPairings);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scored, setScored] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [competitorData, setCompetitorData] = useState<CompetitorData | null>(null);
  const [competitorFromCache, setCompetitorFromCache] = useState(false);
  const [competitorGeneratedAt, setCompetitorGeneratedAt] = useState<string | null>(null);
  const [loadingCompetitor, setLoadingCompetitor] = useState(false);
  const [buildingPitch, setBuildingPitch] = useState<string | null>(null);
  const [showMultiMerchantModal, setShowMultiMerchantModal] = useState(false);
  const [isCreatingPitches, setIsCreatingPitches] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [approvedPitches, setApprovedPitches] = useState<any[]>([]);
  const [momentPitches, setMomentPitches] = useState<PitchSummary[]>(initialPitches);
  const [moduleHeadline, setModuleHeadline] = useState("");
  const [moduleSubhead, setModuleSubhead] = useState("");
  const [isGeneratingHeadline, setIsGeneratingHeadline] = useState(false);

  // Parse stored JSON fields
  let rationale: ScoreRationale = {};
  try { if (moment.scoreRationale) rationale = JSON.parse(moment.scoreRationale); } catch { /* */ }

  let channels: ChannelRec[] = [];
  try { if (moment.channelRecommendations) channels = JSON.parse(moment.channelRecommendations); } catch { /* */ }

  const hasScores = moment.ecommerceScore != null && moment.audienceFit != null && moment.whiteSpaceScore != null;

  // Live score values (updated after re-score)
  const [liveScores, setLiveScores] = useState<{
    ecommerce: number | null;
    audience: number | null;
    whiteSpace: number | null;
    rationale: ScoreRationale;
    channels: ChannelRec[];
    hasScores: boolean;
  }>({
    ecommerce: moment.ecommerceScore,
    audience: moment.audienceFit,
    whiteSpace: moment.whiteSpaceScore,
    rationale,
    channels,
    hasScores,
  });

  async function handleScore() {
    setScoring(true);
    setScoreError(null);
    try {
      const res = await fetch(`/api/moments/${moment.id}/score`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setScoreError(data.error ?? "Scoring failed");
        return;
      }
      // Refresh moment data + pairings (no-store to bypass Next.js route cache)
      const refreshed = await fetch(`/api/moments/${moment.id}`, { cache: "no-store" }).then(r => r.json());
      if (refreshed.pairings) setPairings(refreshed.pairings);

      let newRationale: ScoreRationale = {};
      let newChannels: ChannelRec[] = [];
      try { if (refreshed.scoreRationale) newRationale = JSON.parse(refreshed.scoreRationale); } catch { /* */ }
      try { if (refreshed.channelRecommendations) newChannels = JSON.parse(refreshed.channelRecommendations); } catch { /* */ }

      setLiveScores({
        ecommerce: refreshed.ecommerceScore,
        audience: refreshed.audienceFit,
        whiteSpace: refreshed.whiteSpaceScore,
        rationale: newRationale,
        channels: newChannels,
        hasScores: true,
      });
      setScored(true);
    } catch (e) {
      setScoreError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setScoring(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const loadCompetitor = useCallback(async (refresh = false) => {
    setLoadingCompetitor(true);
    try {
      const res = await fetch(`/api/moments/${moment.id}/competitor${refresh ? "?refresh=true" : ""}`);
      const data = await res.json();
      setCompetitorData(data);
      setCompetitorFromCache(data.fromCache ?? false);
      setCompetitorGeneratedAt(data.generatedAt ?? null);
    } finally {
      setLoadingCompetitor(false);
    }
  }, [moment.id]);

  // Fetch approved pitches for partnership preview
  useEffect(() => {
    fetch(`/api/moments/${moment.id}/approved-pitches`)
      .then(r => r.json())
      .then(data => setApprovedPitches(data.pitches ?? []));
  }, [moment.id]);


  function buildPitchFromPairing(merchantId: string) {
    router.push(`/pitch/new?momentId=${moment.id}&merchantId=${merchantId}`);
  }

  // Sort pairings: dismissed to bottom, then by relevanceScore desc
  const sortedPairings = [...pairings].sort((a, b) => {
    const aDismissed = a.merchantPartnerStatus === "dismissed" ? 1 : 0;
    const bDismissed = b.merchantPartnerStatus === "dismissed" ? 1 : 0;
    if (aDismissed !== bDismissed) return aDismissed - bDismissed;
    return (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
  });

  const selectedMerchants = pairings.filter(p => selected.has(p.id));
  const sortedSelected = [...selectedMerchants].sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
  const primaryMerchantId = sortedSelected[0]?.merchantId ?? null;
  const pitchUrl = `/pitch/new?momentId=${moment.id}${
    primaryMerchantId ? `&merchantId=${primaryMerchantId}` : ""
  }`;

  async function handleCreateAllPitches() {
    setIsCreatingPitches(true);
    setCreatedCount(0);
    const sortedIds = [...selectedMerchants]
      .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
      .map(m => m.merchantId);

    const res = await fetch("/api/pitch/build-multi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ momentId: moment.id, merchantIds: sortedIds }),
    });
    const data = await res.json();

    const pitchIds = (data.pitches ?? []).map((p: any) => p.id);
    sessionStorage.setItem("pitchQueue", JSON.stringify(pitchIds));

    router.push(`/pitch/${data.firstPitchId}`);
  }

  async function handleGenerateHeadline() {
    setIsGeneratingHeadline(true);
    try {
      const res = await fetch(`/api/moments/${moment.id}/module-headline`);
      const data = await res.json();
      setModuleHeadline(data.headline ?? "");
      setModuleSubhead(data.subhead ?? "");
    } finally {
      setIsGeneratingHeadline(false);
    }
  }

  function formatDate(dateStr: string) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const dateLabel = moment.endDate && moment.endDate !== moment.startDate
    ? `${formatDate(moment.startDate)} – ${formatDate(moment.endDate)}`
    : formatDate(moment.startDate);

  // Show hook types as pills
  const hookPills = moment.hook ? moment.hook.split(",").map(h => h.trim()).filter(Boolean) : [];

  return (
    <div style={{ padding: "32px 24px", maxWidth: 1000, margin: "0 auto" }}>

      {/* ── Section 1: Header ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 8 }}>
        <Link href="/calendar" style={{ fontSize: "0.82rem", color: "#86868b", textDecoration: "none" }}>
          ← Calendar
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <CategoryPill category={moment.category} />
            {liveScores.hasScores && liveScores.ecommerce != null && (
              <span style={{
                fontSize: "0.78rem", fontWeight: 700, color: scoreColor(
                  (liveScores.ecommerce + (liveScores.audience ?? 0) + (liveScores.whiteSpace ?? 0)) / 3
                ),
              }}>
                {((liveScores.ecommerce + (liveScores.audience ?? 0) + (liveScores.whiteSpace ?? 0)) / 3).toFixed(1)} / 10
              </span>
            )}
          </div>
          <h1 style={{ marginBottom: 6 }}>{moment.name}</h1>
          <p style={{ fontSize: "0.85rem", color: "#86868b" }}>
            {dateLabel}
            {moment.quarter && <span style={{ marginLeft: 8 }}>· {moment.quarter}</span>}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link href={pitchUrl} className="btn btn-primary" style={{ textDecoration: "none" }}>
            Build Pitch →
          </Link>
          <Link href={`/moments/${moment.id}/edit`} className="btn btn-outline" style={{ textDecoration: "none" }}>
            Edit
          </Link>
          <button
            className="btn btn-outline"
            onClick={handleScore}
            disabled={scoring}
            style={{ opacity: scoring ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {scoring && <span className="spinner" />}
            {scoring ? "Claude is evaluating…" : scored ? "Re-score" : liveScores.hasScores ? "Re-score" : "Score"}
          </button>
        </div>
      </div>

      {scoreError && (
        <div style={{ marginBottom: 16, padding: "10px 16px", background: "#fff5f5", border: "1px solid #ffc7c5", borderRadius: 10, fontSize: "0.85rem", color: "#cc2200" }}>
          {scoreError}
        </div>
      )}

      {/* ── Section 2: AI Evaluation ────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>AI EVALUATION</p>

        {scoring && (
          <div style={{ padding: "14px 18px", background: "rgba(0,113,227,0.06)", border: "1px solid rgba(0,113,227,0.2)", borderRadius: 12, marginBottom: 12 }}>
            <ProgressMessage />
          </div>
        )}

        {liveScores.hasScores ? (
          <>
            {/* Opportunity Summary — shown FIRST */}
            {liveScores.rationale.opportunitySummary && (
              <div className="card-p" style={{
                background: "rgba(0,113,227,0.04)",
                border: "1px solid rgba(0,113,227,0.12)",
                marginBottom: 16,
              }}>
                <p className="eyebrow" style={{ color: "#0071e3", marginBottom: 8 }}>OPPORTUNITY SUMMARY</p>
                <p style={{ fontSize: "1rem", lineHeight: 1.6, fontWeight: 500 }}>{liveScores.rationale.opportunitySummary}</p>
              </div>
            )}

            {/* Three score cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
              <ScoreCard
                eyebrow="SPENDING BEHAVIOR"
                label="Ecommerce Moment"
                score={liveScores.ecommerce}
                rationale={liveScores.rationale.ecommerceRationale}
              />
              <ScoreCard
                eyebrow="REACH"
                label="Audience Fit"
                score={liveScores.audience}
                rationale={liveScores.rationale.audienceRationale}
              />
              <ScoreCard
                eyebrow="COMPETITIVE LANDSCAPE"
                label="White Space"
                score={liveScores.whiteSpace}
                rationale={liveScores.rationale.whiteSpaceRationale}
              />
            </div>

            {/* Moment Analysis (renamed from White Space Analysis) */}
            {liveScores.rationale.whiteSpaceAnalysis && (
              <div className="card-p" style={{ background: "rgba(0,113,227,0.03)", border: "1px solid rgba(0,113,227,0.12)", marginBottom: 0 }}>
                <p className="eyebrow" style={{ color: "#0071e3", marginBottom: 8 }}>MOMENT ANALYSIS</p>
                <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "#1d1d1f" }}>{liveScores.rationale.whiteSpaceAnalysis}</p>
              </div>
            )}
          </>
        ) : (
          <div className="card-p" style={{ textAlign: "center", padding: "32px 24px", background: "rgba(0,113,227,0.04)", border: "1px solid rgba(0,113,227,0.15)" }}>
            <p className="eyebrow" style={{ color: "#0071e3", marginBottom: 10 }}>AI EVALUATION</p>
            <h3 style={{ marginBottom: 8 }}>Score this moment</h3>
            <p style={{ fontSize: "0.85rem", color: "#86868b", marginBottom: 20 }}>
              Claude will evaluate the Apple Pay opportunity — ecommerce fit, audience reach, and competitive white space — and score all merchants for this moment.
            </p>
            <button className="btn btn-blue" onClick={handleScore} disabled={scoring} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              {scoring && <span className="spinner" />}
              {scoring ? "Claude is evaluating…" : "Evaluate with Claude"}
            </button>
          </div>
        )}
      </div>

      {/* ── Section 3: Competitor Landscape ─────────────────────────────────── */}
      <div style={{ marginBottom: 28, minHeight: 80 }}>
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
        ) : loadingCompetitor ? (
          <ProgressMessage stages={["Scanning competitor activations…","Checking payment brand presence…","Assessing dominance levels…","Identifying white space…","Finalizing analysis…"]} />
        ) : (
          <button
            onClick={() => loadCompetitor(false)}
            className="btn btn-outline"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            Analyze Competitor Landscape
          </button>
        )}
      </div>

      {/* ── Section: Partnership Pitches ────────────────────────────────────── */}
      {momentPitches.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>PARTNERSHIP PITCHES</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {momentPitches.map((pitch: any) => (
              <Link
                key={pitch.id}
                href={`/pitch/${pitch.id}`}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 16px", background: "white", borderRadius: 10,
                  border: "1px solid #e8e8ed", textDecoration: "none", fontSize: "0.875rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: pitch.status === "approved" ? "#34c759"
                      : pitch.status === "sent" ? "#0071e3"
                      : pitch.status === "rejected" ? "#ff3b30"
                      : "#d2d2d7",
                  }} />
                  <span style={{ fontWeight: 600, color: "#1d1d1f" }}>{pitch.merchantName ?? "No merchant"}</span>
                  {pitch.targetQuarter && (
                    <span style={{ color: "#86868b" }}>{pitch.targetQuarter}</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.75rem", color: "#86868b", textTransform: "capitalize" }}>{pitch.status}</span>
                  <span style={{ color: "#d2d2d7" }}>→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Section: Merchant Matches ─────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <p className="eyebrow">MERCHANT MATCHES <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#86868b" }}>(dismissed shown at bottom)</span></p>
          <span style={{ fontSize: "0.78rem", color: "#86868b" }}>
            {pairings.length} partner{pairings.length !== 1 ? "s" : ""} scored
          </span>
        </div>

        {pairings.length > 0 ? (
          <>
            <div className="card-apple" style={{ overflow: "hidden", marginBottom: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f0f0f5", background: "#fafafa" }}>
                    <th style={{ width: 32, padding: "10px 12px" }} />
                    <th style={{ padding: "10px 14px", textAlign: "left" }} className="eyebrow">Merchant</th>
                    <th style={{ padding: "10px 14px", textAlign: "left" }} className="eyebrow">Category</th>
                    <th style={{ padding: "10px 14px", textAlign: "left" }} className="eyebrow">Score</th>
                    <th style={{ padding: "10px 14px", textAlign: "left" }} className="eyebrow">Campaign Angle</th>
                    <th style={{ padding: "10px 12px" }} />
                  </tr>
                </thead>
                <tbody>
                  {sortedPairings.map(p => (
                    <MerchantRow
                      key={p.id}
                      pairing={p}
                      selected={selected.has(p.id)}
                      onToggle={() => toggleSelect(p.id)}
                      onBuildPitch={() => buildPitchFromPairing(p.merchantId)}
                      isBuilding={buildingPitch === p.merchantId}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sticky selection bar — rendered at bottom of viewport */}
          </>
        ) : (
          <div className="card-p" style={{ textAlign: "center", padding: "24px", background: "rgba(0,113,227,0.04)", border: "1px solid rgba(0,113,227,0.15)" }}>
            <p style={{ fontSize: "0.85rem", color: "#86868b", marginBottom: 16 }}>
              No merchants scored yet.{!liveScores.hasScores ? " Evaluate this moment with Claude first." : ""}
            </p>
            {!liveScores.hasScores && (
              <button className="btn btn-blue" onClick={handleScore} disabled={scoring}>
                {scoring ? "Evaluating…" : "Evaluate with Claude"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Section: Channel Recommendations ──────────────────────────────── */}
      {liveScores.channels.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p className="eyebrow" style={{ marginBottom: 12 }}>CHANNEL RECOMMENDATIONS</p>
          <div className="card-p">
            {liveScores.channels.map((ch, i) => (
              <div key={ch.channel} style={{
                display: "flex", gap: 12, padding: "14px 0",
                borderBottom: i < liveScores.channels.length - 1 ? "1px solid #f0f0f5" : "none",
                alignItems: "flex-start",
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 6,
                  background: ch.recommended ? "#34c759" : "#d2d2d7",
                }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: 2, color: "#1d1d1f" }}>{ch.channelLabel}</p>
                  <p style={{ fontSize: "0.78rem", color: "#6e6e73", marginBottom: ch.recommended ? 4 : 0, lineHeight: 1.5 }}>{ch.rationale}</p>
                  {ch.recommended && (
                    <p style={{ fontSize: "0.75rem", color: "#0071e3", lineHeight: 1.5 }}>{ch.suggestedFormat}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 5: Influencer Strategy ──────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>INFLUENCER STRATEGY</p>
        <div className="card-p">
          <InfluencerPanel momentId={moment.id} hasPairings={pairings.length > 0} />
        </div>
      </div>

      {/* ── Fixed sticky selection bar ─────────────────────────────────────── */}
      {selected.size > 0 && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
          background: "white", borderTop: "1px solid #e8e8ed",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.08)",
          padding: "12px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: "0.88rem", color: "#6e6e73" }}>
            <span style={{ fontWeight: 700, color: "#1d1d1f" }}>{selected.size}</span>
            {" "}merchant{selected.size !== 1 ? "s" : ""} selected
          </span>
          <button
            onClick={() => selected.size === 1 ? router.push(pitchUrl) : setShowMultiMerchantModal(true)}
            style={{
              fontSize: "0.88rem", fontWeight: 600, color: "white",
              background: "#1d1d1f", padding: "9px 20px", borderRadius: 10,
              border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            Build Pitch{selected.size > 1 ? "es" : ""} →
          </button>
        </div>
      )}

      {/* ── Multi-merchant confirmation modal ─────────────────────────────── */}
      {showMultiMerchantModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 60,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{ background: "white", borderRadius: 20, padding: 24, maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1d1d1f", marginBottom: 4 }}>
              Create {selectedMerchants.length} Partnership Pitches
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#6e6e73", marginBottom: 16 }}>
              Each merchant receives their own tailored pitch — you&apos;ll send them separately.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {[...selectedMerchants]
                .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
                .map((m, i) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.88rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: "50%", background: "#f5f5f7",
                        fontSize: "0.7rem", display: "flex", alignItems: "center", justifyContent: "center", color: "#6e6e73", flexShrink: 0,
                      }}>{i + 1}</span>
                      <span style={{ fontWeight: 600, color: "#1d1d1f" }}>{m.merchantName}</span>
                      <span style={{ color: "#86868b" }}>{m.merchantCategory}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: "#1d1d1f" }}>{m.relevanceScore?.toFixed(1)}</span>
                  </div>
                ))}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowMultiMerchantModal(false)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #e8e8ed", background: "white", fontSize: "0.88rem", cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAllPitches}
                disabled={isCreatingPitches}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, background: "#1d1d1f", color: "white", border: "none", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: isCreatingPitches ? 0.6 : 1 }}
              >
                {isCreatingPitches
                  ? `Creating ${createdCount} of ${selectedMerchants.length}…`
                  : `Create ${selectedMerchants.length} Pitches →`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Section: Partnership Module Preview ──────────────────────────────── */}
      {approvedPitches.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p className="eyebrow">PARTNERSHIP MODULE PREVIEW</p>
              <p style={{ fontSize: "0.82rem", color: "#86868b", marginTop: 2 }}>
                What this campaign&apos;s promotional module could look like
              </p>
            </div>
            <button
              onClick={handleGenerateHeadline}
              disabled={isGeneratingHeadline}
              style={{
                fontSize: "0.75rem", padding: "6px 12px", borderRadius: 8, border: "1px solid #e8e8ed",
                background: "white", cursor: "pointer", fontFamily: "inherit", opacity: isGeneratingHeadline ? 0.6 : 1,
              }}
            >
              {isGeneratingHeadline ? "Generating…" : "✨ Generate Headline"}
            </button>
          </div>

          {moduleHeadline && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1d1d1f", marginBottom: 4 }}>{moduleHeadline}</h3>
              {moduleSubhead && <p style={{ fontSize: "1rem", color: "#6e6e73" }}>{moduleSubhead}</p>}
            </div>
          )}

          <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8, marginLeft: -4, paddingLeft: 4 }}>
            {approvedPitches.map((pitch: any) => (
              <MerchantPreviewCard
                key={pitch.id}
                merchantName={pitch.merchant?.name ?? ""}
                tagline={pitch.offerMechanics?.split(".")[0] ?? ""}
                category={pitch.merchant?.category ?? ""}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Section 6: Moment Context ────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>MOMENT CONTEXT</p>
        <div className="card-p" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: 6 }}>Description</p>
            <p style={{ fontSize: "0.9rem", color: "#1d1d1f", lineHeight: 1.6 }}>{moment.description}</p>
          </div>
          {hookPills.length > 0 && (
            <div style={{ borderTop: "1px solid #f0f0f5", paddingTop: 16 }}>
              <p className="eyebrow" style={{ marginBottom: 8 }}>Hook Type</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {hookPills.map(h => (
                  <span key={h} style={{
                    fontSize: "0.78rem", padding: "3px 10px", borderRadius: 10,
                    background: "#f5f5f7", color: "#1d1d1f", border: "1px solid #e8e8ed",
                  }}>{h}</span>
                ))}
              </div>
            </div>
          )}
          {moment.notes && (
            <div style={{ borderTop: "1px solid #f0f0f5", paddingTop: 16 }}>
              <p className="eyebrow" style={{ marginBottom: 6 }}>Notes</p>
              <p style={{ fontSize: "0.9rem", color: "#6e6e73", lineHeight: 1.6 }}>{moment.notes}</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

// ── Merchant Preview Card ─────────────────────────────────────────────────────

function MerchantPreviewCard({
  merchantName,
  tagline,
  category,
}: {
  merchantName: string;
  tagline: string;
  category: string;
}) {
  const domain = merchantName.toLowerCase().replace(/[^a-z0-9]/g, "") + ".com";
  const logoUrl = `https://logo.clearbit.com/${domain}`;
  const [logoError, setLogoError] = useState(false);

  return (
    <div style={{
      flexShrink: 0, width: 224, background: "#f9f9fb", borderRadius: 16,
      padding: 20, display: "flex", flexDirection: "column", gap: 12,
      border: "1px solid #f0f0f5",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14, background: "white", border: "1px solid #e8e8ed",
        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
      }}>
        {!logoError ? (
          <img
            src={logoUrl}
            alt={merchantName}
            style={{ width: 40, height: 40, objectFit: "contain" }}
            onError={() => setLogoError(true)}
          />
        ) : (
          <span style={{ fontSize: "1.3rem", fontWeight: 700, color: "#86868b" }}>
            {merchantName[0]}
          </span>
        )}
      </div>

      <div>
        <p style={{ fontWeight: 600, color: "#1d1d1f", fontSize: "0.88rem", marginBottom: 2 }}>{merchantName}</p>
        <p style={{ color: "#6e6e73", fontSize: "0.75rem", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {tagline || `Pay with Apple Pay at ${merchantName}.`}
        </p>
      </div>

      <button style={{
        marginTop: "auto", padding: "8px 16px", background: "#1d1d1f", color: "white",
        fontSize: "0.75rem", fontWeight: 600, borderRadius: 20, border: "none", cursor: "pointer", fontFamily: "inherit",
      }}>
        Shop now
      </button>
    </div>
  );
}

// ── Merchant row with expand/collapse ─────────────────────────────────────────

function MerchantRow({
  pairing, selected, onToggle, onBuildPitch, isBuilding,
}: {
  pairing: Pairing;
  selected: boolean;
  onToggle: () => void;
  onBuildPitch: () => void;
  isBuilding: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = pairing.relevanceScore >= 7 ? "#248a3d" : pairing.relevanceScore >= 4 ? "#c47c00" : "#cc2200";
  const bg   = pairing.relevanceScore >= 7 ? "rgba(52,199,89,0.1)" : pairing.relevanceScore >= 4 ? "rgba(255,159,10,0.1)" : "rgba(255,59,48,0.1)";

  const { text: rationaleText, offerType } = parseRationale(pairing.rationale);

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
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link href={`/merchants/${pairing.merchantId}`} onClick={e => e.stopPropagation()} style={{ color: "#1d1d1f", textDecoration: "none" }}>
              {pairing.merchantName}
            </Link>
            {pairing.merchantPartnerStatus === "dismissed" && (
              <span style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: 6, background: "rgba(255,59,48,0.1)", color: "#cc2200", fontWeight: 700 }}>
                Dismissed
              </span>
            )}
          </div>
        </td>
        <td style={{ padding: "10px 14px", fontSize: "0.82rem", color: "#86868b" }}>{pairing.merchantCategory}</td>
        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color, background: bg, padding: "2px 8px", borderRadius: 8 }}>
              {pairing.relevanceScore.toFixed(1)}
            </span>
            {rationaleText && (
              <div style={{ position: "relative" }} className="tooltip-trigger">
                <span style={{ cursor: "help", color: "#86868b", fontSize: "0.75rem" }}>ⓘ</span>
                <div className="tooltip" style={{
                  display: "none", position: "absolute", bottom: "100%", left: "50%",
                  transform: "translateX(-50%)", background: "#1d1d1f", color: "white",
                  padding: "8px 12px", borderRadius: 8, fontSize: "0.75rem", lineHeight: 1.5,
                  width: 260, zIndex: 10, marginBottom: 6,
                }}>
                  {rationaleText}
                </div>
              </div>
            )}
          </div>
        </td>
        <td style={{ padding: "10px 14px", fontSize: "0.82rem", color: "#1d1d1f", lineHeight: 1.4 }}>{pairing.campaignAngle}</td>
        <td style={{ padding: "10px 12px" }} onClick={e => e.stopPropagation()}>
          <button
            onClick={onBuildPitch}
            disabled={isBuilding}
            style={{ fontSize: "0.72rem", fontWeight: 600, padding: "4px 10px", borderRadius: 8, background: "#0071e3", color: "white", border: "none", cursor: "pointer", whiteSpace: "nowrap", opacity: isBuilding ? 0.6 : 1 }}
          >
            {isBuilding ? "…" : "Quick Pitch"}
          </button>
        </td>
      </tr>
      {expanded && rationaleText && (
        <tr style={{ borderBottom: "1px solid #f0f0f5", background: selected ? "rgba(0,113,227,0.04)" : "#fafafa" }}>
          <td />
          <td colSpan={4} style={{ padding: "8px 14px 14px", fontSize: "0.8rem", color: "#6e6e73", lineHeight: 1.6 }}>
            {rationaleText}
          </td>
        </tr>
      )}
    </>
  );
}
