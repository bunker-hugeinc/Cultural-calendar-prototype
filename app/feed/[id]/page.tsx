"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface FeedCandidate {
  id: string; name: string; startDate: string; endDate: string | null;
  category: string; score: number; headline: string; body: string; why: string;
  hook: string; partners: string; personas: string; hashtags: string;
  competing: string; status: string;
}

interface Evaluation {
  ecommerceScore: number; ecommerceRationale: string;
  audienceFit: number; audienceRationale: string;
  whiteSpaceScore: number; whiteSpaceRationale: string;
  whiteSpaceAnalysis: string; overallRationale: string;
  channelRecommendations: ChannelRec[];
}

interface ChannelRec {
  channel: string; channelLabel: string; recommended: boolean;
  rationale: string; suggestedFormat: string;
}

interface Pairing {
  merchantName: string; merchantId: string | null;
  relevanceScore: number; campaignAngle: string; rationale: string;
}

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  gather:  { bg: "#e8f5e9", color: "#248a3d" },
  improve: { bg: "#fce4ec", color: "#dc5078" },
  excite:  { bg: "#e3f2fd", color: "#0071e3" },
};

function scoreColor(s: number) {
  return s >= 7 ? "#34c759" : s >= 4 ? "#ff9f0a" : "#ff3b30";
}

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function ScoreCard({ eyebrow, label, score, rationale }: { eyebrow: string; label: string; score: number; rationale: string }) {
  const color = scoreColor(score);
  return (
    <div className="card-p">
      <p className="eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</p>
      <p style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 8, color: "#1d1d1f" }}>{label}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#e8e8ed" }}>
          <div style={{ height: "100%", width: `${(score / 10) * 100}%`, background: color, borderRadius: 2 }} />
        </div>
        <span style={{ fontWeight: 700, fontSize: "1rem", color }}>{score.toFixed(1)}</span>
      </div>
      <p style={{ fontSize: "0.75rem", color: "#6e6e73", lineHeight: 1.5 }}>{rationale}</p>
    </div>
  );
}

