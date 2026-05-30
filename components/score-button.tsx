"use client";

import { useState } from "react";

interface Pairing {
  merchantName: string;
  relevanceScore: number;
  campaignAngle: string;
  rationale: string;
}

interface ScoreButtonProps {
  momentId: string;
  hasPairings: boolean;
  onScored: (pairings: Pairing[], count: number) => void;
}

const MONO = `"SF Pro Mono","SFMono-Regular",ui-monospace,monospace`;

export function ScoreButton({ momentId, hasPairings, onScored }: ScoreButtonProps) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/moments/${momentId}/score`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Scoring failed", false);
      } else {
        onScored(data.pairings, data.scored);
        showToast(`Scored against ${data.scored} merchants`, true);
      }
    } catch {
      showToast("Network error — please try again", false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
        style={{
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: ".06em",
          background: loading ? "#f0fdf4" : "#dcfce7",
          borderColor: "#86efac",
          color: "#15803d",
          cursor: loading ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: 7,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ animation: "spin 0.8s linear infinite" }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Scoring…
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4l3 3" />
            </svg>
            {hasPairings ? "Re-score Merchants" : "Score Against Merchants"}
          </>
        )}
      </button>

      {/* Toast */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {toast && (
        <div style={{
          position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
          background: toast.ok ? "#15803d" : "#dc2626",
          color: "#fff", padding: "10px 18px", borderRadius: 8,
          fontFamily: MONO, fontSize: 12, fontWeight: 500, zIndex: 200,
          boxShadow: "0 4px 20px rgba(0,0,0,.2)",
          whiteSpace: "nowrap",
          animation: "fadeIn .2s ease",
        }}>
          {toast.ok ? "✓ " : "✕ "}{toast.msg}
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity:0; transform: translateX(-50%) translateY(8px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }`}</style>
    </>
  );
}
