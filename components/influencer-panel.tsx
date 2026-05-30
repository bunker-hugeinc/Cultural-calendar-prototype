"use client";

import { useState } from "react";

const MONO = `"SF Pro Mono","SFMono-Regular",ui-monospace,monospace`;
const SANS = `-apple-system,"SF Pro Text",BlinkMacSystemFont,sans-serif`;
const DISP = `"SF Pro Display",-apple-system,BlinkMacSystemFont,sans-serif`;

interface Persona {
  type: string;
  handleStyle: string;
  audienceSize: string;
  contentStyle: string;
  whyThisMoment: string;
}

interface InfluencerPanelProps {
  momentId: string;
  hasPairings: boolean;
}

function avatarInitials(handle: string): string {
  return handle.replace(/^@/, "").slice(0, 2).toUpperCase();
}

export function InfluencerPanel({ momentId, hasPairings }: InfluencerPanelProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSuggest() {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/moments/${momentId}/personas`, { method: "POST" });
      let data: { personas?: Persona[]; error?: string; details?: string } = {};
      try {
        data = await res.json();
      } catch {
        // Response body wasn't valid JSON (e.g. upstream gateway error)
        setError(`Server error (${res.status}) — please try again`);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? `Request failed (${res.status})`);
      } else {
        setPersonas(data.personas ?? []);
      }
    } catch (err) {
      // Network-level failure (offline, DNS, etc.)
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Network error — ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveToNotes() {
    if (!personas.length) return;
    setSaving(true);
    const text = personas
      .map(p =>
        `${p.type} · ${p.handleStyle} · ${p.audienceSize}\n${p.contentStyle}\nWhy: ${p.whyThisMoment}`
      )
      .join("\n\n");
    const notesText = `--- Influencer Personas (AI-generated) ---\n${text}`;
    try {
      const res = await fetch(`/api/moments/${momentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _appendNotes: notesText }),
      });
      if (res.ok) {
        setSaved(true);
        showToast("Personas saved to notes");
      } else {
        showToast("Failed to save notes");
      }
    } catch {
      showToast("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ marginTop: 32 }}>
      {/* Section label */}
      <div style={{ fontFamily: MONO, fontSize: 8, fontWeight: 500, letterSpacing: ".2em", textTransform: "uppercase", color: "#b0b0ba", marginBottom: 12 }}>
        Influencer Strategy
      </div>

      {/* Suggest button */}
      <button
        onClick={handleSuggest}
        disabled={loading}
        style={{
          fontFamily: MONO,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          padding: "9px 16px",
          borderRadius: 8,
          border: "1px solid rgba(220,80,120,.35)",
          background: loading ? "rgba(220,80,120,.04)" : "rgba(220,80,120,.08)",
          color: "#9c2050",
          cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.7 : 1,
          display: "flex",
          alignItems: "center",
          gap: 7,
          transition: "all .15s",
          marginBottom: personas.length ? 20 : 0,
        }}
      >
        {loading ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ animation: "spin .8s linear infinite" }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            Thinking…
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            {personas.length ? "Re-suggest Influencers" : "Suggest Influencers"}
          </>
        )}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {!hasPairings && !personas.length && (
        <p style={{ fontFamily: SANS, fontSize: 12, color: "#b0b0ba", marginTop: 8 }}>
          Score this moment against merchants first for better persona suggestions.
        </p>
      )}

      {error && (
        <p style={{ fontFamily: SANS, fontSize: 12, color: "#dc2626", marginTop: 8 }}>{error}</p>
      )}

      {/* Persona cards */}
      {personas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {personas.map((p, i) => (
            <div key={i} style={{
              background: "#fafafa",
              border: "1px solid rgba(0,0,0,.09)",
              borderRadius: 10,
              padding: "16px 18px",
              display: "grid",
              gridTemplateColumns: "40px 1fr",
              gap: "0 14px",
            }}>
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "rgba(220,80,120,.1)",
                border: "1px solid rgba(220,80,120,.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: MONO, fontSize: 10, fontWeight: 700, color: "#9c2050",
                flexShrink: 0,
              }}>
                {avatarInitials(p.handleStyle)}
              </div>

              {/* Content */}
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ fontFamily: DISP, fontSize: 14, fontWeight: 700, color: "#111" }}>{p.handleStyle}</span>
                  <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: ".1em", textTransform: "uppercase", color: "#9c2050", background: "rgba(220,80,120,.08)", border: "1px solid rgba(220,80,120,.2)", padding: "2px 7px", borderRadius: 4 }}>{p.type}</span>
                  <span style={{ fontFamily: MONO, fontSize: 8, color: "#6e6e80", letterSpacing: ".06em" }}>{p.audienceSize}</span>
                </div>
                <p style={{ fontFamily: SANS, fontSize: 12, color: "#444", lineHeight: 1.55, margin: "0 0 6px" }}>{p.contentStyle}</p>
                <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                  <span style={{ fontFamily: MONO, fontSize: 7.5, fontWeight: 500, letterSpacing: ".14em", textTransform: "uppercase", color: "#b0b0ba", whiteSpace: "nowrap", paddingTop: 1 }}>Why:</span>
                  <p style={{ fontFamily: SANS, fontSize: 12, color: "#1a3fa8", lineHeight: 1.55, margin: 0 }}>{p.whyThisMoment}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Save to Notes */}
          <button
            onClick={handleSaveToNotes}
            disabled={saving || saved}
            style={{
              alignSelf: "flex-start",
              fontFamily: MONO,
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              padding: "7px 14px",
              borderRadius: 6,
              border: saved ? "1px solid rgba(52,168,83,.4)" : "1px solid rgba(0,0,0,.12)",
              background: saved ? "rgba(52,168,83,.08)" : "#fff",
              color: saved ? "#15803d" : "#6e6e80",
              cursor: (saving || saved) ? "default" : "pointer",
              opacity: saving ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all .2s",
            }}
          >
            {saved ? (
              <>
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7l3.5 3.5L12 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Saved to Notes
              </>
            ) : saving ? "Saving…" : "Save to Notes"}
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
          background: "#15803d", color: "#fff", padding: "10px 18px", borderRadius: 8,
          fontFamily: MONO, fontSize: 12, fontWeight: 500, zIndex: 200,
          boxShadow: "0 4px 20px rgba(0,0,0,.2)", whiteSpace: "nowrap",
        }}>
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