export default function FeedCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [candidate, setCandidate] = useState<FeedCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [pairings, setPairings] = useState<Pairing[]>([]);
  const [scoring, setScoring] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMerchants, setSelectedMerchants] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/feed")
      .then(r => r.json())
      .then((rows: FeedCandidate[]) => {
        const found = rows.find(c => c.id === id);
        setCandidate(found ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleScore() {
    setScoring(true);
    setError(null);
    try {
      const res = await fetch(`/api/feed/${id}/score`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Scoring failed"); return; }
      setEvaluation(data.evaluation);
      setPairings(data.pairings ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setScoring(false);
    }
  }

  async function handleAddToCalendar() {
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/feed/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to add to calendar"); setAdding(false); return; }

      const momentId = data.moment?.id;
      if (!momentId) { setError("No moment ID returned"); setAdding(false); return; }

      // If we have pre-computed scores, save them to the moment
      if (evaluation) {
        await fetch(`/api/moments/${momentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.moment.name,
            startDate: data.moment.startDate,
            endDate: data.moment.endDate,
            category: data.moment.category,
            description: data.moment.description,
            hook: data.moment.hook,
            ecommerceScore: evaluation.ecommerceScore,
            audienceFit: evaluation.audienceFit,
            whiteSpaceScore: evaluation.whiteSpaceScore,
            score: parseFloat(((evaluation.ecommerceScore + evaluation.audienceFit + evaluation.whiteSpaceScore) / 3).toFixed(1)),
            scoreRationale: JSON.stringify({
              ecommerceRationale: evaluation.ecommerceRationale,
              audienceRationale: evaluation.audienceRationale,
              whiteSpaceRationale: evaluation.whiteSpaceRationale,
              whiteSpaceAnalysis: evaluation.whiteSpaceAnalysis,
              overallRationale: evaluation.overallRationale,
            }),
            channelRecommendations: JSON.stringify(evaluation.channelRecommendations),
          }),
        });

        // Save merchant pairings for selected merchants
        const toSave = pairings.filter(p => p.merchantId && selectedMerchants.has(p.merchantName));
        for (const p of toSave) {
          await fetch(`/api/pairings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              momentId,
              merchantId: p.merchantId,
              relevanceScore: p.relevanceScore,
              campaignAngle: p.campaignAngle,
              rationale: p.rationale,
            }),
          }).catch(() => { /* non-fatal */ });
        }
      }

      router.push(`/moments/${momentId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setAdding(false);
    }
  }

  function toggleMerchant(name: string) {
    setSelectedMerchants(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  if (loading) return (
    <div style={{ padding: "40px 24px", maxWidth: 900, margin: "0 auto" }}>
      <p style={{ color: "#86868b", fontSize: "0.85rem" }}>Loading…</p>
    </div>
  );

  if (!candidate) return (
    <div style={{ padding: "40px 24px", maxWidth: 900, margin: "0 auto" }}>
      <Link href="/feed" style={{ fontSize: "0.82rem", color: "#86868b", textDecoration: "none" }}>← Feed</Link>
      <p style={{ marginTop: 24, color: "#86868b" }}>Moment not found or already added to calendar.</p>
    </div>
  );

  const cat = CAT_COLORS[candidate.category] ?? CAT_COLORS.gather;
  let partners: string[] = [];
  try { partners = JSON.parse(candidate.partners); } catch { /* */ }
  let competing: string[] = [];
  try { competing = JSON.parse(candidate.competing); } catch { /* */ }

  const dateLabel = candidate.endDate && candidate.endDate !== candidate.startDate
    ? `${formatDate(candidate.startDate)} – ${formatDate(candidate.endDate)}`
    : formatDate(candidate.startDate);

  const isAdded = candidate.status === "added";

  return (
    <div style={{ padding: "32px 24px", maxWidth: 900, margin: "0 auto" }}>

      {/* Back */}
      <div style={{ marginBottom: 12 }}>
        <Link href="/feed" style={{ fontSize: "0.82rem", color: "#86868b", textDecoration: "none" }}>← Feed</Link>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 10px", borderRadius: 10, background: cat.bg, color: cat.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {candidate.category}
            </span>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: candidate.score >= 7 ? "#34c759" : "#ff9f0a" }}>
              {candidate.score.toFixed(1)}/10 fit score
            </span>
            {isAdded && (
              <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 10px", borderRadius: 10, background: "rgba(52,199,89,0.12)", color: "#248a3d" }}>
                ✓ On Calendar
              </span>
            )}
          </div>
          <h1 style={{ marginBottom: 4 }}>{candidate.name}</h1>
          <p style={{ fontSize: "0.85rem", color: "#86868b" }}>{dateLabel}</p>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {isAdded ? (
            <Link href="/calendar" className="btn btn-outline" style={{ textDecoration: "none" }}>
              View in Calendar
            </Link>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleAddToCalendar}
              disabled={adding}
              style={{ opacity: adding ? 0.6 : 1 }}
            >
              {adding ? "Adding…" : evaluation ? "Add to Calendar & Score →" : "Add to Calendar →"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: "10px 16px", background: "#fff5f5", border: "1px solid #ffc7c5", borderRadius: 10, fontSize: "0.85rem", color: "#cc2200" }}>
          {error}
        </div>
      )}

      {/* Candidate overview */}
      <div className="card-p" style={{ marginBottom: 20 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>OPPORTUNITY</p>
        <p style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "#1d1d1f", marginBottom: 16 }}>{candidate.why}</p>

        {partners.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p className="eyebrow" style={{ marginBottom: 6 }}>SUGGESTED PARTNERS</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {partners.map(p => (
                <span key={p} style={{ fontSize: "0.75rem", padding: "3px 10px", borderRadius: 10, background: "#f5f5f7", color: "#6e6e73", border: "1px solid #e8e8ed" }}>{p}</span>
              ))}
            </div>
          </div>
        )}

        {candidate.hook && (
          <div>
            <p className="eyebrow" style={{ marginBottom: 4 }}>HOOK TYPE</p>
            <p style={{ fontSize: "0.85rem", color: "#6e6e73" }}>{candidate.hook}</p>
          </div>
        )}
      </div>

      {/* AI Evaluation */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <p className="eyebrow">AI EVALUATION</p>
          {evaluation && (
            <button
              onClick={handleScore}
              disabled={scoring}
              style={{ fontSize: "0.75rem", color: "#0071e3", background: "none", border: "none", cursor: "pointer", opacity: scoring ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              {scoring && <span className="spinner" />}
              {scoring ? "Evaluating…" : "Re-score"}
            </button>
          )}
        </div>

        {evaluation ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
              <ScoreCard eyebrow="SPENDING BEHAVIOR" label="Ecommerce Moment" score={evaluation.ecommerceScore} rationale={evaluation.ecommerceRationale} />
              <ScoreCard eyebrow="REACH" label="Audience Fit" score={evaluation.audienceFit} rationale={evaluation.audienceRationale} />
              <ScoreCard eyebrow="COMPETITIVE LANDSCAPE" label="White Space" score={evaluation.whiteSpaceScore} rationale={evaluation.whiteSpaceRationale} />
            </div>
            {evaluation.whiteSpaceAnalysis && (
              <div className="card-p" style={{ background: "rgba(0,113,227,0.03)", border: "1px solid rgba(0,113,227,0.12)", marginBottom: 12 }}>
                <p className="eyebrow" style={{ color: "#0071e3", marginBottom: 6 }}>MOMENT ANALYSIS</p>
                <p style={{ fontSize: "0.88rem", lineHeight: 1.6 }}>{evaluation.whiteSpaceAnalysis}</p>
              </div>
            )}
            {evaluation.overallRationale && (
              <p style={{ fontSize: "0.82rem", color: "#86868b", fontStyle: "italic" }}>{evaluation.overallRationale}</p>
            )}
          </>
        ) : (
          <div className="card-p" style={{ textAlign: "center", padding: "32px 24px", background: "rgba(0,113,227,0.04)", border: "1px solid rgba(0,113,227,0.15)" }}>
            <p className="eyebrow" style={{ color: "#0071e3", marginBottom: 10 }}>EVALUATE THIS MOMENT</p>
            <h3 style={{ marginBottom: 8 }}>Score Apple Pay fit + find best merchants</h3>
            <p style={{ fontSize: "0.85rem", color: "#86868b", marginBottom: 20 }}>
              Claude will evaluate the ecommerce opportunity, audience fit, and competitive white space — and score all merchants for this moment.
            </p>
            <button className="btn btn-blue" onClick={handleScore} disabled={scoring} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              {scoring && <span className="spinner" />}
              {scoring ? "Claude is evaluating…" : "Evaluate with Claude"}
            </button>
          </div>
        )}
      </div>

      {/* Merchant matches */}
      {pairings.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
            <p className="eyebrow">MERCHANT MATCHES</p>
            <span style={{ fontSize: "0.78rem", color: "#86868b" }}>
              Select merchants to save with this moment
            </span>
          </div>
          <div className="card-apple" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #f0f0f5", background: "#fafafa" }}>
                  <th style={{ width: 32, padding: "10px 12px" }} />
                  <th style={{ padding: "10px 14px", textAlign: "left" }} className="eyebrow">Merchant</th>
                  <th style={{ padding: "10px 14px", textAlign: "left" }} className="eyebrow">Score</th>
                  <th style={{ padding: "10px 14px", textAlign: "left" }} className="eyebrow">Campaign Angle</th>
                </tr>
              </thead>
              <tbody>
                {pairings.slice(0, 8).map(p => {
                  const sc = p.relevanceScore;
                  const color = scoreColor(sc);
                  const sel = selectedMerchants.has(p.merchantName);
                  return (
                    <tr key={p.merchantName} style={{ borderBottom: "1px solid #f0f0f5", background: sel ? "rgba(0,113,227,0.04)" : "white" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <input type="checkbox" checked={sel} onChange={() => toggleMerchant(p.merchantName)} style={{ cursor: "pointer", accentColor: "#0071e3" }} />
                      </td>
                      <td style={{ padding: "10px 14px", fontWeight: 600, fontSize: "0.88rem", color: "#1d1d1f" }}>{p.merchantName}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color, background: `${color}18`, padding: "2px 8px", borderRadius: 8 }}>{sc.toFixed(1)}</span>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: "0.82rem", color: "#1d1d1f", lineHeight: 1.4 }}>{p.campaignAngle}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Competing brands */}
      {competing.length > 0 && (
        <div className="card-p" style={{ marginBottom: 20, background: "rgba(255,59,48,0.03)", border: "1px solid rgba(255,59,48,0.12)" }}>
          <p className="eyebrow" style={{ color: "#cc2200", marginBottom: 6 }}>COMPETING BRANDS</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {competing.map(c => (
              <span key={c} style={{ fontSize: "0.78rem", padding: "3px 10px", borderRadius: 10, background: "rgba(255,59,48,0.08)", color: "#cc2200" }}>{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Bottom CTA */}
      {!isAdded && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "#1d1d1f", borderRadius: 14 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "white", marginBottom: 2 }}>
              {evaluation ? "Ready to add this moment?" : "Add to calendar to start scoring and building pitches."}
            </p>
            <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>
              {evaluation
                ? `Scores${selectedMerchants.size > 0 ? ` + ${selectedMerchants.size} merchant${selectedMerchants.size !== 1 ? "s" : ""}` : ""} will be saved automatically.`
                : "You can score and find merchant matches before or after adding."}
            </p>
          </div>
          <button
            className="btn"
            onClick={handleAddToCalendar}
            disabled={adding}
            style={{ background: "#0071e3", color: "white", border: "none", opacity: adding ? 0.6 : 1, flexShrink: 0 }}
          >
            {adding ? "Adding…" : "Add to Calendar →"}
          </button>
        </div>
      )}
    </div>
  );
}
