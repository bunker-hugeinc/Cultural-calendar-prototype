"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ScoreBadge } from "@/components/score-badge";

type PairingStatus = "draft" | "in_review" | "approved" | "live";

const STATUS_META: Record<PairingStatus, { label: string; bg: string; txt: string; border: string }> = {
  draft:     { label: "Draft",     bg: "#f4f4f5", txt: "#52525b", border: "#e4e4e7" },
  in_review: { label: "In Review", bg: "#fef9c3", txt: "#854d0e", border: "#fde047" },
  approved:  { label: "Approved",  bg: "#dbeafe", txt: "#1e40af", border: "#93c5fd" },
  live:      { label: "Live ✓",    bg: "#dcfce7", txt: "#15803d", border: "#86efac" },
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
        className="border-b hover:bg-muted/40 cursor-pointer transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="py-3 px-4 font-medium text-sm">
          <Link href={`/merchants/${merchantId}`} onClick={(e) => e.stopPropagation()} className="hover:text-blue-600 transition-colors">
            {merchantName}
          </Link>
        </td>
        <td className="py-3 px-4 text-sm text-muted-foreground">{merchantCategory}</td>
        <td className="py-3 px-4">
          <ScoreBadge score={relevanceScore} />
        </td>
        <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs truncate">
          {campaignAngle}
        </td>
        <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
          <StatusPill pairingId={id} initial={status as PairingStatus} />
        </td>
        <td className="py-3 px-4 text-sm text-muted-foreground text-right">
          <span className="text-xs">{expanded ? "▲" : "▼"}</span>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b bg-muted/20">
          <td colSpan={6} className="px-4 py-4">
            <p className="text-sm font-medium mb-1">{campaignAngle}</p>
            {rationale && <p className="text-sm text-muted-foreground">{rationale}</p>}
          </td>
        </tr>
      )}
    </>
  );
}
