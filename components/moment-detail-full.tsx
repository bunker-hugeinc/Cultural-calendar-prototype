"use client";

import { useState } from "react";
import Link from "next/link";
import { InfluencerPanel } from "@/components/influencer-panel";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Pairing {
  id: string;
  merchantId: string;
  merchantName: string;
  merchantCategory: string;
  relevanceScore: number;
  campaignAngle: string;
  rationale: string | null;
}

interface ChannelRec {
  channel: string;
  channelLabel: string;
  recommended: boolean;
  rationale: string;
  suggestedFormat: string;
}

interface ScoreRationale {
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

interface Props {
  moment: MomentData;
  initialPairings: Pairing[];
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

export function MomentDetailFull({ moment, initialPairings }: Props) {
  const [pairings, setPairings] = useState<Pairing[]>(initialPairings);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scored, setScored] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
      // Refresh moment data + pairings
      const refreshed = await fetch(`/api/moments/${moment.id}`).then(r => r.json());
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

  const selectedMerchants = pairings.filter(p => selected.has(p.id));
  const pitchUrl = `/pitches/new?momentId=${moment.id}${
    selectedMerchants.length > 0
      ? "&merchantIds=" + selectedMerchants.map(p => p.merchantId).join(",")
      : ""
  }`;

  function formatDate(dateStr: string) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const dateLabel = moment.endDate && moment.endDate !== moment.startDate
    ? `${formatDate(moment.startDate)} – ${formatDate(moment.endDate)}`
    : formatDate(moment.startDate);

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
                {((liveScores.ecommerce + (liveScores.audience ?? 0) + (liveScores.whiteSpace ?? 0)) / 3).toFixed(1)} overall
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
            style={{ opacity: scoring ? 0.6 : 1 }}
          >
            {scoring ? "Scoring…" : scored ? "Re-score" : liveScores.hasScores ? "Re-score" : "Score"}
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

        {liveScores.hasScores ? (
          <>
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

            {liveScores.rationale.whiteSpaceAnalysis && (
              <div className="card-p" style={{ background: "rgba(0,113,227,0.03)", border: "1px solid rgba(0,113,227,0.12)", marginBottom: 0 }}>
                <p className="eyebrow" style={{ color: "#0071e3", marginBottom: 8 }}>WHITE SPACE ANALYSIS</p>
                <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "#1d1d1f" }}>{liveScores.rationale.whiteSpaceAnalysis}</p>
              </div>
            )}

            {liveScores.rationale.overallRationale && (
              <p style={{ marginTop: 12, fontSize: "0.85rem", color: "#86868b", fontStyle: "italic" }}>
                {liveScores.rationale.overallRationale}
              </p>
            )}
          </>
        ) : (
          <div className="card-p" style={{ textAlign: "center", padding: "32px 24px", background: "rgba(0,113,227,0.04)", border: "1px solid rgba(0,113,227,0.15)" }}>
            <p className="eyebrow" style={{ color: "#0071e3", marginBottom: 10 }}>AI EVALUATION</p>
            <h3 style={{ marginBottom: 8 }}>Score this moment</h3>
            <p style={{ fontSize: "0.85rem", color: "#86868b", marginBottom: 20 }}>
              Claude will evaluate the Apple Pay opportunity — ecommerce fit, audience reach, and competitive white space — and score all merchants for this moment.
            </p>
            <button className="btn btn-blue" onClick={handleScore} disabled={scoring}>
              {scoring ? "Evaluating…" : "Evaluate with Claude"}
            </button>
          </div>
        )}
      </div>

      {/* ── Section 3: Merchant Matches ─────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <p className="eyebrow">MERCHANT MATCHES</p>
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
                  </tr>
                </thead>
                <tbody>
                  {pairings.map(p => (
                    <MerchantRow
                      key={p.id}
                      pairing={p}
                      selected={selected.has(p.id)}
                      onToggle={() => toggleSelect(p.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {selected.size > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#1d1d1f", borderRadius: 12 }}>
                <span style={{ fontSize: "0.85rem", color: "white" }}>
                  {selected.size} merchant{selected.size !== 1 ? "s" : ""} selected
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

      {/* ── Section 4: Channel Recommendations ──────────────────────────────── */}
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
                <span style={{
                  fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 10, flexShrink: 0,
                  background: ch.recommended ? "rgba(52,199,89,0.12)" : "#f5f5f7",
                  color: ch.recommended ? "#248a3d" : "#86868b",
                }}>
                  {ch.recommended ? "Recommended" : "Optional"}
                </span>
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

      {/* ── Section 6: Moment Context ────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>MOMENT CONTEXT</p>
        <div className="card-p" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: 6 }}>Description</p>
            <p style={{ fontSize: "0.9rem", color: "#1d1d1f", lineHeight: 1.6 }}>{moment.description}</p>
          </div>
          {moment.hook && (
            <div style={{ borderTop: "1px solid #f0f0f5", paddingTop: 16 }}>
              <p className="eyebrow" style={{ marginBottom: 6 }}>Hook Type</p>
              <p style={{ fontSize: "0.9rem", color: "#1d1d1f" }}>{moment.hook}</p>
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

// ── Merchant row with expand/collapse ─────────────────────────────────────────

function MerchantRow({
  pairing, selected, onToggle,
}: {
  pairing: Pairing;
  selected: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = pairing.relevanceScore >= 7 ? "#248a3d" : pairing.relevanceScore >= 4 ? "#c47c00" : "#cc2200";
  const bg   = pairing.relevanceScore >= 7 ? "rgba(52,199,89,0.1)" : pairing.relevanceScore >= 4 ? "rgba(255,159,10,0.1)" : "rgba(255,59,48,0.1)";

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
          <Link href={`/merchants/${pairing.merchantId}`} onClick={e => e.stopPropagation()} style={{ color: "#1d1d1f", textDecoration: "none" }}>
            {pairing.merchantName}
          </Link>
        </td>
        <td style={{ padding: "10px 14px", fontSize: "0.82rem", color: "#86868b" }}>{pairing.merchantCategory}</td>
        <td style={{ padding: "10px 14px" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color, background: bg, padding: "2px 8px", borderRadius: 8 }}>
            {pairing.relevanceScore.toFixed(1)}
          </span>
        </td>
        <td style={{ padding: "10px 14px", fontSize: "0.82rem", color: "#1d1d1f", lineHeight: 1.4 }}>{pairing.campaignAngle}</td>
      </tr>
      {expanded && pairing.rationale && (
        <tr style={{ borderBottom: "1px solid #f0f0f5", background: selected ? "rgba(0,113,227,0.04)" : "#fafafa" }}>
          <td />
          <td colSpan={4} style={{ padding: "8px 14px 14px", fontSize: "0.8rem", color: "#6e6e73", lineHeight: 1.6 }}>
            {pairing.rationale}
          </td>
        </tr>
      )}
    </>
  );
}
