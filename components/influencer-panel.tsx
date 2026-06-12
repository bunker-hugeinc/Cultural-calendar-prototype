"use client";

import { useState, useEffect } from "react";

const MONO = `"SF Pro Mono","SFMono-Regular",ui-monospace,monospace`;
const SANS = `-apple-system,"SF Pro Text",BlinkMacSystemFont,sans-serif`;
const DISP = `"SF Pro Display",-apple-system,BlinkMacSystemFont,sans-serif`;

const PROGRESS_STAGES = [
  "Finding relevant creators…",
  "Analyzing content niches…",
  "Matching audience profiles…",
  "Evaluating moment alignment…",
  "Finalizing recommendations…",
];

function ProgressMessage() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setStage(prev => (prev + 1) % PROGRESS_STAGES.length), 4000);
    return () => clearInterval(interval);
  }, []);
  return (
    <span style={{ fontFamily: SANS, fontSize: 12, color: "#6e6e73" }}>{PROGRESS_STAGES[stage]}</span>
  );
}

interface CreatorType {
  type: string;
  realExamples: string;
  audienceSize: string;
  contentStyle: string;
  whyThisMoment: string;
}

interface InfluencerPanelProps {
  momentId: string;
  hasPairings: boolean;
}

export function InfluencerPanel({ momentId, hasPairings }: InfluencerPanelProps) {
  const [creators, setCreators] = useState<CreatorType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load previously-saved suggestions so they aren't regenerated every visit.
  useEffect(() => {
    fetch(`/api/moments/${momentId}/personas`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (Array.isArray(d?.personas) && d.personas.length) setCreators(d.personas); })
      .catch(() => { /* ignore */ });
  }, [momentId]);

  async function handleSuggest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/moments/${momentId}/personas`, { method: "POST" });
      let data: { personas?: CreatorType[]; error?: string; details?: string } = {};
      try {
        data = await res.json();
      } catch {
        setError(`Server error (${res.status}) — please try again`);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status})`);
      } else {
        setCreators(data.personas ?? []);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Network error — ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 500, letterSpacing: ".2em", textTransform: "uppercase", color: "#b0b0ba", marginBottom: 12 }}>
        Influencer Strategy
      </div>

      <button
        onClick={handleSuggest}
        disabled={loading}
        style={{
          fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: ".08em", textTransform: "uppercase",
          padding: "9px 16px", borderRadius: 8,
          border: "1px solid rgba(220,80,120,.35)",
          background: loading ? "rgba(220,80,120,.04)" : "rgba(220,80,120,.08)",
          color: "#9c2050", cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1,
          display: "flex", alignItems: "center", gap: 7, transition: "all .15s",
          marginBottom: creators.length ? 20 : 0,
        }}
      >
        {loading ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin .8s linear infinite" }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <ProgressMessage />
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            {creators.length ? "Re-suggest Influencers" : "Suggest Influencers"}
          </>
        )}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {!hasPairings && !creators.length && (
        <p style={{ fontFamily: SANS, fontSize: 12, color: "#b0b0ba", marginTop: 8 }}>
          Score this moment against merchants first for better creator suggestions.
        </p>
      )}

      {error && (
        <p style={{ fontFamily: SANS, fontSize: 12, color: "#dc2626", marginTop: 8 }}>{error}</p>
      )}

      {creators.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {creators.map((c, i) => (
            <div key={i} style={{
              background: "#fafafa", border: "1px solid rgba(0,0,0,.09)", borderRadius: 10, padding: "16px 18px",
            }}>
              {/* Creator type + audience size */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <p style={{ fontFamily: DISP, fontSize: 14, fontWeight: 700, color: "#111", margin: 0 }}>{c.type}</p>
                <span style={{ fontFamily: MONO, fontSize: 9, color: "#6e6e80", letterSpacing: ".06em", whiteSpace: "nowrap", flexShrink: 0 }}>{c.audienceSize}</span>
              </div>

              {/* Real examples — hyperlinked */}
              <p style={{ fontFamily: SANS, fontSize: 12, marginBottom: 10, margin: "0 0 10px" }}>
                {c.realExamples?.split(", ").map((name, j) => {
                  const handle = name.replace(/^@/, "").replace(/\s/g, "").toLowerCase();
                  return (
                    <span key={j}>
                      {j > 0 && ", "}
                      <a
                        href={`https://www.instagram.com/${handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#0071e3", textDecoration: "none" }}
                      >
                        {name}
                      </a>
                    </span>
                  );
                })}
              </p>

              {/* Why this moment — PROMINENT */}
              <div style={{ background: "#f5f5f7", borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
                <p style={{ fontFamily: MONO, fontSize: 8, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#9c2050", marginBottom: 4 }}>WHY THIS MOMENT</p>
                <p style={{ fontFamily: SANS, fontSize: 12, color: "#1d1d1f", lineHeight: 1.55, margin: 0 }}>{c.whyThisMoment}</p>
              </div>

              {/* Content style — secondary */}
              <p style={{ fontFamily: SANS, fontSize: 12, color: "#6e6e73", lineHeight: 1.4, margin: 0 }}>{c.contentStyle}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
