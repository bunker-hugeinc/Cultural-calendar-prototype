"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  gather:  "#5856d6",
  improve: "#248a3d",
  excite:  "#ff6200",
};

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface Moment {
  id: string;
  name: string;
  startDate: string;
  category: string;
  score: number | null;
}

export function UpcomingMoments({ initialMoments }: { initialMoments: Moment[] }) {
  const [moments, setMoments] = useState(initialMoments);

  const handleDismiss = async (id: string) => {
    setMoments(prev => prev.filter(m => m.id !== id));
    await fetch(`/api/moments/${id}/dismiss`, { method: "POST" }).catch(() => {});
  };

  if (moments.length === 0) {
    return <p style={{ color: "#86868b", fontSize: "0.9rem" }}>No upcoming moments in the next 90 days.</p>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
      {moments.map(m => (
        <div key={m.id} style={{ position: "relative" }} className="group">
          <Link href={`/moments/${m.id}`} style={{ textDecoration: "none" }}>
            <div className="card-apple" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#1d1d1f", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {m.name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.75rem", color: "#86868b" }}>{formatDate(m.startDate)}</span>
                  <span style={{
                    fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 10,
                    background: CATEGORY_COLORS[m.category] ?? "#86868b",
                    color: "white", textTransform: "uppercase" as const, letterSpacing: "0.04em",
                  }}>{m.category}</span>
                </div>
              </div>
              {m.score != null && (
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1d1d1f" }}>{m.score.toFixed(1)}</div>
                  <div style={{ fontSize: "0.65rem", color: "#86868b" }}>score</div>
                </div>
              )}
            </div>
          </Link>
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); handleDismiss(m.id); }}
            title="Dismiss"
            style={{
              position: "absolute", top: 8, right: 8,
              width: 22, height: 22, borderRadius: "50%",
              background: "white", border: "1px solid #e8e8ed",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", padding: 0,
              opacity: 0, transition: "opacity 0.15s",
              color: "#86868b",
            }}
            className="dismiss-btn"
          >
            <X size={11} />
          </button>
        </div>
      ))}
      <style>{`.group:hover .dismiss-btn { opacity: 1 !important; } .dismiss-btn:hover { color: #ff3b30 !important; border-color: #ffd7d5 !important; }`}</style>
    </div>
  );
}
