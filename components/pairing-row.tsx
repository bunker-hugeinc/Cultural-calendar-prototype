"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ScoreBadge } from "@/components/score-badge";

type PairingStatus = "draft" | "in_review" | "approved" | "live";

const STATUS_META: Record<PairingStatus, { label: string; bg: string; txt: string; border: string }> = {
  draft:     { label: "Draft",     bg: "#f5f5f7", txt: "#6e6e73", border: "#d2d2d7" },
  in_review: { label: "In Review", bg: "#fff8ec", txt: "#c47c00", border: "#ff9f0a55" },
  approved:  { label: "Approved",  bg: "#e8f4ff", txt: "#0058b3", border: "#0071e355" },
  live:      { label: "Live ✓",    bg: "#edfaf2", txt: "#1e8a44", border: "#34c75955" },
};

const ALL_STATUSES: PairingStatus[] = ["draft", "in_review", "approved", "live"];
const MONO = `"SF Pro Mono","SFMono-Regular",ui-monospace,monospace`;

interface PairingRowProps {
  id: string;
  merchantId: string;
  merchantName: string;
  merchantCategory: string;
  relevanceScore: number;
  campaignAngle: string;
  rationale?: string | null;
  status?: PairingStatus;
}

function StatusPill({
  pairingId,
  initial,
}: {
  pairingId: string;
  initial: PairingStatus;
}) {
  const [status, setStatus] = useState<PairingStatus>(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleSelect(next: PairingStatus) {
    setOpen(false);
    if (next === status) return;
    const prev = status;
    setStatus(next); // optimistic
    setBusy(true);
    try {
      const res = await fetch(`/api/pairings/${pairingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) setStatus(prev); // revert
    } catch {
      setStatus(prev);
    } finally {
      setBusy(false);
    }
  }

  const meta = STATUS_META[status];

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        disabled={busy}
        style={{
          fontFamily: MONO,
          fontSize: 9.5,
          fontWeight: 500,
          letterSpacing: ".08em",
          padding: "3px 9px 3px 8px",
          borderRadius: 6,
          border: `1px solid ${meta.border}`,
          background: meta.bg,
          color: meta.txt,
          cursor: busy ? "default" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          opacity: busy ? 0.6 : 1,
          whiteSpace: "nowrap",
          transition: "opacity .15s",
        }}
      >
        {meta.label}
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" style={{ flexShrink: 0 }}>
          <path d="M1.5 3L4 5.5L6.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          right: 0,
          zIndex: 50,
          background: "#fff",
          border: "1px solid rgba(0,0,0,.1)",
          borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,.12)",
          overflow: "hidden",
          minWidth: 130,
        }}>
          {ALL_STATUSES.map(s => {
            const m = STATUS_META[s];
            const active = s === status;
            return (
              <button
                key={s}
                onClick={(e) => { e.stopPropagation(); handleSelect(s); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 12px",
                  fontFamily: MONO,
                  fontSize: 10,
                  fontWeight: active ? 600 : 400,
                  color: active ? m.txt : "#374151",
                  background: active ? m.bg : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background .1s",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "#f9fafb"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: m.txt, opacity: active ? 1 : 0.35,
                }} />
                {m.label}
                {active && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: "auto" }}>
                    <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PairingRow({
  id,
  merchantId,
  merchantName,
  merchantCategory,
  relevanceScore,
  campaignAngle,
  rationale,
  status = "draft",
}: PairingRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="border-b border-apple-gray-100 hover:bg-apple-gray-50 cursor-pointer transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="py-3 px-4 font-medium text-sm text-apple-black">
          <Link href={`/merchants/${merchantId}`} onClick={(e) => e.stopPropagation()} className="hover:text-apple-blue transition-colors no-underline">
            {merchantName}
          </Link>
        </td>
        <td className="py-3 px-4 text-sm text-apple-gray-400">{merchantCategory}</td>
        <td className="py-3 px-4">
          <ScoreBadge score={relevanceScore} />
        </td>
        <td className="py-3 px-4 text-sm text-apple-gray-600 max-w-xs truncate">
          {campaignAngle}
        </td>
        <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
          <StatusPill pairingId={id} initial={status as PairingStatus} />
        </td>
        <td className="py-3 px-4 text-sm text-apple-gray-400 text-right">
          <span className="text-xs">{expanded ? "▲" : "▼"}</span>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-apple-gray-100 bg-apple-gray-50">
          <td colSpan={6} className="px-4 py-4">
            <p className="text-sm font-semibold text-apple-black mb-1">{campaignAngle}</p>
            {rationale && <p className="text-sm text-apple-gray-600">{rationale}</p>}
          </td>
        </tr>
      )}
    </>
  );
}
