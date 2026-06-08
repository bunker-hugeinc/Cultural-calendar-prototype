"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ScoreRationale {
  audienceRationale?: string;
  productRationale?: string;
  partnerRationale?: string;
  overallRationale?: string;
}

interface SubScoreCardProps {
  momentId: string;
  audienceRelevance: number | null;
  productConnection: number | null;
  partnerAlignment: number | null;
  scoreRationale?: string | null;
}

function scoreColor(score: number | null): string {
  if (score == null) return "#e8e8ed";
  if (score >= 7) return "#34c759";
  if (score >= 4) return "#ff9f0a";
  return "#ff3b30";
}

function textColor(score: number | null): string {
  if (score == null) return "#86868b";
  if (score >= 7) return "#1e8a44";
  if (score >= 4) return "#c47c00";
  return "#cc2200";
}

export function SubScoreCard({ momentId, audienceRelevance, productConnection, partnerAlignment, scoreRationale }: SubScoreCardProps) {
  const router = useRouter();
  const [rescoring, setRescoring] = useState(false);

  let rationale: ScoreRationale | null = null;
  try {
    if (scoreRationale) rationale = JSON.parse(scoreRationale);
  } catch { /* ignore */ }

  const hasScores = audienceRelevance != null && productConnection != null && partnerAlignment != null;

  async function handleRescore() {
    setRescoring(true);
    try {
      await fetch(`/api/moments/${momentId}/score`, { method: "POST" });
      router.refresh();
    } finally {
      setRescoring(false);
    }
  }

  const subScores = [
    { label: "Audience Relevance", value: audienceRelevance, text: rationale?.audienceRationale },
    { label: "Product Connection",  value: productConnection,  text: rationale?.productRationale },
    { label: "Partner Alignment",   value: partnerAlignment,   text: rationale?.partnerRationale },
  ];

  return (
    <div className="card-apple p-5 mb-6">
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <p className="eyebrow">AI EVALUATION</p>
        <button
          onClick={handleRescore}
          disabled={rescoring}
          className="text-xs text-apple-blue hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          {rescoring ? "Scoring…" : hasScores ? "Re-score" : "Score now"}
        </button>
      </div>

      {!hasScores && !rescoring && (
        <p className="text-xs text-apple-gray-400 italic">No AI evaluation yet. Click &quot;Score now&quot; to generate sub-scores and rationale.</p>
      )}

      {hasScores && (
        <>
          {rationale?.overallRationale && (
            <p style={{ fontSize: "0.9rem", color: "#1d1d1f", marginBottom: 20, lineHeight: 1.5 }}>
              {rationale.overallRationale}
            </p>
          )}

          {subScores.map(({ label, value, text }) => value != null && (
            <div key={label} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #f0f0f5" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, flex: 1 }}>{label}</span>
                <div style={{ width: 120, height: 4, borderRadius: 2, background: "#e8e8ed", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(value / 10) * 100}%`, background: scoreColor(value), borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, width: 28, textAlign: "right", color: textColor(value) }}>
                  {value.toFixed(1)}
                </span>
              </div>
              {text && (
                <p style={{ fontSize: "0.78rem", color: "#86868b", lineHeight: 1.5, margin: 0 }}>{text}</p>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
